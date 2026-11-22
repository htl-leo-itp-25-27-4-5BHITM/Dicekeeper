package ai;

import java.util.List;

/**
 * Anbieterneutrale Chat-Anfrage. Der Verlauf kommt vollständig mit, der Server speichert nichts.
 */
public record AiChatRequest(String model, String systemPrompt, List<AiChatMessage> messages, long maxOutputTokens) {
}
