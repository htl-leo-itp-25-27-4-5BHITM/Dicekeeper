package player;

import campaign.Campaign;
import campaign.CampaignDeletionService;
import campaign.CampaignPlayer;
import character.CharacterDeletionService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import notification.Notification;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.Objects;

@ApplicationScoped
public class PlayerDeletionService {

    @ConfigProperty(name = "dicekeeper.upload-dir")
    String uploadDir;

    @Inject
    CampaignDeletionService campaignDeletionService;

    @Inject
    CharacterDeletionService characterDeletionService;

    @Transactional
    public void deleteLocalPlayerAccount(Long playerId) {
        Player player = Player.findById(playerId);
        if (player == null) {
            return;
        }

        List<Campaign> ownedCampaigns = Campaign.find("playerId", playerId).list();
        for (Campaign campaign : ownedCampaigns) {
            campaignDeletionService.deleteCampaign(campaign);
        }

        List<CampaignPlayer> remainingMemberships = CampaignPlayer.find("playerId", playerId).list();
        List<Long> membershipIds = remainingMemberships.stream()
                .map(membership -> membership.id)
                .filter(Objects::nonNull)
                .toList();
        List<Long> characterIds = remainingMemberships.stream()
                .map(membership -> membership.characterId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (!membershipIds.isEmpty()) {
            Notification.delete("secondaryReferenceId in ?1", membershipIds);
        }
        Notification.delete("playerId", playerId);

        for (CampaignPlayer membership : remainingMemberships) {
            membership.delete();
        }

        for (Long characterId : characterIds) {
            if (CampaignPlayer.count("characterId", characterId) == 0) {
                characterDeletionService.deleteCharacterById(characterId);
            }
        }

        deleteUploadedFile(player.profilePicture);
        player.delete();
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
