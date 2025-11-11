package resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import model.Race;

import java.util.List;

@Path("/api/race")
public class RaceResource {

    @Path("/all")
    @GET
    public List<Race> getRaces() {
        return Race.listAll();
    }


}
