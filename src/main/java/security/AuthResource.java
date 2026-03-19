package security;

import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import player.Player;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

@Path("/api/auth")
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {

    private static final String DEFAULT_REDIRECT = "/#/campaigns";

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

    @GET
    @Path("callback")
    public Response callback(@QueryParam("error") String error,
                             @QueryParam("error_description") String errorDescription) {
        if (hasText(error) || hasText(errorDescription)) {
            return Response.seeOther(loginViewUri(Map.of(
                    "kc_error", defaultString(error),
                    "kc_error_description", defaultString(errorDescription)
            ))).build();
        }

        return Response.seeOther(loginViewUri(Map.of("kc", "1"))).build();
    }

    @GET
    @Path("error")
    public Response error(@QueryParam("error") String error,
                          @QueryParam("error_description") String errorDescription) {
        return Response.seeOther(loginViewUri(Map.of(
                "kc_error", defaultString(error),
                "kc_error_description", defaultString(errorDescription)
        ))).build();
    }

    @GET
    @Path("session-expired")
    public Response sessionExpired() {
        return Response.seeOther(loginViewUri(Map.of("kc_expired", "1"))).build();
    }

    @GET
    @Path("login")
    @Authenticated
    @Transactional
    public Response login(@QueryParam("redirect") String redirectPath) {
        securityIdentityService.getOrCreateCurrentPlayer(securityIdentity);
        return Response.seeOther(safeRedirect(redirectPath)).build();
    }

    @GET
    @Path("me")
    @Authenticated
    @Transactional
    public Response me() {
        Player player = securityIdentityService.getOrCreateCurrentPlayer(securityIdentity);
        return Response.ok(player).build();
    }

    private URI safeRedirect(String redirectPath) {
        if (redirectPath == null || redirectPath.isBlank()) {
            return URI.create(DEFAULT_REDIRECT);
        }

        String trimmed = redirectPath.trim();
        if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.contains("://")) {
            return URI.create(DEFAULT_REDIRECT);
        }

        return URI.create(trimmed);
    }

    private URI loginViewUri(Map<String, String> params) {
        Map<String, String> filtered = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (hasText(entry.getValue())) {
                filtered.put(entry.getKey(), entry.getValue());
            }
        }

        if (filtered.isEmpty()) {
            return URI.create("/#/login");
        }

        StringBuilder builder = new StringBuilder("/#/login?");
        boolean first = true;
        for (Map.Entry<String, String> entry : filtered.entrySet()) {
            if (!first) {
                builder.append('&');
            }
            builder.append(encode(entry.getKey()))
                    .append('=')
                    .append(encode(entry.getValue()));
            first = false;
        }
        return URI.create(builder.toString());
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String defaultString(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
