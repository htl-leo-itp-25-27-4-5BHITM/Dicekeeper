package campaign;

import ability.Ability;
import background.Background;
import character.Character;
import character.CharacterOwnerStartupRepair;
import character.ability.CharacterAbility;
import characterclass.CharacterClass;
import characterclass.GermanContentStartupRepair;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import player.Player;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Regression tests for the remaining feedback items: profile picture (2), ending a game (8),
 * character templates of legacy characters, vote state after reload, German content, hit dice,
 * persisted undo history and decoded legacy decision texts.
 */
@QuarkusTest
class FeedbackRoundThreeTest {

    @ConfigProperty(name = "dicekeeper.upload-dir")
    String uploadDir;

    @Inject
    GameState gameState;

    @Inject
    ObjectMapper objectMapper;

    @Inject
    CharacterOwnerStartupRepair characterOwnerStartupRepair;

    @Inject
    GermanContentStartupRepair germanContentStartupRepair;

    @Inject
    DecisionTextStartupRepair decisionTextStartupRepair;

    @BeforeEach
    void clean() {
        FeedbackTestData.clean();
        QuarkusTransaction.requiringNew().run(() -> {
            CharacterClass.deleteAll();
            Background.deleteAll();
        });
    }

    // ===== Fehler 8: the DM can end a running game =====

    @Test
    @TestSecurity(user = "alice")
    void dmEndsTheGameAndSessionStateIsReset() {
        Long alice = FeedbackTestData.player("alice");
        Long bob = FeedbackTestData.player("bob");
        Long character = FeedbackTestData.character(bob, "Tank");
        Long campaign = FeedbackTestData.campaign(alice, true, true, null);
        FeedbackTestData.join(campaign, bob, character);

        GameState.CampaignGameState state = gameState.getOrCreate(campaign);
        state.initializeHp(bob, 7, 12);
        state.setTurn(bob);
        state.mapMarkers.put("m1", new GameState.MapMarker("m1", "structure", "Burg", 0.5, 0.5, null, null, "🏰"));
        gameState.save(campaign);
        given().contentType(ContentType.JSON).body(Map.of("title", "Links?", "text", "Oder rechts?"))
                .when().post("/api/campaign/" + campaign + "/game/decision").then().statusCode(200);

        given().when().post("/api/campaign/" + campaign + "/end")
                .then().statusCode(200).body("started", equalTo(false));

        Campaign stored = QuarkusTransaction.requiringNew().call(() -> Campaign.findById(campaign));
        assertFalse(stored.started);
        assertTrue(Boolean.TRUE.equals(stored.isPublic), "ending must not change the visibility");
        GameState.CampaignGameState after = gameState.getOrCreate(campaign);
        assertTrue(after.playerHp.isEmpty());
        assertNull(after.currentTurnPlayerId);
        assertEquals(1, after.mapMarkers.size(), "prepared map markers stay");
        given().when().get("/api/campaign/" + campaign + "/game/decisions")
                .then().statusCode(200).body("[0].status", equalTo("RESOLVED"));
    }

    @Test
    @TestSecurity(user = "bob")
    void playersCannotEndTheGame() {
        Long alice = FeedbackTestData.player("alice");
        Long bob = FeedbackTestData.player("bob");
        Long campaign = FeedbackTestData.campaign(alice, true, true, null);
        FeedbackTestData.join(campaign, bob, null);

        given().when().post("/api/campaign/" + campaign + "/end").then().statusCode(403);
        Campaign stored = QuarkusTransaction.requiringNew().call(() -> Campaign.findById(campaign));
        assertTrue(stored.started);
    }

    // ===== Vote state survives a reload =====

    @Test
    @TestSecurity(user = "bob")
    void decisionListTellsWhetherThePlayerVotedAndIsOldestFirst() {
        Long alice = FeedbackTestData.player("alice");
        Long bob = FeedbackTestData.player("bob");
        Long character = FeedbackTestData.character(bob, "Tank");
        Long campaign = FeedbackTestData.campaign(alice, true, true, null);
        FeedbackTestData.join(campaign, bob, character);
        Long first = QuarkusTransaction.requiringNew().call(() -> {
            GroupDecision d = new GroupDecision(campaign, "Erste", "a", 2);
            d.createdAt = 1L;
            d.persist();
            return d.id;
        });
        QuarkusTransaction.requiringNew().run(() -> {
            GroupDecision d = new GroupDecision(campaign, "Zweite", "b", 2);
            d.createdAt = 2L;
            d.persist();
        });

        given().contentType(ContentType.JSON).body(Map.of("decisionId", first, "vote", "yes"))
                .when().post("/api/campaign/" + campaign + "/game/vote").then().statusCode(200);

        given().when().get("/api/campaign/" + campaign + "/game/decisions")
                .then().statusCode(200)
                .body("title", contains("Erste", "Zweite"))
                .body("hasVoted", contains(true, false));
    }

    // ===== Legacy characters without owner become read-only templates =====

