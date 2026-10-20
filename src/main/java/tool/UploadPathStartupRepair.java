package tool;

import campaign.Campaign;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.jboss.logging.Logger;
import player.Player;

import java.util.ArrayList;
import java.util.List;

/**
 * Removes upload paths from the database that the server did not create itself, e.g. manipulated
 * profile picture or map paths stored before paths were validated. Only the database reference is
 * removed; no file is touched.
 */
@ApplicationScoped
public class UploadPathStartupRepair {

    private static final Logger LOG = Logger.getLogger(UploadPathStartupRepair.class);

    void onStart(@Observes StartupEvent event) {
        QuarkusTransaction.requiringNew().run(() -> {
            int players = 0;
            for (Player player : Player.<Player>list("profilePicture is not null")) {
                if (!isOwnProfilePicture(player)) {
                    player.profilePicture = null;
                    players++;
                }
            }

            int campaigns = 0;
            for (Campaign campaign : Campaign.<Campaign>list("mapImagePath is not null or mapImagePaths is not null")) {
                if (repairMaps(campaign)) campaigns++;
            }

            if (players > 0 || campaigns > 0) {
                LOG.warnv("Removed invalid upload paths from {0} players and {1} campaigns", players, campaigns);
            }
        });
    }

    static boolean isOwnProfilePicture(Player player) {
        return UploadPaths.isManagedPath(player.profilePicture, UploadPaths.PROFILES)
                && player.profilePicture.startsWith("/uploads/profiles/player-" + player.id + "-");
    }

    static boolean isOwnMap(Campaign campaign, String path) {
        return UploadPaths.isManagedPath(path, UploadPaths.MAPS)
                && path.startsWith("/uploads/maps/campaign-" + campaign.id + "-");
    }

    /** Returns true if the campaign was changed. */
    public static boolean repairMaps(Campaign campaign) {
        List<String> stored = new ArrayList<>();
        if (campaign.mapImagePaths != null && !campaign.mapImagePaths.isBlank()) {
            for (String path : campaign.mapImagePaths.split("\\R")) {
                String trimmed = path.trim();
                if (!trimmed.isEmpty() && !stored.contains(trimmed)) stored.add(trimmed);
            }
        } else if (campaign.mapImagePath != null && !campaign.mapImagePath.isBlank()) {
            stored.add(campaign.mapImagePath.trim());
        }
        List<String> valid = stored.stream().filter(path -> isOwnMap(campaign, path)).toList();
        boolean selectedValid = campaign.mapImagePath == null || isOwnMap(campaign, campaign.mapImagePath);
        if (valid.size() == stored.size() && selectedValid) {
            return false;
        }

        String previouslySelected = selectedValid ? campaign.mapImagePath : null;
        campaign.mapImagePaths = valid.isEmpty() ? null : String.join("\n", valid);
        int index = previouslySelected != null ? valid.indexOf(previouslySelected) : -1;
        campaign.selectedMapIndex = Math.max(0, index);
        campaign.mapImagePath = valid.isEmpty() ? null : valid.get(campaign.selectedMapIndex);
        return true;
    }
}
