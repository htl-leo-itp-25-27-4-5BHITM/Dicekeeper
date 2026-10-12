package account.deletion;

public enum DeletionFailureCategory {
    CONFIGURATION,
    AUTHENTICATION,
    AUTHORIZATION,
    TIMEOUT,
    TRANSPORT,
    UPSTREAM_STATUS,
    LOCAL_DATABASE,
    FILESYSTEM,
    INTERNAL
}
