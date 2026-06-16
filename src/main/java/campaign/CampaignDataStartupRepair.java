package campaign;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.jboss.logging.Logger;

@ApplicationScoped
public class CampaignDataStartupRepair {

    private static final Logger LOG = Logger.getLogger(CampaignDataStartupRepair.class);

    void onStart(@Observes StartupEvent event) {
        try {
            QuarkusTransaction.requiringNew().run(() -> {
                long repaired = Campaign.update(
                        "maxPlayerCount = null where maxPlayerCount <= ?1",
                        0
                );
                if (repaired > 0) {
                    LOG.warnv("Normalized non-positive max player counts for {0} campaigns", repaired);
                }
            });
        } catch (Exception exception) {
            throw new IllegalStateException("Could not normalize campaign max player counts", exception);
        }
    }
}
