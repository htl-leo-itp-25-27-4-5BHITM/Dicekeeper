package campaign;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.jboss.logging.Logger;

/**
 * Widens {@code campaign.story} to {@link Campaign#STORY_MAX_LENGTH} characters.
 *
 * <p>{@code hibernate-orm.database.generation=update} creates missing columns but never
 * changes the length of an existing one, so databases created before the limit was raised
 * still have {@code varchar(1000)}. Widening a varchar is a metadata-only change in
 * PostgreSQL (no table rewrite), and the check makes this a no-op once it has run.</p>
 */
@ApplicationScoped
public class CampaignStoryColumnMigration {

    private static final Logger LOG = Logger.getLogger(CampaignStoryColumnMigration.class);

    @Inject
    EntityManager entityManager;

    void onStart(@Observes StartupEvent event) {
        try {
            QuarkusTransaction.requiringNew().run(this::widenStoryColumn);
        } catch (Exception exception) {
            LOG.error("Could not widen campaign.story to " + Campaign.STORY_MAX_LENGTH
                    + " characters; stories longer than the current column cannot be saved", exception);
        }
    }

    void widenStoryColumn() {
        Integer currentLength = currentStoryColumnLength();
        if (currentLength == null || currentLength >= Campaign.STORY_MAX_LENGTH) {
            return;
        }

        // SET DATA TYPE is understood by PostgreSQL and H2 alike.
        entityManager.createNativeQuery(
                "alter table campaign alter column story set data type varchar(" + Campaign.STORY_MAX_LENGTH + ")"
        ).executeUpdate();
        LOG.infof("Widened campaign.story from %d to %d characters", currentLength, Campaign.STORY_MAX_LENGTH);
    }

    /** Declared length of campaign.story, or {@code null} when the column is unbounded or missing. */
    Integer currentStoryColumnLength() {
        Object result = entityManager.createNativeQuery(
                "select min(character_maximum_length) from information_schema.columns "
                        + "where lower(table_name) = 'campaign' and lower(column_name) = 'story'"
        ).getSingleResult();
        return result instanceof Number number ? number.intValue() : null;
    }
}
