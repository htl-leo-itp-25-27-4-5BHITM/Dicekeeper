package campaign;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;

/**
 * SSE endpoint: clients connect here to receive real-time game updates.
 */
@Path("/api/campaign/{campaignId}/sse")
public class GameSseResource {

    @Inject
    SseBroadcaster broadcaster;

    @GET
    @Produces(MediaType.SERVER_SENT_EVENTS)
    public void subscribe(@PathParam("campaignId") Long campaignId,
                          @Context SseEventSink sink,
                          @Context Sse sse) {
        broadcaster.register(campaignId, sink, sse);

        // Send a welcome event so the client knows connection is established
        try {
            sink.send(sse.newEventBuilder()
                    .name("connected")
                    .data(String.class, "{\"status\":\"connected\",\"campaignId\":" + campaignId + "}")
                    .build());
        } catch (Exception e) {
            // sink already closed
        }
    }
}

