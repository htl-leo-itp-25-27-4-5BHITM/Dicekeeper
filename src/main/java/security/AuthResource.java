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

@Path("/api/auth")
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {

    private static final String DEFAULT_REDIRECT = "/campaign-creation/Campaigns.html";

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

    @GET
    @Path("login")
    @Authenticated
    @Transactional
    public Response login(@QueryParam("redirect") String redirectPath) {
        // Ensure a Player row exists for the authenticated Keycloak user.
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
        if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
            return URI.create(DEFAULT_REDIRECT);
        }

        return URI.create(trimmed);
    }
}
