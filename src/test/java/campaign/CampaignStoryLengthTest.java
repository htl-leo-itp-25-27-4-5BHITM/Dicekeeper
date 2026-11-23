package campaign;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;

/** The private DM story holds up to 5000 characters, in the API and in the database. */
@QuarkusTest
class CampaignStoryLengthTest {

    private static final String MAX_STORY = "s".repeat(Campaign.STORY_MAX_LENGTH);
    private static final String TOO_LONG_STORY = MAX_STORY + "s";

    @Inject
    EntityManager entityManager;

    @Inject
    CampaignStoryColumnMigration migration;

    @BeforeEach
    void clean() {
        FeedbackTestData.clean();
    }

    @Test
    @TestSecurity(user = "dm")
    void storeAndReturnA5000CharacterStory() {
        Long dm = FeedbackTestData.player("dm");
        Long campaignId = FeedbackTestData.campaign(dm, false, false, null);

        given().contentType(ContentType.JSON)
                .body(Map.of("story", MAX_STORY))
                .when().patch("/api/campaign/" + campaignId + "/story")
                .then().statusCode(200);

        String stored = QuarkusTransaction.requiringNew()
                .call(() -> Campaign.<Campaign>findById(campaignId).story);
        assertEquals(Campaign.STORY_MAX_LENGTH, stored.length());
    }

    @Test
    @TestSecurity(user = "dm")
    void rejectAStoryOverTheLimitWithA400() {
        Long dm = FeedbackTestData.player("dm");
        Long campaignId = FeedbackTestData.campaign(dm, false, false, "alt");

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

        String stored = QuarkusTransaction.requiringNew()
                .call(() -> Campaign.<Campaign>findById(campaignId).story);
        assertEquals("alt", stored);
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
