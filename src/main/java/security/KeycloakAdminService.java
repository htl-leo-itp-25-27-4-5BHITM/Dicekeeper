package security;

import account.deletion.DeletionFailureCategory;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.json.Json;
import jakarta.json.JsonObject;
import jakarta.json.JsonReader;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.StringReader;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Set;

@ApplicationScoped
public class KeycloakAdminService {

    private static final int MAX_PROVIDER_RESPONSE_BYTES = 16_384;

    private static final Set<String> PLACEHOLDERS = Set.of(
            "replace-me", "changeme", "change-me", "placeholder", "todo", "not-configured");

    @ConfigProperty(name = "quarkus.oidc.auth-server-url", defaultValue = "http://localhost:8000/realms/dicekeeper")
    String authServerUrl;

    @ConfigProperty(name = "dicekeeper.account-deletion.enabled", defaultValue = "false")
    boolean enabled;

    @ConfigProperty(name = "dicekeeper.keycloak.admin.client-id", defaultValue = "not-configured")
    String clientId;

    @ConfigProperty(name = "dicekeeper.keycloak.admin.client-secret", defaultValue = "not-configured")
    String clientSecret;

    @ConfigProperty(name = "dicekeeper.keycloak.admin.connect-timeout", defaultValue = "PT3S")
    Duration connectTimeout;

    @ConfigProperty(name = "dicekeeper.keycloak.admin.request-timeout", defaultValue = "PT5S")
    Duration requestTimeout;

    private volatile HttpClient httpClient;

    public AdminSession preflight() {
        validateConfiguration();
        RealmEndpoint endpoint = resolveRealmEndpoint();
        return new AdminSession(endpoint, fetchAdminAccessToken(endpoint));
    }

    public void deleteUser(String keycloakUserId) {
        deleteUser(keycloakUserId, preflight());
    }

    public void deleteUser(String keycloakUserId, AdminSession session) {
        if (isBlank(keycloakUserId)) {
            throw new KeycloakAdminException(
                    DeletionFailureCategory.CONFIGURATION,
                    "The authenticated Keycloak subject is unavailable");
        }
        if (session == null) {
            throw new KeycloakAdminException(
                    DeletionFailureCategory.CONFIGURATION,
                    "The Keycloak administrative session is unavailable");
        }

        URI deleteUri = URI.create(session.endpoint.adminBaseUrl()
                + "/admin/realms/" + encodePathSegment(session.endpoint.realm())
                + "/users/" + encodePathSegment(keycloakUserId));

        HttpRequest request = HttpRequest.newBuilder(deleteUri)
                .timeout(requestTimeout)
                .header("Authorization", "Bearer " + session.accessToken)
                .DELETE()
                .build();

        ProviderResponse response = send(request, "Keycloak user deletion failed");
        int status = response.statusCode();
        if (status == 204 || status == 404) {
            return;
        }
        throw statusFailure(status, "Keycloak user deletion was rejected");
    }

