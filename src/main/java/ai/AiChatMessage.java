package ai;

/**
 * Eine Nachricht im Chatverlauf. role ist "user" oder "assistant".
 */
public record AiChatMessage(String role, String content) {

    public boolean isUser() {
        return "user".equals(role);
    }

    public boolean isAssistant() {
        return "assistant".equals(role);
    }
}
