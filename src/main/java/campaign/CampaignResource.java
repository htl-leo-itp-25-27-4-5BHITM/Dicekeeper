package campaign;

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
import java.util.List;
import java.util.UUID;

@Path("/api/campaign")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class CampaignResource {

    private static final java.nio.file.Path UPLOAD_DIR = Paths.get("src/main/resources/META-INF/resources/campaign-creation/uploads");

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

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
    public Response get(@PathParam("id") Long id, @QueryParam("playerId") Long ignoredPlayerId) {
        Campaign campaign = Campaign.findById(id);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign with id " + id + " not found")
                    .build();
        }

        // Check if the requester is the DM - if not, hide the story
        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", id, currentPlayerId).firstResult();
        boolean isDM = cp != null && "DM".equals(cp.role);

        CampaignDTO dto = new CampaignDTO(campaign, isDM);
        return Response.ok(dto).build();
    }

    @GET
    @Path("{id}/story")
    public Response getStory(@PathParam("id") Long id, @QueryParam("playerId") Long ignoredPlayerId) {
        Campaign campaign = Campaign.findById(id);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign with id " + id + " not found")
                    .build();
        }

        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", id, currentPlayerId).firstResult();
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
    public Response updateStory(@PathParam("id") Long id, @QueryParam("playerId") Long ignoredPlayerId, StoryUpdateDTO storyUpdate) {
        Campaign campaign = Campaign.findById(id);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign with id " + id + " not found")
                    .build();
        }

        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", id, currentPlayerId).firstResult();
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

        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);

        campaign.id = null;
        campaign.playerId = currentPlayerId;
        campaign.persist();

        CampaignPlayer dm = new CampaignPlayer(campaign.id, campaign.playerId, "DM");
        dm.persist();

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

        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        if (existing.playerId == null || !existing.playerId.equals(currentPlayerId)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Only the DM can update this campaign")
                    .build();
        }

        if (updated.name != null) {
            existing.name = updated.name;
        }
        if (updated.description != null) {
            existing.description = updated.description;
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

        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        if (existing.playerId == null || !existing.playerId.equals(currentPlayerId)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Only the DM can delete this campaign")
                    .build();
        }

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

        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        if (campaign.playerId == null || !campaign.playerId.equals(currentPlayerId)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Only the DM can upload maps")
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
            String newFileName = "campaign-" + id + "-" + UUID.randomUUID() + extension;

            java.nio.file.Path target = UPLOAD_DIR.resolve(newFileName).normalize();
            Files.move(fileUpload.uploadedFile(), target, StandardCopyOption.REPLACE_EXISTING);

            campaign.mapImagePath = "/uploads/" + newFileName;

            return Response.ok(campaign).build();
        } catch (IOException e) {
            String msg = "Failed to upload map: " + e.getMessage();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(msg).build();
        }
    }

    @GET
    @Path("/player/{playerId}")
    public Response getCampaignsByPlayer(@PathParam("playerId") Long playerId) {
        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, playerId);
        if (authorizationError != null) {
            return authorizationError;
        }
        List<Campaign> campaigns = Campaign.list("playerId", playerId);
        return Response.ok(campaigns).build();
    }

    private boolean isValidImageType(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg") ||
                lower.endsWith(".png") || lower.endsWith(".svg");
    }
}
