package campaign;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.jboss.logging.Logger;

/**
 * Older versions of the DM view escaped decision texts before sending them, and the views escaped
 * them again when rendering, so "Fass & Bier" showed up as "Fass &amp;amp; Bier". This decodes the
 * stored texts once; afterwards the row is marked as plain text.
 */
@ApplicationScoped
public class DecisionTextStartupRepair {

    private static final Logger LOG = Logger.getLogger(DecisionTextStartupRepair.class);

    public void onStart(@Observes StartupEvent event) {
        QuarkusTransaction.requiringNew().run(() -> {
            int repaired = 0;
            for (GroupDecision decision : GroupDecision.<GroupDecision>list("textPlain is null")) {
                decision.title = decodeHtml(decision.title);
                decision.description = decodeHtml(decision.description);
                decision.decisionMade = decodeHtml(decision.decisionMade);
                decision.textPlain = Boolean.TRUE;
                repaired++;
            }
            if (repaired > 0) {
                LOG.infov("Decoded HTML-escaped texts of {0} legacy group decisions", repaired);
            }
        });
    }

    /** Reverses the client's former esc(): &amp; &lt; &gt; &quot; (and the common &#39;). */
    static String decodeHtml(String value) {
        if (value == null || value.indexOf('&') < 0) {
            return value;
        }
        return value
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&#x27;", "'")
                .replace("&amp;", "&");
    }
}
