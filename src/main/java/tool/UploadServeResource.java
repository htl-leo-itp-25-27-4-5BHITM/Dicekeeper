package tool;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Path("/uploads")
public class UploadServeResource {

    @ConfigProperty(name = "dicekeeper.upload-dir")
    String uploadDir;

    @GET
    @Path("list")
    @Produces(MediaType.APPLICATION_JSON)
    public Response listFiles() {
        java.nio.file.Path baseDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        if (!Files.exists(baseDir)) {
            return Response.ok(List.of()).build();
        }
        try (Stream<java.nio.file.Path> walk = Files.walk(baseDir)) {
            List<String> files = walk
                    .filter(Files::isRegularFile)
                    .map(p -> "/uploads/" + baseDir.relativize(p).toString())
                    .sorted()
                    .collect(Collectors.toList());
            return Response.ok(files).build();
        } catch (IOException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Failed to list files: " + e.getMessage()).build();
        }
    }

    @GET
    @Path("{subpath: .+}")
    public Response serveFile(@PathParam("subpath") String subpath) {
        // "list" is handled by the method above
        if ("list".equals(subpath)) {
            return listFiles();
        }

        // Prevent path traversal
        java.nio.file.Path baseDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        java.nio.file.Path file = baseDir.resolve(subpath).normalize();
        if (!file.startsWith(baseDir)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        if (!Files.exists(file) || Files.isDirectory(file)) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("File not found: " + subpath + " (looked in " + baseDir + ")")
                    .build();
        }

        try {
            String contentType = Files.probeContentType(file);
            if (contentType == null) {
                contentType = MediaType.APPLICATION_OCTET_STREAM;
            }
            return Response.ok(file.toFile(), contentType)
                    .header("Cache-Control", "public, max-age=86400")
                    .build();
        } catch (IOException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }
}