    @Test
    @TestSecurity(user = "bob")
    void legacyCharactersAreTemplatesThatPlayersCopy() {
        FeedbackTestData.player("bob");
        Long ability = QuarkusTransaction.requiringNew().call(() -> {
            Ability a = new Ability();
            a.name = "Constitution";
            a.persist();
            return a.id;
        });
        Long legacy = QuarkusTransaction.requiringNew().call(() -> {
            Character c = new Character();
            c.name = "Alte Heldin";
            c.classId = 5;
            c.level = 2;
            c.persist();
            CharacterAbility ca = new CharacterAbility();
            ca.character = c;
            ca.ability = Ability.findById(ability);
            ca.score = 15;
            ca.persist();
            return c.id;
        });
        Long emptyDraft = QuarkusTransaction.requiringNew().call(() -> {
            Character c = new Character();
            c.persist();
            return c.id;
        });

        characterOwnerStartupRepair.onStart(null);

        assertNull(QuarkusTransaction.requiringNew().call(() -> Character.findById(emptyDraft)),
                "unnamed drafts without owner are removed");
        given().when().get("/api/character/presets")
                .then().statusCode(200)
                .body("name", contains("Alte Heldin"))
                .body("[0].preset", equalTo(true));
        // Nobody can change a template
        given().contentType(ContentType.JSON).body(Map.of("name", "Gekapert"))
                .when().patch("/api/character/" + legacy).then().statusCode(anyOf(is(403), is(404)));

        Integer copyId = given().when().post("/api/character/" + legacy + "/adopt")
                .then().statusCode(201)
                .body("name", equalTo("Alte Heldin"))
                .body("level", equalTo(2))
                .body("abilityScores[0].score", equalTo(15))
                .extract().path("id");
        assertNotEquals(legacy.intValue(), copyId.intValue());
        given().when().get("/api/character/all")
                .then().statusCode(200).body("id", contains(copyId));
        // The copy belongs to bob and can be edited by him
        given().contentType(ContentType.JSON).body(Map.of("name", "Neue Heldin"))
                .when().patch("/api/character/" + copyId).then().statusCode(200);
    }

    @Test
    @TestSecurity(user = "bob")
    void ownCharactersCannotBeAdoptedAsTemplates() {
        Long bob = FeedbackTestData.player("bob");
        Long alice = FeedbackTestData.player("alice");
        Long foreign = FeedbackTestData.character(alice, "Fremd");
        given().when().post("/api/character/" + foreign + "/adopt").then().statusCode(404);
        given().when().get("/api/character/presets").then().statusCode(200).body("size()", is(0));
        assertNotNull(bob);
    }

    // ===== Hit points from the class hit die =====

    @Test
    @TestSecurity(user = "bob")
    void hitPointsUseTheClassHitDie() {
        Long alice = FeedbackTestData.player("alice");
        Long bob = FeedbackTestData.player("bob");
        Long barbarian = QuarkusTransaction.requiringNew().call(() -> {
            CharacterClass c = new CharacterClass();
            c.name = "Barbar";
            c.persist();
            return c.id;
        });
        Long character = QuarkusTransaction.requiringNew().call(() -> {
            Character c = new Character();
            c.name = "Grimm";
            c.level = 1;
            c.classId = barbarian;
            c.ownerPlayerId = bob;
            c.persist();
            return c.id;
        });
        Long campaign = FeedbackTestData.campaign(alice, true, true, null);
        FeedbackTestData.join(campaign, bob, character);

        given().contentType(ContentType.JSON).body(Map.of("playerId", bob))
                .when().post("/api/campaign/" + campaign + "/game/init-hp")
                .then().statusCode(200).body("maxHp", equalTo(12)).body("hp", equalTo(12));
    }

    // ===== German content =====

    @Test
    void englishSeedContentIsTranslated() {
        QuarkusTransaction.requiringNew().run(() -> {
            CharacterClass barbarian = new CharacterClass();
            barbarian.name = "Barbarian";
            barbarian.description = "Barbarians are mighty warriors";
            barbarian.persist();
            CharacterClass custom = new CharacterClass();
            custom.name = "Eigene Klasse";
            custom.description = "vom Team angepasst";
            custom.persist();
            Background acolyte = new Background();
            acolyte.name = "Acolyte";
            acolyte.description = "Intelligence, Wisdom, Charisma";
            acolyte.persist();
        });
        // The seed ids are fixed (1..10); map our rows onto them for the repair.
        QuarkusTransaction.requiringNew().run(() -> {
            CharacterClass.update("id = 1 where name = 'Barbarian'");
            CharacterClass.update("id = 2 where name = 'Eigene Klasse'");
            Background.update("id = 1 where name = 'Acolyte'");
        });

        germanContentStartupRepair.onStart(null);

        QuarkusTransaction.requiringNew().run(() -> {
            CharacterClass translated = CharacterClass.findById(1L);
            assertEquals("Barbar", translated.name);
            assertTrue(translated.description.contains("Trefferwürfel: W12"));
            CharacterClass custom = CharacterClass.findById(2L);
            assertEquals("Eigene Klasse", custom.name, "renamed rows are left alone");
            Background acolyte = Background.findById(1L);
            assertEquals("Akolyth", acolyte.name);
            assertTrue(acolyte.description.startsWith("Du hast dich dem Dienst"));
        });
    }

