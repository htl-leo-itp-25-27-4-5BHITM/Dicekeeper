package character;

import campaign.CampaignPlayer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.core.Response;

import java.util.List;

/**
 * Ownership rules for characters.
 *
 * <p>Only the owner may change, delete or submit a character. The DM of a campaign the character
 * was submitted to may read the full sheet; the other members only get a short public summary.</p>
 */
@ApplicationScoped
public class CharacterAccess {

    public boolean isOwner(Character character, Long playerId) {
        return character != null && playerId != null && playerId.equals(character.ownerPlayerId);
    }

    /** Full sheet: the owner and the DM of a campaign the character was submitted to. */
    public boolean canReadFull(Character character, Long playerId) {
        if (isOwner(character, playerId)) return true;
        List<Long> campaignIds = submittedCampaignIds(character);
        return !campaignIds.isEmpty() && playerId != null
                && CampaignPlayer.count("playerId = ?1 and role = 'DM' and campaignId in ?2", playerId, campaignIds) > 0;
    }

    /** Public summary (name, level, race, class): also the fellow members of such a campaign. */
    public boolean canReadSummary(Character character, Long playerId) {
        if (canReadFull(character, playerId)) return true;
        List<Long> campaignIds = submittedCampaignIds(character);
        return !campaignIds.isEmpty() && playerId != null
                && CampaignPlayer.count("playerId = ?1 and campaignId in ?2", playerId, campaignIds) > 0;
    }

    private List<Long> submittedCampaignIds(Character character) {
        if (character == null) return List.of();
        return CampaignPlayer.<CampaignPlayer>find("characterId", character.id).stream()
                .map(cp -> cp.campaignId)
                .distinct()
                .toList();
    }

    /**
     * A character that waits for or has the DM's approval must not change, otherwise the review
     * could be bypassed. It can be edited before submitting and after a rejection.
     */
    public boolean isLockedForEditing(Character character) {
        return CampaignPlayer.count(
                "characterId = ?1 and characterStatus in ('PENDING', 'APPROVED')", character.id) > 0;
    }

    public Response locked() {
        return Response.status(Response.Status.CONFLICT)
                .entity("Der Charakter ist eingereicht oder freigegeben und kann nicht geändert werden").build();
    }

    public Response notFound() {
        // 404 instead of 403 so foreign character ids are not disclosed.
        return Response.status(Response.Status.NOT_FOUND).entity("Charakter nicht gefunden").build();
    }
}
