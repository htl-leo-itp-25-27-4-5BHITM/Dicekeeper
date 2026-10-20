package campaign;

import character.Character;
import character.ability.CharacterAbility;
import character.skill.CharacterSkill;
import io.quarkus.narayana.jta.QuarkusTransaction;
import notification.Notification;
import player.Player;

/** Shared fixtures for the integration tests of the feedback fixes. */
final class FeedbackTestData {

    private FeedbackTestData() {
    }

    static void clean() {
        QuarkusTransaction.requiringNew().run(() -> {
            GroupDecisionVote.deleteAll();
            GroupDecision.deleteAll();
            GameStateRecord.deleteAll();
            Notification.deleteAll();
            CampaignPlayer.deleteAll();
            Campaign.deleteAll();
            CharacterAbility.deleteAll();
            CharacterSkill.deleteAll();
            Character.deleteAll();
            Player.deleteAll();
        });
    }

    /** Creates the player that {@code @TestSecurity(user = name)} resolves to. */
    static Long player(String testSecurityUser) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Player player = new Player();
            player.email = "kc_" + testSecurityUser + "@noemail.local";
            player.username = testSecurityUser;
            player.persist();
            return player.id;
        });
    }

    static Long campaign(Long dmId, boolean isPublic, boolean started, String story) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Campaign campaign = new Campaign();
            campaign.name = "Campaign of " + dmId;
            campaign.story = story;
            campaign.playerId = dmId;
            campaign.isPublic = isPublic;
            campaign.started = started;
            campaign.persist();
            new CampaignPlayer(campaign.id, dmId, "DM").persist();
            return campaign.id;
        });
    }

    static Long join(Long campaignId, Long playerId, Long characterId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            CampaignPlayer cp = new CampaignPlayer(campaignId, playerId, "PLAYER");
            cp.characterId = characterId;
            cp.characterStatus = characterId != null ? "APPROVED" : "NONE";
            cp.persist();
            return cp.id;
        });
    }

    static Long character(Long ownerId, String name) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Character character = new Character();
            character.name = name;
            character.level = 1;
            character.ownerPlayerId = ownerId;
            character.persist();
            return character.id;
        });
    }
}
