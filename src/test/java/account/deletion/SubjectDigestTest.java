package account.deletion;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SubjectDigestTest {

    private final SubjectDigest digest = new SubjectDigest();

    @Test
    void producesStableNonReversibleWidthDigest() {
        String first = digest.digest("keycloak-subject-123");
        assertEquals(64, first.length());
        assertEquals(first, digest.digest("keycloak-subject-123"));
        assertNotEquals(first, digest.digest("keycloak-subject-124"));
        assertFalse(first.contains("keycloak-subject"));
    }

    @Test
    void rejectsMissingSubjects() {
        assertThrows(IllegalArgumentException.class, () -> digest.digest(" "));
    }
}
