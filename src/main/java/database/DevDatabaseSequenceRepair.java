package database;

import io.quarkus.arc.profile.IfBuildProfile;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.id.enhanced.SequenceStyleGenerator;
import org.hibernate.persister.entity.AbstractEntityPersister;
import org.hibernate.persister.entity.EntityPersister;
import org.jboss.logging.Logger;

@ApplicationScoped
@IfBuildProfile("dev")
public class DevDatabaseSequenceRepair {

    private static final Logger LOG = Logger.getLogger(DevDatabaseSequenceRepair.class);

    @Inject
    EntityManager entityManager;

    @Inject
    EntityManagerFactory entityManagerFactory;

    void onStart(@Observes StartupEvent event) {
        try {
            QuarkusTransaction.requiringNew().run(this::repairSequences);
        } catch (Exception exception) {
            LOG.warn("Could not repair database sequences for dev startup", exception);
        }
    }

    private void repairSequences() {
        SessionFactoryImplementor sessionFactory = entityManagerFactory.unwrap(SessionFactoryImplementor.class);

        sessionFactory.getMappingMetamodel().forEachEntityDescriptor(this::repairSequenceForEntity);
    }

    private void repairSequenceForEntity(EntityPersister persister) {
        if (!(persister instanceof AbstractEntityPersister entityPersister)) {
            return;
        }

        if (!(entityPersister.getIdentifierGenerator() instanceof SequenceStyleGenerator sequenceGenerator)) {
            return;
        }

        if (!sequenceGenerator.getDatabaseStructure().isPhysicalSequence()) {
            return;
        }

        String tableName = entityPersister.getIdentifierTableName();
        String sequenceName = sequenceGenerator.getDatabaseStructure().getPhysicalName().render();

        try {
            long maxId = queryLong("select coalesce(max(id), 0) from " + tableName);
            long lastValue = queryLong("select last_value from " + sequenceName);
            long targetValue = Math.max(maxId, lastValue);

            if (targetValue <= lastValue) {
                return;
            }

            entityManager.createNativeQuery("select setval(cast(?1 as regclass), ?2, true)")
                    .setParameter(1, sequenceName)
                    .setParameter(2, targetValue)
                    .getSingleResult();

            LOG.infof("Advanced sequence %s to %d for %s", sequenceName, targetValue, tableName);
        } catch (Exception exception) {
            LOG.warnf(exception, "Could not repair sequence %s for table %s", sequenceName, tableName);
        }
    }

    private long queryLong(String sql) {
        return ((Number) entityManager.createNativeQuery(sql).getSingleResult()).longValue();
    }
}
