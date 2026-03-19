package campaign;

import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import security.SecurityIdentityService;

import java.util.List;

@Path("/api/campaign/{campaignId}/decisions")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class GroupDecisionResource {

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

    @GET
    public Response getDecisions(@PathParam("campaignId") Long campaignId,
                                 @QueryParam("playerId") Long ignoredPlayerId) {
        Campaign campaign = Campaign.findById(campaignId);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign not found")
                    .build();
        }

        Long playerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", campaignId, playerId).firstResult();
        if (cp == null || !"DM".equals(cp.role)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Only the DM can view decisions")
                    .build();
        }

        List<GroupDecision> decisions = GroupDecision.find("campaignId = ?1 order by orderIndex asc, createdAt desc", campaignId).list();
        return Response.ok(decisions).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response createDecision(@PathParam("campaignId") Long campaignId,
                                   @QueryParam("playerId") Long ignoredPlayerId,
                                   GroupDecisionDTO dto) {
        Campaign campaign = Campaign.findById(campaignId);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign not found")
                    .build();
        }

        Long playerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", campaignId, playerId).firstResult();
        if (cp == null || !"DM".equals(cp.role)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Only the DM can create decisions")
                    .build();
        }

        if (dto.title == null || dto.title.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Decision title is required")
                    .build();
        }

        long playerCount = CampaignPlayer.find("campaignId = ?1 and role = 'PLAYER'", campaignId).count();
        GroupDecision decision = new GroupDecision(campaignId, dto.title.trim(), dto.description, (int) playerCount);
        if (dto.orderIndex != null) {
            decision.orderIndex = dto.orderIndex;
        }
        decision.persist();

        return Response.status(Response.Status.CREATED).entity(decision).build();
    }

    @PATCH
    @Path("{decisionId}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response updateDecision(@PathParam("campaignId") Long campaignId,
                                   @PathParam("decisionId") Long decisionId,
                                   @QueryParam("playerId") Long ignoredPlayerId,
                                   GroupDecisionDTO dto) {
        Campaign campaign = Campaign.findById(campaignId);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign not found")
                    .build();
        }

        Long playerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", campaignId, playerId).firstResult();
        if (cp == null || !"DM".equals(cp.role)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Only the DM can update decisions")
                    .build();
        }

        GroupDecision decision = GroupDecision.findById(decisionId);
        if (decision == null || !decision.campaignId.equals(campaignId)) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Decision not found")
                    .build();
        }

        if (dto.title != null) {
            decision.title = dto.title.trim();
        }
        if (dto.description != null) {
            decision.description = dto.description;
        }
        if (dto.decisionMade != null) {
            decision.decisionMade = dto.decisionMade;
        }
        if (dto.status != null) {
            decision.status = dto.status;
            if ("RESOLVED".equals(dto.status) && decision.resolvedAt == null) {
                decision.resolvedAt = System.currentTimeMillis();
            }
        }
        if (dto.orderIndex != null) {
            decision.orderIndex = dto.orderIndex;
        }

        return Response.ok(decision).build();
    }

    @DELETE
    @Path("{decisionId}")
    @Transactional
    public Response deleteDecision(@PathParam("campaignId") Long campaignId,
                                   @PathParam("decisionId") Long decisionId,
                                   @QueryParam("playerId") Long ignoredPlayerId) {
        Campaign campaign = Campaign.findById(campaignId);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign not found")
                    .build();
        }

        Long playerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", campaignId, playerId).firstResult();
        if (cp == null || !"DM".equals(cp.role)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Only the DM can delete decisions")
                    .build();
        }

        GroupDecision decision = GroupDecision.findById(decisionId);
        if (decision == null || !decision.campaignId.equals(campaignId)) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Decision not found")
                    .build();
        }

        decision.delete();
        return Response.noContent().build();
    }
}
