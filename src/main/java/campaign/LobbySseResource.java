package campaign;

import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;

/**
 * SSE endpoint for the campaign list ("Startseite"). Clients receive a {@code lobby_changed}
 * event whenever a campaign is created, changed, started, ended or deleted, or its roster
 * changes, and then re-fetch their campaign list. Events carry only ids, never campaign data.
 */
@Path("/api/lobby/sse")
@Authenticated
public class LobbySseResource {

    @Inject
    SseBroadcaster broadcaster;

    @GET
    @Produces(MediaType.SERVER_SENT_EVENTS)
    public void subscribe(@HeaderParam("Last-Event-ID") String lastEventIdHeader,
                          @Context SseEventSink sink,
                          @Context Sse sse) {
        Long lastEventId = null;
        if (lastEventIdHeader != null && !lastEventIdHeader.isBlank()) {
            try {
                lastEventId = Long.parseLong(lastEventIdHeader.trim());
            } catch (NumberFormatException ignored) {
                // A malformed id only means no replay.
            }
        }
        broadcaster.register(SseBroadcaster.LOBBY_CHANNEL, sink, sse, lastEventId);
    }
}
