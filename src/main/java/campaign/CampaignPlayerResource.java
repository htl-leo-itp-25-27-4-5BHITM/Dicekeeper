package campaign;

import character.Character;
import notification.Notification;
import player.Player;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/api/campaign-player")
@Produces(MediaType.APPLICATION_JSON)
public class CampaignPlayerResource {

    @GET
    @Path("{campaignId}")
    public List<CampaignPlayer> getCampaignPlayers(@PathParam("campaignId") Long campaignId) {
        Campaign campaign = Campaign.findById(campaignId);
        if (campaign == null) {
            throw new WebApplicationException("Campaign not found", Response.Status.NOT_FOUND);
        }
        return CampaignPlayer.find("campaignId", campaignId).list();
    }

    @GET
    @Path("{campaignId}/pending-characters")
    public List<CampaignPlayer> getPendingCharacters(@PathParam("campaignId") Long campaignId) {
        return CampaignPlayer.find("campaignId = ?1 and characterStatus = 'PENDING'", campaignId).list();
    }

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

    @GET
    @Path("player/{playerId}")
    public List<CampaignPlayer> getPlayerCampaigns(@PathParam("playerId") Long playerId) {
        Player player = Player.findById(playerId);
        if (player == null) {
            throw new WebApplicationException("Player not found", Response.Status.NOT_FOUND);
        }
        return CampaignPlayer.find("playerId", playerId).list();
    }

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

