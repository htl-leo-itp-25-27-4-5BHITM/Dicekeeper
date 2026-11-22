package ai;

import ai.provider.AiProviderClient;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.ArrayList;
import java.util.List;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

/**
 * Zentrale Stelle für alle KI-Aufrufe in Dicekeeper. Views und Fach-Services sprechen nie direkt mit
 * einem Anbieter, sondern immer hierüber (so sieht es auch openspec/add-ai-campaign-assistance vor).
 * Hier sitzen Prompt-Auswahl, Eingabe-Limits und die Anbieterwahl.
 */
@ApplicationScoped
public class AiGateway {

    @Inject
    Instance<AiProviderClient> providers;

    @ConfigProperty(name = "dicekeeper.ai.max-messages", defaultValue = "60")
    int maxMessages;

    @ConfigProperty(name = "dicekeeper.ai.max-message-chars", defaultValue = "12000")
    int maxMessageChars;

    @ConfigProperty(name = "dicekeeper.ai.max-conversation-chars", defaultValue = "120000")
    int maxConversationChars;

    @ConfigProperty(name = "dicekeeper.ai.max-output-tokens", defaultValue = "16000")
    long maxOutputTokens;

    public AiProviderClient provider(AiProviderId id) {
        for (AiProviderClient client : providers) {
            if (client.id() == id) {
                return client;
            }
        }
        throw new IllegalStateException("Kein Client für " + id);
    }

    public List<AiModelInfo> listModels(AiProviderId id, String apiKey) {
        return provider(id).listModels(apiKey);
    }

    public String preferredModel(AiProviderId id, List<AiModelInfo> models) {
        return provider(id).preferredModel(models);
    }

    /** Prüft und normalisiert den Verlauf. Wirft IllegalArgumentException mit nutzerlesbarer Meldung. */
    public List<AiChatMessage> validateConversation(List<AiChatMessage> raw) {
        if (raw == null || raw.isEmpty()) {
            throw new IllegalArgumentException("Keine Nachricht übergeben.");
        }
        if (raw.size() > maxMessages) {
            throw new IllegalArgumentException("Der Chat ist zu lang (max. " + maxMessages
                    + " Nachrichten). Bitte einen neuen Chat beginnen.");
        }
        List<AiChatMessage> clean = new ArrayList<>(raw.size());
        int total = 0;
        for (AiChatMessage message : raw) {
            if (message == null || message.content() == null || message.content().isBlank()) {
                continue;
            }
            if (!message.isUser() && !message.isAssistant()) {
                throw new IllegalArgumentException("Ungültige Rolle im Verlauf.");
            }
            if (message.content().length() > maxMessageChars) {
                throw new IllegalArgumentException("Eine Nachricht ist zu lang (max. " + maxMessageChars + " Zeichen).");
            }
            total += message.content().length();
            clean.add(message);
        }
        if (total > maxConversationChars) {
            throw new IllegalArgumentException("Der Chat ist zu lang. Bitte einen neuen Chat beginnen.");
        }
        if (clean.isEmpty() || !clean.get(clean.size() - 1).isUser()) {
            throw new IllegalArgumentException("Die letzte Nachricht muss vom Nutzer kommen.");
        }
        return clean;
    }

    public AiChatResult streamChat(AiProviderId id, String apiKey, String model, AiAssistantMode mode,
                                   List<AiChatMessage> conversation, Consumer<String> onDelta, BooleanSupplier cancelled) {
        AiChatRequest request = new AiChatRequest(model, AiPrompts.systemPrompt(mode),
                validateConversation(conversation), maxOutputTokens);
        return provider(id).streamChat(apiKey, request, onDelta, cancelled);
    }
}
