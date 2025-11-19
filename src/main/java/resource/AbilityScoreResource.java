package resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import model.Ability;

import java.util.List;

@Path("/api/ability-score")
public class AbilityScoreResource {

    @GET
    @Path("/all")
    public List<Ability> getAbilityScores() {
        return Ability.listAll();
    }
}
