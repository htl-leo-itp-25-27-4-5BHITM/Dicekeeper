package account.deletion;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@ApplicationScoped
public class CleanupManifestExecutor {

    @ConfigProperty(name = "dicekeeper.upload-dir")
    String uploadDir;

    public void execute(List<String> relativePaths) {
        Path root = Path.of(uploadDir).toAbsolutePath().normalize();
        for (String entry : relativePaths == null ? List.<String>of() : relativePaths) {
            deleteOne(root, entry);
        }
    }

    void deleteOne(Path root, String entry) {
        if (entry == null || entry.isBlank()) {
            return;
        }

        Path relative;
        try {
            relative = Path.of(entry.trim());
        } catch (RuntimeException invalid) {
            throw new FileCleanupException("Cleanup manifest contains an invalid path");
        }
        if (relative.isAbsolute()) {
            throw new FileCleanupException("Cleanup manifest contains an absolute path");
        }

        Path normalizedRoot = root.toAbsolutePath().normalize();
        Path target = normalizedRoot.resolve(relative).normalize();
        if (!target.startsWith(normalizedRoot) || target.equals(normalizedRoot)) {
            throw new FileCleanupException("Cleanup manifest path escapes the upload directory");
        }

        try {
            if (Files.notExists(target)) {
                return;
            }
            if (Files.isDirectory(target)) {
                throw new FileCleanupException("Cleanup manifest path identifies a directory");
            }
            Files.delete(target);
        } catch (FileCleanupException known) {
            throw known;
        } catch (IOException failure) {
            throw new FileCleanupException("An uploaded file could not be deleted", failure);
        }
    }
}
