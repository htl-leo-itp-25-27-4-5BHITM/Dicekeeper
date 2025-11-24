package resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import model.Ability;

import java.util.List;

@Path("/api/ability")
public class AbilityResource {

    @GET
    @Path("/all")
    public List<Ability> getAbilityScores() {
        return Ability.listAll();
    }
}
