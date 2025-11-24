package resource;

import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Response;
import model.Ability;
import model.Character;
import model.Character_ability;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Path("/api/character")
public class CharacterResource {

    // Create a new character with just the name
    //TODO: check if the character has aready been created for the user
//    @POST
//    @Transactional
//    public Response createCharacter(Character character) {
//        if (character.name == null || character.name.isBlank()) {
//            return Response.status(Response.Status.BAD_REQUEST)
//                    .entity("Character name is required.")
//                    .build();
//        }
//        if (character.classId == 0) {
//            return Response.status(Response.Status.BAD_REQUEST)
//                    .entity("Character classId is required.")
//                    .build();
//        }
//        if (character.backgroundId == 0) {
//            return Response.status(Response.Status.BAD_REQUEST)
//                    .entity("Character backgroundId is required.")
//                    .build();
//        }
//
//        character.persist();
//        return Response.status(Response.Status.CREATED)
//                .entity(character)
//                .build();
//    }


    @POST
    @Path("/createInitialCharacter")
    @Transactional
    public Response createInitialCharacter() {
        Character character = new Character();

        character.persist();
        return Response.status(Response.Status.CREATED)
                .entity(character)
                .build();
    }



//    @POST
//    @Path("/saveClass")
//    @Transactional
//    @Consumes("application/json")
//    public Response saveCharacterClass() {
//
//    }




    @GET
    @Path("/all")
    public Response getAllCharacters() {
        return Response.ok(Character.listAll()).build();
    }

    @GET
    @Path("/{id}")
    public Response getCharacter(@PathParam("id") Long id) {
        Character character = Character.findById(id);
        if (character == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(character).build();
    }

    @GET
    @Path("/{id}/getName")
    public Response getCharacterName(@PathParam("id") Long id) {
        Character character = Character
                .findById(id);
        if (character == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(character.name).build();
    }


    @GET
    @Path("/{id}/getAbilityScores")
    public Response getCharacterAbilityScores(@PathParam("id") Long id) {

        Character character = Character.findById(id);
        if (character == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        // Fetch all Character_ability rows for this character
        List<Character_ability> list = Character_ability.list("character", character);

        // Convert to DTO
        List<Map<String, Object>> result = new ArrayList<>();

        for (Character_ability entry : list) {
            Map<String, Object> data = new HashMap<>();
            data.put("abilityKey", entry.ability.name);   // or ability.key if you add one
            data.put("abilityId", entry.ability.id);      // optional
            data.put("score", entry.score);
            result.add(data);
        }

        return Response.ok(result).build();
    }


    // Update any fields
//    @PATCH
//    @Path("/{id}")
//    @Transactional
//    public Response updateCharacter(@PathParam("id") Long id, Character updated) {
//        Character existing = Character.findById(id);
//        if (existing == null) {
//            return Response.status(Response.Status.NOT_FOUND).build();
//        }
//
//        // Only update fields that are not null in the request
//        if (updated.name != null) existing.name = updated.name;
////        if (updated.raceId != 0) existing.raceId = updated.raceId;
//        if (updated.classId != 0) existing.classId = updated.classId;
//        if (updated.backgroundId != 0) existing.backgroundId = updated.backgroundId;
//        if (updated.info != null) existing.info = updated.info;
//
//        return Response.ok(existing).build();
//    }


}