    // ===== Legacy decision texts =====

    @Test
    @TestSecurity(user = "alice")
    void legacyEscapedDecisionTextsAreDecodedOnce() {
        Long alice = FeedbackTestData.player("alice");
        Long campaign = FeedbackTestData.campaign(alice, true, true, null);
        Long id = QuarkusTransaction.requiringNew().call(() -> {
            GroupDecision d = new GroupDecision(campaign, "Fass &amp; Bier", "&lt;b&gt;", 1);
            d.textPlain = null; // stored by an old client
            d.persist();
            return d.id;
        });
        Long fresh = QuarkusTransaction.requiringNew().call(() -> {
            GroupDecision d = new GroupDecision(campaign, "Tom &amp; Jerry", "neu", 1);
            d.persist();
            return d.id;
        });

        decisionTextStartupRepair.onStart(null);
        decisionTextStartupRepair.onStart(null);

        QuarkusTransaction.requiringNew().run(() -> {
            GroupDecision legacy = GroupDecision.findById(id);
            assertEquals("Fass & Bier", legacy.title);
            assertEquals("<b>", legacy.description);
            GroupDecision current = GroupDecision.findById(fresh);
            assertEquals("Tom &amp; Jerry", current.title, "texts of the current version stay untouched");
        });
    }

    // ===== Undo history survives a restart =====

    @Test
    void undoHistoryIsPersisted() throws Exception {
        GameState.CampaignGameState state = new GameState.CampaignGameState();
        state.mapMarkers.put("m1", new GameState.MapMarker("m1", "player", "A", 0.2, 0.2, null, "1", null));
        state.pushUndo();
        state.mapMarkers.get("m1").x = 0.8;
        state.stampPlayerMarkers();
        state.pushUndo();
        state.mapMarkers.remove("m1");

        String json = objectMapper.writeValueAsString(state.toPersisted());
        assertTrue(json.length() < 60_000, "two undo steps should stay small, was " + json.length());
        GameState.CampaignGameState restored = GameState.CampaignGameState.fromPersisted(
                objectMapper.readValue(json, GameState.PersistedState.class));

        assertTrue(restored.hasUndo());
        GameState.MapUndoSnapshot newest = restored.popUndo();
        assertEquals(0.8, newest.markers.get("m1").x, 1e-9);
        assertNotNull(restored.fogExploration(), "fog of the snapshot is restored");
        GameState.MapUndoSnapshot oldest = restored.popUndo();
        assertEquals(0.2, oldest.markers.get("m1").x, 1e-9);
        assertNull(restored.popUndo());
    }

    // ===== Fehler 2: profile picture =====

    @Test
    @TestSecurity(user = "bob")
    void profilePictureAcceptsWebpAndReplacesTheOldFile() throws Exception {
        Long bob = FeedbackTestData.player("bob");
        Path tmp = Files.createTempFile("avatar", ".webp");
        Files.write(tmp, new byte[]{'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'});

        String first = given().multiPart("file", tmp.toFile(), "image/webp")
                .when().post("/api/player/" + bob + "/upload-profile-picture")
                .then().statusCode(200).body("profilePicture", endsWith(".webp"))
                .extract().path("profilePicture");
        Path firstFile = Paths.get(uploadDir).toAbsolutePath().resolve(first.replaceFirst("^/uploads/", ""));
        assertTrue(Files.exists(firstFile));

        String second = given().multiPart("file", tmp.toFile(), "image/webp")
                .when().post("/api/player/" + bob + "/upload-profile-picture")
                .then().statusCode(200).extract().path("profilePicture");
        assertNotEquals(first, second);
        assertFalse(Files.exists(firstFile), "the old picture is removed after a successful upload");

        Path bmp = Files.createTempFile("avatar", ".bmp");
        given().multiPart("file", bmp.toFile(), "image/bmp")
                .when().post("/api/player/" + bob + "/upload-profile-picture")
                .then().statusCode(400).body(containsString("WebP"));
        Player stored = QuarkusTransaction.requiringNew().call(() -> Player.findById(bob));
        assertEquals(second, stored.profilePicture, "a rejected upload keeps the current picture");
    }

    // ===== Upload responses cannot run scripts =====

    @Test
    @TestSecurity(user = "bob")
    void uploadsAreServedWithASandbox() throws Exception {
        Long bob = FeedbackTestData.player("bob");
        Path svg = Files.createTempFile("avatar", ".svg");
        Files.writeString(svg, "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
        String path = given().multiPart("file", svg.toFile(), "image/svg+xml")
                .when().post("/api/player/" + bob + "/upload-profile-picture")
                .then().statusCode(200).extract().path("profilePicture");

        given().when().get(path)
                .then().statusCode(200)
                .header("Content-Security-Policy", containsString("sandbox"))
                .header("X-Content-Type-Options", equalTo("nosniff"));
        assertNotNull(List.of(path));
    }
}
