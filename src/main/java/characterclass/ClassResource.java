package characterclass;

import io.quarkus.security.Authenticated;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.stream.Collectors;

@Path("/api/classes")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class ClassResource {

    @GET
    public Response getCharacterClasses() {
        List<CharacterClass> classes = CharacterClass.listAll();
        List<ClassDTO> dtos = classes.stream()
            .map(ClassDTO::fromEntity)
            .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    @GET
    @Path("{id}")
    public Response getClassById(@PathParam("id") Long id) {
        CharacterClass clazz = CharacterClass.findById(id);
        if (clazz == null) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity("Class not found").build();
        }
        return Response.ok(ClassDTO.fromEntity(clazz)).build();
    }
}
