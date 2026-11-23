package campaign;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import player.Player;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;

/** The private DM story holds up to 5000 characters, in the API and in the database. */
@QuarkusTest
class CampaignStoryLengthTest {

    private static final String DM_USER = "story-length-dm";
    private static final String DM_EMAIL = "kc_" + DM_USER + "@noemail.local";
    private static final String MAX_STORY = "s".repeat(Campaign.STORY_MAX_LENGTH);
    private static final String TOO_LONG_STORY = MAX_STORY + "s";

    @Inject
    EntityManager entityManager;

    @Inject
    CampaignStoryColumnMigration migration;

    private Long dmId;

    @BeforeEach
    void prepareDm() {
        dmId = QuarkusTransaction.requiringNew().call(() -> {
            Player existing = Player.find("email", DM_EMAIL).firstResult();
            if (existing != null) {
                List<Campaign> campaigns = Campaign.list("playerId", existing.id);
                for (Campaign campaign : campaigns) {
                    CampaignPlayer.delete("campaignId", campaign.id);
                    campaign.delete();
                }
                existing.delete();
            }

            Player player = new Player();
            player.email = DM_EMAIL;
            player.username = DM_USER;
            player.name = DM_USER;
            player.persist();
            return player.id;
        });
    }

    private Long campaignWithStory(String story) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Campaign campaign = new Campaign();
            campaign.name = "Story length";
            campaign.story = story;
            campaign.playerId = dmId;
            campaign.persist();
            new CampaignPlayer(campaign.id, dmId, "DM").persist();
            return campaign.id;
        });
    }

    private String storedStory(Long campaignId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> Campaign.<Campaign>findById(campaignId).story);
    }

    @Test
    @TestSecurity(user = DM_USER)
    void storeA5000CharacterStory() {
        Long campaignId = campaignWithStory(null);

        given().contentType(ContentType.JSON)
                .body(Map.of("story", MAX_STORY))
                .when().patch("/api/campaign/" + campaignId + "/story")
                .then().statusCode(200);

        assertEquals(Campaign.STORY_MAX_LENGTH, storedStory(campaignId).length());
    }

    @Test
    @TestSecurity(user = DM_USER)
    void rejectAStoryOverTheLimitWithA400() {
        Long campaignId = campaignWithStory("alt");

        given().contentType(ContentType.JSON)
                .body(Map.of("story", TOO_LONG_STORY))
                .when().patch("/api/campaign/" + campaignId + "/story")
                .then().statusCode(400)
                .body(equalTo(CampaignValidation.STORY_TOO_LONG_ERROR));

        given().contentType(ContentType.JSON)
                .body(Map.of("story", TOO_LONG_STORY))
                .when().patch("/api/campaign/" + campaignId)
                .then().statusCode(400);

        given().contentType(ContentType.JSON)
                .body(Map.of("name", "Zu lang", "story", TOO_LONG_STORY))
                .when().post("/api/campaign")
                .then().statusCode(400);

        assertEquals("alt", storedStory(campaignId));
    }

    @Test
    void migrationWidensAnOldStoryColumn() {
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                "alter table campaign alter column story set data type varchar(1000)").executeUpdate());
        assertEquals(1000, QuarkusTransaction.requiringNew().call(migration::currentStoryColumnLength));

        QuarkusTransaction.requiringNew().run(migration::widenStoryColumn);
        assertEquals(Campaign.STORY_MAX_LENGTH,
                QuarkusTransaction.requiringNew().call(migration::currentStoryColumnLength));

        // A second run changes nothing.
        QuarkusTransaction.requiringNew().run(migration::widenStoryColumn);
        assertEquals(Campaign.STORY_MAX_LENGTH,
                QuarkusTransaction.requiringNew().call(migration::currentStoryColumnLength));
    }
}
