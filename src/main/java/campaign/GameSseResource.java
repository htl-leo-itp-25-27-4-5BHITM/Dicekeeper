package campaign;

import jakarta.inject.Inject;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;
import security.SecurityIdentityService;

/**
 * SSE endpoint: clients connect here to receive real-time game updates.
 */
@Path("/api/campaign/{campaignId}/sse")
@Authenticated
public class GameSseResource {

    @Inject
    SseBroadcaster broadcaster;

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

    @GET
    @Produces(MediaType.SERVER_SENT_EVENTS)
    public void subscribe(@PathParam("campaignId") Long campaignId,
                          @HeaderParam("Last-Event-ID") String lastEventIdHeader,
                          @QueryParam("lastEventId") String lastEventIdQuery,
                          @Context SseEventSink sink,
                          @Context Sse sse) {
        if (Campaign.findById(campaignId) == null) {
            throw new NotFoundException("Kampagne nicht gefunden");
        }

        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        CampaignPlayer membership = CampaignPlayer.find(
                "campaignId = ?1 and playerId = ?2",
                campaignId,
                currentPlayerId
        ).firstResult();
        if (membership == null) {
            throw new ForbiddenException("Du bist kein Mitglied dieser Kampagne");
        }

        // Browsers send Last-Event-ID on automatic reconnects; the client passes it as a
        // query parameter when it has to recreate the EventSource itself.
        Long lastEventId = parseEventId(lastEventIdHeader);
        if (lastEventId == null) {
            lastEventId = parseEventId(lastEventIdQuery);
        }
        broadcaster.register(campaignId, sink, sse, lastEventId);
    }

    private static Long parseEventId(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
