package resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import model.Background;

import java.util.List;

@Path("/api/background")
public class BackgroundResource {

    @GET
    @Path("/all")
    public List<Background> getBackgrounds() {
        return Background.listAll();
    }

    @GET
    @Path("{id}")
    public Background getBackgroundById(@PathParam("id") int id) {
        return Background.findById((long) id);
    }
}
