package account.deletion;

import io.quarkus.test.junit.QuarkusTestProfile;

import java.util.Map;

public class InvalidAccountDeletionAdminProfile implements QuarkusTestProfile {
    @Override
    public Map<String, String> getConfigOverrides() {
        return Map.of(
                "dicekeeper.account-deletion.enabled", "true",
                "dicekeeper.keycloak.admin.client-id", "not-configured",
                "dicekeeper.keycloak.admin.client-secret", "replace-me"
        );
    }
}
