package resource;

import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Response;
import model.Character;

@Path("/api/character")
public class CharacterResource {

    // Create a new character with just the name
    //TODO: check if the character has aready been created for the user
    @POST
    @Transactional
    public Response createCharacter(Character character) {
        if (character.name == null || character.name.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Character name is required.")
                    .build();
        }
        if (character.classId == 0) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Character classId is required.")
                    .build();
        }
        if (character.backgroundId == 0) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Character backgroundId is required.")
                    .build();
        }

        character.persist();
        return Response.status(Response.Status.CREATED)
                .entity(character)
                .build();
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

    // Update any fields
    @PATCH
    @Path("/{id}")
    @Transactional
    public Response updateCharacter(@PathParam("id") Long id, Character updated) {
        Character existing = Character.findById(id);
        if (existing == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        // Only update fields that are not null in the request
        if (updated.name != null) existing.name = updated.name;
//        if (updated.raceId != 0) existing.raceId = updated.raceId;
        if (updated.classId != 0) existing.classId = updated.classId;
        if (updated.backgroundId != 0) existing.backgroundId = updated.backgroundId;
        if (updated.info != null) existing.info = updated.info;

        return Response.ok(existing).build();
    }


}
