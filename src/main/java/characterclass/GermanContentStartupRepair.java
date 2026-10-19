package characterclass;

import background.Background;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.jboss.logging.Logger;

import java.util.Map;

/**
 * Translates the built-in English classes and backgrounds of existing databases to German.
 * Only rows that still carry their original English name are changed.
 */
@ApplicationScoped
public class GermanContentStartupRepair {

    private static final Logger LOG = Logger.getLogger(GermanContentStartupRepair.class);

    public void onStart(@Observes StartupEvent event) {
        QuarkusTransaction.requiringNew().run(() -> {
            int translated = 0;
            for (Map.Entry<Long, GermanContent.Entry> e : GermanContent.CLASSES.entrySet()) {
                CharacterClass clazz = CharacterClass.findById(e.getKey());
                if (clazz != null && e.getValue().englishName().equals(clazz.name)) {
                    clazz.name = e.getValue().germanName();
                    clazz.description = e.getValue().description();
                    translated++;
                }
            }
            for (Map.Entry<Long, GermanContent.Entry> e : GermanContent.BACKGROUNDS.entrySet()) {
                Background background = Background.findById(e.getKey());
                if (background != null && e.getValue().englishName().equals(background.name)) {
                    background.name = e.getValue().germanName();
                    background.description = e.getValue().description();
                    translated++;
                }
            }
            if (translated > 0) {
                LOG.infov("Translated {0} classes/backgrounds to German", translated);
            }
        });
    }
}
