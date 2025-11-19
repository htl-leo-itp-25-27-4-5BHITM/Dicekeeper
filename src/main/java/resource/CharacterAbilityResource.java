package resource;

import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Response;
import model.Character_ability;

@Path("/api/character-ability")
public class CharacterAbilityResource {

    @POST
    public void initialCreateCharacterAbility() {

    }

    @PATCH
    public Response updateCharacterAbilities(Character_ability[] updatedScores) {
        for (Character_ability updated : updatedScores) {
            Character_ability existing = Character_ability.findById(updated.id);
            if (existing == null) {
                return Response.status(Response.Status.NOT_FOUND).build();
            }

            // Update only the score field
            existing.score = updated.score;
        }
        return Response.ok().build();

    }

}
