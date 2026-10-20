package campaign;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

/** Regression tests for the reported bugs 16–23. */
@QuarkusTest
class FeedbackRoundTwoTest {

    @ConfigProperty(name = "dicekeeper.upload-dir")
    String uploadDir;

    @BeforeEach
    void clean() {
        FeedbackTestData.clean();
    }

    // ===== Fehler 16: e-mail addresses of other players =====

    @Test
    @TestSecurity(user = "bob")
    void otherPlayersOnlySeeThePublicProfile() {
        Long alice = FeedbackTestData.player("alice");
        Long bob = FeedbackTestData.player("bob");

        given().when().get("/api/player/id/" + alice)
                .then().statusCode(200)
                .body("username", equalTo("alice"))
                .body("$", not(hasKey("email")))
                .body("$", not(hasKey("name")));
        given().when().get("/api/player/id/" + bob)
                .then().statusCode(200)
                .body("email", equalTo("kc_bob@noemail.local"));
    }

    // ===== Fehler 17: correcting a rejected character =====

    @Test
    @TestSecurity(user = "bob")
    void rejectedCharacterCanBeCorrectedAndResubmitted() {
        Long alice = FeedbackTestData.player("alice");
        Long bob = FeedbackTestData.player("bob");
        Long character = FeedbackTestData.character(bob, "Erster Entwurf");
        Long campaign = FeedbackTestData.campaign(alice, true, false, null);
        Long membership = FeedbackTestData.join(campaign, bob, character);
        QuarkusTransaction.requiringNew().run(() -> {
            CampaignPlayer cp = CampaignPlayer.findById(membership);
            cp.characterStatus = "REJECTED";
            cp.dmNotes = "Bitte Vorgeschichte ergänzen";
        });

        given().contentType(ContentType.JSON).body(Map.of("name", "Überarbeitet", "info", "Neue Vorgeschichte"))
                .when().patch("/api/character/" + character)
                .then().statusCode(200).body("name", equalTo("Überarbeitet"));
        given().when().post("/api/campaign-player/" + campaign + "/" + bob + "/resubmit-character")
                .then().statusCode(200).body("characterStatus", equalTo("PENDING"));

        // While the DM reviews it, the character is locked.
        given().contentType(ContentType.JSON).body(Map.of("name", "Heimlich geändert"))
                .when().patch("/api/character/" + character).then().statusCode(409);
        given().when().delete("/api/character/" + character).then().statusCode(409);
    }

    @Test
    @TestSecurity(user = "bob")
    void abilityScoresMustBeInRange() {
        Long bob = FeedbackTestData.player("bob");
        Long characterId = FeedbackTestData.character(bob, "Held");
        Long abilityId = QuarkusTransaction.requiringNew().call(() -> {
            ability.Ability a = new ability.Ability();
            a.name = "Strength";
            a.persist();
            return a.id;
        });

        given().contentType(ContentType.JSON).body(Map.of("score", 99))
                .when().patch("/api/character-ability/" + characterId + "/" + abilityId).then().statusCode(400);
        given().contentType(ContentType.JSON).body(Map.of("score", 14))
                .when().patch("/api/character-ability/" + characterId + "/" + abilityId).then().statusCode(200);
        QuarkusTransaction.requiringNew().run(() -> {
            character.ability.CharacterAbility.deleteAll();
            ability.Ability.deleteAll();
        });
    }

    // ===== Fehler 19: uploads without login =====

    @Test
    void uploadsRequireLogin() {
        given().redirects().follow(false).when().get("/uploads/profiles/x.png")
                .then().statusCode(anyOf(is(401), is(302)));
        given().redirects().follow(false).when().get("/img?src=/uploads/profiles/x.png")
                .then().statusCode(anyOf(is(401), is(302)));
    }

    @Test
    @TestSecurity(user = "bob")
    void privateMapsAreOnlyVisibleToMembers() throws Exception {
        Long alice = FeedbackTestData.player("alice");
        Long bob = FeedbackTestData.player("bob");
        Long privateCampaign = FeedbackTestData.campaign(alice, false, false, null);
        String mapPath = "/uploads/maps/campaign-" + privateCampaign + "-secret.png";
        QuarkusTransaction.requiringNew().run(() -> {
            Campaign campaign = Campaign.findById(privateCampaign);
            campaign.mapImagePaths = mapPath;
            campaign.mapImagePath = mapPath;
        });
        Path file = Paths.get(uploadDir, "maps", "campaign-" + privateCampaign + "-secret.png");
        Files.createDirectories(file.getParent());
        Files.write(file, new byte[]{1, 2, 3});

        given().when().get(mapPath).then().statusCode(404);
        given().when().get("/img?src=" + mapPath).then().statusCode(404);
        given().when().get("/uploads/list").then().statusCode(404);

        FeedbackTestData.join(privateCampaign, bob, null);
        given().when().get(mapPath).then().statusCode(200);
    }

