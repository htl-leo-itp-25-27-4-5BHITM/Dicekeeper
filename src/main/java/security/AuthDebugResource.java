package security;

import io.quarkus.arc.profile.IfBuildProfile;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.Map;

@Path("/api/auth/debug")
@Produces(MediaType.APPLICATION_JSON)
@IfBuildProfile("dev")
@Authenticated
public class AuthDebugResource {

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

    @GET
    @Path("claims")
    public Map<String, Object> claims() {
        return securityIdentityService.debugClaims(securityIdentity);
    }
}
