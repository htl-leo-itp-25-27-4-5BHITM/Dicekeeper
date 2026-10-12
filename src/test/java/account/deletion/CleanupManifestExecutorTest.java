package account.deletion;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CleanupManifestExecutorTest {

    @TempDir
    Path uploadRoot;

    @Test
    void deletesFilesAndAcceptsAlreadyMissingFiles() throws IOException {
        Path file = uploadRoot.resolve("profiles/player.png");
        Files.createDirectories(file.getParent());
        Files.writeString(file, "image");
        CleanupManifestExecutor executor = executor();

        executor.execute(List.of("profiles/player.png", "profiles/already-missing.png"));
        executor.execute(List.of("profiles/player.png"));

        assertFalse(Files.exists(file));
    }

    @Test
    void rejectsTraversalAbsolutePathsAndDirectories() throws IOException {
        Files.createDirectories(uploadRoot.resolve("maps"));
        CleanupManifestExecutor executor = executor();

        assertThrows(FileCleanupException.class, () -> executor.execute(List.of("../outside")));
        assertThrows(FileCleanupException.class, () -> executor.execute(List.of(uploadRoot.resolve("x").toString())));
        assertThrows(FileCleanupException.class, () -> executor.execute(List.of("maps")));
    }

    @Test
    void leavesAnIoFailureRetryable() throws IOException {
        Path file = uploadRoot.resolve("profiles/locked.png");
        Files.createDirectories(file.getParent());
        Files.writeString(file, "image");
        CleanupManifestExecutor executor = new CleanupManifestExecutor() {
            @Override
            void deleteOne(Path root, String entry) {
                throw new FileCleanupException("An uploaded file could not be deleted", new IOException("simulated"));
            }
        };
        executor.uploadDir = uploadRoot.toString();

        assertThrows(FileCleanupException.class, () -> executor.execute(List.of("profiles/locked.png")));
        assertTrue(Files.exists(file));
    }

    private CleanupManifestExecutor executor() {
        CleanupManifestExecutor executor = new CleanupManifestExecutor();
        executor.uploadDir = uploadRoot.toString();
        return executor;
    }
}
