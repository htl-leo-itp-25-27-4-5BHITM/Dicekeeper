package campaign;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.transaction.Status;
import jakarta.transaction.Synchronization;
import jakarta.transaction.TransactionSynchronizationRegistry;
import jakarta.ws.rs.sse.OutboundSseEvent;
import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;
import io.vertx.core.Vertx;
import org.jboss.logging.Logger;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Manages SSE connections per campaign and broadcasts events.
 *
 * <p>Every non-heartbeat event gets an id that increases by exactly one per campaign (clients
 * treat a gap as lost events and reload their snapshot) and is kept in a
 * small per-campaign replay buffer. Clients that reconnect with a {@code Last-Event-ID}
 * receive the events they missed, so short connection drops do not lose dice rolls,
 * turn changes or the campaign start.</p>
 */
@ApplicationScoped
public class SseBroadcaster {

    private static final Logger LOG = Logger.getLogger(SseBroadcaster.class);
    static final int REPLAY_BUFFER_SIZE = 200;
    private static final long RECONNECT_DELAY_MS = 2_000;

    @Inject
    ObjectMapper objectMapper;

    @Inject
    Vertx vertx;

    @Inject
    TransactionSynchronizationRegistry transactionRegistry;

    private final ConcurrentHashMap<Long, CampaignChannel> channels = new ConcurrentHashMap<>();
    private long heartbeatTimerId;

    record BufferedEvent(long id, String name, String json) {
    }

    static final class CampaignChannel {
        final Set<SseConnection> connections = new CopyOnWriteArraySet<>();
        final Deque<BufferedEvent> replayBuffer = new ArrayDeque<>();
        // Seeded from the clock so ids stay increasing across restarts and stale client ids never skip new events.
        long lastEventId = System.currentTimeMillis() * 1_000;
    }

    public static class SseConnection {
        public final SseEventSink sink;
        public final Sse sse;
        // Sends are chained so concurrent broadcasts never write to the same sink at once.
        private CompletionStage<?> tail = CompletableFuture.completedFuture(null);

        public SseConnection(SseEventSink sink, Sse sse) {
            this.sink = sink;
            this.sse = sse;
        }

        synchronized CompletionStage<?> enqueue(OutboundSseEvent event) {
            CompletionStage<?> next = tail
                    .exceptionally(ignored -> null)
                    .thenCompose(ignored -> sink.isClosed()
                            ? CompletableFuture.failedFuture(new IllegalStateException("SSE sink closed"))
                            : sink.send(event).thenApply(sent -> (Object) sent));
            tail = next;
            return next;
        }
    }

    /**
     * Registers a client and sends it the welcome event followed by every buffered event
     * newer than {@code lastEventId}, atomically with respect to concurrent broadcasts.
     */
    public void register(Long campaignId, SseEventSink sink, Sse sse, Long lastEventId) {
        CampaignChannel channel = channels.computeIfAbsent(campaignId, id -> new CampaignChannel());
        SseConnection connection = new SseConnection(sink, sse);
        synchronized (channel) {
            channel.connections.add(connection);
            send(campaignId, channel, connection, sse.newEventBuilder()
                    .name("connected")
                    .reconnectDelay(RECONNECT_DELAY_MS)
                    .data(String.class, "{\"status\":\"connected\",\"campaignId\":" + campaignId + "}")
                    .build());
            if (lastEventId != null) {
                int replayed = 0;
                for (BufferedEvent buffered : channel.replayBuffer) {
                    if (buffered.id() > lastEventId) {
                        send(campaignId, channel, connection, toEvent(sse, buffered));
                        replayed++;
                    }
                }
                if (replayed > 0) {
                    LOG.debugv("Replayed SSE events: campaign={0} count={1}", campaignId, replayed);
                }
            }
        }
        LOG.debugv("SSE client connected: campaign={0} clients={1}",
                campaignId, channel.connections.size());
    }

