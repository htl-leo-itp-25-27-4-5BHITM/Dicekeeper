package character.ability;

import ability.Ability;
import character.Character;
import io.quarkus.security.Authenticated;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/character-ability")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class CharacterAbilityResource {

    /**
     * Update (or create) the ability score for a given character & ability.
     */
    @PATCH
    @Path("/{characterId}/{abilityId}")
    @Transactional
    public Response updateAbilityScore(@PathParam("characterId") Long characterId,
                                       @PathParam("abilityId") Long abilityId,
                                       AbilityScoreUpdateDTO update) {
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

        CharacterAbility ca = CharacterAbility
                .find("character = ?1 and ability = ?2", character, ability)
                .firstResult();

        if (ca == null) {
            ca = new CharacterAbility();
            ca.character = character;
            ca.ability = ability;
        }

        ca.score = update.score;
        ca.persist();

        return Response.ok(AbilityScoreDTO.fromEntity(ca)).build();
    }
}
