package ai;

import java.util.Locale;

/**
 * Wofür der Assistent gerade genutzt wird. Jeder Modus bringt einen eigenen System-Prompt mit
 * (siehe {@link AiPrompts}). Später wählt die App den Modus aus dem Kontext (Kampagnen-Editor,
 * laufende Session, ...); auf der Testseite kann man ihn manuell umschalten.
 */
public enum AiAssistantMode {
    GENERAL,
    CAMPAIGN_CREATION,
    SESSION_HELP;

    public static AiAssistantMode parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return GENERAL;
        }
        try {
            return valueOf(raw.trim().toUpperCase(Locale.ROOT).replace('-', '_'));
        } catch (IllegalArgumentException e) {
            return GENERAL;
        }
    }
}
