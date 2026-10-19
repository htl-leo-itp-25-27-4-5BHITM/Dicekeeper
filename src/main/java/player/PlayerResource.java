package player;

import account.deletion.AccountDeletionCoordinator;
import account.deletion.AccountDeletionResponses;
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

import org.eclipse.microprofile.config.inject.ConfigProperty;
import tool.UploadPaths;
import tool.UploadPermissionUtil;

@Path("/api/player")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class PlayerResource {

    @ConfigProperty(name = "dicekeeper.upload-dir")
    String uploadDir;

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

    @Inject
    AccountDeletionCoordinator accountDeletionCoordinator;

    @Inject
    AccountDeletionResponses accountDeletionResponses;

    @GET
    @Path("{email}")
    public Response getPlayerByEmail(@PathParam("email") String email) {
        Player currentPlayer = securityIdentityService.getOrCreateCurrentPlayer(securityIdentity);
        if (currentPlayer.email == null || !currentPlayer.email.equalsIgnoreCase(email)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Du kannst nur auf dein eigenes Profil zugreifen")
                    .build();
        }
        return Response.ok(currentPlayer).build();
    }

    @GET
    @Path("id/{id}")
    public Response getPlayerById(@PathParam("id") Long id) {
        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        try {
            Player player = Player.findById(id);
            if (player == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Spieler nicht gefunden")
                        .build();
            }
            // Only the player themselves gets e-mail and name; everyone else sees the public profile.
            return Response.ok(player.id.equals(currentPlayerId) ? player : new PublicPlayerDTO(player)).build();
        } catch (Exception e) {
            String msg = "Dienst vorübergehend nicht verfügbar: " + e.getMessage();
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
                    .entity("Spieler nicht gefunden")
                    .build();
        }

        if (fileUpload == null || fileUpload.fileName() == null || fileUpload.fileName().isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Keine Datei hochgeladen")
                    .build();
        }

        String originalFileName = fileUpload.fileName();
        if (!isValidImageType(originalFileName)) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Nur JPG-, PNG-, SVG-, WebP- oder GIF-Bilder sind erlaubt")
                    .build();
        }

        try {
            String previousPicture = player.profilePicture;

            java.nio.file.Path profilesDir = Paths.get(uploadDir, "profiles").toAbsolutePath();
            Files.createDirectories(profilesDir);

            String extension = "";
            int dot = originalFileName.lastIndexOf('.');
            if (dot >= 0) {
                extension = originalFileName.substring(dot).toLowerCase(java.util.Locale.ROOT);
            }
            String newFileName = "player-" + id + "-" + UUID.randomUUID() + extension;

            java.nio.file.Path target = profilesDir.resolve(newFileName).normalize();
            Files.move(fileUpload.uploadedFile(), target, StandardCopyOption.REPLACE_EXISTING);
            UploadPermissionUtil.ensureSharedReadAccess(target);

            // Remove the old picture only after the new one is stored, so a failed upload keeps it.
            deleteOwnProfilePicture(player.id, previousPicture);
            player.profilePicture = UploadPaths.publicPath(UploadPaths.PROFILES, newFileName);

            return Response.ok(player).build();
        } catch (IOException e) {
            String msg = "Profilbild-Upload fehlgeschlagen: " + e.getMessage();
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
                    .entity("Spieler nicht gefunden")
                    .build();
        }

        if (updated.username != null) {
            existing.username = updated.username;
        }
        if (updated.name != null) {
            existing.name = updated.name;
        }
        // profilePicture is only set by the upload endpoint; a client-supplied path is ignored.

        return Response.ok(existing).build();
    }

    @DELETE
    @Path("{id}")
    public Response deletePlayer(@PathParam("id") Long id) {
        return accountDeletionResponses.toResponse(accountDeletionCoordinator.delete(securityIdentity, id));
    }

    private void deleteOwnProfilePicture(Long playerId, String picture) {
        // Only files this server created for this player are deleted (player-<id>-<uuid>.ext in uploads/profiles).
        if (picture == null || !picture.startsWith("/uploads/profiles/player-" + playerId + "-")) {
            return;
        }
        UploadPaths.resolveManagedFile(uploadDir, picture, UploadPaths.PROFILES).ifPresent(file -> {
            try {
                Files.deleteIfExists(file);
            } catch (IOException e) {
                System.err.println("Failed to delete old file " + picture + ": " + e.getMessage());
            }
        });
    }

    private boolean isValidImageType(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg") ||
                lower.endsWith(".png") || lower.endsWith(".svg") ||
                lower.endsWith(".webp") || lower.endsWith(".gif");
    }
}
