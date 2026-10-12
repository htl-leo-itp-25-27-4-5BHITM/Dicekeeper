package account.deletion;

import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;
import player.Player;
import player.PlayerDeletionService;
import security.KeycloakAdminException;
import security.KeycloakAdminService;
import security.SecurityIdentityService;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@ApplicationScoped
public class AccountDeletionCoordinator {

    private static final Logger LOG = Logger.getLogger(AccountDeletionCoordinator.class);

    private final ConcurrentHashMap<String, ReentrantLock> subjectLocks = new ConcurrentHashMap<>();

    @Inject
    SecurityIdentityService identityService;

    @Inject
    SubjectDigest subjectDigest;

    @Inject
    AccountDeletionMarkerService markerService;

    @Inject
    PlayerDeletionService playerDeletionService;

    @Inject
    CleanupManifestExecutor manifestExecutor;

    @Inject
    KeycloakAdminService keycloakAdminService;

    public AccountDeletionOutcome delete(SecurityIdentity identity, Long expectedPlayerId) {
        String subject = identityService.getCurrentSubject(identity);
        if (subject == null || subject.isBlank()) {
            return AccountDeletionOutcome.FORBIDDEN;
        }
        String digest = subjectDigest.digest(subject);
        ReentrantLock lock = subjectLocks.computeIfAbsent(digest, ignored -> new ReentrantLock());
        lock.lock();
        try {
            try {
                return deleteLocked(identity, subject, digest, expectedPlayerId);
            } catch (RuntimeException unexpected) {
                logFailure(UUID.randomUUID().toString(),
                        "coordinator", DeletionFailureCategory.INTERNAL, null);
                return AccountDeletionOutcome.LOCAL_FAILURE;
            }
        } finally {
            lock.unlock();
            if (!lock.hasQueuedThreads()) {
                subjectLocks.remove(digest, lock);
            }
        }
    }

    private AccountDeletionOutcome deleteLocked(SecurityIdentity identity,
                                                 String subject,
                                                 String digest,
                                                 Long expectedPlayerId) {
        String correlationId = UUID.randomUUID().toString();
        AccountDeletionMarker marker = markerService.find(digest).orElse(null);
        if (marker != null && marker.state == AccountDeletionState.COMPLETED) {
            return expectedPlayerId == null || expectedPlayerId.equals(marker.originalPlayerId)
                    ? AccountDeletionOutcome.COMPLETED
                    : AccountDeletionOutcome.FORBIDDEN;
        }

        Player player = marker == null ? identityService.findCurrentPlayerWithoutCreating(identity) : null;
        Long playerId = marker != null ? marker.originalPlayerId : player != null ? player.id : null;
        if (playerId == null || (expectedPlayerId != null && !expectedPlayerId.equals(playerId))) {
            return AccountDeletionOutcome.FORBIDDEN;
        }

        KeycloakAdminService.AdminSession adminSession;
        try {
            adminSession = keycloakAdminService.preflight();
        } catch (KeycloakAdminException failure) {
            logFailure(correlationId, "preflight", failure.category(), failure.upstreamStatus());
            if (marker != null) {
                recordFailureSafely(digest, failure.category(), correlationId);
                return AccountDeletionOutcome.PENDING;
            }
            return AccountDeletionOutcome.PREFLIGHT_FAILED;
        }

        try {
            if (marker == null || marker.state == AccountDeletionState.PREPARED) {
                marker = playerDeletionService.deleteLocalPlayerAccount(digest, playerId);
            }
        } catch (RuntimeException failure) {
            logFailure(correlationId, "local", DeletionFailureCategory.LOCAL_DATABASE, null);
            return AccountDeletionOutcome.LOCAL_FAILURE;
        }

        if (marker.state == AccountDeletionState.LOCAL_DELETED) {
            try {
                manifestExecutor.execute(marker.cleanupPaths());
                marker = markerService.transition(digest,
                        AccountDeletionState.LOCAL_DELETED,
                        AccountDeletionState.FILES_DELETED);
            } catch (FileCleanupException failure) {
                recordFailureSafely(digest, DeletionFailureCategory.FILESYSTEM, correlationId);
                logFailure(correlationId, "files", DeletionFailureCategory.FILESYSTEM, null);
                return AccountDeletionOutcome.PENDING;
            } catch (RuntimeException failure) {
                recordFailureSafely(digest, DeletionFailureCategory.LOCAL_DATABASE, correlationId);
                logFailure(correlationId, "file-transition", DeletionFailureCategory.LOCAL_DATABASE, null);
                return AccountDeletionOutcome.PENDING;
            }
        }

        if (marker.state == AccountDeletionState.FILES_DELETED) {
            try {
                keycloakAdminService.deleteUser(subject, adminSession);
                markerService.transition(digest,
                        AccountDeletionState.FILES_DELETED,
                        AccountDeletionState.COMPLETED);
            } catch (KeycloakAdminException failure) {
                recordFailureSafely(digest, failure.category(), correlationId);
                logFailure(correlationId, "keycloak-delete", failure.category(), failure.upstreamStatus());
                return AccountDeletionOutcome.PENDING;
            } catch (RuntimeException failure) {
                recordFailureSafely(digest, DeletionFailureCategory.LOCAL_DATABASE, correlationId);
                logFailure(correlationId, "completion-transition", DeletionFailureCategory.LOCAL_DATABASE, null);
                return AccountDeletionOutcome.PENDING;
            }
        }

        return AccountDeletionOutcome.COMPLETED;
    }

    private void recordFailureSafely(String subjectDigest,
                                     DeletionFailureCategory category,
                                     String correlationId) {
        try {
            markerService.recordFailure(subjectDigest, category);
        } catch (RuntimeException persistenceFailure) {
            logFailure(correlationId, "failure-record", DeletionFailureCategory.LOCAL_DATABASE, null);
        }
    }

    private void logFailure(String correlationId,
                            String stage,
                            DeletionFailureCategory category,
                            Integer upstreamStatus) {
        LOG.warnf("event=account_deletion_failure correlation=%s stage=%s category=%s upstream_status=%s",
                correlationId,
                stage,
                category,
                upstreamStatus == null ? "none" : upstreamStatus);
    }
}
