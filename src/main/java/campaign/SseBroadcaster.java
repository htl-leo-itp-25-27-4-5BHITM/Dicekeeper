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

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Manages SSE connections per campaign and broadcasts events.
 */
@ApplicationScoped
public class SseBroadcaster {

    private static final Logger LOG = Logger.getLogger(SseBroadcaster.class);

    @Inject
    ObjectMapper objectMapper;

    @Inject
    Vertx vertx;

    @Inject
    TransactionSynchronizationRegistry transactionRegistry;

    // campaignId → set of active SSE sinks
    private final ConcurrentHashMap<Long, Set<SseConnection>> connections = new ConcurrentHashMap<>();
    private final AtomicLong eventSequence = new AtomicLong();
    private long heartbeatTimerId;

    public static class SseConnection {
        public final SseEventSink sink;
        public final Sse sse;

        public SseConnection(SseEventSink sink, Sse sse) {
            this.sink = sink;
            this.sse = sse;
        }
    }

    public void register(Long campaignId, SseEventSink sink, Sse sse) {
        Set<SseConnection> campaignConnections =
                connections.computeIfAbsent(campaignId, id -> new CopyOnWriteArraySet<>());
        campaignConnections.add(new SseConnection(sink, sse));
        LOG.debugv("SSE client connected: campaign={0} clients={1}",
                campaignId, campaignConnections.size());
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
        Set<SseConnection> sinks = connections.get(campaignId);
        if (sinks == null || sinks.isEmpty()) {
            LOG.debugv("SSE event has no subscribers: campaign={0} event={1}", campaignId, eventName);
            return;
        }

        String json;
        try {
            json = objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            LOG.errorf(e, "Could not serialize SSE event: campaign=%d event=%s", campaignId, eventName);
            return;
        }

        long eventId = eventSequence.incrementAndGet();
        for (SseConnection conn : sinks) {
            if (conn.sink.isClosed()) {
                removeConnection(campaignId, sinks, conn, null);
                continue;
            }
            try {
                OutboundSseEvent event = conn.sse.newEventBuilder()
                        .id(Long.toString(eventId))
                        .name(eventName)
                        .reconnectDelay(2_000)
                        .data(String.class, json)
                        .build();
                conn.sink.send(event).whenComplete((ignored, failure) -> {
                    if (failure != null) {
                        removeConnection(campaignId, sinks, conn, failure);
                    }
                });
            } catch (Exception e) {
                removeConnection(campaignId, sinks, conn, e);
            }
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
        for (Long campaignId : connections.keySet()) {
            broadcast(campaignId, "heartbeat", java.util.Map.of("timestamp", System.currentTimeMillis()));
        }
    }

    private void removeConnection(Long campaignId, Set<SseConnection> sinks,
                                  SseConnection connection, Throwable failure) {
        if (!sinks.remove(connection)) {
            return;
        }
        if (sinks.isEmpty()) {
            connections.remove(campaignId, sinks);
        }
        if (failure == null) {
            LOG.debugv("SSE client disconnected: campaign={0} clients={1}",
                    campaignId, sinks.size());
        } else {
            LOG.debugv(failure, "SSE delivery failed: campaign={0} clients={1}",
                    campaignId, sinks.size());
        }
        try {
            connection.sink.close();
        } catch (Exception ignored) {
            // The transport is already closed.
        }
    }
}
