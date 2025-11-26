package resource;

import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import model.Ability;
import model.Character;
import model.Character_ability;

@Path("/api/character-ability")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class CharacterAbilityResource {

    // small DTO for JSON body: { "score": 14 }
    public static class AbilityScoreUpdate {
        public int score;
    }

    /**
     * Update (or create) the ability score for a given character & ability.
     * PATCH /api/character-ability/{characterId}/{abilityId}
     */
    @PATCH
    @Path("/{characterId}/{abilityId}")
    @Transactional
    public Response updateAbilityScore(@PathParam("characterId") Long characterId,
                                       @PathParam("abilityId") Long abilityId,
                                       AbilityScoreUpdate update) {
        if (update == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Body must contain a score field").build();
        }

        Character character = Character.findById(characterId);
        if (character == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Character not found").build();
        }

        Ability ability = Ability.findById(abilityId);
        if (ability == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Ability not found").build();
        }

        Character_ability ca = Character_ability
                .find("character = ?1 and ability = ?2", character, ability)
                .firstResult();

        if (ca == null) {
            // create link if it doesn't exist yet
            ca = new Character_ability();
            ca.character = character;
            ca.ability = ability;
        }

        ca.score = update.score;
        ca.persist();

        return Response.ok(ca).build();
    }
}
