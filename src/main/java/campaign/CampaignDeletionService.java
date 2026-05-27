package campaign;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import notification.Notification;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
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

        GroupDecision.delete("campaignId", campaignId);
        Notification.delete("referenceId", campaignId);
        CampaignPlayer.delete("campaignId", campaignId);

        deleteUploadedFile(campaign.mapImagePath);
        campaign.delete();
        gameState.remove(campaignId);
    }

    private void deleteUploadedFile(String filePath) {
        if (filePath == null || filePath.isBlank()) return;
        try {
            String relative = filePath.replaceFirst("^/uploads/", "");
            java.nio.file.Path file = Paths.get(uploadDir).toAbsolutePath().resolve(relative).normalize();
            if (Files.exists(file) && !Files.isDirectory(file)) {
                Files.delete(file);
            }
        } catch (IOException e) {
            System.err.println("Failed to delete old file " + filePath + ": " + e.getMessage());
        }
    }
}
