package tool;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.nio.file.Path;
import java.nio.file.Paths;

@ApplicationScoped
public class UploadPermissionStartupRepair {

    private static final Logger LOG = Logger.getLogger(UploadPermissionStartupRepair.class);

    @ConfigProperty(name = "dicekeeper.upload-dir")
    String uploadDir;

    void onStart(@Observes StartupEvent event) {
        Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
        int repaired = UploadPermissionUtil.repairTree(root);
        if (repaired > 0) {
            LOG.infof("Ensured shared read access for %d upload paths under %s", repaired, root);
        }
    }
}
