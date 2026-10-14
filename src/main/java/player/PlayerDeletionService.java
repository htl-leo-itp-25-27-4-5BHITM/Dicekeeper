package player;

import account.deletion.AccountDeletionMarker;
import account.deletion.AccountDeletionMarkerService;
import account.deletion.AccountDeletionState;
import campaign.Campaign;
import campaign.CampaignPlayer;
import campaign.GameState;
import campaign.GroupDecision;
import character.ability.CharacterAbility;
import character.skill.CharacterSkill;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import notification.Notification;
import tool.UploadPaths;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@ApplicationScoped
public class PlayerDeletionService {

    @Inject
    AccountDeletionMarkerService markerService;

    @Inject
    GameState gameState;

    @Transactional
    public AccountDeletionMarker deleteLocalPlayerAccount(String subjectDigest, Long playerId) {
        AccountDeletionMarker existing = markerService.findForUpdate(subjectDigest).orElse(null);
        if (existing != null && existing.state != AccountDeletionState.PREPARED) {
            return existing;
        }
        if (existing != null && !existing.originalPlayerId.equals(playerId)) {
            throw new IllegalStateException("Deletion marker ownership mismatch");
        }

        CleanupPlan plan = discover(playerId);
        AccountDeletionMarker marker = existing != null
                ? existing
                : markerService.createPrepared(subjectDigest, playerId, plan.filePaths());

        if (marker.cleanupPaths().isEmpty() && !plan.filePaths().isEmpty()) {
            marker.setCleanupPaths(plan.filePaths());
            marker.updatedAt = Instant.now();
        }

        deleteRows(plan, playerId);
        return markerService.transition(subjectDigest,
                AccountDeletionState.PREPARED,
                AccountDeletionState.LOCAL_DELETED);
    }

    CleanupPlan discover(Long playerId) {
        Player player = Player.findById(playerId);
        List<Campaign> ownedCampaigns = Campaign.find("playerId", playerId).list();
        List<Long> ownedCampaignIds = ownedCampaigns.stream()
                .map(campaign -> campaign.id)
                .filter(id -> id != null)
                .distinct()
                .toList();

        List<CampaignPlayer> affectedMemberships;
        if (ownedCampaignIds.isEmpty()) {
            affectedMemberships = CampaignPlayer.find("playerId", playerId).list();
        } else {
            affectedMemberships = CampaignPlayer.find(
                    "campaignId in ?1 or playerId = ?2", ownedCampaignIds, playerId).list();
        }

        List<Long> membershipIds = affectedMemberships.stream()
                .map(membership -> membership.id)
                .filter(id -> id != null)
                .distinct()
                .toList();
        List<Long> characterIds = java.util.stream.Stream.concat(
                        affectedMemberships.stream().map(membership -> membership.characterId),
                        character.Character.<character.Character>find("ownerPlayerId", playerId).stream()
                                .map(owned -> owned.id))
                .filter(id -> id != null)
                .distinct()
                .toList();

        LinkedHashSet<String> filePaths = new LinkedHashSet<>();
        // Only files the server created for this player and their campaigns; a stored path can never
        // make the deletion remove someone else's upload.
        if (player != null) {
            addUploadPath(filePaths, player.profilePicture, UploadPaths.PROFILES, "player-" + player.id + "-");
        }
        for (Campaign campaign : ownedCampaigns) {
            for (String path : mapPaths(campaign)) {
                addUploadPath(filePaths, path, UploadPaths.MAPS, "campaign-" + campaign.id + "-");
            }
        }

        return new CleanupPlan(ownedCampaignIds, membershipIds, characterIds, List.copyOf(filePaths));
    }

    private void deleteRows(CleanupPlan plan, Long playerId) {
        if (!plan.ownedCampaignIds().isEmpty()) {
            campaign.GroupDecisionVote.delete("campaignId in ?1", plan.ownedCampaignIds());
            GroupDecision.delete("campaignId in ?1", plan.ownedCampaignIds());
            Notification.delete("referenceId in ?1", plan.ownedCampaignIds());
        }
        if (!plan.membershipIds().isEmpty()) {
            Notification.delete("secondaryReferenceId in ?1", plan.membershipIds());
            CampaignPlayer.delete("id in ?1", plan.membershipIds());
        }
        Notification.delete("playerId", playerId);

        if (!plan.ownedCampaignIds().isEmpty()) {
            Campaign.delete("id in ?1", plan.ownedCampaignIds());
            plan.ownedCampaignIds().forEach(gameState::remove);
        }

        Player.deleteById(playerId);

        Set<Long> orphanCharacterIds = new LinkedHashSet<>();
        for (Long characterId : plan.characterIds()) {
            if (CampaignPlayer.count("characterId", characterId) == 0) {
                orphanCharacterIds.add(characterId);
            }
        }
        if (!orphanCharacterIds.isEmpty()) {
            CharacterAbility.delete("character.id in ?1", orphanCharacterIds);
            List<Integer> integerIds = orphanCharacterIds.stream().map(Long::intValue).toList();
            CharacterSkill.delete("characterId in ?1", integerIds);
            character.Character.delete("id in ?1", orphanCharacterIds);
        }
    }

    private List<String> mapPaths(Campaign campaign) {
        List<String> paths = new ArrayList<>();
        if (campaign.mapImagePaths != null && !campaign.mapImagePaths.isBlank()) {
            for (String path : campaign.mapImagePaths.split("\\R")) {
                if (path != null && !path.isBlank() && !paths.contains(path.trim())) {
                    paths.add(path.trim());
                }
            }
        }
        if (paths.isEmpty() && campaign.mapImagePath != null && !campaign.mapImagePath.isBlank()) {
            paths.add(campaign.mapImagePath.trim());
        }
        return paths;
    }

    private void addUploadPath(Set<String> target, String path, String folder, String ownerPrefix) {
        if (path == null) return;
        String normalized = path.trim();
        if (UploadPaths.isManagedPath(normalized, folder)
                && normalized.startsWith("/uploads/" + folder + "/" + ownerPrefix)) {
            target.add(normalized.substring("/uploads/".length()));
        }
    }

    record CleanupPlan(List<Long> ownedCampaignIds,
                       List<Long> membershipIds,
                       List<Long> characterIds,
                       List<String> filePaths) {
    }
}
