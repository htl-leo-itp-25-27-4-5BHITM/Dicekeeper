package ai.playground;

import ai.AiAssistantMode;
import ai.AiChatMessage;
import ai.AiChatResult;
import ai.AiCredentialStore;
import ai.AiGateway;
import ai.AiModelInfo;
import ai.AiProviderException;
import ai.AiProviderId;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.common.annotation.Blocking;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.infrastructure.Infrastructure;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotAuthorizedException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.RestStreamElementType;
import security.SecurityIdentityService;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * DEV-ONLY: Backend der versteckten KI-Testseite (#/dev/ki-test).
 *
 * Nur aktiv, wenn dicekeeper.ai-playground.enabled=true (lokal im dev-Profil automatisch, sonst
 * per Umgebungsvariable AI_PLAYGROUND_ENABLED). Andernfalls antworten alle Endpunkte mit 404.
 * Zum Entfernen: dieses Paket ai/playground, app/dev/ und die markierte Route in main.js löschen.
 * Das Paket ai/ (Gateway, Provider, Prompts) bleibt für die echten KI-Features bestehen.
 */
@Path("/api/dev/ai")
@Authenticated
@Blocking
public class AiPlaygroundResource {

    private static final Logger LOG = Logger.getLogger(AiPlaygroundResource.class);

    @ConfigProperty(name = "dicekeeper.ai-playground.enabled", defaultValue = "false")
    boolean enabled;

    @Inject
    AiGateway gateway;

    @Inject
    AiCredentialStore credentials;

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

    public record ConnectRequest(String provider, String apiKey) {
    }

    public record ChatRequest(String provider, String model, String mode, List<AiChatMessage> messages) {
    }

    /** Ein Ereignis im Antwort-Stream: type = delta | done | error. */
    public record StreamEvent(String type, String text, String stopReason, Long inputTokens, Long outputTokens) {
        static StreamEvent delta(String text) {
            return new StreamEvent("delta", text, null, null, null);
        }

        static StreamEvent done(AiChatResult result) {
            return new StreamEvent("done", null, result.stopReason(), result.inputTokens(), result.outputTokens());
        }

        static StreamEvent error(String message) {
            return new StreamEvent("error", message, null, null, null);
        }
    }

    private void requireEnabled() {
        if (!enabled) {
            throw new NotFoundException();
        }
    }

    private String subject() {
        String subject = securityIdentityService.getCurrentSubject(securityIdentity);
        if (subject == null || subject.isBlank()) {
            throw new NotAuthorizedException("Bearer");
        }
        return subject;
    }

    @GET
    @Path("status")
    @Produces(MediaType.APPLICATION_JSON)
    public Map<String, Object> status() {
        requireEnabled();
        String subject = subject();
        Map<String, Object> providers = new LinkedHashMap<>();
        for (AiProviderId id : AiProviderId.values()) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("name", id.displayName());
            credentials.get(subject, id).ifPresentOrElse(key -> {
                entry.put("connected", true);
                entry.put("keyHint", key.hint());
                entry.put("connectedAt", key.connectedAt().toString());
            }, () -> entry.put("connected", false));
            providers.put(id.key(), entry);
        }
        return Map.of("providers", providers);
    }

    @POST
    @Path("connect")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response connect(ConnectRequest request) {
        requireEnabled();
        String subject = subject();
        AiProviderId provider = parseProvider(request == null ? null : request.provider());
        String apiKey = request.apiKey() == null ? "" : request.apiKey().trim();
        if (apiKey.length() < 20 || apiKey.length() > 300 || apiKey.chars().anyMatch(Character::isWhitespace)) {
            throw bad("Das sieht nicht nach einem gültigen API-Key aus.");
        }
        try {
            List<AiModelInfo> models = gateway.listModels(provider, apiKey);
            credentials.put(subject, provider, apiKey);
            return Response.ok(modelsPayload(provider, models)).build();
        } catch (AiProviderException e) {
            LOG.infof("KI-Testseite: Verbinden mit %s fehlgeschlagen (%s)", provider, e.getMessage());
            return Response.status(e.category() == AiProviderException.Category.INVALID_KEY ? 400 : 502)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", e.category().userMessage()))
                    .build();
        }
    }

    @DELETE
    @Path("connect/{provider}")
    public Response disconnect(@PathParam("provider") String rawProvider) {
        requireEnabled();
        credentials.remove(subject(), parseProvider(rawProvider));
        return Response.noContent().build();
    }

    @GET
    @Path("models/{provider}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response models(@PathParam("provider") String rawProvider) {
        requireEnabled();
        AiProviderId provider = parseProvider(rawProvider);
        String apiKey = credentials.get(subject(), provider)
                .orElseThrow(() -> bad("Nicht mit " + provider.displayName() + " verbunden."))
                .apiKey();
        try {
            return Response.ok(modelsPayload(provider, gateway.listModels(provider, apiKey))).build();
        } catch (AiProviderException e) {
            return Response.status(502).type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", e.category().userMessage())).build();
        }
    }

    @POST
    @Path("chat")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestStreamElementType(MediaType.APPLICATION_JSON)
    public Multi<StreamEvent> chat(ChatRequest request) {
        requireEnabled();
        String subject = subject();
        if (request == null) {
            throw bad("Anfrage fehlt.");
        }
        AiProviderId provider = parseProvider(request.provider());
        String apiKey = credentials.get(subject, provider)
                .orElseThrow(() -> bad("Nicht mit " + provider.displayName() + " verbunden."))
                .apiKey();
        String model = request.model() == null || request.model().isBlank() ? null : request.model().trim();
        if (model == null || model.length() > 120) {
            throw bad("Kein Modell gewählt.");
        }
        AiAssistantMode mode = AiAssistantMode.parse(request.mode());
        List<AiChatMessage> conversation;
        try {
            conversation = gateway.validateConversation(request.messages());
        } catch (IllegalArgumentException e) {
            throw bad(e.getMessage());
        }

        return Multi.createFrom().<StreamEvent>emitter(emitter -> {
            AtomicBoolean cancelled = new AtomicBoolean(false);
            emitter.onTermination(() -> cancelled.set(true));
            try {
                AiChatResult result = gateway.streamChat(provider, apiKey, model, mode, conversation,
                        text -> emitter.emit(StreamEvent.delta(text)), cancelled::get);
                emitter.emit(StreamEvent.done(result));
            } catch (AiProviderException e) {
                LOG.infof("KI-Testseite: Chat mit %s/%s fehlgeschlagen (%s)", provider, model, e.getMessage());
                emitter.emit(StreamEvent.error(e.category().userMessage()));
            } catch (RuntimeException e) {
                LOG.warn("KI-Testseite: unerwarteter Fehler", e);
                emitter.emit(StreamEvent.error("Unerwarteter Fehler auf dem Server."));
            }
            emitter.complete();
        }).runSubscriptionOn(Infrastructure.getDefaultWorkerPool());
    }

    /** 400 mit nutzerlesbarer Meldung als JSON ({"error": "..."}). */
    private static WebApplicationException bad(String message) {
        return new WebApplicationException(Response.status(400)
                .type(MediaType.APPLICATION_JSON)
                .entity(Map.of("error", message))
                .build());
    }

    private static AiProviderId parseProvider(String raw) {
        try {
            return AiProviderId.parse(raw);
        } catch (IllegalArgumentException e) {
            throw bad(e.getMessage());
        }
    }

    private Map<String, Object> modelsPayload(AiProviderId provider, List<AiModelInfo> models) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("provider", provider.key());
        payload.put("models", new ArrayList<>(models));
        payload.put("defaultModel", gateway.preferredModel(provider, models));
        return payload;
    }
}
