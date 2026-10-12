package account.deletion;

public class FileCleanupException extends RuntimeException {
    public FileCleanupException(String message) {
        super(message);
    }

    public FileCleanupException(String message, Throwable cause) {
        super(message, cause);
    }
}
