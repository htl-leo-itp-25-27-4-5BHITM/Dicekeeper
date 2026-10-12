package account.deletion;

public record AccountDeletionError(String code, String message, boolean retryable) {
    public AccountDeletionError {
        if (code == null || code.length() > 64 || message == null || message.length() > 240) {
            throw new IllegalArgumentException("Account deletion error fields exceed their bounds");
        }
    }

    public static AccountDeletionError pending() {
        return new AccountDeletionError(
                "ACCOUNT_DELETION_PENDING",
                "Der Account konnte noch nicht vollständig gelöscht werden. Bitte erneut versuchen.",
                true);
    }

    public static AccountDeletionError completed() {
        return new AccountDeletionError(
                "ACCOUNT_DELETION_COMPLETED",
                "Dieser Account wurde bereits gelöscht.",
                false);
    }

    public static AccountDeletionError unavailable() {
        return new AccountDeletionError(
                "ACCOUNT_DELETION_UNAVAILABLE",
                "Die Account-Löschung ist derzeit nicht verfügbar. Bitte später erneut versuchen.",
                true);
    }

    public static AccountDeletionError forbidden() {
        return new AccountDeletionError(
                "ACCOUNT_DELETION_FORBIDDEN",
                "Du kannst nur deinen eigenen Account löschen.",
                false);
    }

    public static AccountDeletionError failed() {
        return new AccountDeletionError(
                "ACCOUNT_DELETION_FAILED",
                "Der Account konnte nicht gelöscht werden. Bitte später erneut versuchen.",
                true);
    }
}
