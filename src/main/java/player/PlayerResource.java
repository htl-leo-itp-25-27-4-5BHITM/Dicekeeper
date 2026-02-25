package player;

import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import security.SecurityIdentityService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Path("/api/player")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class PlayerResource {

    private static final java.nio.file.Path UPLOAD_DIR = Paths.get("uploads/profiles");

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

    @GET
    @Path("{email}")
    public Response getPlayerByEmail(@PathParam("email") String email) {
        Player currentPlayer = securityIdentityService.getOrCreateCurrentPlayer(securityIdentity);
        if (currentPlayer.email == null || !currentPlayer.email.equalsIgnoreCase(email)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("You can only access your own player identity")
                    .build();
        }
        return Response.ok(currentPlayer).build();
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

    @POST
    @Path("{id}/upload-profile-picture")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public Response uploadProfilePicture(@PathParam("id") Long id,
                                         @RestForm("file") FileUpload fileUpload) {
        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, id);
        if (authorizationError != null) {
            return authorizationError;
        }

        Player player = Player.findById(id);
        if (player == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Player with id " + id + " not found")
                    .build();
        }

        if (fileUpload == null || fileUpload.fileName() == null || fileUpload.fileName().isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("No file uploaded")
                    .build();
        }

        String originalFileName = fileUpload.fileName();
        if (!isValidImageType(originalFileName)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Only JPG, PNG or SVG images are allowed")
                    .build();
        }

        try {
            Files.createDirectories(UPLOAD_DIR);

            String extension = "";
            int dot = originalFileName.lastIndexOf('.');
            if (dot >= 0) {
                extension = originalFileName.substring(dot);
            }
            String newFileName = "player-" + id + "-" + UUID.randomUUID() + extension;

            java.nio.file.Path target = UPLOAD_DIR.resolve(newFileName).normalize();
            Files.move(fileUpload.uploadedFile(), target, StandardCopyOption.REPLACE_EXISTING);

            player.profilePicture = "/uploads/profiles/" + newFileName;

            return Response.ok(player).build();
        } catch (IOException e) {
            String msg = "Failed to upload profile picture: " + e.getMessage();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(msg).build();
        }
    }

    @PATCH
    @Path("{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response updatePlayer(@PathParam("id") Long id, Player updated) {
        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, id);
        if (authorizationError != null) {
            return authorizationError;
        }

        Player existing = Player.findById(id);
        if (existing == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Player with id " + id + " not found")
                    .build();
        }

        if (updated.username != null) {
            existing.username = updated.username;
        }
        if (updated.name != null) {
            existing.name = updated.name;
        }
        if (updated.profilePicture != null) {
            existing.profilePicture = updated.profilePicture;
        }

        return Response.ok(existing).build();
    }

    private boolean isValidImageType(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg") ||
                lower.endsWith(".png") || lower.endsWith(".svg");
    }
}
