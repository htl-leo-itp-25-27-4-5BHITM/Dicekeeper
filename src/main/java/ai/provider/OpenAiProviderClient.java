package ai.provider;

import ai.AiChatMessage;
import ai.AiChatRequest;
import ai.AiChatResult;
import ai.AiModelInfo;
import ai.AiProviderException;
import ai.AiProviderId;
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.core.http.StreamResponse;
import com.openai.errors.OpenAIIoException;
import com.openai.errors.OpenAIServiceException;
import com.openai.models.chat.completions.ChatCompletionChunk;
import com.openai.models.chat.completions.ChatCompletionCreateParams;
import com.openai.models.chat.completions.ChatCompletionStreamOptions;
import com.openai.models.models.Model;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
import java.util.regex.Pattern;

/**
 * OpenAI über das offizielle OpenAI-Java-SDK (Chat Completions).
 */
@ApplicationScoped
public class OpenAiProviderClient implements AiProviderClient {

    /** Nur Chat-Modelle anbieten, keine Audio-/Bild-/Embedding-Modelle. */
    private static final Pattern CHAT_MODEL = Pattern.compile("^(gpt-|o\\d|chatgpt-).*");
    private static final Pattern NON_CHAT = Pattern.compile(
            ".*(audio|realtime|tts|transcribe|image|embedding|search|instruct|moderation|whisper|dall-e|codex|computer-use).*");
    private static final Pattern SIZE_SUFFIX = Pattern.compile(".*-(mini|nano)(-.*)?$");

    @Override
    public AiProviderId id() {
        return AiProviderId.OPENAI;
    }

    private OpenAIClient client(String apiKey) {
        return OpenAIOkHttpClient.builder()
                .apiKey(apiKey)
                .timeout(Duration.ofMinutes(5))
                .maxRetries(1)
                .build();
    }

    @Override
    public List<AiModelInfo> listModels(String apiKey) {
        OpenAIClient client = client(apiKey);
        try {
            List<AiModelInfo> models = new ArrayList<>();
            for (Model model : client.models().list().autoPager()) {
                String id = model.id();
                String lower = id.toLowerCase(Locale.ROOT);
                if (CHAT_MODEL.matcher(lower).matches() && !NON_CHAT.matcher(lower).matches()) {
                    models.add(new AiModelInfo(id, id));
                }
            }
            models.sort(Comparator.comparing(AiModelInfo::id).reversed());
            return models;
        } catch (RuntimeException e) {
            throw translate(e);
        } finally {
            client.close();
        }
    }

    @Override
    public String preferredModel(List<AiModelInfo> available) {
        // Neueste "volle" GPT-Version ohne Datums-Snapshot bevorzugen (z. B. gpt-5.5 vor gpt-5.5-mini).
        return available.stream()
                .map(AiModelInfo::id)
                .filter(id -> id.startsWith("gpt-"))
                .filter(id -> !SIZE_SUFFIX.matcher(id).matches())
                .filter(id -> !id.matches(".*-\\d{4}-\\d{2}-\\d{2}$"))
                .findFirst()
                .orElse(available.isEmpty() ? "gpt-5" : available.get(0).id());
    }

    @Override
    public AiChatResult streamChat(String apiKey, AiChatRequest request, Consumer<String> onDelta, BooleanSupplier cancelled) {
        ChatCompletionCreateParams.Builder params = ChatCompletionCreateParams.builder()
                .model(request.model())
                .maxCompletionTokens(request.maxOutputTokens())
                .streamOptions(ChatCompletionStreamOptions.builder().includeUsage(true).build())
                .addDeveloperMessage(request.systemPrompt());
        for (AiChatMessage message : request.messages()) {
            if (message.isAssistant()) {
                params.addAssistantMessage(message.content());
            } else {
                params.addUserMessage(message.content());
            }
        }

        OpenAIClient client = client(apiKey);
        Long inputTokens = null;
        Long outputTokens = null;
        String stopReason = "other";
        try (StreamResponse<ChatCompletionChunk> stream = client.chat().completions().createStreaming(params.build())) {
            Iterator<ChatCompletionChunk> chunks = stream.stream().iterator();
            while (chunks.hasNext()) {
                if (cancelled.getAsBoolean()) {
                    return new AiChatResult("cancelled", inputTokens, outputTokens);
                }
                ChatCompletionChunk chunk = chunks.next();
                for (ChatCompletionChunk.Choice choice : chunk.choices()) {
                    choice.delta().content().ifPresent(text -> {
                        if (!text.isEmpty()) {
                            onDelta.accept(text);
                        }
                    });
                    choice.delta().refusal().ifPresent(text -> {
                        if (!text.isEmpty()) {
                            onDelta.accept(text);
                        }
                    });
                    if (choice.finishReason().isPresent()) {
                        stopReason = switch (choice.finishReason().get().toString()) {
                            case "stop" -> "end";
                            case "length" -> "max_tokens";
                            case "content_filter" -> "refusal";
                            default -> "other";
                        };
                    }
                }
                if (chunk.usage().isPresent()) {
                    inputTokens = chunk.usage().get().promptTokens();
                    outputTokens = chunk.usage().get().completionTokens();
                }
            }
            return new AiChatResult(stopReason, inputTokens, outputTokens);
        } catch (RuntimeException e) {
            throw translate(e);
        } finally {
            client.close();
        }
    }

    private static AiProviderException translate(RuntimeException e) {
        if (e instanceof AiProviderException ai) {
            return ai;
        }
        if (e instanceof OpenAIServiceException service) {
            return new AiProviderException(AiProviderException.categoryForStatus(service.statusCode()),
                    "OpenAI HTTP " + service.statusCode(), e);
        }
        if (e instanceof OpenAIIoException) {
            return new AiProviderException(AiProviderException.Category.UNAVAILABLE, "OpenAI I/O", e);
        }
        return new AiProviderException(AiProviderException.Category.UNKNOWN, e.getClass().getSimpleName(), e);
    }
}
