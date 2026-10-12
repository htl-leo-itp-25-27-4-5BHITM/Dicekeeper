package account.deletion;

import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AccountDeletionResponsesTest {

    private final AccountDeletionResponses responses = new AccountDeletionResponses();

    @Test
    void mapsCoordinatorOutcomesToTheStableRestContract() {
        try (Response completed = responses.toResponse(AccountDeletionOutcome.COMPLETED);
             Response forbidden = responses.toResponse(AccountDeletionOutcome.FORBIDDEN);
             Response unavailable = responses.toResponse(AccountDeletionOutcome.PREFLIGHT_FAILED);
             Response pending = responses.toResponse(AccountDeletionOutcome.PENDING);
             Response failed = responses.toResponse(AccountDeletionOutcome.LOCAL_FAILURE)) {
            assertEquals(204, completed.getStatus());
            assertEquals("\"cookies\", \"storage\"", completed.getHeaderString("Clear-Site-Data"));
            assertError(forbidden, 403, "ACCOUNT_DELETION_FORBIDDEN", false);
            assertError(unavailable, 503, "ACCOUNT_DELETION_UNAVAILABLE", true);
            assertError(pending, 409, "ACCOUNT_DELETION_PENDING", true);
            assertError(failed, 500, "ACCOUNT_DELETION_FAILED", true);
        }
    }

    @Test
    void responseFieldsAreBoundedAndNeverContainDiagnostics() {
        for (AccountDeletionOutcome outcome : AccountDeletionOutcome.values()) {
            try (Response response = responses.toResponse(outcome)) {
                if (!(response.getEntity() instanceof AccountDeletionError error)) continue;
                assertTrue(error.code().length() <= 64);
                assertTrue(error.message().length() <= 240);
                assertFalse(error.message().matches("(?is).*<!DOCTYPE|stack trace|exception|secret|token|credential.*"));
            }
        }
    }

    private void assertError(Response response, int status, String code, boolean retryable) {
        assertEquals(status, response.getStatus());
        assertEquals("application/json", response.getMediaType().toString());
        AccountDeletionError error = (AccountDeletionError) response.getEntity();
        assertEquals(code, error.code());
        assertEquals(retryable, error.retryable());
    }
}
