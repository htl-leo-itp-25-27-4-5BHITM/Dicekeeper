package background;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.stream.Collectors;

@Path("/api/background")
@Produces(MediaType.APPLICATION_JSON)
public class BackgroundResource {

    @GET
    @Path("/all")
    public Response getBackgrounds() {
        List<Background> backgrounds = Background.listAll();
        List<BackgroundDTO> dtos = backgrounds.stream()
            .map(BackgroundDTO::fromEntity)
            .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    @GET
    @Path("{id}")
    public Response getBackgroundById(@PathParam("id") Long id) {
        Background background = Background.findById(id);
        if (background == null) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity("Background not found").build();
        }
        return Response.ok(BackgroundDTO.fromEntity(background)).build();
    }
}

