package resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import model.Background;

import java.util.List;

@Path("/api/background")
public class BackgroundResource {

    @GET
    @Path("/all")
    public List<Background> getBackgrounds() {
        return Background.listAll();
    }
}
