package ai.provider;

import ai.AiChatRequest;
import ai.AiChatResult;
import ai.AiModelInfo;
import ai.AiProviderId;

import java.util.List;
import java.util.function.Consumer;
import java.util.function.BooleanSupplier;

/**
 * Gemeinsame Schnittstelle für alle KI-Anbieter. Jeder Aufruf bekommt den API-Key des Nutzers mit
 * (Bring-your-own-key); die Implementierungen halten selbst keine Keys.
 */
public interface AiProviderClient {

    AiProviderId id();

    /** Prüft den Key, indem die verfügbaren Modelle abgefragt werden. Wirft bei ungültigem Key. */
    List<AiModelInfo> listModels(String apiKey);

    /** Modell, das vorausgewählt wird, wenn der Key es anbietet. */
    String preferredModel(List<AiModelInfo> available);

    /**
     * Streamt die Antwort. onDelta bekommt Textstücke, sobald sie eintreffen. cancelled wird
     * zwischen den Stücken abgefragt, damit ein geschlossener Browser-Tab den Stream beendet.
     */
    AiChatResult streamChat(String apiKey, AiChatRequest request, Consumer<String> onDelta, BooleanSupplier cancelled);
}
