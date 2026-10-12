package account.deletion;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import player.Player;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
@QuarkusTestResource(value = SuccessfulKeycloakAdminResource.class, restrictToAnnotatedClass = true)
class AccountDeletionClearSiteDataHttpTest {

    @BeforeEach
    void preparePlayer() {
        SuccessfulKeycloakAdminResource.resetCounts();
        QuarkusTransaction.requiringNew().run(() -> {
            AccountDeletionMarker.deleteAll();
            Player.deleteAll();

            Player player = new Player();
            player.email = "kc_rest-clear-site-data@noemail.local";
            player.username = "rest-clear-site-data";
            player.name = "rest-clear-site-data";
            player.persist();
        });
    }

    @Test
    @TestSecurity(user = "rest-clear-site-data")
    void successfulDeletionSendsClearSiteDataOverHttp() {
        given()
                .when().delete("/api/account")
                .then()
                .statusCode(204)
                .header("Clear-Site-Data", equalTo("\"cookies\", \"storage\""));

        assertEquals(1, SuccessfulKeycloakAdminResource.tokenRequests());
        assertEquals(1, SuccessfulKeycloakAdminResource.deleteRequests());
        assertEquals(0, Player.count());
    }
}
