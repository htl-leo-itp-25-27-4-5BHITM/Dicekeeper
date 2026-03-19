package security;

import io.quarkus.oidc.UserInfo;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.json.JsonArray;
import jakarta.json.JsonNumber;
import jakarta.json.JsonObject;
import jakarta.json.JsonString;
import jakarta.json.JsonValue;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import player.Player;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@ApplicationScoped
public class SecurityIdentityService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    @Transactional
    public Player getOrCreateCurrentPlayer(SecurityIdentity identity) {
        String realEmail = resolveEmail(identity);
        String normalizedRealEmail = isBlank(realEmail) ? null : realEmail.toLowerCase(Locale.ROOT);
        String fallbackEmail = resolveFallbackEmail(identity);
        String lookupEmail = normalizedRealEmail != null ? normalizedRealEmail : fallbackEmail;

        Player player = Player.find("lower(email) = ?1", lookupEmail).firstResult();

        if (player == null && normalizedRealEmail != null && !normalizedRealEmail.equals(fallbackEmail)) {
            player = Player.find("lower(email) = ?1", fallbackEmail).firstResult();
        }

        String resolvedIdentityEmail = normalizedRealEmail != null ? normalizedRealEmail : fallbackEmail;
        String resolvedUsername = resolveUsername(identity, resolvedIdentityEmail);
        String explicitDisplayName = resolveExplicitDisplayName(identity);
        String resolvedName = resolveDisplayName(identity, explicitDisplayName, resolvedUsername, resolvedIdentityEmail);

        if (player == null) {
            player = new Player();
            player.email = resolvedIdentityEmail;
            player.username = resolvedUsername;
            player.name = resolvedName;
            player.persist();
            return player;
        }

        boolean changed = false;
        String emailBasedUsername = usernameFromEmail(player.email);

        if (normalizedRealEmail != null && isSyntheticEmail(player.email) && !normalizedRealEmail.equalsIgnoreCase(player.email)) {
            Player collision = Player.find("lower(email) = ?1", normalizedRealEmail).firstResult();
            if (collision == null || collision.id.equals(player.id)) {
                player.email = normalizedRealEmail;
                changed = true;
            }
        }

        boolean usernameLooksLikeDisplayName = !isBlank(explicitDisplayName)
                && !isBlank(player.username)
                && player.username.equals(player.name)
                && player.username.equals(explicitDisplayName);
        boolean usernameLooksGenerated = isBlank(player.username)
                || isSyntheticUsername(player.username)
                || equalsIgnoreCase(player.username, emailBasedUsername)
                || equalsIgnoreCase(player.username, resolvedUsername);

        if (!isBlank(resolvedUsername)
                && (usernameLooksGenerated || usernameLooksLikeDisplayName)
                && !resolvedUsername.equals(player.username)) {
            player.username = resolvedUsername;
            changed = true;
        }

        if (!isBlank(explicitDisplayName) && !explicitDisplayName.equals(player.name)) {
            player.name = explicitDisplayName;
            changed = true;
        } else if (!isBlank(resolvedName)
                && (isBlank(player.name)
                || isSyntheticDisplayName(player.name)
                || equalsIgnoreCase(player.name, player.username)
                || equalsIgnoreCase(player.name, emailBasedUsername)
                || equalsIgnoreCase(player.name, resolvedName))
                && !resolvedName.equals(player.name)) {
            player.name = resolvedName;
            changed = true;
        }

        if (changed) {
            player.persist();
        }

        return player;
    }

    @Transactional
    public Long getCurrentPlayerId(SecurityIdentity identity) {
        return getOrCreateCurrentPlayer(identity).id;
    }

    public Map<String, Object> debugClaims(SecurityIdentity identity) {
        String realEmail = resolveEmail(identity);
        String normalizedRealEmail = isBlank(realEmail) ? null : realEmail.toLowerCase(Locale.ROOT);
        String fallbackEmail = resolveFallbackEmail(identity);
        String resolvedIdentityEmail = normalizedRealEmail != null ? normalizedRealEmail : fallbackEmail;
        String resolvedUsername = resolveUsername(identity, resolvedIdentityEmail);
        String explicitDisplayName = resolveExplicitDisplayName(identity);
        String resolvedName = resolveDisplayName(identity, explicitDisplayName, resolvedUsername, resolvedIdentityEmail);

        Map<String, Object> resolved = new LinkedHashMap<>();
        resolved.put("email", resolvedIdentityEmail);
        resolved.put("username", resolvedUsername);
        resolved.put("displayName", explicitDisplayName);
        resolved.put("name", resolvedName);

        Map<String, Object> candidates = new LinkedHashMap<>();
        candidates.put("email", claimString(identity, "email", "upn"));
        candidates.put("preferred_username", claimString(identity, "preferred_username", "preferredUserName"));
        candidates.put("username", claimString(identity, "username"));
        candidates.put("displayname", claimString(identity, "displayname", "displayName", "display_name"));
        candidates.put("name", claimString(identity, "name"));
        candidates.put("given_name", claimString(identity, "given_name"));
        candidates.put("family_name", claimString(identity, "family_name"));
        candidates.put("sub", claimString(identity, "sub"));

        Map<String, Object> debug = new LinkedHashMap<>();
        debug.put("principal", identity != null && identity.getPrincipal() != null ? identity.getPrincipal().getName() : null);
        debug.put("resolved", resolved);
        debug.put("candidateClaims", candidates);
        debug.put("identityAttributeKeys", identity != null ? new ArrayList<>(identity.getAttributes().keySet()) : List.of());
        debug.put("userInfoKeys", userInfoKeys(identity));
        debug.put("jwtClaimNames", jwtClaimNames(identity));
        return debug;
    }

    @Transactional
    public Response requireCurrentPlayer(SecurityIdentity identity, Long requestedPlayerId) {
        Long currentPlayerId = getCurrentPlayerId(identity);
        if (!currentPlayerId.equals(requestedPlayerId)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("You can only access your own player data")
                    .build();
        }
        return null;
    }

    private String resolveEmail(SecurityIdentity identity) {
        String fromClaims = claimString(identity, "email", "upn");
        if (!isBlank(fromClaims) && EMAIL_PATTERN.matcher(fromClaims).matches()) {
            return fromClaims;
        }

        String principal = identity.getPrincipal() != null ? identity.getPrincipal().getName() : null;
        if (!isBlank(principal) && EMAIL_PATTERN.matcher(principal).matches()) {
            return principal;
        }

        return null;
    }

    private String resolveFallbackEmail(SecurityIdentity identity) {
        String subject = firstNonBlank(
                claimString(identity, "sub"),
                identity.getPrincipal() != null ? identity.getPrincipal().getName() : null
        );

        if (!isBlank(subject)) {
            String safe = subject.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9._-]", "_");
            return "kc_" + safe + "@noemail.local";
        }

        throw new WebApplicationException(
                "Could not resolve a stable user identifier from Keycloak token.",
                Response.Status.BAD_REQUEST
        );
    }

    private boolean isSyntheticEmail(String value) {
        return !isBlank(value) && value.toLowerCase(Locale.ROOT).endsWith("@noemail.local");
    }

    private boolean isSyntheticUsername(String value) {
        return !isBlank(value) && value.toLowerCase(Locale.ROOT).startsWith("kc_");
    }

    private boolean isSyntheticDisplayName(String value) {
        if (isBlank(value)) {
            return true;
        }
        String lowered = value.toLowerCase(Locale.ROOT);
        return lowered.startsWith("kc_") || lowered.endsWith("@noemail.local");
    }

    private String resolveUsername(SecurityIdentity identity, String emailFallback) {
        return firstNonBlank(
                claimString(identity, "preferred_username", "preferredUserName", "username", "nickname"),
                usernameFromSubject(identity),
                usernameFromEmail(emailFallback)
        );
    }

    private String resolveDisplayName(SecurityIdentity identity,
                                      String explicitDisplayName,
                                      String usernameFallback,
                                      String emailFallback) {
        return firstNonBlank(
                explicitDisplayName,
                usernameFallback,
                usernameFromEmail(emailFallback),
                emailFallback
        );
    }

    private String resolveExplicitDisplayName(SecurityIdentity identity) {
        return claimString(identity, "displayname", "displayName", "display_name", "Displayname");
    }

    private String usernameFromSubject(SecurityIdentity identity) {
        String subject = firstNonBlank(
                claimString(identity, "sub"),
                identity.getPrincipal() != null ? identity.getPrincipal().getName() : null
        );
        if (isBlank(subject)) {
            return null;
        }

        String safe = subject.replaceAll("[^A-Za-z0-9._-]", "_");
        return safe.isBlank() ? null : safe;
    }

    private String usernameFromEmail(String email) {
        if (isBlank(email)) {
            return "player";
        }
        int at = email.indexOf('@');
        if (at <= 0) {
            return email;
        }
        return email.substring(0, at);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (!isBlank(value)) {
                return value;
            }
        }
        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private boolean equalsIgnoreCase(String left, String right) {
        return left != null && right != null && left.equalsIgnoreCase(right);
    }

    private String claimString(SecurityIdentity identity, String... keys) {
        for (String key : keys) {
            String value = firstNonBlank(
                    attributeString(identity, key),
                    userInfoClaim(identity, key),
                    jwtClaim(identity, key)
            );
            if (!isBlank(value)) {
                return value;
            }
        }
        return null;
    }

    private String attributeString(SecurityIdentity identity, String key) {
        if (identity == null || key == null) {
            return null;
        }
        return mapValue(identity.getAttributes(), key);
    }

    private String userInfoClaim(SecurityIdentity identity, String claim) {
        if (identity == null || claim == null) {
            return null;
        }

        Object userInfoObj = identity.getAttributes().get("userinfo");
        if (userInfoObj instanceof UserInfo userInfo) {
            return jsonObjectValue(userInfo.getJsonObject(), claim);
        }
        if (userInfoObj instanceof Map<?, ?> map) {
            return mapValue(map, claim);
        }

        return null;
    }

    private String jwtClaim(SecurityIdentity identity, String claim) {
        if (identity == null || claim == null) {
            return null;
        }
        Principal principal = identity.getPrincipal();
        if (principal instanceof JsonWebToken jwt) {
            Object directValue = claimValue(jwt, claim);
            if (directValue != null) {
                return objectToString(directValue);
            }

            Object nestedAttributes = claimValue(jwt, "attributes");
            if (nestedAttributes instanceof JsonObject jsonObject) {
                return jsonObjectValue(jsonObject, claim);
            }
            if (nestedAttributes instanceof Map<?, ?> map) {
                return mapValue(map, claim);
            }
        }
        return null;
    }

    private String objectToString(Object value) {
        switch (value) {
            case null -> {
                return null;
            }
            case JsonArray jsonArray -> {
                for (JsonValue item : jsonArray) {
                    String resolved = objectToString(item);
                    if (!isBlank(resolved)) {
                        return resolved;
                    }
                }
                return null;
            }
            case Collection<?> collection -> {
                for (Object item : collection) {
                    String resolved = objectToString(item);
                    if (!isBlank(resolved)) {
                        return resolved;
                    }
                }
                return null;
            }
            case JsonString jsonString -> {
                return jsonString.getString().trim();
            }
            case JsonNumber jsonNumber -> {
                return jsonNumber.toString();
            }
            case JsonValue jsonValue -> {
                JsonValue.ValueType type = jsonValue.getValueType();
                if (type == JsonValue.ValueType.TRUE || type == JsonValue.ValueType.FALSE) {
                    return jsonValue.toString();
                }
                return null;
            }
            case String s -> {
                return s.trim();
            }
            default -> {
            }
        }
        if (value instanceof Number || value instanceof Boolean) {
            return String.valueOf(value);
        }
        return null;
    }

    private String mapValue(Map<?, ?> values, String key) {
        if (values == null || key == null) {
            return null;
        }

        Object direct = values.get(key);
        if (direct != null) {
            return objectToString(direct);
        }

        for (Map.Entry<?, ?> entry : values.entrySet()) {
            if (entry.getKey() instanceof String entryKey && entryKey.equalsIgnoreCase(key)) {
                return objectToString(entry.getValue());
            }
        }

        Object attributes = values.get("attributes");
        if (attributes instanceof Map<?, ?> nestedMap) {
            return mapValue(nestedMap, key);
        }
        if (attributes instanceof JsonObject nestedJson) {
            return jsonObjectValue(nestedJson, key);
        }

        return null;
    }

    private String jsonObjectValue(JsonObject jsonObject, String key) {
        if (jsonObject == null || key == null) {
            return null;
        }

        if (jsonObject.containsKey(key)) {
            return objectToString(jsonObject.get(key));
        }

        for (String propertyName : jsonObject.keySet()) {
            if (propertyName.equalsIgnoreCase(key)) {
                return objectToString(jsonObject.get(propertyName));
            }
        }

        JsonObject nestedAttributes = jsonObject.getJsonObject("attributes");
        if (nestedAttributes != null) {
            return jsonObjectValue(nestedAttributes, key);
        }

        return null;
    }

    private Object claimValue(JsonWebToken jwt, String claim) {
        if (jwt == null || claim == null) {
            return null;
        }

        if (jwt.containsClaim(claim)) {
            return jwt.getClaim(claim);
        }

        for (String claimName : jwt.getClaimNames()) {
            if (claimName.equalsIgnoreCase(claim)) {
                return jwt.getClaim(claimName);
            }
        }

        return null;
    }

    private List<String> userInfoKeys(SecurityIdentity identity) {
        if (identity == null) {
            return List.of();
        }

        Object userInfoObj = identity.getAttributes().get("userinfo");
        if (userInfoObj instanceof UserInfo userInfo) {
            return new ArrayList<>(userInfo.getPropertyNames());
        }
        if (userInfoObj instanceof Map<?, ?> map) {
            return map.keySet().stream().map(String::valueOf).toList();
        }
        return List.of();
    }

    private List<String> jwtClaimNames(SecurityIdentity identity) {
        if (identity == null || !(identity.getPrincipal() instanceof JsonWebToken jwt)) {
            return List.of();
        }
        return new ArrayList<>(jwt.getClaimNames());
    }
}
