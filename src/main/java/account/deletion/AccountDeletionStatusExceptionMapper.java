package account.deletion;

import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

@Provider
public class AccountDeletionStatusExceptionMapper implements ExceptionMapper<AccountDeletionStatusException> {

    @Inject
    AccountDeletionResponses responses;

    @Override
    public Response toResponse(AccountDeletionStatusException exception) {
        return responses.pending(exception.state());
    }
}