    public void validateConfiguration() {
        if (!enabled) {
            throw new KeycloakAdminException(
                    DeletionFailureCategory.CONFIGURATION,
                    "Account deletion is disabled");
        }
        if (!validCredential(clientId) || !validCredential(clientSecret)) {
            throw new KeycloakAdminException(
                    DeletionFailureCategory.CONFIGURATION,
                    "Keycloak account-administration credentials are not configured");
        }
        if (connectTimeout == null || connectTimeout.isZero() || connectTimeout.isNegative()
                || requestTimeout == null || requestTimeout.isZero() || requestTimeout.isNegative()) {
            throw new KeycloakAdminException(
                    DeletionFailureCategory.CONFIGURATION,
                    "Keycloak account-administration timeouts are invalid");
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean isReady() {
        if (!enabled) {
            return true;
        }
        try {
            validateConfiguration();
            resolveRealmEndpoint();
            return true;
        } catch (KeycloakAdminException failure) {
            return false;
        }
    }

    private String fetchAdminAccessToken(RealmEndpoint endpoint) {
        String body = "grant_type=client_credentials"
                + "&client_id=" + encodeForm(clientId)
                + "&client_secret=" + encodeForm(clientSecret);

        HttpRequest request = HttpRequest.newBuilder(endpoint.tokenUri())
                .timeout(requestTimeout)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        ProviderResponse response = send(request, "Keycloak admin token request failed");
        int status = response.statusCode();
        if (status < 200 || status >= 300) {
            throw statusFailure(status, "Keycloak admin authentication was rejected");
        }

        try (JsonReader reader = Json.createReader(new StringReader(response.body()))) {
            JsonObject json = reader.readObject();
            String token = json.getString("access_token", null);
            if (isBlank(token)) {
                throw new KeycloakAdminException(
                        DeletionFailureCategory.UPSTREAM_STATUS,
                        status,
                        "Keycloak returned an invalid token response");
            }
            return token;
        } catch (KeycloakAdminException known) {
            throw known;
        } catch (RuntimeException malformed) {
            throw new KeycloakAdminException(
                    DeletionFailureCategory.UPSTREAM_STATUS,
                    status,
                    "Keycloak returned an invalid token response");
        }
    }

    private ProviderResponse send(HttpRequest request, String safeMessage) {
        try {
            HttpResponse<InputStream> response = client().send(request, HttpResponse.BodyHandlers.ofInputStream());
            try (InputStream body = response.body()) {
                byte[] bounded = body.readNBytes(MAX_PROVIDER_RESPONSE_BYTES + 1);
                int length = Math.min(bounded.length, MAX_PROVIDER_RESPONSE_BYTES);
                return new ProviderResponse(
                        response.statusCode(),
                        new String(bounded, 0, length, StandardCharsets.UTF_8));
            }
        } catch (HttpTimeoutException timeout) {
            throw new KeycloakAdminException(
                    DeletionFailureCategory.TIMEOUT, null, safeMessage, timeout);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new KeycloakAdminException(
                    DeletionFailureCategory.TRANSPORT, null, safeMessage, interrupted);
        } catch (Exception transport) {
            throw new KeycloakAdminException(
                    DeletionFailureCategory.TRANSPORT, null, safeMessage, transport);
        }
    }

    private HttpClient client() {
        HttpClient current = httpClient;
        if (current == null) {
            synchronized (this) {
                current = httpClient;
                if (current == null) {
                    current = HttpClient.newBuilder().connectTimeout(connectTimeout).build();
                    httpClient = current;
                }
            }
        }
        return current;
    }

    private KeycloakAdminException statusFailure(int status, String safeMessage) {
        DeletionFailureCategory category = switch (status) {
            case 400, 401 -> DeletionFailureCategory.AUTHENTICATION;
            case 403 -> DeletionFailureCategory.AUTHORIZATION;
            default -> DeletionFailureCategory.UPSTREAM_STATUS;
        };
        return new KeycloakAdminException(category, status, safeMessage);
    }

    private RealmEndpoint resolveRealmEndpoint() {
        try {
            URI authUri = URI.create(trimTrailingSlash(authServerUrl));
            String path = trimTrailingSlash(authUri.getPath());
            int realmsIndex = path.lastIndexOf("/realms/");
            if (realmsIndex < 0) {
                throw new IllegalArgumentException("realm path missing");
            }

            String realmPath = path.substring(realmsIndex + "/realms/".length());
            int nextSlash = realmPath.indexOf('/');
            String realm = nextSlash >= 0 ? realmPath.substring(0, nextSlash) : realmPath;
            if (isBlank(realm)) {
                throw new IllegalArgumentException("realm missing");
            }

            String adminRootPath = path.substring(0, realmsIndex);
            String adminBaseUrl = authUri.getScheme() + "://" + authUri.getAuthority() + adminRootPath;
            URI tokenUri = URI.create(trimTrailingSlash(authServerUrl) + "/protocol/openid-connect/token");
            return new RealmEndpoint(trimTrailingSlash(adminBaseUrl), realm, tokenUri);
        } catch (RuntimeException invalid) {
            throw new KeycloakAdminException(
                    DeletionFailureCategory.CONFIGURATION,
                    "The Keycloak realm URL is invalid");
        }
    }

    private boolean validCredential(String value) {
        return !isBlank(value) && !PLACEHOLDERS.contains(value.trim().toLowerCase());
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

    private record RealmEndpoint(String adminBaseUrl, String realm, URI tokenUri) {
    }

    private record ProviderResponse(int statusCode, String body) {
    }

    public static final class AdminSession {
        private final RealmEndpoint endpoint;
        private final String accessToken;

        private AdminSession(RealmEndpoint endpoint, String accessToken) {
            this.endpoint = endpoint;
            this.accessToken = accessToken;
        }

        @Override
        public String toString() {
            return "KeycloakAdminSession[redacted]";
        }
    }
}
