package campaign;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import notification.Notification;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import tool.UploadPaths;

import java.io.IOException;
import java.nio.file.Files;
import java.util.Map;

@ApplicationScoped
public class CampaignDeletionService {

    @ConfigProperty(name = "dicekeeper.upload-dir")
    String uploadDir;

    @Inject
    GameState gameState;

    @Inject
    SseBroadcaster broadcaster;

    public void deleteCampaign(Campaign campaign) {
        if (campaign == null || campaign.id == null) {
            return;
        }

        Long campaignId = campaign.id;
        broadcaster.broadcast(campaignId, "campaign_deleted", Map.of("campaignId", campaignId));

        GroupDecisionVote.delete("campaignId", campaignId);
        GroupDecision.delete("campaignId", campaignId);
        Notification.delete("referenceId", campaignId);
        CampaignPlayer.delete("campaignId", campaignId);

        for (String mapPath : getMapPaths(campaign)) {
            deleteOwnMapFile(campaignId, mapPath);
        }
        campaign.delete();
        gameState.remove(campaignId);
    }

    private java.util.List<String> getMapPaths(Campaign campaign) {
        java.util.List<String> paths = new java.util.ArrayList<>();
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

    private void deleteOwnMapFile(Long campaignId, String filePath) {
        // Only map files this server created for this campaign are deleted (campaign-<id>-<uuid>.ext in uploads/maps).
        if (filePath == null || !filePath.startsWith("/uploads/maps/campaign-" + campaignId + "-")) return;
        UploadPaths.resolveManagedFile(uploadDir, filePath, UploadPaths.MAPS).ifPresent(file -> {
            try {
                Files.deleteIfExists(file);
            } catch (IOException e) {
                System.err.println("Failed to delete old file " + filePath + ": " + e.getMessage());
            }
        });
    }
}
