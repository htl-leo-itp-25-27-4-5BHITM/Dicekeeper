package ai.provider;

import ai.AiChatMessage;
import ai.AiChatRequest;
import ai.AiChatResult;
import ai.AiModelInfo;
import ai.AiProviderException;
import ai.AiProviderId;
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.http.StreamResponse;
import com.anthropic.errors.AnthropicIoException;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.RawMessageStreamEvent;
import com.anthropic.models.messages.StopReason;
import com.anthropic.models.models.ModelInfo;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

/**
 * Claude über das offizielle Anthropic-Java-SDK.
 */
@ApplicationScoped
public class AnthropicProviderClient implements AiProviderClient {

    /** Reihenfolge der Vorauswahl. Opus 5.5 ist das aktuelle Standardmodell. */
    private static final List<String> PREFERRED = List.of("claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5");

    @Override
    public AiProviderId id() {
        return AiProviderId.ANTHROPIC;
    }

    private AnthropicClient client(String apiKey) {
        return AnthropicOkHttpClient.builder()
                .apiKey(apiKey)
                .timeout(Duration.ofMinutes(5))
                .maxRetries(1)
                .build();
    }

    @Override
    public List<AiModelInfo> listModels(String apiKey) {
        AnthropicClient client = client(apiKey);
        try {
            List<AiModelInfo> models = new ArrayList<>();
            for (ModelInfo info : client.models().list().autoPager()) {
                models.add(new AiModelInfo(info.id(), info.displayName()));
            }
            return models;
        } catch (RuntimeException e) {
            throw translate(e);
        } finally {
            client.close();
        }
    }

    @Override
    public String preferredModel(List<AiModelInfo> available) {
        for (String id : PREFERRED) {
            if (available.stream().anyMatch(m -> m.id().equals(id))) {
                return id;
            }
        }
        return available.isEmpty() ? PREFERRED.get(0) : available.get(0).id();
    }

    @Override
    public AiChatResult streamChat(String apiKey, AiChatRequest request, Consumer<String> onDelta, BooleanSupplier cancelled) {
        MessageCreateParams.Builder params = MessageCreateParams.builder()
                .model(request.model())
                .maxTokens(request.maxOutputTokens())
                .system(request.systemPrompt());
        for (AiChatMessage message : request.messages()) {
            if (message.isAssistant()) {
                params.addAssistantMessage(message.content());
            } else {
                params.addUserMessage(message.content());
            }
        }

        AnthropicClient client = client(apiKey);
        Long inputTokens = null;
        Long outputTokens = null;
        String stopReason = "other";
        try (StreamResponse<RawMessageStreamEvent> stream = client.messages().createStreaming(params.build())) {
            Iterator<RawMessageStreamEvent> events = stream.stream().iterator();
            while (events.hasNext()) {
                if (cancelled.getAsBoolean()) {
                    return new AiChatResult("cancelled", inputTokens, outputTokens);
                }
                RawMessageStreamEvent event = events.next();
                if (event.isMessageStart()) {
                    inputTokens = event.asMessageStart().message().usage().inputTokens();
                } else if (event.isContentBlockDelta()) {
                    event.asContentBlockDelta().delta().text().ifPresent(t -> onDelta.accept(t.text()));
                } else if (event.isMessageDelta()) {
                    var delta = event.asMessageDelta();
                    outputTokens = delta.usage().outputTokens();
                    stopReason = delta.delta().stopReason().map(AnthropicProviderClient::mapStopReason).orElse(stopReason);
                }
            }
            return new AiChatResult(stopReason, inputTokens, outputTokens);
        } catch (RuntimeException e) {
            throw translate(e);
        } finally {
            client.close();
        }
    }

    private static String mapStopReason(StopReason reason) {
        if (StopReason.END_TURN.equals(reason)) {
            return "end";
        }
        if (StopReason.MAX_TOKENS.equals(reason)) {
            return "max_tokens";
        }
        if (StopReason.REFUSAL.equals(reason)) {
            return "refusal";
        }
        return "other";
    }

    private static AiProviderException translate(RuntimeException e) {
        if (e instanceof AiProviderException ai) {
            return ai;
        }
        if (e instanceof AnthropicServiceException service) {
            return new AiProviderException(AiProviderException.categoryForStatus(service.statusCode()),
                    "Anthropic HTTP " + service.statusCode(), e);
        }
        if (e instanceof AnthropicIoException) {
            return new AiProviderException(AiProviderException.Category.UNAVAILABLE, "Anthropic I/O", e);
        }
        return new AiProviderException(AiProviderException.Category.UNKNOWN, e.getClass().getSimpleName(), e);
    }
}
