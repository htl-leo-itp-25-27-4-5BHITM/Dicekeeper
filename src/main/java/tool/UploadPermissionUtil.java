package tool;

import org.jboss.logging.Logger;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

public final class UploadPermissionUtil {

    private static final Logger LOG = Logger.getLogger(UploadPermissionUtil.class);

    private UploadPermissionUtil() {
    }

    public static void ensureSharedReadAccess(Path path) {
        if (path == null || !Files.exists(path)) {
            return;
        }

        boolean directory = Files.isDirectory(path);
        path.toFile().setReadable(true, false);
        if (directory) {
            path.toFile().setExecutable(true, false);
        }

        try {
            Set<PosixFilePermission> permissions = new HashSet<>(Files.getPosixFilePermissions(path));
            permissions.add(PosixFilePermission.OWNER_READ);
            permissions.add(PosixFilePermission.GROUP_READ);
            permissions.add(PosixFilePermission.OTHERS_READ);

            if (directory) {
                permissions.add(PosixFilePermission.OWNER_EXECUTE);
                permissions.add(PosixFilePermission.GROUP_EXECUTE);
                permissions.add(PosixFilePermission.OTHERS_EXECUTE);
            }

            Files.setPosixFilePermissions(path, permissions);
        } catch (UnsupportedOperationException | IOException exception) {
            LOG.debugf("Could not set POSIX permissions for %s: %s", path, exception.getMessage());
        }
    }

    public static int repairTree(Path root) {
        if (root == null || !Files.exists(root)) {
            return 0;
        }

        AtomicInteger repaired = new AtomicInteger();
        ensureSharedReadAccess(root);
        repaired.incrementAndGet();

        try (Stream<Path> walk = Files.walk(root)) {
            walk.sorted(Comparator.comparingInt(Path::getNameCount))
                    .skip(1)
                    .forEach(path -> {
                        ensureSharedReadAccess(path);
                        repaired.incrementAndGet();
                    });
        } catch (IOException exception) {
            LOG.warnf(exception, "Could not repair upload permissions under %s", root);
        }

        return repaired.get();
    }
}
