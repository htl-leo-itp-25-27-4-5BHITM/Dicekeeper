package account.deletion;

import io.quarkus.security.identity.SecurityIdentity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import player.Player;
import player.PlayerDeletionService;
import security.KeycloakAdminException;
import security.KeycloakAdminService;
import security.SecurityIdentityService;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.logging.Handler;
import java.util.logging.LogRecord;

import static org.junit.jupiter.api.Assertions.*;

class AccountDeletionCoordinatorTest {

    private AccountDeletionCoordinator coordinator;
    private FakeMarkerService markers;
    private FakePlayerDeletion local;
    private FakeManifestExecutor files;
    private FakeKeycloak keycloak;

    @BeforeEach
    void setUp() {
        coordinator = new AccountDeletionCoordinator();
        markers = new FakeMarkerService();
        local = new FakePlayerDeletion(markers);
        files = new FakeManifestExecutor();
        keycloak = new FakeKeycloak();
        coordinator.identityService = new FakeIdentityService();
        coordinator.subjectDigest = new SubjectDigest();
        coordinator.markerService = markers;
        coordinator.playerDeletionService = local;
        coordinator.manifestExecutor = files;
        coordinator.keycloakAdminService = keycloak;
    }

    @Test
    void runsTheCompleteSuccessfulStateSequence() {
        AccountDeletionOutcome outcome = coordinator.delete(null, null);

        assertEquals(AccountDeletionOutcome.COMPLETED, outcome);
        assertEquals(AccountDeletionState.COMPLETED, markers.marker.state);
        assertEquals(1, local.calls);
        assertEquals(1, files.calls);
        assertEquals(1, keycloak.deleteCalls);
    }

    @Test
    void preflightFailureDoesNotMutateLocalState() {
        keycloak.preflightFailure = new KeycloakAdminException(
                DeletionFailureCategory.AUTHENTICATION, 401, "safe");

        assertEquals(AccountDeletionOutcome.PREFLIGHT_FAILED, coordinator.delete(null, null));
        assertNull(markers.marker);
        assertEquals(0, local.calls);
        assertEquals(0, files.calls);
        assertEquals(0, keycloak.deleteCalls);
    }

    @Test
    void failureLogsContainOnlyStructuredRedactedContext() {
        keycloak.preflightFailure = new KeycloakAdminException(
                DeletionFailureCategory.AUTHENTICATION,
                401,
                "secret token subject@example.test <!DOCTYPE upstream body");
        AtomicReference<String> captured = new AtomicReference<>("");
        Handler handler = new Handler() {
            @Override
            public void publish(LogRecord record) {
                captured.set(record.getMessage());
            }

            @Override public void flush() {}
            @Override public void close() {}
        };
        java.util.logging.Logger logger = java.util.logging.Logger.getLogger(AccountDeletionCoordinator.class.getName());
        logger.addHandler(handler);
        try {
            coordinator.delete(null, null);
        } finally {
            logger.removeHandler(handler);
        }

        assertTrue(captured.get().contains("correlation="));
        assertTrue(captured.get().contains("stage=preflight"));
        assertTrue(captured.get().contains("category=AUTHENTICATION"));
        assertFalse(captured.get().matches("(?is).*secret|token|subject@example|DOCTYPE|upstream body.*"));
    }

    @Test
    void resumesEveryPersistedIntermediateStateAndDuplicatesAreIdempotent() {
        markers.marker = marker(AccountDeletionState.LOCAL_DELETED);
        assertEquals(AccountDeletionOutcome.COMPLETED, coordinator.delete(null, null));
        assertEquals(0, local.calls);
        assertEquals(1, files.calls);
        assertEquals(1, keycloak.deleteCalls);

        assertEquals(AccountDeletionOutcome.COMPLETED, coordinator.delete(null, null));
        assertEquals(1, files.calls);
        assertEquals(1, keycloak.deleteCalls);

        setUp();
        markers.marker = marker(AccountDeletionState.FILES_DELETED);
        assertEquals(AccountDeletionOutcome.COMPLETED, coordinator.delete(null, null));
        assertEquals(0, local.calls);
        assertEquals(0, files.calls);
        assertEquals(1, keycloak.deleteCalls);
    }

