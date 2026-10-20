package tool;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class UploadPathsTest {

    @Test
    void acceptsOnlyPlainFilesInTheExpectedFolder() {
        assertTrue(UploadPaths.resolveManagedFile("uploads", "/uploads/maps/campaign-1-abc.png", UploadPaths.MAPS).isPresent());

        assertTrue(UploadPaths.resolveManagedFile("uploads", "/uploads/../secret.txt", UploadPaths.MAPS).isEmpty());
        assertTrue(UploadPaths.resolveManagedFile("uploads", "/uploads/maps/../../secret.txt", UploadPaths.MAPS).isEmpty());
        assertTrue(UploadPaths.resolveManagedFile("uploads", "/uploads/maps/..", UploadPaths.MAPS).isEmpty());
        assertTrue(UploadPaths.resolveManagedFile("uploads", "/uploads/maps/a/b.png", UploadPaths.MAPS).isEmpty());
        assertTrue(UploadPaths.resolveManagedFile("uploads", "/etc/passwd", UploadPaths.MAPS).isEmpty());
        assertTrue(UploadPaths.resolveManagedFile("uploads", "/uploads/profiles/x.png", UploadPaths.MAPS).isEmpty());
        assertTrue(UploadPaths.resolveManagedFile("uploads", null, UploadPaths.MAPS).isEmpty());
    }
}
