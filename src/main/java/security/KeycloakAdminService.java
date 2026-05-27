package security;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.json.JsonReader;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.StringReader;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

@ApplicationScoped
public class KeycloakAdminService {

    @ConfigProperty(name = "quarkus.oidc.auth-server-url", defaultValue = "http://localhost:8000/realms/dicekeeper")
    String authServerUrl;

    @ConfigProperty(name = "dicekeeper.keycloak.admin.enabled", defaultValue = "true")
    boolean enabled;

    @ConfigProperty(name = "dicekeeper.keycloak.admin.client-id", defaultValue = "dicekeeper-web")
    String clientId;

    @ConfigProperty(name = "dicekeeper.keycloak.admin.client-secret", defaultValue = "replace-me")
    String clientSecret;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public void deleteUser(String keycloakUserId) {
        if (!enabled) {
            throw new IllegalStateException("Keycloak account deletion is disabled");
        }
        if (isBlank(keycloakUserId)) {
            throw new IllegalStateException("Could not resolve Keycloak user id for current session");
        }
        if (isBlank(clientId) || isBlank(clientSecret) || "replace-me".equals(clientSecret)) {
            throw new IllegalStateException("Keycloak admin client credentials are not configured");
        }

        RealmEndpoint endpoint = resolveRealmEndpoint();
        String token = fetchAdminAccessToken(endpoint);
        deleteUser(endpoint, keycloakUserId, token);
    }

    private String fetchAdminAccessToken(RealmEndpoint endpoint) {
        String body = "grant_type=client_credentials"
                + "&client_id=" + encodeForm(clientId)
                + "&client_secret=" + encodeForm(clientSecret);

        HttpRequest request = HttpRequest.newBuilder(endpoint.tokenUri())
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = send(request, "Keycloak admin token request failed");
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Keycloak admin token request failed with HTTP " + response.statusCode());
        }

        try (JsonReader reader = Json.createReader(new StringReader(response.body()))) {
            JsonObject json = reader.readObject();
            String token = json.getString("access_token", null);
            if (isBlank(token)) {
                throw new IllegalStateException("Keycloak admin token response did not include an access token");
            }
            return token;
        }
    }

    private void deleteUser(RealmEndpoint endpoint, String keycloakUserId, String token) {
        URI deleteUri = URI.create(endpoint.adminBaseUrl()
                + "/admin/realms/" + encodePathSegment(endpoint.realm())
                + "/users/" + encodePathSegment(keycloakUserId));

        HttpRequest request = HttpRequest.newBuilder(deleteUri)
                .header("Authorization", "Bearer " + token)
                .DELETE()
                .build();

        HttpResponse<String> response = send(request, "Keycloak user deletion failed");
        if (response.statusCode() == 204 || response.statusCode() == 404) {
            return;
        }

        throw new IllegalStateException("Keycloak user deletion failed with HTTP " + response.statusCode());
    }

    private HttpResponse<String> send(HttpRequest request, String message) {
        try {
            return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(message + ": interrupted", e);
        } catch (Exception e) {
            throw new IllegalStateException(message + ": " + e.getMessage(), e);
        }
    }

    private RealmEndpoint resolveRealmEndpoint() {
        URI authUri = URI.create(trimTrailingSlash(authServerUrl));
        String path = trimTrailingSlash(authUri.getPath());
        int realmsIndex = path.lastIndexOf("/realms/");
        if (realmsIndex < 0) {
            throw new IllegalStateException("quarkus.oidc.auth-server-url must include /realms/{realm}");
        }

        String realmPath = path.substring(realmsIndex + "/realms/".length());
        int nextSlash = realmPath.indexOf('/');
        String realm = nextSlash >= 0 ? realmPath.substring(0, nextSlash) : realmPath;
        if (isBlank(realm)) {
            throw new IllegalStateException("Could not resolve Keycloak realm from auth-server-url");
        }

        String adminRootPath = path.substring(0, realmsIndex);
        String adminBaseUrl = authUri.getScheme() + "://" + authUri.getAuthority() + adminRootPath;
        URI tokenUri = URI.create(trimTrailingSlash(authServerUrl) + "/protocol/openid-connect/token");
        return new RealmEndpoint(trimTrailingSlash(adminBaseUrl), realm, tokenUri);
    }

    private String encodeForm(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String encodePathSegment(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private String trimTrailingSlash(String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        while (trimmed.endsWith("/") && trimmed.length() > 1) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private record RealmEndpoint(String adminBaseUrl, String realm, URI tokenUri) {}
}
