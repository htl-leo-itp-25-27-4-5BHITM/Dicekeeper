package security;

import account.deletion.DeletionFailureCategory;

public class KeycloakAdminException extends RuntimeException {
    private final DeletionFailureCategory category;
    private final Integer upstreamStatus;

    public KeycloakAdminException(DeletionFailureCategory category, String safeMessage) {
        this(category, null, safeMessage, null);
    }

    public KeycloakAdminException(DeletionFailureCategory category,
                                  Integer upstreamStatus,
                                  String safeMessage) {
        this(category, upstreamStatus, safeMessage, null);
    }

    public KeycloakAdminException(DeletionFailureCategory category,
                                  Integer upstreamStatus,
                                  String safeMessage,
                                  Throwable cause) {
        super(safeMessage, cause);
        this.category = category;
        this.upstreamStatus = upstreamStatus;
    }

    public DeletionFailureCategory category() {
        return category;
    }

    public Integer upstreamStatus() {
        return upstreamStatus;
    }
}
