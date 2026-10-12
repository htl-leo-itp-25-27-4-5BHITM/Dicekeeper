package account.deletion;

public enum AccountDeletionState {
    PREPARED,
    LOCAL_DELETED,
    FILES_DELETED,
    COMPLETED;

    public boolean isPending() {
        return this != COMPLETED;
    }
}