        CampaignPlayer existing = CampaignPlayer.find("campaignId = ?1 and playerId = ?2",
                                                       campaignId, playerId).firstResult();
        if (existing != null) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Player already in campaign")
                    .build();
        }

        if (campaign.maxPlayerCount != null) {
            long currentPlayerCount = CampaignPlayer.find("campaignId", campaignId).count();
            if (currentPlayerCount >= campaign.maxPlayerCount) {
                return Response.status(Response.Status.CONFLICT)
                        .entity("Campaign is full")
                        .build();
            }
        }

        CampaignPlayer cp = new CampaignPlayer(campaignId, playerId, "PLAYER");
        cp.persist();

        // Return with needsCharacter flag to redirect user to character creation
        return Response.status(Response.Status.CREATED)
                .entity(new JoinCampaignResponse(cp, true))
                .build();
    }

    /**
     * Assign a character to a player in a campaign and submit for DM approval.
     */
    @POST
    @Path("{campaignId}/{playerId}/submit-character")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response submitCharacter(@PathParam("campaignId") Long campaignId,
                                    @PathParam("playerId") Long playerId,
                                    CharacterSubmitDTO submitDTO) {
        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", campaignId, playerId).firstResult();
        if (cp == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Player not in campaign")
                    .build();
        }

        if ("DM".equals(cp.role)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("DM does not need to submit a character")
                    .build();
        }

        Character character = Character.findById(submitDTO.characterId);
        if (character == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Character not found")
                    .build();
        }

        // Update campaign player with character
        cp.characterId = submitDTO.characterId;
        cp.characterStatus = "PENDING";
        cp.dmNotes = null; // Clear any previous rejection notes

        // Notify the DM
        Campaign campaign = Campaign.findById(campaignId);
        Player player = Player.findById(playerId);

        Notification dmNotification = new Notification(
                campaign.playerId, // DM's player ID
                "CHARACTER_SUBMITTED",
                "Character Submitted for Approval",
                player.username + " has submitted character '" + character.name + "' for your campaign '" + campaign.name + "'",
                campaignId,
                cp.id // CampaignPlayer ID for easy lookup
        );
        dmNotification.persist();

        return Response.ok(cp).build();
    }

    /**
     * DM approves a player's character.
     */
    @POST
    @Path("{campaignId}/approve-character/{campaignPlayerId}")
    @Transactional
    public Response approveCharacter(@PathParam("campaignId") Long campaignId,
                                     @PathParam("campaignPlayerId") Long campaignPlayerId,
                                     @QueryParam("dmPlayerId") Long dmPlayerId) {
        // Verify the requester is the DM
        CampaignPlayer dmCp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", campaignId, dmPlayerId).firstResult();
        if (dmCp == null || !"DM".equals(dmCp.role)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Only the DM can approve characters")
                    .build();
        }

        CampaignPlayer playerCp = CampaignPlayer.findById(campaignPlayerId);
        if (playerCp == null || !playerCp.campaignId.equals(campaignId)) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign player not found")
                    .build();
        }

        if (!"PENDING".equals(playerCp.characterStatus)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Character is not pending approval")
                    .build();
        }

        playerCp.characterStatus = "APPROVED";
        playerCp.dmNotes = null;

        // Notify the player
        Campaign campaign = Campaign.findById(campaignId);
        Character character = Character.findById(playerCp.characterId);

        Notification playerNotification = new Notification(
                playerCp.playerId,
                "CHARACTER_APPROVED",
                "Character Approved!",
                "Your character '" + character.name + "' has been approved for campaign '" + campaign.name + "'!",
                campaignId,
                playerCp.characterId
        );
        playerNotification.persist();

        return Response.ok(playerCp).build();
    }

    /**
     * DM rejects a player's character with notes.
     */
    @POST
    @Path("{campaignId}/reject-character/{campaignPlayerId}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response rejectCharacter(@PathParam("campaignId") Long campaignId,
                                    @PathParam("campaignPlayerId") Long campaignPlayerId,
                                    @QueryParam("dmPlayerId") Long dmPlayerId,
                                    CharacterRejectDTO rejectDTO) {
        // Verify the requester is the DM
        CampaignPlayer dmCp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", campaignId, dmPlayerId).firstResult();
        if (dmCp == null || !"DM".equals(dmCp.role)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Only the DM can reject characters")
                    .build();
        }

        CampaignPlayer playerCp = CampaignPlayer.findById(campaignPlayerId);
        if (playerCp == null || !playerCp.campaignId.equals(campaignId)) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign player not found")
                    .build();
        }

        if (!"PENDING".equals(playerCp.characterStatus)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Character is not pending approval")
                    .build();
        }

        playerCp.characterStatus = "REJECTED";
        playerCp.dmNotes = rejectDTO.notes;

        // Notify the player
        Campaign campaign = Campaign.findById(campaignId);
        Character character = Character.findById(playerCp.characterId);

        Notification playerNotification = new Notification(
                playerCp.playerId,
                "CHARACTER_REJECTED",
                "Character Needs Changes",
                "Your character '" + character.name + "' for campaign '" + campaign.name + "' needs some changes. Click to view DM notes.",
                campaignId,
                playerCp.characterId
        );
        playerNotification.persist();

        return Response.ok(playerCp).build();
    }

    /**
     * Player resubmits character after making changes.
     */
    @POST
    @Path("{campaignId}/{playerId}/resubmit-character")
    @Transactional
    public Response resubmitCharacter(@PathParam("campaignId") Long campaignId,
                                      @PathParam("playerId") Long playerId) {
        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", campaignId, playerId).firstResult();
        if (cp == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Player not in campaign")
                    .build();
        }

        if (!"REJECTED".equals(cp.characterStatus)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Character was not rejected")
                    .build();
        }

        cp.characterStatus = "PENDING";

        // Notify the DM
        Campaign campaign = Campaign.findById(campaignId);
        Player player = Player.findById(playerId);
        Character character = Character.findById(cp.characterId);

        Notification dmNotification = new Notification(
                campaign.playerId,
                "CHARACTER_SUBMITTED",
                "Character Resubmitted",
                player.username + " has resubmitted character '" + character.name + "' for your campaign '" + campaign.name + "'",
                campaignId,
                cp.id
        );
        dmNotification.persist();

        return Response.ok(cp).build();
    }

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

    // Response class for join campaign
    public static class JoinCampaignResponse {
        public CampaignPlayer campaignPlayer;
        public boolean needsCharacter;

        public JoinCampaignResponse(CampaignPlayer cp, boolean needsCharacter) {
            this.campaignPlayer = cp;
            this.needsCharacter = needsCharacter;
        }
    }
}
