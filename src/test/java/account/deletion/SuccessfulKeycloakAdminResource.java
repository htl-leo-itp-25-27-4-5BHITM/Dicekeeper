package account.deletion;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

public class SuccessfulKeycloakAdminResource implements QuarkusTestResourceLifecycleManager {

    private static final AtomicInteger TOKEN_REQUESTS = new AtomicInteger();
    private static final AtomicInteger DELETE_REQUESTS = new AtomicInteger();

    private HttpServer server;

    @Override
    public Map<String, String> start() {
        try {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/realms/dicekeeper/protocol/openid-connect/token", exchange -> {
                TOKEN_REQUESTS.incrementAndGet();
                respond(exchange, 200, "{\"access_token\":\"test-token\"}");
            });
            server.createContext("/admin/realms/dicekeeper/users/", exchange -> {
                DELETE_REQUESTS.incrementAndGet();
                respond(exchange, 204, "");
            });
            server.start();

            String authServerUrl = "http://127.0.0.1:" + server.getAddress().getPort()
                    + "/realms/dicekeeper";
            return Map.of(
                    "quarkus.oidc.auth-server-url", authServerUrl,
                    "dicekeeper.account-deletion.enabled", "true",
                    "dicekeeper.keycloak.admin.client-id", "test-client",
                    "dicekeeper.keycloak.admin.client-secret", "not-a-real-credential"
            );
        } catch (IOException failure) {
            throw new IllegalStateException("Could not start the fake Keycloak admin boundary", failure);
        }
    }

    @Override
    public void stop() {
        if (server != null) {
            server.stop(0);
        }
    }

    static void resetCounts() {
        TOKEN_REQUESTS.set(0);
        DELETE_REQUESTS.set(0);
    }

    static int tokenRequests() {
        return TOKEN_REQUESTS.get();
    }

    static int deleteRequests() {
        return DELETE_REQUESTS.get();
    }

    private void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, status == 204 ? -1 : bytes.length);
        if (status != 204) {
            exchange.getResponseBody().write(bytes);
        }
        exchange.close();
    }
}
