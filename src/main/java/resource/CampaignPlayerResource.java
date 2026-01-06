package resource;

import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import model.Campaign;
import model.CampaignPlayer;
import model.Player;

import java.util.List;

@Path("/api/campaign-player")
@Produces(MediaType.APPLICATION_JSON)
public class CampaignPlayerResource {

    // Get all players in a campaign
    @GET
    @Path("{campaignId}")
    public List<CampaignPlayer> getCampaignPlayers(@PathParam("campaignId") Long campaignId) {
        Campaign campaign = Campaign.findById(campaignId);
        if (campaign == null) {
            throw new WebApplicationException("Campaign not found", Response.Status.NOT_FOUND);
        }
        return CampaignPlayer.find("campaignId", campaignId).list();
    }

    // Check if player is in campaign
    @GET
    @Path("{campaignId}/{playerId}/role")
    public Response getPlayerRole(@PathParam("campaignId") Long campaignId,
                                  @PathParam("playerId") Long playerId) {
        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", campaignId, playerId).firstResult();
        if (cp == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Player not in campaign")
                    .build();
        }
        return Response.ok(cp).build();
    }

    // Get all campaigns a player is in (including as DM)
    @GET
    @Path("player/{playerId}")
    public List<CampaignPlayer> getPlayerCampaigns(@PathParam("playerId") Long playerId) {
        Player player = Player.findById(playerId);
        if (player == null) {
            throw new WebApplicationException("Player not found", Response.Status.NOT_FOUND);
        }
        return CampaignPlayer.find("playerId", playerId).list();
    }

    // Join a public campaign
    @POST
    @Path("{campaignId}/join")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response joinCampaign(@PathParam("campaignId") Long campaignId,
                                 String playerIdJson) {
        Campaign campaign = Campaign.findById(campaignId);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign not found")
                    .build();
        }

        if (!campaign.isPublic) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Campaign is not public")
                    .build();
        }

        // Parse playerId from JSON body (simple approach: {"playerId": 123})
        Long playerId = extractPlayerId(playerIdJson);
        if (playerId == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Invalid player ID")
                    .build();
        }

        Player player = Player.findById(playerId);
        if (player == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Player not found")
                    .build();
        }

        // Check if player already in campaign
        CampaignPlayer existing = CampaignPlayer.find("campaignId = ?1 and playerId = ?2",
                                                       campaignId, playerId).firstResult();
        if (existing != null) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Player already in campaign")
                    .build();
        }

        // Check max player count
        if (campaign.maxPlayerCount != null) {
            long currentPlayerCount = CampaignPlayer.find("campaignId", campaignId).count();
            if (currentPlayerCount >= campaign.maxPlayerCount) {
                return Response.status(Response.Status.CONFLICT)
                        .entity("Campaign is full")
                        .build();
            }
        }

        // Create campaign player entry (not DM, regular player)
        CampaignPlayer cp = new CampaignPlayer(campaignId, playerId, "PLAYER");
        cp.persist();

        return Response.status(Response.Status.CREATED).entity(cp).build();
    }

    // Leave a campaign
    @DELETE
    @Path("{campaignId}/leave/{playerId}")
    @Transactional
    public Response leaveCampaign(@PathParam("campaignId") Long campaignId,
                                  @PathParam("playerId") Long playerId) {
        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2",
                                                campaignId, playerId).firstResult();
        if (cp == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Player not in campaign")
                    .build();
        }

        // Check if player is DM
        if ("DM".equals(cp.role)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("DM cannot leave campaign")
                    .build();
        }

        cp.delete();
        return Response.noContent().build();
    }

    private Long extractPlayerId(String json) {
        if (json == null || json.isEmpty()) return null;
        try {
            // Simple extraction of playerId from JSON
            int start = json.indexOf("\"playerId\"");
            if (start == -1) return null;
            int colonIndex = json.indexOf(":", start);
            int commaIndex = json.indexOf(",", colonIndex);
            int braceIndex = json.indexOf("}", colonIndex);
            int endIndex = commaIndex > 0 ? Math.min(commaIndex, braceIndex) : braceIndex;
            if (endIndex == -1) return null;

            String idStr = json.substring(colonIndex + 1, endIndex).trim();
            return Long.parseLong(idStr);
        } catch (Exception e) {
            return null;
        }
    }
}

