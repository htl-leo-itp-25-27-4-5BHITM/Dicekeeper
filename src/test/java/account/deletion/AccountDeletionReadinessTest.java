package account.deletion;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class AccountDeletionReadinessTest {

    @Test
    void disabledCapabilityRemainsReadyWithoutAdminCredentials() {
        given()
                .when().get("/q/health/ready")
                .then()
                .statusCode(200)
                .body("checks.find { it.name == 'account-deletion' }.status", equalTo("UP"))
                .body("checks.find { it.name == 'account-deletion' }.data.enabled", equalTo(false));
    }
}
