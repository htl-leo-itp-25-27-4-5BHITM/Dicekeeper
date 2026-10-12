package account.deletion;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
@TestProfile(InvalidAccountDeletionAdminProfile.class)
class AccountDeletionInvalidReadinessTest {

    @Test
    void enabledCapabilityWithInvalidAdminCredentialsIsUnready() {
        given()
                .when().get("/q/health/ready")
                .then()
                .statusCode(503)
                .body("checks.find { it.name == 'account-deletion' }.status", equalTo("DOWN"))
                .body("checks.find { it.name == 'account-deletion' }.data.enabled", equalTo(true));
    }
}
