package account.deletion;

import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;
import security.SecurityIdentityService;

@Provider
@Priority(Priorities.AUTHORIZATION + 100)
public class AccountDeletionRequestFilter implements ContainerRequestFilter {

    @Inject
    SecurityIdentity identity;

    @Inject
    SecurityIdentityService identityService;

    @Inject
    AccountDeletionResponses responses;

    @Override
    public void filter(ContainerRequestContext request) {
        if (identity == null || identity.isAnonymous()) {
            return;
        }
        String path = request.getUriInfo().getPath();
        if (path.equals("api/account") || isAllowedAuthPath(path)) {
            return;
        }
        identityService.findDeletionMarker(identity)
                .ifPresent(marker -> request.abortWith(responses.pending(marker.state)));
    }

    private boolean isAllowedAuthPath(String path) {
        return path.equals("api/auth/me")
                || path.equals("api/auth/login")
                || path.equals("api/auth/logout")
                || path.equals("api/auth/callback")
                || path.equals("api/auth/error")
                || path.equals("api/auth/session-expired");
    }
}
