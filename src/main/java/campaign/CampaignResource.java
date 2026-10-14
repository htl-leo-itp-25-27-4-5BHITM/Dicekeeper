package campaign;

import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import player.Player;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.eclipse.microprofile.config.inject.ConfigProperty;
import tool.UploadPaths;
import tool.UploadPermissionUtil;

@Path("/api/campaign")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class CampaignResource {

    @ConfigProperty(name = "dicekeeper.upload-dir")
    String uploadDir;

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

    @Inject
    CampaignDeletionService campaignDeletionService;

    @Inject
    SseBroadcaster broadcaster;

    @Inject
    GameState gameState;

    /**
     * Campaigns the current player may see: public ones and the ones they are a member of.
     * Lists never contain the DM story; it is only returned by the single-campaign endpoints.
     */
    @GET
    public List<CampaignDTO> list() {
        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        List<Long> memberCampaignIds = CampaignPlayer.<CampaignPlayer>find("playerId", currentPlayerId).stream()
                .map(cp -> cp.campaignId)
                .toList();
        List<Campaign> campaigns = memberCampaignIds.isEmpty()
                ? Campaign.list("isPublic", true)
                : Campaign.list("isPublic = true or id in ?1", memberCampaignIds);
        return toListDtos(campaigns);
    }

    @GET
    @Path("public/all")
    public List<CampaignDTO> listPublic() {
        return toListDtos(Campaign.list("isPublic", true));
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

        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        CampaignPlayer cp = CampaignPlayer.find("campaignId = ?1 and playerId = ?2", id, currentPlayerId).firstResult();
        if (cp == null && !Boolean.TRUE.equals(campaign.isPublic)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Du darfst diese Kampagne nicht ansehen")
                    .build();
        }

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
                    .entity("Nur der DM kann die Story einsehen")
                    .build();
        }

        return Response.ok(campaign.story).build();
    }

    @PATCH
    @Path("{id}/story")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response updateStory(@PathParam("id") Long id,
                                @QueryParam("playerId") Long ignoredPlayerId,
                                StoryUpdateDTO storyUpdate) {
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
                    .entity("Nur der DM kann die Story ändern")
                    .build();
        }

        campaign.story = storyUpdate.story;
        return Response.ok(new CampaignDTO(campaign, true)).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response create(CampaignWriteDTO request) {
        if (request == null || request.name == null || request.name.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Bitte gib einen Kampagnennamen ein")
                    .build();
        }
        Response validationError = validateMaxPlayerCount(request.maxPlayerCount);
        if (validationError != null) {
            return validationError;
        }

        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        Player player = Player.findById(currentPlayerId);
        if (player == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Player with id " + currentPlayerId + " not found")
                    .build();
        }

        // Map paths, owner and start state are server-owned and never taken from the request.
        Campaign campaign = new Campaign();
        campaign.name = request.name;
        campaign.description = request.description;
        campaign.story = request.story;
        campaign.isPublic = Boolean.TRUE.equals(request.isPublic);
        campaign.maxPlayerCount = request.maxPlayerCount;
        campaign.playerId = currentPlayerId;
        campaign.persist();

        CampaignPlayer dm = new CampaignPlayer(campaign.id, campaign.playerId, "DM");
        dm.persist();

        return Response.status(Response.Status.CREATED).entity(new CampaignDTO(campaign, true)).build();
    }

    @PATCH
    @Path("{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response update(@PathParam("id") Long id, CampaignWriteDTO updated) {
        if (updated == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Campaign update is required")
                    .build();
        }
        Campaign existing = Campaign.findById(id);
        if (existing == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Campaign with id " + id + " not found")
                    .build();
        }

        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        if (existing.playerId == null || !existing.playerId.equals(currentPlayerId)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Nur der DM kann diese Kampagne ändern")
                    .build();
        }
        Response validationError = validateMaxPlayerCount(updated.maxPlayerCount);
        if (validationError != null) {
            return validationError;
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
        boolean justStarted = Boolean.TRUE.equals(updated.started) && !Boolean.TRUE.equals(existing.started);
        if (updated.started != null) {
            existing.started = updated.started;
        }
        if (justStarted) {
            gameState.onCampaignStarted(id);
        }

        CampaignDTO dto = new CampaignDTO(existing, true);
        broadcaster.broadcast(id, "campaign_updated", new CampaignDTO(existing, false));
        if (Boolean.TRUE.equals(updated.started)) {
            broadcaster.broadcast(id, "campaign_started", new CampaignDTO(existing, false));
        }

        return Response.ok(dto).build();
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
                    .entity("Nur der DM kann diese Kampagne löschen")
                    .build();
        }

        campaignDeletionService.deleteCampaign(existing);
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
                    .entity("Nur der DM kann Karten hochladen")
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
                    .entity("Nur JPG-, PNG- oder SVG-Bilder sind erlaubt")
                    .build();
        }

        try {
            List<String> mapPaths = getMapPaths(campaign);
            if (mapPaths.size() >= 5) {
                return Response.status(Response.Status.CONFLICT)
                        .entity("Eine Kampagne kann höchstens 5 Karten haben")
                        .build();
            }

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
            UploadPermissionUtil.ensureSharedReadAccess(target);

            String mapPath = UploadPaths.publicPath(UploadPaths.MAPS, newFileName);
            mapPaths.add(mapPath);
            campaign.selectedMapIndex = mapPaths.size() - 1;
            saveMapPaths(campaign, mapPaths);
            campaign.mapImagePath = mapPath;

            CampaignDTO dto = new CampaignDTO(campaign, true);
            broadcaster.broadcast(id, "campaign_updated", new CampaignDTO(campaign, false));

            return Response.ok(dto).build();
        } catch (IOException e) {
            String msg = "Karten-Upload fehlgeschlagen: " + e.getMessage();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(msg).build();
        }
    }

    @PATCH
    @Path("{id}/selected-map")
    @Consumes(MediaType.APPLICATION_JSON)
    @Transactional
    public Response selectMap(@PathParam("id") Long id, Map<String, Object> body) {
        Campaign campaign = Campaign.findById(id);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND).entity("Kampagne nicht gefunden").build();
        }
        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        if (campaign.playerId == null || !campaign.playerId.equals(currentPlayerId)) {
            return Response.status(Response.Status.FORBIDDEN).entity("Nur der DM kann Karten auswählen").build();
        }

        Integer index = toInt(body != null ? body.get("selectedMapIndex") : null);
        List<String> mapPaths = getMapPaths(campaign);
        if (index == null || index < 0 || index >= mapPaths.size()) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Ungültige Karte").build();
        }

        campaign.selectedMapIndex = index;
        campaign.mapImagePath = mapPaths.get(index);
        saveMapPaths(campaign, mapPaths);

        CampaignDTO dto = new CampaignDTO(campaign, true);
        broadcaster.broadcast(id, "campaign_updated", new CampaignDTO(campaign, false));
        return Response.ok(dto).build();
    }

    @DELETE
    @Path("{id}/maps/{mapIndex}")
    @Transactional
    public Response deleteMap(@PathParam("id") Long id, @PathParam("mapIndex") int mapIndex) {
        Campaign campaign = Campaign.findById(id);
        if (campaign == null) {
            return Response.status(Response.Status.NOT_FOUND).entity("Kampagne nicht gefunden").build();
        }
        Long currentPlayerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        if (campaign.playerId == null || !campaign.playerId.equals(currentPlayerId)) {
            return Response.status(Response.Status.FORBIDDEN).entity("Nur der DM kann Karten löschen").build();
        }

        List<String> mapPaths = getMapPaths(campaign);
        if (mapIndex < 0 || mapIndex >= mapPaths.size()) {
            return Response.status(Response.Status.NOT_FOUND).entity("Karte nicht gefunden").build();
        }

        String removedPath = mapPaths.remove(mapIndex);
        deleteOwnMapFile(campaign, removedPath);

        int selected = campaign.selectedMapIndex != null ? campaign.selectedMapIndex : 0;
        if (mapPaths.isEmpty()) {
            campaign.selectedMapIndex = 0;
            campaign.mapImagePath = null;
        } else {
            if (mapIndex < selected) selected--;
            if (mapIndex == selected) selected = Math.min(selected, mapPaths.size() - 1);
            campaign.selectedMapIndex = Math.max(0, selected);
            campaign.mapImagePath = mapPaths.get(campaign.selectedMapIndex);
        }
        saveMapPaths(campaign, mapPaths);

        CampaignDTO dto = new CampaignDTO(campaign, true);
        broadcaster.broadcast(id, "campaign_updated", new CampaignDTO(campaign, false));
        return Response.ok(dto).build();
    }

    @GET
    @Path("/player/{playerId}")
    public Response getCampaignsByPlayer(@PathParam("playerId") Long playerId) {
        Response authorizationError = securityIdentityService.requireCurrentPlayer(securityIdentity, playerId);
        if (authorizationError != null) {
            return authorizationError;
        }

        List<Campaign> campaigns = Campaign.list("playerId", playerId);
        return Response.ok(toListDtos(campaigns)).build();
    }

    private void deleteOwnMapFile(Campaign campaign, String filePath) {
        // Only map files this server created for this campaign are deleted (campaign-<id>-<uuid>.ext in uploads/maps).
        if (filePath == null || !filePath.startsWith("/uploads/maps/campaign-" + campaign.id + "-")) {
            return;
        }
        UploadPaths.resolveManagedFile(uploadDir, filePath, UploadPaths.MAPS).ifPresent(file -> {
            try {
                Files.deleteIfExists(file);
            } catch (IOException e) {
                // Log but don't fail the request
                System.err.println("Failed to delete old file " + filePath + ": " + e.getMessage());
            }
        });
    }

    private List<CampaignDTO> toListDtos(List<Campaign> campaigns) {
        return campaigns.stream().map(campaign -> new CampaignDTO(campaign, false)).toList();
    }

    private boolean isValidImageType(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg") ||
                lower.endsWith(".png") || lower.endsWith(".svg");
    }

    private Response validateMaxPlayerCount(Integer maxPlayerCount) {
        String validationError = CampaignValidation.validateMaxPlayerCount(maxPlayerCount);
        return validationError == null
                ? null
                : Response.status(Response.Status.BAD_REQUEST).entity(validationError).build();
    }

    private List<String> getMapPaths(Campaign campaign) {
        List<String> paths = new ArrayList<>();
        if (campaign.mapImagePaths != null && !campaign.mapImagePaths.isBlank()) {
            for (String path : campaign.mapImagePaths.split("\\R")) {
                if (path != null && !path.isBlank() && !paths.contains(path.trim())) {
                    paths.add(path.trim());
                }
            }
        }
        if (paths.isEmpty() && campaign.mapImagePath != null && !campaign.mapImagePath.isBlank()) {
            paths.add(campaign.mapImagePath);
        }
        return paths;
    }

    private void saveMapPaths(Campaign campaign, List<String> paths) {
        campaign.mapImagePaths = String.join("\n", paths);
        if (paths.isEmpty()) {
            campaign.selectedMapIndex = 0;
            campaign.mapImagePath = null;
            return;
        }
        int selected = campaign.selectedMapIndex != null ? campaign.selectedMapIndex : 0;
        selected = Math.max(0, Math.min(selected, paths.size() - 1));
        campaign.selectedMapIndex = selected;
        campaign.mapImagePath = paths.get(selected);
    }

    private Integer toInt(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) return ((Number) obj).intValue();
        try { return Integer.parseInt(obj.toString()); } catch (Exception e) { return null; }
    }
}
