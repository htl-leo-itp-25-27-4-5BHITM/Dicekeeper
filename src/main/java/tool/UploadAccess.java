package tool;

import campaign.Campaign;
import campaign.CampaignPlayer;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import security.SecurityIdentityService;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Decides who may load an uploaded file.
 *
 * <ul>
 *   <li>Profile pictures: every signed-in user (they are shown next to player names).</li>
 *   <li>Maps: members of the campaign, or anyone signed in if the campaign is public.</li>
 *   <li>Everything else: nobody.</li>
 * </ul>
 */
@ApplicationScoped
public class UploadAccess {

    private static final Pattern MAP_FILE = Pattern.compile("^/uploads/maps/campaign-(\\d+)-[^/]+$");

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

    public boolean canRead(String publicPath) {
        if (UploadPaths.isManagedPath(publicPath, UploadPaths.PROFILES)) {
            return true;
        }
        if (!UploadPaths.isManagedPath(publicPath, UploadPaths.MAPS)) {
            return false;
        }
        Campaign campaign = findCampaign(publicPath);
        if (campaign == null) {
            return false;
        }
        if (Boolean.TRUE.equals(campaign.isPublic)) {
            return true;
        }
        Long playerId = securityIdentityService.getCurrentPlayerId(securityIdentity);
        return CampaignPlayer.count("campaignId = ?1 and playerId = ?2", campaign.id, playerId) > 0;
    }

    private Campaign findCampaign(String mapPath) {
        Matcher matcher = MAP_FILE.matcher(mapPath);
        if (matcher.matches()) {
            Campaign campaign = Campaign.findById(Long.parseLong(matcher.group(1)));
            return campaign != null && usesMap(campaign, mapPath) ? campaign : null;
        }
        // Older files without the campaign id in their name.
        return Campaign.<Campaign>find("mapImagePath = ?1 or mapImagePaths like ?2", mapPath, "%" + mapPath + "%")
                .stream()
                .filter(campaign -> usesMap(campaign, mapPath))
                .findFirst()
                .orElse(null);
    }

    private boolean usesMap(Campaign campaign, String mapPath) {
        if (mapPath.equals(campaign.mapImagePath)) return true;
        if (campaign.mapImagePaths == null) return false;
        for (String path : campaign.mapImagePaths.split("\\R")) {
            if (mapPath.equals(path.trim())) return true;
        }
        return false;
    }
}
