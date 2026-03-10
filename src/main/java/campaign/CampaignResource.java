package campaign;

import player.Player;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

import org.eclipse.microprofile.config.inject.ConfigProperty;

@Path("/api/campaign")
@Produces(MediaType.APPLICATION_JSON)
public class CampaignResource {

    @ConfigProperty(name = "dicekeeper.upload-dir")
    String uploadDir;

    @GET
    public List<Campaign> list() {
        return Campaign.listAll();
    }

    @GET
    @Path("public/all")
    public List<Campaign> listPublic() {
        return Campaign.find("isPublic", true).list();
    }

    @GET
    @Path("{id}")
    public Response get(@PathParam("id") Long id, @QueryParam("playerId") Long playerId) {
        Campaign campaign = Campaign.findById(id);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign with id " + id + " not found")
                    .build();
        }

        // Check if the requester is the DM - if not, hide the story
        boolean isDM = false;
        if (playerId != null) {
            CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", id, playerId).firstResult();
            isDM = cp != null && "DM".equals(cp.role);
        }

        CampaignDTO dto = new CampaignDTO(campaign, isDM);
        return Response.ok(dto).build();
    }

    @GET
    @Path("{id}/story")
    public Response getStory(@PathParam("id") Long id, @QueryParam("playerId") Long playerId) {
        Campaign campaign = Campaign.findById(id);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign with id " + id + " not found")
                    .build();
        }

        // Only DM can see the story
        if (playerId == null) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Player ID required")
                    .build();
        }

        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", id, playerId).firstResult();
        if (cp == null || !"DM".equals(cp.role)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Only the DM can view the story")
                    .build();
        }

        return Response.ok(campaign.story).build();
    }

    @PATCH
    @Path("{id}/story")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response updateStory(@PathParam("id") Long id, @QueryParam("playerId") Long playerId, StoryUpdateDTO storyUpdate) {
        Campaign campaign = Campaign.findById(id);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign with id " + id + " not found")
                    .build();
        }

        // Only DM can update the story
        if (playerId == null) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Player ID required")
                    .build();
        }

        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", id, playerId).firstResult();
        if (cp == null || !"DM".equals(cp.role)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Only the DM can update the story")
                    .build();
        }

        campaign.story = storyUpdate.story;
        return Response.ok(campaign).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response create(Campaign campaign) {
        if (campaign == null || campaign.name == null || campaign.name.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Campaign name is required")
                    .build();
        }

        if (campaign.playerId != null) {
            Player player = Player.findById(campaign.playerId);
            if (player == null) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Player with id " + campaign.playerId + " not found")
                        .build();
            }
        }

        campaign.id = null;
        campaign.persist();

        if (campaign.playerId != null) {
            CampaignPlayer dm = new CampaignPlayer(campaign.id, campaign.playerId, "DM");
            dm.persist();
        }

        return Response.status(Response.Status.CREATED).entity(campaign).build();
    }

    @PATCH
    @Path("{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response update(@PathParam("id") Long id, Campaign updated) {
        Campaign existing = Campaign.findById(id);
        if (existing == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign with id " + id + " not found")
                    .build();
        }

        if (updated.name != null) {
            existing.name = updated.name;
        }
        if (updated.description != null) {
            existing.description = updated.description;
        }
        if (updated.playerId != null) {
            existing.playerId = updated.playerId;
        }
        if (updated.isPublic != null) {
            existing.isPublic = updated.isPublic;
        }
        if (updated.maxPlayerCount != null) {
            existing.maxPlayerCount = updated.maxPlayerCount;
        }
        if (updated.story != null) {
            existing.story = updated.story;
        }
        if (updated.started != null) {
            existing.started = updated.started;
        }

        return Response.ok(existing).build();
    }

    @DELETE
    @Path("{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        Campaign existing = Campaign.findById(id);
        if (existing == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign with id " + id + " not found")
                    .build();
        }
        deleteUploadedFile(existing.mapImagePath);
        existing.delete();
        return Response.noContent().build();
    }

    @POST
    @Path("{id}/upload-map")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public Response uploadMap(@PathParam("id") Long id,
                              @RestForm("file") FileUpload fileUpload) {
        Campaign campaign = Campaign.findById(id);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign with id " + id + " not found")
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
            // Delete old map file if exists
            deleteUploadedFile(campaign.mapImagePath);

            java.nio.file.Path mapsDir = Paths.get(uploadDir, "maps").toAbsolutePath();
            Files.createDirectories(mapsDir);

            String extension = "";
            int dot = originalFileName.lastIndexOf('.');
            if (dot >= 0) {
                extension = originalFileName.substring(dot);
            }
            String newFileName = "campaign-" + id + "-" + UUID.randomUUID() + extension;

            java.nio.file.Path target = mapsDir.resolve(newFileName).normalize();
            Files.move(fileUpload.uploadedFile(), target, StandardCopyOption.REPLACE_EXISTING);

            campaign.mapImagePath = "/uploads/maps/" + newFileName;

            return Response.ok(campaign).build();
        } catch (IOException e) {
            String msg = "Failed to upload map: " + e.getMessage();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(msg).build();
        }
    }

    @GET
    @Path("/player/{playerId}")
    public List<Campaign> getCampaignsByPlayer(@PathParam("playerId") Long playerId) {
        return Campaign.list("playerId", playerId);
    }

    private void deleteUploadedFile(String filePath) {
        if (filePath == null || filePath.isBlank()) return;
        try {
            // filePath is like "/uploads/maps/campaign-1-uuid.png"
            // strip leading "/uploads/" to get relative path within uploadDir
            String relative = filePath.replaceFirst("^/uploads/", "");
            java.nio.file.Path file = Paths.get(uploadDir).toAbsolutePath().resolve(relative).normalize();
            if (Files.exists(file) && !Files.isDirectory(file)) {
                Files.delete(file);
            }
        } catch (IOException e) {
            // Log but don't fail the request
            System.err.println("Failed to delete old file " + filePath + ": " + e.getMessage());
        }
    }

    private boolean isValidImageType(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg") ||
                lower.endsWith(".png") || lower.endsWith(".svg");
    }
}