    @Test
    void persistedFailuresRemainPendingAndAnotherPlayerCannotReuseTheMarker() {
        markers.marker = marker(AccountDeletionState.LOCAL_DELETED);
        files.failure = new FileCleanupException("retry");
        assertEquals(AccountDeletionOutcome.PENDING, coordinator.delete(null, null));
        assertEquals(AccountDeletionState.LOCAL_DELETED, markers.marker.state);
        assertEquals(DeletionFailureCategory.FILESYSTEM, markers.marker.failureCategory);

        files.failure = null;
        assertEquals(AccountDeletionOutcome.FORBIDDEN, coordinator.delete(null, 999L));
        assertEquals(AccountDeletionState.LOCAL_DELETED, markers.marker.state);
    }

    @Test
    void localFailureReturnsTheRollbackSafeOutcome() {
        local.failure = new IllegalStateException("simulated database error with internal details");
        assertEquals(AccountDeletionOutcome.LOCAL_FAILURE, coordinator.delete(null, null));
        assertNull(markers.marker);
        assertEquals(0, files.calls);
        assertEquals(0, keycloak.deleteCalls);
    }

    private AccountDeletionMarker marker(AccountDeletionState state) {
        AccountDeletionMarker marker = new AccountDeletionMarker();
        marker.id = 1L;
        marker.subjectDigest = new SubjectDigest().digest("subject");
        marker.originalPlayerId = 123L;
        marker.state = state;
        marker.createdAt = Instant.now();
        marker.updatedAt = marker.createdAt;
        marker.setCleanupPaths(List.of("profiles/test.png"));
        return marker;
    }

    private static class FakeIdentityService extends SecurityIdentityService {
        @Override
        public String getCurrentSubject(SecurityIdentity identity) {
            return "subject";
        }

        @Override
        public Player findCurrentPlayerWithoutCreating(SecurityIdentity identity) {
            Player player = new Player();
            player.id = 123L;
            return player;
        }
    }

    private static class FakeMarkerService extends AccountDeletionMarkerService {
        AccountDeletionMarker marker;

        @Override
        public Optional<AccountDeletionMarker> find(String subjectDigest) {
            return Optional.ofNullable(marker);
        }

        @Override
        public AccountDeletionMarker transition(String subjectDigest,
                                                AccountDeletionState expected,
                                                AccountDeletionState next) {
            if (marker.state != expected) throw new IllegalStateException("bad transition");
            marker.state = next;
            marker.failureCategory = null;
            return marker;
        }

        @Override
        public void recordFailure(String subjectDigest, DeletionFailureCategory category) {
            marker.failureCategory = category;
        }
    }

    private static class FakePlayerDeletion extends PlayerDeletionService {
        private final FakeMarkerService markers;
        int calls;
        RuntimeException failure;

        FakePlayerDeletion(FakeMarkerService markers) {
            this.markers = markers;
        }

        @Override
        public AccountDeletionMarker deleteLocalPlayerAccount(String subjectDigest, Long playerId) {
            calls++;
            if (failure != null) throw failure;
            markers.marker = new AccountDeletionCoordinatorTest().marker(AccountDeletionState.LOCAL_DELETED);
            return markers.marker;
        }
    }

    private static class FakeManifestExecutor extends CleanupManifestExecutor {
        int calls;
        RuntimeException failure;

        @Override
        public void execute(List<String> relativePaths) {
            calls++;
            if (failure != null) throw failure;
        }
    }

    private static class FakeKeycloak extends KeycloakAdminService {
        KeycloakAdminException preflightFailure;
        KeycloakAdminException deleteFailure;
        int deleteCalls;

        @Override
        public AdminSession preflight() {
            if (preflightFailure != null) throw preflightFailure;
            return null;
        }

        @Override
        public void deleteUser(String keycloakUserId, AdminSession session) {
            deleteCalls++;
            if (deleteFailure != null) throw deleteFailure;
        }
    }
}