    public void broadcast(Long campaignId, String eventName, Object data) {
        int transactionStatus = transactionRegistry.getTransactionStatus();
        if (transactionStatus == Status.STATUS_ACTIVE) {
            transactionRegistry.registerInterposedSynchronization(new Synchronization() {
                @Override
                public void beforeCompletion() {
                }

                @Override
                public void afterCompletion(int status) {
                    if (status == Status.STATUS_COMMITTED) {
                        broadcastNow(campaignId, eventName, data);
                    }
                }
            });
            return;
        }
        if (transactionStatus == Status.STATUS_MARKED_ROLLBACK
                || transactionStatus == Status.STATUS_ROLLEDBACK
                || transactionStatus == Status.STATUS_ROLLING_BACK) {
            LOG.debugv("Skipping SSE event for rolled-back transaction: campaign={0} event={1}",
                    campaignId, eventName);
            return;
        }
        broadcastNow(campaignId, eventName, data);
    }

    private void broadcastNow(Long campaignId, String eventName, Object data) {
        String json;
        try {
            json = objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            LOG.errorf(e, "Could not serialize SSE event: campaign=%d event=%s", campaignId, eventName);
            return;
        }

        // Buffer even without subscribers: a player who is reconnecting right now must still get it.
        CampaignChannel channel = channels.computeIfAbsent(campaignId, id -> new CampaignChannel());
        synchronized (channel) {
            BufferedEvent buffered = new BufferedEvent(++channel.lastEventId, eventName, json);
            channel.replayBuffer.addLast(buffered);
            while (channel.replayBuffer.size() > REPLAY_BUFFER_SIZE) {
                channel.replayBuffer.removeFirst();
            }
            if (channel.connections.isEmpty()) {
                LOG.debugv("SSE event has no subscribers: campaign={0} event={1}", campaignId, eventName);
                return;
            }
            for (SseConnection conn : channel.connections) {
                send(campaignId, channel, conn, toEvent(conn.sse, buffered));
            }
        }
    }

    private OutboundSseEvent toEvent(Sse sse, BufferedEvent buffered) {
        return sse.newEventBuilder()
                .id(Long.toString(buffered.id()))
                .name(buffered.name())
                .reconnectDelay(RECONNECT_DELAY_MS)
                .data(String.class, buffered.json())
                .build();
    }

    private void send(Long campaignId, CampaignChannel channel, SseConnection conn, OutboundSseEvent event) {
        if (conn.sink.isClosed()) {
            removeConnection(campaignId, channel, conn, null);
            return;
        }
        try {
            conn.enqueue(event).whenComplete((ignored, failure) -> {
                if (failure != null) {
                    removeConnection(campaignId, channel, conn, failure);
                }
            });
        } catch (Exception e) {
            removeConnection(campaignId, channel, conn, e);
        }
    }

    @PostConstruct
    void startHeartbeat() {
        heartbeatTimerId = vertx.setPeriodic(20_000, ignored -> sendHeartbeat());
    }

    @PreDestroy
    void stopHeartbeat() {
        vertx.cancelTimer(heartbeatTimerId);
    }

    void sendHeartbeat() {
        String json = "{\"timestamp\":" + System.currentTimeMillis() + "}";
        for (Map.Entry<Long, CampaignChannel> entry : channels.entrySet()) {
            CampaignChannel channel = entry.getValue();
            List<SseConnection> snapshot;
            synchronized (channel) {
                snapshot = new ArrayList<>(channel.connections);
            }
            for (SseConnection conn : snapshot) {
                // Heartbeats carry no id so they never advance the client's Last-Event-ID.
                send(entry.getKey(), channel, conn, conn.sse.newEventBuilder()
                        .name("heartbeat")
                        .data(String.class, json)
                        .build());
            }
        }
    }

    private void removeConnection(Long campaignId, CampaignChannel channel,
                                  SseConnection connection, Throwable failure) {
        if (!channel.connections.remove(connection)) {
            return;
        }
        if (failure == null) {
            LOG.debugv("SSE client disconnected: campaign={0} clients={1}",
                    campaignId, channel.connections.size());
        } else {
            LOG.debugv(failure, "SSE delivery failed: campaign={0} clients={1}",
                    campaignId, channel.connections.size());
        }
        try {
            connection.sink.close();
        } catch (Exception ignored) {
            // The transport is already closed.
        }
    }
}
