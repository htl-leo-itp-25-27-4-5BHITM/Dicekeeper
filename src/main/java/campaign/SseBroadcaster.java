package campaign;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.sse.OutboundSseEvent;
import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Manages SSE connections per campaign and broadcasts events.
 */
@ApplicationScoped
public class SseBroadcaster {

    @Inject
    ObjectMapper objectMapper;

    // campaignId → set of active SSE sinks
    private final ConcurrentHashMap<Long, Set<SseConnection>> connections = new ConcurrentHashMap<>();

    public static class SseConnection {
        public final SseEventSink sink;
        public final Sse sse;

        public SseConnection(SseEventSink sink, Sse sse) {
            this.sink = sink;
            this.sse = sse;
        }
    }

    public void register(Long campaignId, SseEventSink sink, Sse sse) {
        connections.computeIfAbsent(campaignId, id -> new CopyOnWriteArraySet<>())
                   .add(new SseConnection(sink, sse));
    }

    public void broadcast(Long campaignId, String eventName, Object data) {
        Set<SseConnection> sinks = connections.get(campaignId);
        if (sinks == null || sinks.isEmpty()) return;

        String json;
        try {
            json = objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            json = "{}";
        }

        for (SseConnection conn : sinks) {
            if (conn.sink.isClosed()) {
                sinks.remove(conn);
                continue;
            }
            try {
                OutboundSseEvent event = conn.sse.newEventBuilder()
                        .name(eventName)
                        .data(String.class, json)
                        .build();
                conn.sink.send(event);
            } catch (Exception e) {
                sinks.remove(conn);
            }
        }
    }
}

