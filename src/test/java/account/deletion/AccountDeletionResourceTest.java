package account.deletion;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import player.Player;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class AccountDeletionResourceTest {

    @Inject
    AccountDeletionMarkerService markers;

    @Inject
    SubjectDigest subjectDigest;

    @BeforeEach
    void clean() {
        QuarkusTransaction.requiringNew().run(() -> {
            AccountDeletionMarker.deleteAll();
            Player.deleteAll();
        });
    }

    @Test
    @TestSecurity(user = "rest-preflight")
    void returnsSafe503WhenDeletionIsDisabledBeforeLocalMutation() {
        Long playerId = createPlayer("kc_rest-preflight@noemail.local");

        given()
                .when().delete("/api/account")
                .then()
                .statusCode(503)
                .contentType("application/json")
                .body("code", equalTo("ACCOUNT_DELETION_UNAVAILABLE"))
                .body("retryable", equalTo(true))
                .body("message", not(anyOf(containsString("exception"), containsString("secret"), containsString("token"))));

        org.junit.jupiter.api.Assertions.assertNotNull(Player.findById(playerId));
        org.junit.jupiter.api.Assertions.assertEquals(0, AccountDeletionMarker.count());
    }

    @Test
    @TestSecurity(user = "rest-resume")
    void persistedDeletionReturns409WhenItsRetryCannotPreflight() {
        markers.startOrGet(subjectDigest.digest("rest-resume"), 702L);

        given()
                .when().delete("/api/account")
                .then()
                .statusCode(409)
                .body("code", equalTo("ACCOUNT_DELETION_PENDING"))
                .body("retryable", equalTo(true));
    }

    @Test
    @TestSecurity(user = "rest-owner")
    void compatibilityWrapperRejectsAnotherPlayer() {
        createPlayer("kc_rest-owner@noemail.local");
        Long anotherPlayer = createPlayer("other@example.test");

        given()
                .when().delete("/api/player/" + anotherPlayer)
                .then()
                .statusCode(403)
                .body("code", equalTo("ACCOUNT_DELETION_FORBIDDEN"));
    }

    @Test
    @TestSecurity(user = "rest-pending")
    void authMeReportsPendingWithoutRecreatingAPlayer() {
        markers.startOrGet(subjectDigest.digest("rest-pending"), 700L);

        given()
                .when().get("/api/auth/me")
                .then()
                .statusCode(409)
                .body("code", equalTo("ACCOUNT_DELETION_PENDING"))
                .body("retryable", equalTo(true));

        org.junit.jupiter.api.Assertions.assertEquals(0, Player.count());
    }

    @Test
    @TestSecurity(user = "rest-completed")
    void authMeReportsCompletedWithoutRecreatingAPlayer() {
        String digest = subjectDigest.digest("rest-completed");
        markers.startOrGet(digest, 701L);
        markers.transition(digest, AccountDeletionState.PREPARED, AccountDeletionState.LOCAL_DELETED);
        markers.transition(digest, AccountDeletionState.LOCAL_DELETED, AccountDeletionState.FILES_DELETED);
        markers.transition(digest, AccountDeletionState.FILES_DELETED, AccountDeletionState.COMPLETED);

        given()
                .when().get("/api/auth/me")
                .then()
                .statusCode(410)
                .body("code", equalTo("ACCOUNT_DELETION_COMPLETED"))
                .body("retryable", equalTo(false));
        org.junit.jupiter.api.Assertions.assertEquals(0, Player.count());
    }

    @Test
    @TestSecurity(user = "rest-normal")
    void authMeStillCreatesAndReturnsANormalPlayer() {
        given()
                .when().get("/api/auth/me")
                .then()
                .statusCode(200)
                .body("id", notNullValue());
        org.junit.jupiter.api.Assertions.assertEquals(1, Player.count());
    }

    private Long createPlayer(String email) {
        final Long[] id = new Long[1];
        QuarkusTransaction.requiringNew().run(() -> {
            Player player = new Player();
            player.email = email;
            player.username = email.substring(0, email.indexOf('@'));
            player.name = player.username;
            player.persist();
            id[0] = player.id;
        });
        return id[0];
    }

}
