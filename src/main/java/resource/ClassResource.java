package resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import model.classes;

import java.util.List;

@Path("/api/classes")
public class ClassResource {

    @GET
    public List<classes> getCharacterClasses() {
        return classes.listAll();
    }
}
