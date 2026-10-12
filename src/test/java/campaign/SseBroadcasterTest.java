package campaign;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Status;
import jakarta.transaction.TransactionSynchronizationRegistry;
import jakarta.ws.rs.sse.OutboundSseEvent;
import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SseBroadcasterTest {

    private SseBroadcaster broadcaster;
    private final Sse sse = fakeSse();

    @BeforeEach
    void setUp() {
        broadcaster = new SseBroadcaster();
        broadcaster.objectMapper = new ObjectMapper();
        broadcaster.transactionRegistry = (TransactionSynchronizationRegistry) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{TransactionSynchronizationRegistry.class},
                (proxy, method, args) -> "getTransactionStatus".equals(method.getName())
                        ? Status.STATUS_NO_TRANSACTION
                        : null);
    }

    @Test
    void liveClientsReceiveEventsInOrder() {
        RecordingSink sink = new RecordingSink();
        broadcaster.register(1L, sink, sse, null);

        broadcaster.broadcast(1L, "campaign_started", Map.of("id", 1));
        broadcaster.broadcast(1L, "dice", Map.of("result", 17));

        assertEquals(List.of("connected", "campaign_started", "dice"), sink.names());
    }

    @Test
    void reconnectingClientGetsMissedEventsReplayed() {
        RecordingSink first = new RecordingSink();
        broadcaster.register(1L, first, sse, null);
        broadcaster.broadcast(1L, "turn", Map.of("playerId", 2));
        String lastSeenId = first.events.get(1).get("id");
        first.closed = true;

        // Happens while the client is disconnected.
        broadcaster.broadcast(1L, "dice", Map.of("result", 4));
        broadcaster.broadcast(1L, "dice", Map.of("result", 12));

        RecordingSink second = new RecordingSink();
        broadcaster.register(1L, second, sse, Long.parseLong(lastSeenId));

        assertEquals(List.of("connected", "dice", "dice"), second.names());
        assertTrue(second.events.get(2).get("data").contains("12"));
    }

    @Test
    void eventsAreBufferedEvenWithoutSubscribers() {
        broadcaster.broadcast(5L, "campaign_started", Map.of("id", 5));

        RecordingSink sink = new RecordingSink();
        broadcaster.register(5L, sink, sse, 0L);

        assertEquals(List.of("connected", "campaign_started"), sink.names());
    }

    @Test
    void eventIdsAreContiguousPerCampaign() {
        RecordingSink sink = new RecordingSink();
        broadcaster.register(1L, sink, sse, null);

        broadcaster.broadcast(1L, "dice", Map.of("result", 1));
        broadcaster.broadcast(2L, "dice", Map.of("result", 2));
        broadcaster.broadcast(1L, "dice", Map.of("result", 3));

        long first = Long.parseLong(sink.events.get(1).get("id"));
        long second = Long.parseLong(sink.events.get(2).get("id"));
        assertEquals(first + 1, second);
    }

    @Test
    void replayIsScopedToTheCampaign() {
        broadcaster.broadcast(1L, "dice", Map.of("result", 1));

        RecordingSink sink = new RecordingSink();
        broadcaster.register(2L, sink, sse, 0L);

        assertEquals(List.of("connected"), sink.names());
    }

    static final class RecordingSink implements SseEventSink {
        final List<Map<String, String>> events = new ArrayList<>();
        boolean closed;

        @Override
        public boolean isClosed() {
            return closed;
        }

        @Override
        public CompletionStage<?> send(OutboundSseEvent event) {
            Map<String, String> recorded = new HashMap<>();
            recorded.put("name", event.getName());
            recorded.put("id", event.getId());
            recorded.put("data", String.valueOf(event.getData()));
            events.add(recorded);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public void close() {
            closed = true;
        }

        List<String> names() {
            return events.stream().map(e -> e.get("name")).toList();
        }
    }

    /** Minimal Sse whose builder records the fields the broadcaster sets. */
    private static Sse fakeSse() {
        ClassLoader loader = SseBroadcasterTest.class.getClassLoader();
        return (Sse) Proxy.newProxyInstance(loader, new Class<?>[]{Sse.class}, (sseProxy, sseMethod, sseArgs) -> {
            if (!"newEventBuilder".equals(sseMethod.getName())) {
                throw new UnsupportedOperationException(sseMethod.getName());
            }
            Map<String, Object> fields = new HashMap<>();
            return Proxy.newProxyInstance(loader, new Class<?>[]{OutboundSseEvent.Builder.class},
                    (builder, method, args) -> {
                        switch (method.getName()) {
                            case "id" -> fields.put("id", args[0]);
                            case "name" -> fields.put("name", args[0]);
                            case "data" -> fields.put("data", args[args.length - 1]);
                            case "build" -> {
                                return Proxy.newProxyInstance(loader, new Class<?>[]{OutboundSseEvent.class},
                                        (event, getter, ignored) -> switch (getter.getName()) {
                                            case "getId" -> fields.get("id");
                                            case "getName" -> fields.get("name");
                                            case "getData" -> fields.get("data");
                                            default -> null;
                                        });
                            }
                            default -> {
                                // reconnectDelay, comment, mediaType: not needed for these assertions
                            }
                        }
                        return builder;
                    });
        });
    }
}