    // ===== Fehler 20: DM chat =====

    @Test
    @TestSecurity(user = "alice")
    void dmMessagesAreStoredForPlayers() {
        Long alice = FeedbackTestData.player("alice");
        Long campaign = FeedbackTestData.campaign(alice, true, true, null);

        given().contentType(ContentType.JSON).body(Map.of("text", "Ihr hört Schritte <im> Gang & dann Stille."))
                .when().post("/api/campaign/" + campaign + "/game/message")
                .then().statusCode(200).body("text", equalTo("Ihr hört Schritte <im> Gang & dann Stille."));
        given().contentType(ContentType.JSON).body(Map.of("text", "  "))
                .when().post("/api/campaign/" + campaign + "/game/message").then().statusCode(400);

        given().when().get("/api/campaign/" + campaign + "/game/state")
                .then().statusCode(200)
                .body("dmMessages.text", contains("Ihr hört Schritte <im> Gang & dann Stille."));
    }

    @Test
    @TestSecurity(user = "bob")
    void playersCannotSendDmMessages() {
        Long alice = FeedbackTestData.player("alice");
        Long bob = FeedbackTestData.player("bob");
        Long campaign = FeedbackTestData.campaign(alice, true, true, null);
        FeedbackTestData.join(campaign, bob, null);

        given().contentType(ContentType.JSON).body(Map.of("text", "Ich bin der DM"))
                .when().post("/api/campaign/" + campaign + "/game/message").then().statusCode(403);
    }

    // ===== Fehler 21 + 23: DM vote, unapproved players =====

    @Test
    @TestSecurity(user = "alice")
    void dmCannotVoteAndOnlyApprovedPlayersTakePart() {
        Long alice = FeedbackTestData.player("alice");
        Long approved = FeedbackTestData.player("approved");
        Long waiting = FeedbackTestData.player("waiting");
        Long character = FeedbackTestData.character(approved, "Held");
        Long campaign = FeedbackTestData.campaign(alice, true, true, null);
        FeedbackTestData.join(campaign, approved, character);
        FeedbackTestData.join(campaign, waiting, null);

        Integer decisionId = given().contentType(ContentType.JSON)
                .body(Map.of("title", "Tür & Tor?", "text", "Öffnen <ja/nein>"))
                .when().post("/api/campaign/" + campaign + "/game/decision")
                .then().statusCode(200)
                .body("totalPlayers", equalTo(1))
                .body("title", equalTo("Tür & Tor?"))
                .extract().path("id");

        given().contentType(ContentType.JSON).body(Map.of("decisionId", decisionId, "vote", "yes"))
                .when().post("/api/campaign/" + campaign + "/game/vote").then().statusCode(403);

        given().contentType(ContentType.JSON).body(Map.of("playerId", waiting))
                .when().post("/api/campaign/" + campaign + "/game/turn").then().statusCode(409);
        given().contentType(ContentType.JSON).body(Map.of("playerId", approved))
                .when().post("/api/campaign/" + campaign + "/game/turn").then().statusCode(200);
    }

    // ===== Open point: manipulated paths stored before the fix =====

    @Test
    void startupRepairDropsForeignMapPaths() {
        Campaign campaign = new Campaign();
        campaign.id = 7L;
        String own = "/uploads/maps/campaign-7-a.png";
        campaign.mapImagePaths = own + "\n/uploads/maps/campaign-8-b.png\n/uploads/../secret.txt";
        campaign.mapImagePath = "/uploads/../secret.txt";

        assertEquals(true, tool.UploadPathStartupRepair.repairMaps(campaign));
        assertEquals(own, campaign.mapImagePaths);
        assertEquals(own, campaign.mapImagePath);
        assertEquals(0, campaign.selectedMapIndex);
        assertEquals(false, tool.UploadPathStartupRepair.repairMaps(campaign));
    }
}
