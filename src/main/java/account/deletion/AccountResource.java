package account.deletion;

import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/account")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class AccountResource {

    @Inject
    SecurityIdentity identity;

    @Inject
    AccountDeletionCoordinator coordinator;

    @Inject
    AccountDeletionResponses responses;

    @DELETE
    public Response deleteCurrentAccount() {
        return responses.toResponse(coordinator.delete(identity, null));
    }
}
