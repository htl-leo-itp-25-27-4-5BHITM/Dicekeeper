package account.deletion;

public class AccountDeletionStatusException extends RuntimeException {
    private final AccountDeletionState state;

    public AccountDeletionStatusException(AccountDeletionState state) {
        super(state == AccountDeletionState.COMPLETED
                ? "Account deletion has completed"
                : "Account deletion is pending");
        this.state = state;
    }

    public AccountDeletionState state() {
        return state;
    }
}
