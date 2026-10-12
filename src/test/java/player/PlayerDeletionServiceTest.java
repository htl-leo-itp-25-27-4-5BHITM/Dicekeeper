package player;

import ability.Ability;
import account.deletion.AccountDeletionMarker;
import account.deletion.AccountDeletionState;
import campaign.Campaign;
import campaign.CampaignPlayer;
import character.ability.CharacterAbility;
import character.skill.CharacterSkill;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.UserTransaction;
import notification.Notification;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class PlayerDeletionServiceTest {

    @Inject
    PlayerDeletionService deletionService;

    @Inject
    UserTransaction userTransaction;

    private final Path uploadRoot = Path.of("target/test-uploads");

    @BeforeEach
    void clean() throws Exception {
        QuarkusTransaction.requiringNew().run(() -> {
            Notification.deleteAll();
            CampaignPlayer.deleteAll();
            CharacterAbility.deleteAll();
            CharacterSkill.deleteAll();
            character.Character.deleteAll();
            Campaign.deleteAll();
            Player.deleteAll();
            AccountDeletionMarker.deleteAll();
            Ability.deleteAll();
        });
        Files.createDirectories(uploadRoot);
    }

    @Test
    void deletesCompleteAffectedSetAndRetainsUnrelatedReferences() throws Exception {
        Fixture fixture = createFixture();
        for (String relative : List.of("profiles/delete.png", "maps/one.png", "maps/two.png")) {
            Path file = uploadRoot.resolve(relative);
            Files.createDirectories(file.getParent());
            Files.writeString(file, "data");
        }

        AccountDeletionMarker marker = deletionService.deleteLocalPlayerAccount("a".repeat(64), fixture.deletedPlayerId());

        assertEquals(AccountDeletionState.LOCAL_DELETED, marker.state);
        assertEquals(List.of("profiles/delete.png", "maps/one.png", "maps/two.png"), marker.cleanupPaths());
        assertNull(Player.findById(fixture.deletedPlayerId()));
        assertNull(Campaign.findById(fixture.ownedCampaignId()));
        assertNotNull(Campaign.findById(fixture.joinedCampaignId()));
        assertNotNull(Campaign.findById(fixture.unrelatedCampaignId()));
        assertEquals(0, CampaignPlayer.count("playerId", fixture.deletedPlayerId()));
        assertNull(character.Character.findById(fixture.orphanCharacterId()));
        assertEquals(0, CharacterAbility.count("character.id", fixture.orphanCharacterId()));
        assertEquals(0, CharacterSkill.count("characterId", fixture.orphanCharacterId().intValue()));
        assertNotNull(character.Character.findById(fixture.sharedCharacterId()));
        assertEquals(1, CampaignPlayer.count("characterId", fixture.sharedCharacterId()));
        assertEquals(0, Notification.count("playerId", fixture.deletedPlayerId()));
        assertTrue(Files.exists(uploadRoot.resolve("profiles/delete.png")), "files are not deleted inside the DB transaction");
    }

    @Test
    void handlesAnEmptyAccountAndReplayAfterCommit() {
        AtomicReference<Long> playerId = new AtomicReference<>();
        QuarkusTransaction.requiringNew().run(() -> {
            Player player = player("empty@example.test");
            player.persist();
            playerId.set(player.id);
        });

        AccountDeletionMarker first = deletionService.deleteLocalPlayerAccount("b".repeat(64), playerId.get());
        AccountDeletionMarker replay = deletionService.deleteLocalPlayerAccount("b".repeat(64), playerId.get());

        assertEquals(first.id, replay.id);
        assertEquals(AccountDeletionState.LOCAL_DELETED, replay.state);
        assertEquals(0, Player.count("id", playerId.get()));
    }

    @Test
    void rollbackRestoresMarkerAndRowsWithoutTouchingFiles() throws Exception {
        Path file = uploadRoot.resolve("profiles/rollback.png");
        Files.createDirectories(file.getParent());
        Files.writeString(file, "data");
        AtomicReference<Long> playerId = new AtomicReference<>();
        QuarkusTransaction.requiringNew().run(() -> {
            Player player = player("rollback@example.test");
            player.profilePicture = "/uploads/profiles/rollback.png";
            player.persist();
            playerId.set(player.id);
        });

        userTransaction.begin();
        try {
            deletionService.deleteLocalPlayerAccount("c".repeat(64), playerId.get());
            throw new IllegalStateException("simulated database failure");
        } catch (IllegalStateException expected) {
            userTransaction.rollback();
        }

        assertNotNull(Player.findById(playerId.get()));
        assertEquals(0, AccountDeletionMarker.count("subjectDigest", "c".repeat(64)));
        assertTrue(Files.exists(file));
    }

    private Fixture createFixture() {
        AtomicReference<Fixture> reference = new AtomicReference<>();
        QuarkusTransaction.requiringNew().run(() -> {
            Player deleting = player("delete@example.test");
            deleting.profilePicture = "/uploads/profiles/delete.png";
            deleting.persist();
            Player other = player("other@example.test");
            other.persist();

            Campaign owned = campaign("Owned", deleting.id);
            owned.mapImagePaths = "/uploads/maps/one.png\n/uploads/maps/two.png\n/uploads/maps/one.png";
            owned.persist();
            Campaign joined = campaign("Joined", other.id);
            joined.persist();
            Campaign unrelated = campaign("Unrelated", other.id);
            unrelated.persist();

            character.Character orphan = character("Orphan");
            orphan.persist();
            character.Character shared = character("Shared");
            shared.persist();

            membership(owned.id, deleting.id, orphan.id).persist();
            membership(owned.id, other.id, orphan.id).persist();
            membership(joined.id, deleting.id, shared.id).persist();
            membership(unrelated.id, other.id, shared.id).persist();

            Ability ability = new Ability();
            ability.name = "Strength";
            ability.persist();
            CharacterAbility characterAbility = new CharacterAbility();
            characterAbility.character = orphan;
            characterAbility.ability = ability;
            characterAbility.score = 12;
            characterAbility.persist();
            CharacterSkill characterSkill = new CharacterSkill();
            characterSkill.characterId = orphan.id.intValue();
            characterSkill.skillId = 1;
            characterSkill.persist();

            Notification notification = new Notification(deleting.id, "TEST", "title", "message", owned.id);
            notification.persist();

            reference.set(new Fixture(deleting.id, owned.id, joined.id, unrelated.id, orphan.id, shared.id));
        });
        return reference.get();
    }

    private Player player(String email) {
        Player player = new Player();
        player.email = email;
        player.username = email.substring(0, email.indexOf('@'));
        player.name = player.username;
        return player;
    }

    private Campaign campaign(String name, Long ownerId) {
        Campaign campaign = new Campaign();
        campaign.name = name;
        campaign.playerId = ownerId;
        campaign.isPublic = false;
        campaign.started = false;
        return campaign;
    }

    private character.Character character(String name) {
        character.Character character = new character.Character();
        character.name = name;
        character.classId = 1;
        character.backgroundId = 1;
        return character;
    }

    private CampaignPlayer membership(Long campaignId, Long playerId, Long characterId) {
        CampaignPlayer membership = new CampaignPlayer(campaignId, playerId, "PLAYER");
        membership.characterId = characterId;
        return membership;
    }

    private record Fixture(Long deletedPlayerId,
                           Long ownedCampaignId,
                           Long joinedCampaignId,
                           Long unrelatedCampaignId,
                           Long orphanCharacterId,
                           Long sharedCharacterId) {
    }
}
