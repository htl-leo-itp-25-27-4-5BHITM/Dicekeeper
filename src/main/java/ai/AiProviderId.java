package ai;

import java.util.Locale;

/**
 * KI-Anbieter, mit denen sich Nutzer über ihren eigenen API-Key verbinden können.
 */
public enum AiProviderId {
    OPENAI("OpenAI"),
    ANTHROPIC("Claude (Anthropic)");

    private final String displayName;

    AiProviderId(String displayName) {
        this.displayName = displayName;
    }

    public String displayName() {
        return displayName;
    }

    public static AiProviderId parse(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("Provider fehlt");
        }
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "openai" -> OPENAI;
            case "anthropic", "claude" -> ANTHROPIC;
            default -> throw new IllegalArgumentException("Unbekannter Provider: " + raw);
        };
    }

    public String key() {
        return name().toLowerCase(Locale.ROOT);
    }
}
