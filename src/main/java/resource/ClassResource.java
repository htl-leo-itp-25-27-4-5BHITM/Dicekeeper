package resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import model.Class;

import java.util.List;

@Path("/api/classes")
public class ClassResource {

    @GET
    public List<Class> getCharacterClasses() {
        return Class.listAll();
    }
}
