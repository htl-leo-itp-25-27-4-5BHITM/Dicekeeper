package account.deletion;

import io.smallrye.health.api.AsyncHealthCheck;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Readiness;
import security.KeycloakAdminService;

@Readiness
@ApplicationScoped
public class AccountDeletionReadinessCheck implements AsyncHealthCheck {

    @Inject
    KeycloakAdminService keycloakAdminService;

    @Inject
    AccountDeletionMarkerService markerService;

    @Override
    public Uni<HealthCheckResponse> call() {
        boolean ready = !keycloakAdminService.isEnabled()
                || (keycloakAdminService.isReady() && markerService.hasValidRetention());
        HealthCheckResponse response = HealthCheckResponse.named("account-deletion")
                .status(ready)
                .withData("enabled", keycloakAdminService.isEnabled())
                .build();
        return Uni.createFrom().item(response);
    }
}
