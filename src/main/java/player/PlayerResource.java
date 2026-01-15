package player;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/player")
@Produces(MediaType.APPLICATION_JSON)
public class PlayerResource {

    @GET
    @Path("{email}")
    public Response getPlayerByEmail(@PathParam("email") String email) {
        try {
            Player player = Player.find("email", email).firstResult();
            if (player == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Player with email " + email + " not found")
                        .build();
            }
            return Response.ok(player).build();
        } catch (Exception e) {
            String msg = "Service temporarily unavailable: " + e.getMessage();
            return Response.status(Response.Status.SERVICE_UNAVAILABLE)
                    .entity(msg)
                    .build();
        }
    }

    @GET
    @Path("id/{id}")
    public Response getPlayerById(@PathParam("id") Long id) {
        try {
            Player player = Player.findById(id);
            if (player == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Player with id " + id + " not found")
                        .build();
            }
            return Response.ok(player).build();
        } catch (Exception e) {
            String msg = "Service temporarily unavailable: " + e.getMessage();
            return Response.status(Response.Status.SERVICE_UNAVAILABLE)
                    .entity(msg)
                    .build();
        }
    }
}

