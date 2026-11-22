package ai;

/**
 * Fehler beim Aufruf eines KI-Anbieters, mit einer Kategorie, die man dem Nutzer zeigen kann.
 * Die Originalmeldung des Anbieters wird nicht ungefiltert weitergegeben.
 */
public class AiProviderException extends RuntimeException {

    public enum Category {
        INVALID_KEY("Der API-Key wurde vom Anbieter abgelehnt."),
        PERMISSION_DENIED("Der API-Key hat keine Berechtigung für dieses Modell."),
        RATE_LIMITED("Rate-Limit oder Guthaben beim Anbieter erschöpft. Bitte später erneut versuchen."),
        MODEL_NOT_FOUND("Das Modell ist für diesen Key nicht verfügbar."),
        BAD_REQUEST("Der Anbieter hat die Anfrage abgelehnt."),
        UNAVAILABLE("Der Anbieter ist gerade nicht erreichbar."),
        UNKNOWN("Unerwarteter Fehler beim Anbieter.");

        private final String userMessage;

        Category(String userMessage) {
            this.userMessage = userMessage;
        }

        public String userMessage() {
            return userMessage;
        }
    }

    private final Category category;

    public AiProviderException(Category category, String detail, Throwable cause) {
        super(detail, cause);
        this.category = category;
    }

    public Category category() {
        return category;
    }

    public static Category categoryForStatus(int status) {
        return switch (status) {
            case 401 -> Category.INVALID_KEY;
            case 403 -> Category.PERMISSION_DENIED;
            case 404 -> Category.MODEL_NOT_FOUND;
            case 400, 413, 422 -> Category.BAD_REQUEST;
            case 429 -> Category.RATE_LIMITED;
            default -> status >= 500 ? Category.UNAVAILABLE : Category.UNKNOWN;
        };
    }
}
