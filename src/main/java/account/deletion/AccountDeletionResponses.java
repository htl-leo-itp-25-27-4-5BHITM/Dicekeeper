package account.deletion;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.core.Response;

@ApplicationScoped
public class AccountDeletionResponses {

    public Response toResponse(AccountDeletionOutcome outcome) {
        return switch (outcome) {
            case COMPLETED -> Response.noContent()
                    .header("Clear-Site-Data", "\"cookies\", \"storage\"")
                    .build();
            case FORBIDDEN -> error(Response.Status.FORBIDDEN, AccountDeletionError.forbidden());
            case PREFLIGHT_FAILED -> error(Response.Status.SERVICE_UNAVAILABLE, AccountDeletionError.unavailable());
            case PENDING -> error(Response.Status.CONFLICT, AccountDeletionError.pending());
            case LOCAL_FAILURE -> error(Response.Status.INTERNAL_SERVER_ERROR, AccountDeletionError.failed());
        };
    }

    public Response pending(AccountDeletionState state) {
        if (state == AccountDeletionState.COMPLETED) {
            return error(Response.Status.GONE, AccountDeletionError.completed());
        }
        return error(Response.Status.CONFLICT, AccountDeletionError.pending());
    }

    private Response error(Response.Status status, AccountDeletionError error) {
        return Response.status(status).entity(error).type("application/json").build();
    }
}
