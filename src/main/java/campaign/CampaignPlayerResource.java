package campaign;

import character.Character;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import notification.Notification;
import player.Player;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
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

    @Inject
    SseBroadcaster broadcaster;

    @GET
    @Path("{campaignId}")
    public Response getCampaignPlayers(@PathParam("campaignId") Long campaignId) {
        Campaign campaign = Campaign.findById(campaignId);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Kampagne nicht gefunden")
                    .build();
        }

        Long requesterId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        CampaignPlayer requesterMembership = findMembership(campaignId, requesterId);
        if (requesterMembership == null && !Boolean.TRUE.equals(campaign.isPublic)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Du bist kein Mitglied dieser Kampagne")
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
                    .entity("Nur der DM kann eingereichte Charaktere einsehen")
                    .build();
        }

        List<CampaignPlayer> pending = CampaignPlayer.find(
                "campaignId = ?1 and characterStatus = 'PENDING'",
                campaignId
        ).list();
        return Response.ok(pending).build();
    }

    @GET
    @Path("{campaignId}/{playerId}/role")
    public Response getPlayerRole(@PathParam("campaignId") Long campaignId,
                                  @PathParam("playerId") Long playerId) {
        Long requesterId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        if (!requesterId.equals(playerId) && !isDm(campaignId, requesterId)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Du kannst nur deine eigene Rolle einsehen")
                    .build();
        }

        CampaignPlayer cp = findMembership(campaignId, playerId);
        if (cp == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Spieler ist nicht in dieser Kampagne")
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
                    .entity("Spieler nicht gefunden")
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
                    .entity("Kampagne nicht gefunden")
                    .build();
        }

        if (!campaign.isPublic) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Die Kampagne ist nicht öffentlich")
                    .build();
        }

        Long playerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        Player player = Player.findById(playerId);
        if (player == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Spieler nicht gefunden")
                    .build();
        }

        CampaignPlayer existing = findMembership(campaignId, playerId);
        if (existing != null) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Du bist bereits in dieser Kampagne")
                    .build();
        }

        if (campaign.maxPlayerCount != null) {
            long currentPlayerCount = CampaignPlayer.find(
                    "campaignId = ?1 and role = 'PLAYER'",
                    campaignId
            ).count();
            if (currentPlayerCount >= campaign.maxPlayerCount) {
                return Response.status(Response.Status.CONFLICT)
                        .entity("Die Kampagne ist voll")
                        .build();
            }
        }

        CampaignPlayer cp = new CampaignPlayer(campaignId, playerId, "PLAYER");
        cp.persist();
        broadcastRosterUpdate(campaignId, "joined", playerId);

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
                    .entity("Bitte wähle einen Charakter")
                    .build();
        }

        CampaignPlayer cp = findMembership(campaignId, playerId);
        if (cp == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Spieler ist nicht in dieser Kampagne")
                    .build();
        }

        if ("DM".equals(cp.role)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Der DM braucht keinen Charakter")
                    .build();
        }

        Character character = Character.findById(submitDTO.characterId);
        if (character == null || !playerId.equals(character.ownerPlayerId)) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Charakter nicht gefunden")
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
                "Charakter zur Freigabe eingereicht",
                resolvePlayerLoginName(player, playerId)
                        + " hat den Charakter '" + character.name + "' für deine Kampagne '" + campaign.name + "' eingereicht",
                campaignId,
                cp.id // CampaignPlayer ID for easy lookup
        );
        dmNotification.persist();
        broadcastRosterUpdate(campaignId, "character_submitted", playerId);

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
        CampaignPlayer dmCp = findMembership(campaignId, dmPlayerId);
        if (dmCp == null || !"DM".equals(dmCp.role)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Nur der DM kann Charaktere freigeben")
                    .build();
        }

        CampaignPlayer playerCp = CampaignPlayer.findById(campaignPlayerId);
        if (playerCp == null || !playerCp.campaignId.equals(campaignId)) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Spieler nicht in dieser Kampagne gefunden")
                    .build();
        }

        if (!"PENDING".equals(playerCp.characterStatus)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Der Charakter wartet nicht auf eine Freigabe")
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
                "Charakter freigegeben!",
                "Dein Charakter '" + character.name + "' wurde für die Kampagne '" + campaign.name + "' freigegeben!",
                campaignId,
                playerCp.characterId
        );
        playerNotification.persist();
        broadcastRosterUpdate(campaignId, "character_approved", playerCp.playerId);

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
        CampaignPlayer dmCp = findMembership(campaignId, dmPlayerId);
        if (dmCp == null || !"DM".equals(dmCp.role)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Nur der DM kann Charaktere ablehnen")
                    .build();
        }

        CampaignPlayer playerCp = CampaignPlayer.findById(campaignPlayerId);
        if (playerCp == null || !playerCp.campaignId.equals(campaignId)) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Spieler nicht in dieser Kampagne gefunden")
                    .build();
        }

        if (!"PENDING".equals(playerCp.characterStatus)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Der Charakter wartet nicht auf eine Freigabe")
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
                "Charakter muss überarbeitet werden",
                "Dein Charakter '" + character.name + "' für die Kampagne '" + campaign.name + "' muss überarbeitet werden. Klicke hier, um die Hinweise des DM zu sehen.",
                campaignId,
                playerCp.characterId
        );
        playerNotification.persist();
        broadcastRosterUpdate(campaignId, "character_rejected", playerCp.playerId);

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

        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", campaignId, playerId).firstResult();
        if (cp == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Spieler ist nicht in dieser Kampagne")
                    .build();
        }

        if (!"REJECTED".equals(cp.characterStatus)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Der Charakter wurde nicht abgelehnt")
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
                "Charakter erneut eingereicht",
                resolvePlayerLoginName(player, playerId)
                        + " hat den Charakter '" + character.name + "' für deine Kampagne '" + campaign.name + "' erneut eingereicht",
                campaignId,
                cp.id
        );
        dmNotification.persist();
        broadcastRosterUpdate(campaignId, "character_resubmitted", playerId);

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
                    .entity("Spieler ist nicht in dieser Kampagne")
                    .build();
        }

        Long requesterId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        boolean selfLeave = requesterId.equals(playerId);

        if (selfLeave) {
            if ("DM".equals(targetMembership.role)) {
                return Response.status(Response.Status.FORBIDDEN)
                        .entity("Der DM kann die Kampagne nicht verlassen")
                        .build();
            }

            targetMembership.delete();
            broadcastRosterUpdate(campaignId, "left", playerId);
            return Response.noContent().build();
        }

        if (!isDm(campaignId, requesterId)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Nur der DM kann andere Spieler entfernen")
                    .build();
        }

        if ("DM".equals(targetMembership.role)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Der DM kann nicht entfernt werden")
                    .build();
        }

        targetMembership.delete();
        broadcastRosterUpdate(campaignId, "removed", playerId);
        return Response.noContent().build();
    }

    private void broadcastRosterUpdate(Long campaignId, String action, Long playerId) {
        broadcaster.broadcast(campaignId, "roster_updated", java.util.Map.of(
                "action", action,
                "playerId", playerId
        ));
        broadcaster.broadcastLobby("roster_" + action, campaignId);
    }

    private CampaignPlayer findMembership(Long campaignId, Long playerId) {
        return CampaignPlayer.find("campaignId = ?1 and playerId = ?2", campaignId, playerId).firstResult();
    }

    private boolean isDm(Long campaignId, Long playerId) {
        CampaignPlayer cp = findMembership(campaignId, playerId);
        return cp != null && "DM".equals(cp.role);
    }

    private String resolvePlayerLoginName(Player player, Long playerId) {
        if (player != null && player.username != null && !player.username.isBlank()) {
            return player.username;
        }
        return "Player " + playerId;
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
