package tool;

import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

/**
 * Serves uploaded files to signed-in users who may see them (see {@link UploadAccess}).
 */
@Path("/uploads")
@Authenticated
public class UploadServeResource {

    @ConfigProperty(name = "dicekeeper.upload-dir")
    String uploadDir;

    @Inject
    UploadAccess uploadAccess;

    @GET
    @Path("{subpath: .+}")
    public Response serveFile(@PathParam("subpath") String subpath) {
        String publicPath = "/uploads/" + subpath;
        java.nio.file.Path baseDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        java.nio.file.Path file = baseDir.resolve(subpath).normalize();
        // Same answer for "missing" and "not allowed", so file names cannot be probed.
        if (!file.startsWith(baseDir) || !uploadAccess.canRead(publicPath)
                || !Files.exists(file) || Files.isDirectory(file)) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        try {
            String contentType = Files.probeContentType(file);
            if (contentType == null) {
                contentType = MediaType.APPLICATION_OCTET_STREAM;
            }
            return Response.ok(file.toFile(), contentType)
                    .header("Cache-Control", "private, max-age=3600")
                    .build();
        } catch (IOException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }
}
