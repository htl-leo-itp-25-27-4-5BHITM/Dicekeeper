package resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import model.Class;

import java.util.List;

@Path("/api/classes")
public class ClassResource {

    @GET
    public List<Class> getCharacterClasses() {
        return Class.listAll();
    }

    @GET
    @Path("{id}")
    public Class getClassById(@PathParam("id") int id) {
        return Class.findById((long) id);
    }
}
