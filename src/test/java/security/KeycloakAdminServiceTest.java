package security;

import account.deletion.DeletionFailureCategory;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class KeycloakAdminServiceTest {

    private HttpServer server;
    private final AtomicReference<String> tokenBody = new AtomicReference<>("{\"access_token\":\"test-token\"}");
    private final AtomicInteger tokenStatus = new AtomicInteger(200);
    private final AtomicInteger deleteStatus = new AtomicInteger(204);
    private final AtomicInteger tokenDelayMillis = new AtomicInteger();

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/realms/test/protocol/openid-connect/token", exchange -> {
            delay(tokenDelayMillis.get());
            respond(exchange, tokenStatus.get(), tokenBody.get());
        });
        server.createContext("/admin/realms/test/users/", exchange ->
                respond(exchange, deleteStatus.get(), "provider-body-secret-stack-trace"));
        server.start();
    }

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void acceptsTokenAndTreatsDelete204And404AsComplete() {
        KeycloakAdminService service = service();
        service.deleteUser("subject/with spaces");
        deleteStatus.set(404);
        service.deleteUser("already-absent");
    }

    @Test
    void classifiesMalformedTokenInvalidClientAndForbiddenDelete() {
        tokenBody.set("not-json");
        KeycloakAdminException malformed = assertThrows(KeycloakAdminException.class,
                () -> service().preflight());
        assertEquals(DeletionFailureCategory.UPSTREAM_STATUS, malformed.category());

        tokenBody.set("{\"error\":\"invalid_client\",\"secret\":\"must-not-leak\"}");
        tokenStatus.set(401);
        KeycloakAdminException invalidClient = assertThrows(KeycloakAdminException.class,
                () -> service().preflight());
        assertEquals(DeletionFailureCategory.AUTHENTICATION, invalidClient.category());
        assertFalse(invalidClient.getMessage().contains("must-not-leak"));

        tokenStatus.set(200);
        tokenBody.set("{\"access_token\":\"test-token\"}");
        deleteStatus.set(403);
        KeycloakAdminException forbidden = assertThrows(KeycloakAdminException.class,
                () -> service().deleteUser("subject"));
        assertEquals(DeletionFailureCategory.AUTHORIZATION, forbidden.category());
        assertEquals(403, forbidden.upstreamStatus());
        assertFalse(forbidden.getMessage().contains("provider-body"));
    }

    @Test
    void classifiesUpstreamTransportAndTimeoutFailures() throws IOException {
        deleteStatus.set(500);
        KeycloakAdminException upstream = assertThrows(KeycloakAdminException.class,
                () -> service().deleteUser("subject"));
        assertEquals(DeletionFailureCategory.UPSTREAM_STATUS, upstream.category());

        int closedPort = server.getAddress().getPort();
        server.stop(0);
        server = null;
        KeycloakAdminService transportService = configured("http://127.0.0.1:" + closedPort + "/realms/test");
        KeycloakAdminException transport = assertThrows(KeycloakAdminException.class, transportService::preflight);
        assertEquals(DeletionFailureCategory.TRANSPORT, transport.category());

        startServer();
        tokenDelayMillis.set(250);
        KeycloakAdminService timeoutService = service();
        timeoutService.requestTimeout = Duration.ofMillis(50);
        KeycloakAdminException timeout = assertThrows(KeycloakAdminException.class, timeoutService::preflight);
        assertEquals(DeletionFailureCategory.TIMEOUT, timeout.category());
    }

    @Test
    void requiresValidConfigurationOnlyWhenEnabled() {
        KeycloakAdminService disabled = service();
        disabled.enabled = false;
        disabled.clientId = "";
        disabled.clientSecret = "replace-me";
        assertTrue(disabled.isReady());

        for (String invalid : new String[]{"", " ", "replace-me", "placeholder"}) {
            KeycloakAdminService enabled = service();
            enabled.clientSecret = invalid;
            assertFalse(enabled.isReady(), "invalid value: " + invalid);
            assertThrows(KeycloakAdminException.class, enabled::validateConfiguration);
        }

        KeycloakAdminService configuredClient = service();
        assertTrue(configuredClient.isReady());
        assertDoesNotThrow(configuredClient::validateConfiguration);
    }

    private KeycloakAdminService service() {
        return configured("http://127.0.0.1:" + server.getAddress().getPort() + "/realms/test");
    }

    private KeycloakAdminService configured(String authServerUrl) {
        KeycloakAdminService service = new KeycloakAdminService();
        service.authServerUrl = authServerUrl;
        service.enabled = true;
        service.clientId = "dicekeeper-web";
        service.clientSecret = "browser-test-secret";
        service.connectTimeout = Duration.ofMillis(250);
        service.requestTimeout = Duration.ofSeconds(1);
        return service;
    }

    private void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, status == 204 ? -1 : bytes.length);
        if (status != 204) {
            exchange.getResponseBody().write(bytes);
        }
        exchange.close();
    }

    private void delay(int millis) {
        if (millis <= 0) return;
        try {
            Thread.sleep(millis);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
    }
}
