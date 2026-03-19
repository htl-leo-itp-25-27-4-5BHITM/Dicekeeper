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
                          @Context SseEventSink sink,
                          @Context Sse sse) {
        if (Campaign.findById(campaignId) == null) {
            throw new NotFoundException("Campaign not found");
        }

        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        CampaignPlayer membership = CampaignPlayer.find(
                "campaignId = ?1 and playerId = ?2",
                campaignId,
                currentPlayerId
        ).firstResult();
        if (membership == null) {
            throw new ForbiddenException("You are not a member of this campaign");
        }

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
