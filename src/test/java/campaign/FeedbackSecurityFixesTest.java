package campaign;

import character.Character;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
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
 * Regression tests for the reported bugs 9–12 and 15 (file deletion, story leak,
 * foreign characters, campaign start, client-chosen dice/HP/fog).
 */
@QuarkusTest
class FeedbackSecurityFixesTest {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};

    @ConfigProperty(name = "dicekeeper.upload-dir")
    String uploadDir;

    @BeforeEach
    void clean() {
        FeedbackTestData.clean();
    }

    // ===== Fehler 9: files outside uploads/ =====

    @Test
    @TestSecurity(user = "alice")
    void profilePicturePathCannotBeSetAndForeignFilesAreNeverDeleted() throws Exception {
        Long alice = FeedbackTestData.player("alice");
        Path victim = createVictimFile("victim-profile.txt");

        given().contentType(ContentType.JSON)
                .body(Map.of("profilePicture", "/uploads/../victim-profile.txt", "name", "Alice"))
                .when().patch("/api/player/" + alice)
                .then().statusCode(200)
                .body("name", equalTo("Alice"))
                .body("profilePicture", nullValue());

        // Even if a bad path is already stored (old data), uploading must not delete it.
        QuarkusTransaction.requiringNew().run(() ->
                Player.<Player>findById(alice).profilePicture = "/uploads/../victim-profile.txt");

        given().multiPart("file", "avatar.png", PNG, "image/png")
                .when().post("/api/player/" + alice + "/upload-profile-picture")
                .then().statusCode(200)
                .body("profilePicture", startsWith("/uploads/profiles/player-" + alice + "-"));

        assertTrue(Files.exists(victim), "file outside uploads/ must not be deleted");
    }

    @Test
    @TestSecurity(user = "alice")
    void mapPathsFromCreateRequestAreIgnored() throws Exception {
        FeedbackTestData.player("alice");
        Path victim = createVictimFile("victim-map.txt");

        Integer campaignId = given().contentType(ContentType.JSON)
                .body(Map.of(
                        "name", "Evil",
                        "mapImagePath", "/uploads/../victim-map.txt",
                        "mapImagePaths", "/uploads/../victim-map.txt",
                        "started", true))
                .when().post("/api/campaign")
                .then().statusCode(201)
                .body("mapImagePaths", empty())
                .body("started", equalTo(false))
                .extract().path("id");

        given().when().delete("/api/campaign/" + campaignId).then().statusCode(204);
        assertTrue(Files.exists(victim), "file outside uploads/ must not be deleted");
    }

    // ===== Fehler 10: DM story in campaign lists =====

    @Test
    @TestSecurity(user = "bob")
    void campaignListsHidePrivateCampaignsAndStories() {
        Long alice = FeedbackTestData.player("alice");
        Long bob = FeedbackTestData.player("bob");
        Long privateCampaign = FeedbackTestData.campaign(alice, false, false, "secret plot");
        Long publicCampaign = FeedbackTestData.campaign(alice, true, false, "public secret");
        Long ownCampaign = FeedbackTestData.campaign(bob, false, false, "bob's own plot");

        List<Integer> ids = given().when().get("/api/campaign")
                .then().statusCode(200)
                .body("story", everyItem(nullValue()))
                .extract().path("id");
        assertTrue(ids.contains(publicCampaign.intValue()));
        assertTrue(ids.contains(ownCampaign.intValue()));
        assertFalse(ids.contains(privateCampaign.intValue()));

        given().when().get("/api/campaign/public/all")
                .then().statusCode(200)
                .body("story", everyItem(nullValue()))
                .body("id", not(hasItem(privateCampaign.intValue())));

        given().when().get("/api/campaign/" + publicCampaign)
                .then().statusCode(200)
                .body("story", nullValue());
    }

    // ===== Fehler 11: foreign characters =====

    @Test
    @TestSecurity(user = "bob")
    void foreignCharactersAreInvisibleAndImmutable() {
        Long alice = FeedbackTestData.player("alice");
        Long bob = FeedbackTestData.player("bob");
        Long alicesCharacter = FeedbackTestData.character(alice, "Alices Held");
        Long bobsCharacter = FeedbackTestData.character(bob, "Bobs Held");
        Long campaign = FeedbackTestData.campaign(alice, true, false, null);
        FeedbackTestData.join(campaign, bob, null);

        given().when().get("/api/character/all")
                .then().statusCode(200)
                .body("id", contains(bobsCharacter.intValue()));

        given().when().get("/api/character/" + alicesCharacter).then().statusCode(404);
        given().contentType(ContentType.JSON).body(Map.of("name", "Hacked"))
                .when().patch("/api/character/" + alicesCharacter).then().statusCode(404);
        given().contentType(ContentType.JSON).body(Map.of("score", 20))
                .when().patch("/api/character-ability/" + alicesCharacter + "/1").then().statusCode(404);
        given().when().delete("/api/character/" + alicesCharacter).then().statusCode(404);
        given().contentType(ContentType.JSON).body(Map.of("characterId", alicesCharacter))
                .when().post("/api/campaign-player/" + campaign + "/" + bob + "/submit-character")
                .then().statusCode(404);

        Character unchanged = QuarkusTransaction.requiringNew().call(() -> Character.findById(alicesCharacter));
        assertEquals("Alices Held", unchanged.name);

        given().contentType(ContentType.JSON).body(Map.of("characterId", bobsCharacter))
                .when().post("/api/campaign-player/" + campaign + "/" + bob + "/submit-character")
                .then().statusCode(200);
    }

    @Test
    @TestSecurity(user = "carol")
    void partyMembersCanReadSubmittedCharacters() {
        Long alice = FeedbackTestData.player("alice");
        Long bob = FeedbackTestData.player("bob");
        Long carol = FeedbackTestData.player("carol");
        Long bobsCharacter = FeedbackTestData.character(bob, "Bobs Held");
        Long campaign = FeedbackTestData.campaign(alice, true, true, null);
        FeedbackTestData.join(campaign, bob, bobsCharacter);
        FeedbackTestData.join(campaign, carol, null);

        // Fellow players only get the public summary, not the full sheet.
        given().when().get("/api/character/" + bobsCharacter)
                .then().statusCode(200)
                .body("name", equalTo("Bobs Held"))
                .body("abilityScores", nullValue())
                .body("info", nullValue());
        given().when().get("/api/character/" + bobsCharacter + "/getAbilityScores").then().statusCode(404);
        given().contentType(ContentType.JSON).body(Map.of("name", "Hacked"))
                .when().patch("/api/character/" + bobsCharacter).then().statusCode(404);
    }

    // ===== Fehler 12: start makes campaign private / edit resets start =====

    @Test
    @TestSecurity(user = "alice")
    void partialUpdatesOnlyChangeSentFields() {
        Long alice = FeedbackTestData.player("alice");
        Long campaign = FeedbackTestData.campaign(alice, true, false, "story");

        given().contentType(ContentType.JSON).body(Map.of("started", true))
                .when().patch("/api/campaign/" + campaign)
                .then().statusCode(200)
                .body("started", equalTo(true))
                .body("isPublic", equalTo(true));

        given().contentType(ContentType.JSON).body(Map.of("name", "Renamed", "description", "new"))
                .when().patch("/api/campaign/" + campaign)
                .then().statusCode(200)
                .body("name", equalTo("Renamed"))
                .body("started", equalTo(true))
                .body("isPublic", equalTo(true))
                .body("story", equalTo("story"));
    }

    // ===== Fehler 15: dice, HP and fog decided by the client =====

    @Test
    @TestSecurity(user = "bob")
    void serverRollsDiceAndValidatesManualResults() {
        Long alice = FeedbackTestData.player("alice");
        Long bob = FeedbackTestData.player("bob");
        Long campaign = FeedbackTestData.campaign(alice, true, true, null);
        FeedbackTestData.join(campaign, bob, null);

        for (int i = 0; i < 20; i++) {
            given().contentType(ContentType.JSON).body(Map.of("diceType", "d20", "result", 999))
                    .when().post("/api/campaign/" + campaign + "/game/dice")
                    .then().statusCode(200)
                    .body("result", allOf(greaterThanOrEqualTo(1), lessThanOrEqualTo(20)));
        }

        given().contentType(ContentType.JSON).body(Map.of("diceType", "d20", "result", 999, "manual", true))
                .when().post("/api/campaign/" + campaign + "/game/dice").then().statusCode(400);
        given().contentType(ContentType.JSON).body(Map.of("diceType", "d20", "result", 0, "manual", true))
                .when().post("/api/campaign/" + campaign + "/game/dice").then().statusCode(400);
        given().contentType(ContentType.JSON).body(Map.of("diceType", "d999"))
                .when().post("/api/campaign/" + campaign + "/game/dice").then().statusCode(400);
        given().contentType(ContentType.JSON).body(Map.of("diceType", "d6", "result", 4, "manual", true))
                .when().post("/api/campaign/" + campaign + "/game/dice")
                .then().statusCode(200).body("result", equalTo(4));
    }

    @Test
    @TestSecurity(user = "bob")
    void hitPointsAreCalculatedOnTheServer() {
        Long alice = FeedbackTestData.player("alice");
        Long bob = FeedbackTestData.player("bob");
        Long character = FeedbackTestData.character(bob, "Tank");
        Long campaign = FeedbackTestData.campaign(alice, true, true, null);
        FeedbackTestData.join(campaign, bob, character);

        given().contentType(ContentType.JSON).body(Map.of("playerId", bob, "hp", 9999, "maxHp", 9999))
                .when().post("/api/campaign/" + campaign + "/game/init-hp")
                .then().statusCode(200)
                .body("hp", equalTo(10))
                .body("maxHp", equalTo(10));
    }

    @Test
    @TestSecurity(user = "bob")
    void playersCannotUploadFog() {
        Long alice = FeedbackTestData.player("alice");
        Long bob = FeedbackTestData.player("bob");
        Long campaign = FeedbackTestData.campaign(alice, true, true, null);
        FeedbackTestData.join(campaign, bob, null);

        given().contentType(ContentType.JSON).body(Map.of("data", "data:image/png;base64,AAAA"))
                .when().put("/api/campaign/" + campaign + "/game/fog-exploration")
                .then().statusCode(anyOf(is(404), is(405)));
        given().when().get("/api/campaign/" + campaign + "/game/fog-exploration")
                .then().statusCode(200).body("data", equalTo(""));
    }

    @Test
    void maxHpFormula() {
        assertEquals(10, GameActionResource.calculateMaxHp(1, 10));
        assertEquals(12, GameActionResource.calculateMaxHp(1, 15));
        assertEquals(12 + 8, GameActionResource.calculateMaxHp(2, 15));
        assertEquals(1, GameActionResource.calculateMaxHp(1, -40));
        // Hit dice per class: barbarian d12, sorcerer d6
        assertEquals(14, GameActionResource.calculateMaxHp(1, 14, characterclass.GermanContent.hitDie("Barbar")));
        assertEquals(14 + 2 * 9, GameActionResource.calculateMaxHp(3, 14, characterclass.GermanContent.hitDie("Barbarian")));
        assertEquals(5, GameActionResource.calculateMaxHp(1, 8, characterclass.GermanContent.hitDie("Zauberer")));
        assertEquals(10, characterclass.GermanContent.hitDie("Kämpfer"));
    }

    private Path createVictimFile(String name) throws Exception {
        Path victim = Paths.get(uploadDir).toAbsolutePath().getParent().resolve(name);
        Files.writeString(victim, "do not delete");
        return victim;
    }
}
