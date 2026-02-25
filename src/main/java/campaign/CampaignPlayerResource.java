package campaign;

import character.Character;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import notification.Notification;
import player.Player;
import security.SecurityIdentityService;

import java.util.List;

@Path("/api/campaign-player")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class CampaignPlayerResource {

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

    @GET
    @Path("{campaignId}")
    public Response getCampaignPlayers(@PathParam("campaignId") Long campaignId) {
        Campaign campaign = Campaign.findById(campaignId);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign not found")
                    .build();
        }

        Long requesterId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        CampaignPlayer requesterMembership = findMembership(campaignId, requesterId);
        if (requesterMembership == null && !Boolean.TRUE.equals(campaign.isPublic)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("You are not a member of this campaign")
                    .build();
        }

        List<CampaignPlayer> members = CampaignPlayer.find("campaignId", campaignId).list();
        return Response.ok(members).build();
    }

    @GET
    @Path("{campaignId}/pending-characters")
    public Response getPendingCharacters(@PathParam("campaignId") Long campaignId) {
        Long requesterId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        if (!isDm(campaignId, requesterId)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Only the DM can view pending characters")
                    .build();
        }

        List<CampaignPlayer> pending = CampaignPlayer.find("campaignId = ?1 and characterStatus = 'PENDING'", campaignId).list();
        return Response.ok(pending).build();
    }

    @GET
    @Path("{campaignId}/{playerId}/role")
    public Response getPlayerRole(@PathParam("campaignId") Long campaignId,
                                  @PathParam("playerId") Long playerId) {
        Long requesterId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        if (!requesterId.equals(playerId) && !isDm(campaignId, requesterId)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("You can only view your own role")
                    .build();
        }

        CampaignPlayer cp = findMembership(campaignId, playerId);
        if (cp == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Player not in campaign")
                    .build();
        }
        return Response.ok(cp).build();
    }

    @GET
    @Path("player/{playerId}")
    public Response getPlayerCampaigns(@PathParam("playerId") Long playerId) {
        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, playerId);
        if (authorizationError != null) {
            return authorizationError;
        }

        Player player = Player.findById(playerId);
        if (player == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Player not found")
                    .build();
        }

        List<CampaignPlayer> campaigns = CampaignPlayer.find("playerId", playerId).list();
        return Response.ok(campaigns).build();
    }

    @POST
    @Path("{campaignId}/join")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response joinCampaign(@PathParam("campaignId") Long campaignId,
                                 String ignoredPlayerIdJson) {
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

        Long playerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        Player player = Player.findById(playerId);
        if (player == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Player not found")
                    .build();
        }

        CampaignPlayer existing = findMembership(campaignId, playerId);
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
        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, playerId);
        if (authorizationError != null) {
            return authorizationError;
        }

        if (submitDTO == null || submitDTO.characterId == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("characterId is required")
                    .build();
        }

        CampaignPlayer cp = findMembership(campaignId, playerId);
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
                (player.name != null && !player.name.isBlank() ? player.name : player.username)
                        + " has submitted character '" + character.name + "' for your campaign '" + campaign.name + "'",
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
                                     @QueryParam("dmPlayerId") Long ignoredDmPlayerId) {
        Long dmPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);

        // Verify the requester is the DM
        CampaignPlayer dmCp = findMembership(campaignId, dmPlayerId);
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
                                    @QueryParam("dmPlayerId") Long ignoredDmPlayerId,
                                    CharacterRejectDTO rejectDTO) {
        Long dmPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);

        // Verify the requester is the DM
        CampaignPlayer dmCp = findMembership(campaignId, dmPlayerId);
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
        playerCp.dmNotes = rejectDTO != null ? rejectDTO.notes : null;

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
        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, playerId);
        if (authorizationError != null) {
            return authorizationError;
        }

        CampaignPlayer cp = findMembership(campaignId, playerId);
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
                (player.name != null && !player.name.isBlank() ? player.name : player.username)
                        + " has resubmitted character '" + character.name + "' for your campaign '" + campaign.name + "'",
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
        CampaignPlayer targetMembership = findMembership(campaignId, playerId);
        if (targetMembership == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Player not in campaign")
                    .build();
        }

        Long requesterId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        boolean selfLeave = requesterId.equals(playerId);

        if (selfLeave) {
            if ("DM".equals(targetMembership.role)) {
                return Response.status(Response.Status.FORBIDDEN)
                        .entity("DM cannot leave campaign")
                        .build();
            }

            targetMembership.delete();
            return Response.noContent().build();
        }

        if (!isDm(campaignId, requesterId)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Only the DM can remove other players")
                    .build();
        }

        if ("DM".equals(targetMembership.role)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("The DM cannot be removed")
                    .build();
        }

        targetMembership.delete();
        return Response.noContent().build();
    }

    private CampaignPlayer findMembership(Long campaignId, Long playerId) {
        return CampaignPlayer.find("campaignId = ?1 and playerId = ?2", campaignId, playerId).firstResult();
    }

    private boolean isDm(Long campaignId, Long playerId) {
        CampaignPlayer cp = findMembership(campaignId, playerId);
        return cp != null && "DM".equals(cp.role);
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
