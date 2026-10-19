package character;

import campaign.CampaignPlayer;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.List;

/**
 * Characters created before ownership existed have no owner. If such a character was submitted to a
 * campaign by exactly one player, that player becomes the owner. Named characters that cannot be
 * attributed stay ownerless and are offered to everyone as read-only templates ("Vorlagen") that a
 * player adopts as a personal copy. Abandoned, unnamed drafts without an owner are removed.
 */
@ApplicationScoped
public class CharacterOwnerStartupRepair {

    private static final Logger LOG = Logger.getLogger(CharacterOwnerStartupRepair.class);

    @Inject
    CharacterDeletionService characterDeletionService;

    public void onStart(@Observes StartupEvent event) {
        QuarkusTransaction.requiringNew().run(() -> {
            int repaired = 0;
            int removedDrafts = 0;
            for (Character character : Character.<Character>list("ownerPlayerId is null")) {
                List<Long> playerIds = CampaignPlayer.<CampaignPlayer>find("characterId", character.id).stream()
                        .map(cp -> cp.playerId)
                        .distinct()
                        .toList();
                if (playerIds.size() == 1) {
                    character.ownerPlayerId = playerIds.get(0);
                    repaired++;
                } else if (playerIds.isEmpty() && (character.name == null || character.name.isBlank())) {
                    // An empty draft from an aborted character creation: nobody can use or find it.
                    characterDeletionService.deleteCharacterById(character.id);
                    removedDrafts++;
                }
            }
            if (removedDrafts > 0) {
                LOG.infov("Removed {0} unnamed character drafts without owner", removedDrafts);
            }
            if (repaired > 0) {
                LOG.infov("Assigned owners to {0} legacy characters", repaired);
            }
        });
    }
}
