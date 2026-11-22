package ai;

/**
 * Abschluss eines Chat-Aufrufs. stopReason ist anbieterneutral: "end", "max_tokens", "refusal" oder "other".
 */
public record AiChatResult(String stopReason, Long inputTokens, Long outputTokens) {
}
