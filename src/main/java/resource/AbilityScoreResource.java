package resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import model.Ability_Score;

import java.util.List;

@Path("/api/ability-score")
public class AbilityScoreResource {

    @GET
    @Path("/all")
    public List<Ability_Score> getAbilityScores() {
        return Ability_Score.listAll();
    }
}
