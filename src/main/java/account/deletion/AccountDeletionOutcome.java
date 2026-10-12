package account.deletion;

public enum AccountDeletionOutcome {
    COMPLETED,
    FORBIDDEN,
    PREFLIGHT_FAILED,
    PENDING,
    LOCAL_FAILURE
}
