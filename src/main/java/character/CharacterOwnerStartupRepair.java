package character;

import campaign.CampaignPlayer;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.jboss.logging.Logger;

import java.util.List;

/**
 * Characters created before ownership existed have no owner. If such a character was submitted to a
 * campaign by exactly one player, that player becomes the owner. Characters that were never submitted
 * cannot be attributed and stay ownerless (invisible to everyone).
 */
@ApplicationScoped
public class CharacterOwnerStartupRepair {

    private static final Logger LOG = Logger.getLogger(CharacterOwnerStartupRepair.class);

    void onStart(@Observes StartupEvent event) {
        QuarkusTransaction.requiringNew().run(() -> {
            int repaired = 0;
            for (Character character : Character.<Character>list("ownerPlayerId is null")) {
                List<Long> playerIds = CampaignPlayer.<CampaignPlayer>find("characterId", character.id).stream()
                        .map(cp -> cp.playerId)
                        .distinct()
                        .toList();
                if (playerIds.size() == 1) {
                    character.ownerPlayerId = playerIds.get(0);
                    repaired++;
                }
            }
            if (repaired > 0) {
                LOG.infov("Assigned owners to {0} legacy characters", repaired);
            }
        });
    }
}
