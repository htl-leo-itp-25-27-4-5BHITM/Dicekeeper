package ai;

import ai.provider.AnthropicProviderClient;
import io.quarkus.test.junit.QuarkusMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

/** DEV-ONLY: gehört zur KI-Testseite und wird mit ihr gelöscht. */
@QuarkusTest
class AiPlaygroundResourceTest {

    static final String GOOD_KEY = "sk-ant-test-0123456789abcdefWXYZ";

    static class FakeAnthropic extends AnthropicProviderClient {
        final AtomicReference<AiChatRequest> lastRequest = new AtomicReference<>();

        @Override
        public List<AiModelInfo> listModels(String apiKey) {
            if (!GOOD_KEY.equals(apiKey)) {
                throw new AiProviderException(AiProviderException.Category.INVALID_KEY, "401", null);
            }
            return List.of(new AiModelInfo("claude-sonnet-5-5", "Claude Sonnet 5.5"),
                    new AiModelInfo("claude-opus-5-5", "Claude Opus 5.5"));
        }

        @Override
        public AiChatResult streamChat(String apiKey, AiChatRequest request, Consumer<String> onDelta, BooleanSupplier cancelled) {
            lastRequest.set(request);
            onDelta.accept("Hallo ");
            onDelta.accept("Abenteurer");
            return new AiChatResult("end", 12L, 3L);
        }
    }

    FakeAnthropic fake;

    @BeforeEach
    void installFake() {
        fake = new FakeAnthropic();
        QuarkusMock.installMockForType(fake, AnthropicProviderClient.class);
    }

    @Test
    void requiresLogin() {
        given().when().get("/api/dev/ai/status").then().statusCode(401);
    }

    @Test
    @TestSecurity(user = "ai-status")
    void statusStartsDisconnected() {
        given().when().get("/api/dev/ai/status").then().statusCode(200)
                .body("providers.openai.connected", is(false))
                .body("providers.anthropic.connected", is(false));
    }

    @Test
    @TestSecurity(user = "ai-bad-key")
    void rejectsMalformedAndInvalidKeys() {
        given().contentType(ContentType.JSON).body("{\"provider\":\"anthropic\",\"apiKey\":\"short\"}")
                .when().post("/api/dev/ai/connect").then().statusCode(400).body("error", notNullValue());
        given().contentType(ContentType.JSON).body("{\"provider\":\"anthropic\",\"apiKey\":\"sk-ant-wrong-0123456789abcdef\"}")
                .when().post("/api/dev/ai/connect").then().statusCode(400)
                .body("error", containsString("abgelehnt"));
        given().when().get("/api/dev/ai/status").then().body("providers.anthropic.connected", is(false));
    }

    @Test
    @TestSecurity(user = "ai-chat")
    void connectsWithoutLeakingKeyAndStreamsChat() {
        String connectBody = given().contentType(ContentType.JSON)
                .body("{\"provider\":\"anthropic\",\"apiKey\":\"" + GOOD_KEY + "\"}")
                .when().post("/api/dev/ai/connect").then().statusCode(200)
                .body("defaultModel", is("claude-opus-5-5"))
                .extract().asString();
        assertFalse(connectBody.contains(GOOD_KEY));

        String status = given().when().get("/api/dev/ai/status").then().statusCode(200)
                .body("providers.anthropic.connected", is(true))
                .body("providers.anthropic.keyHint", is("••••WXYZ"))
                .extract().asString();
        assertFalse(status.contains(GOOD_KEY));

        String stream = given().contentType(ContentType.JSON)
                .body("""
                        {"provider":"anthropic","model":"claude-opus-5-5","mode":"session_help",
                         "messages":[{"role":"user","content":"Wie funktioniert Grappling?"}]}""")
                .when().post("/api/dev/ai/chat").then().statusCode(200)
                .extract().asString();
        assertTrue(stream.contains("\"type\":\"delta\""), stream);
        assertTrue(stream.contains("Abenteurer"), stream);
        assertTrue(stream.contains("\"type\":\"done\""), stream);
        assertTrue(fake.lastRequest.get().systemPrompt().contains("laufenden Session"));

        given().when().delete("/api/dev/ai/connect/anthropic").then().statusCode(204);
        given().when().get("/api/dev/ai/status").then().body("providers.anthropic.connected", is(false));
    }

    @Test
    @TestSecurity(user = "ai-not-connected")
    void chatWithoutConnectionFails() {
        given().contentType(ContentType.JSON)
                .body("{\"provider\":\"openai\",\"model\":\"gpt-5\",\"messages\":[{\"role\":\"user\",\"content\":\"Hi\"}]}")
                .when().post("/api/dev/ai/chat").then().statusCode(400).body("error", notNullValue());
    }

    @Test
    @TestSecurity(user = "ai-validation")
    void rejectsConversationEndingWithAssistant() {
        given().contentType(ContentType.JSON).body("{\"provider\":\"anthropic\",\"apiKey\":\"" + GOOD_KEY + "\"}")
                .when().post("/api/dev/ai/connect").then().statusCode(200);
        given().contentType(ContentType.JSON)
                .body("{\"provider\":\"anthropic\",\"model\":\"claude-opus-5-5\",\"messages\":[{\"role\":\"assistant\",\"content\":\"Hi\"}]}")
                .when().post("/api/dev/ai/chat").then().statusCode(400).body("error", notNullValue());
    }
}
