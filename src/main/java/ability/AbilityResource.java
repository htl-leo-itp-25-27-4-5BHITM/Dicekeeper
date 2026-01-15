package ability;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.stream.Collectors;

@Path("/api/ability")
@Produces(MediaType.APPLICATION_JSON)
public class AbilityResource {

    @GET
    @Path("/all")
    public Response getAbilityScores() {
        List<Ability> abilities = Ability.listAll();
        List<AbilityDTO> dtos = abilities.stream()
            .map(AbilityDTO::fromEntity)
            .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }
}

