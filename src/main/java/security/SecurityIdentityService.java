package security;

import io.quarkus.oidc.UserInfo;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.json.JsonNumber;
import jakarta.json.JsonString;
import jakarta.json.JsonValue;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import player.Player;

import java.security.Principal;
import java.util.Locale;
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

        // If the user previously logged in without an email claim, migrate the synthetic user row.
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

        if (!isBlank(resolvedUsername)
                && (isBlank(player.username) || isSyntheticUsername(player.username) || usernameLooksLikeDisplayName)
                && !resolvedUsername.equals(player.username)) {
            player.username = resolvedUsername;
            changed = true;
        }

        if (!isBlank(explicitDisplayName) && !explicitDisplayName.equals(player.name)) {
            player.name = explicitDisplayName;
            changed = true;
        } else if (!isBlank(resolvedName) && (isBlank(player.name) || isSyntheticDisplayName(player.name))) {
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
        String fromClaims = firstNonBlank(
                attributeString(identity, "email"),
                attributeString(identity, "upn"),
                userInfoClaim(identity, "email"),
                jwtClaim(identity, "email")
        );
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
                attributeString(identity, "sub"),
                userInfoClaim(identity, "sub"),
                jwtClaim(identity, "sub"),
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
                attributeString(identity, "preferred_username"),
                attributeString(identity, "username"),
                userInfoClaim(identity, "preferred_username"),
                userInfoClaim(identity, "username"),
                jwtClaim(identity, "preferred_username"),
                jwtClaim(identity, "username"),
                attributeString(identity, "nickname"),
                usernameFromSubject(identity),
                usernameFromEmail(emailFallback)
        );
    }

    private String resolveDisplayName(SecurityIdentity identity, String explicitDisplayName, String usernameFallback, String emailFallback) {
        String fullNameFromParts = fullName(
                firstNonBlank(attributeString(identity, "given_name"), userInfoClaim(identity, "given_name"), jwtClaim(identity, "given_name")),
                firstNonBlank(attributeString(identity, "family_name"), userInfoClaim(identity, "family_name"), jwtClaim(identity, "family_name"))
        );

        return firstNonBlank(
                explicitDisplayName,
                attributeString(identity, "name"),
                userInfoClaim(identity, "name"),
                jwtClaim(identity, "name"),
                fullNameFromParts,
                attributeString(identity, "given_name"),
                userInfoClaim(identity, "given_name"),
                jwtClaim(identity, "given_name"),
                usernameFallback,
                usernameFromEmail(emailFallback),
                emailFallback
        );
    }

    private String resolveExplicitDisplayName(SecurityIdentity identity) {
        return firstNonBlank(
                attributeString(identity, "displayname"),
                attributeString(identity, "displayName"),
                attributeString(identity, "display_name"),
                userInfoClaim(identity, "displayname"),
                userInfoClaim(identity, "displayName"),
                userInfoClaim(identity, "display_name"),
                jwtClaim(identity, "displayname"),
                jwtClaim(identity, "displayName"),
                jwtClaim(identity, "display_name")
        );
    }

    private String usernameFromSubject(SecurityIdentity identity) {
        String subject = firstNonBlank(
                attributeString(identity, "sub"),
                userInfoClaim(identity, "sub"),
                jwtClaim(identity, "sub"),
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

    private String attributeString(SecurityIdentity identity, String key) {
        if (identity == null || key == null) {
            return null;
        }
        return objectToString(identity.getAttributes().get(key));
    }

    private String userInfoClaim(SecurityIdentity identity, String claim) {
        if (identity == null || claim == null) {
            return null;
        }

        Object userInfoObj = identity.getAttributes().get("userinfo");
        if (userInfoObj instanceof UserInfo userInfo) {
            return objectToString(userInfo.get(claim));
        }
        if (userInfoObj instanceof Map<?, ?> map) {
            return objectToString(map.get(claim));
        }

        return null;
    }

    private String jwtClaim(SecurityIdentity identity, String claim) {
        if (identity == null || claim == null) {
            return null;
        }
        Principal principal = identity.getPrincipal();
        if (principal instanceof JsonWebToken jwt && jwt.containsClaim(claim)) {
            return objectToString(jwt.getClaim(claim));
        }
        return null;
    }

    private String objectToString(Object value) {
        switch (value) {
            case null -> {
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

    private String fullName(String firstName, String lastName) {
        if (isBlank(firstName) && isBlank(lastName)) {
            return null;
        }
        if (isBlank(firstName)) {
            return lastName.trim();
        }
        if (isBlank(lastName)) {
            return firstName.trim();
        }
        return firstName.trim() + " " + lastName.trim();
    }
}
