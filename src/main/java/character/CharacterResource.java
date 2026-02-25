package character;

import character.ability.AbilityScoreDTO;
import character.ability.CharacterAbility;
import background.Background;
import characterclass.CharacterClass;
import io.quarkus.security.Authenticated;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.stream.Collectors;

@Path("/api/character")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class CharacterResource {

    /**
     * Create a new empty character for the character creation flow.
     */
    @POST
    @Path("/createInitialCharacter")
    @Transactional
    public Response createInitialCharacter() {
        Character character = new Character();
        character.persist();

        CharacterDTO dto = CharacterDTO.fromEntity(character);
        return Response.status(Response.Status.CREATED).entity(dto).build();
    }

    /**
     * Get all characters as DTOs.
     */
    @GET
    @Path("/all")
    public Response getAllCharacters() {
        List<Character> characters = Character.listAll();
        List<CharacterDTO> dtos = characters.stream()
            .map(this::toFullDTO)
            .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    /**
     * Get a single character with all related data (class, background, ability scores).
     */
    @GET
    @Path("/{id}")
    public Response getCharacter(@PathParam("id") Long id) {
        Character character = Character.findById(id);
        if (character == null) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity("Character not found").build();
        }

        CharacterDTO dto = toFullDTO(character);
        return Response.ok(dto).build();
    }

    /**
     * Get just the character name.
     */
    @GET
    @Path("/{id}/getName")
    public Response getCharacterName(@PathParam("id") Long id) {
        Character character = Character.findById(id);
        if (character == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(character.name).build();
    }

    /**
     * Get ability scores for a character.
     */
    @GET
    @Path("/{id}/getAbilityScores")
    public Response getCharacterAbilityScores(@PathParam("id") Long id) {
        Character character = Character.findById(id);
        if (character == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        List<CharacterAbility> list = CharacterAbility.list("character", character);
        List<AbilityScoreDTO> result = list.stream()
            .map(AbilityScoreDTO::fromEntity)
            .collect(Collectors.toList());

        return Response.ok(result).build();
    }

    /**
     * Update character fields. Only non-null fields will be updated.
     */
    @PATCH
    @Path("/{id}")
    @Transactional
    public Response updateCharacter(@PathParam("id") Long id, CharacterUpdateDTO updated) {
        Character existing = Character.findById(id);
        if (existing == null) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity("Character not found").build();
        }

        if (updated.name != null) {
            existing.name = updated.name;
        }
        if (updated.classId != null) {
            existing.classId = updated.classId;
        }
        if (updated.backgroundId != null) {
            existing.backgroundId = updated.backgroundId.intValue();
        }
        if (updated.info != null) {
            existing.info = updated.info;
        }
        if (updated.level != null) {
            existing.level = updated.level;
        }
        if (updated.race != null) {
            existing.race = updated.race;
        }
        if (updated.alignment != null) {
            existing.alignment = updated.alignment;
        }

        CharacterDTO dto = toFullDTO(existing);
        return Response.ok(dto).build();
    }

    /**
     * Delete a character.
     */
    @DELETE
    @Path("/{id}")
    @Transactional
    public Response deleteCharacter(@PathParam("id") Long id) {
        Character character = Character.findById(id);
        if (character == null) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity("Character not found").build();
        }

        CharacterAbility.delete("character", character);
        character.delete();
        return Response.noContent().build();
    }

    private CharacterDTO toFullDTO(Character character) {
        CharacterClass clazz = null;
        if (character.classId != 0) {
            clazz = CharacterClass.findById(character.classId);
        }

        Background background = null;
        if (character.backgroundId != 0) {
            background = Background.findById((long) character.backgroundId);
        }

        List<CharacterAbility> abilityScores = CharacterAbility.list("character", character);

        return CharacterDTO.fromEntityWithRelations(character, clazz, background, abilityScores);
    }
}
