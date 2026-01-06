package resource;

import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import model.Campaign;
import model.CampaignPlayer;
import model.Player;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Path("/api/campaign")
@Produces(MediaType.APPLICATION_JSON)
public class CampaignResource {

    private static final java.nio.file.Path UPLOAD_DIR = Paths.get("src/main/resources/META-INF/resources/campaign-creation/uploads");

    // ---- basic CRUD ----

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
    public Response get(@PathParam("id") Long id) {
        Campaign campaign = Campaign.findById(id);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign with id " + id + " not found")
                    .build();
        }
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

        // Optional: validate playerId if provided
        if (campaign.playerId != null) {
            Player player = Player.findById(campaign.playerId);
            if (player == null) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Player with id " + campaign.playerId + " not found")
                        .build();
            }
        }

        campaign.id = null; // always create a new one
        campaign.persist();

        // Add creator as DM
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
            // could validate Player here if you want
            existing.playerId = updated.playerId;
        }
        if (updated.isPublic != null) {
            existing.isPublic = updated.isPublic;
        }
        if (updated.maxPlayerCount != null) {
            existing.maxPlayerCount = updated.maxPlayerCount;
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
        existing.delete();
        return Response.noContent().build();
    }

    // ---- file upload for map image ----

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
            // ensure ./uploads exists
            Files.createDirectories(UPLOAD_DIR);

            // build new filename: campaign-<id>-<uuid>.<ext>
            String extension = "";
            int dot = originalFileName.lastIndexOf('.');
            if (dot >= 0) {
                extension = originalFileName.substring(dot);
            }
            String newFileName = "campaign-" + id + "-" + UUID.randomUUID() + extension;

            java.nio.file.Path target = UPLOAD_DIR.resolve(newFileName).normalize();

            // move temporary upload to ./uploads/
            Files.move(fileUpload.uploadedFile(), target, StandardCopyOption.REPLACE_EXISTING);

            // store HTTP path in DB so frontend can use it
            campaign.mapImagePath = "/uploads/" + newFileName;

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

    private boolean isValidImageType(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg") ||
                lower.endsWith(".png") || lower.endsWith(".svg");
    }
}
