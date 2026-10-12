package account.deletion;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@ApplicationScoped
public class AccountDeletionMarkerService {

    private final ConcurrentHashMap<String, ReentrantLock> startLocks = new ConcurrentHashMap<>();

    @jakarta.inject.Inject
    AccountDeletionMarkerTransactions transactions;

    @ConfigProperty(name = "dicekeeper.account-deletion.marker-retention", defaultValue = "P7D")
    Duration completedRetention;

    @ConfigProperty(name = "dicekeeper.account-deletion.accepted-session-window", defaultValue = "PT8H")
    Duration acceptedSessionWindow;

    @Transactional
    public Optional<AccountDeletionMarker> find(String subjectDigest) {
        if (subjectDigest == null || subjectDigest.isBlank()) {
            return Optional.empty();
        }
        AccountDeletionMarker marker = AccountDeletionMarker.find("subjectDigest", subjectDigest).firstResult();
        if (marker != null
                && marker.state == AccountDeletionState.COMPLETED
                && marker.completedAt != null) {
            validateRetention();
            if (marker.completedAt.isBefore(Instant.now().minus(completedRetention))) {
                marker.delete();
                return Optional.empty();
            }
        }
        return Optional.ofNullable(marker);
    }

    public AccountDeletionMarker startOrGet(String subjectDigest, Long playerId) {
        ReentrantLock lock = startLocks.computeIfAbsent(subjectDigest, ignored -> new ReentrantLock());
        lock.lock();
        try {
            return transactions.findOrCreate(subjectDigest, playerId);
        } finally {
            lock.unlock();
            if (!lock.hasQueuedThreads()) {
                startLocks.remove(subjectDigest, lock);
            }
        }
    }

    @Transactional
    public Optional<AccountDeletionMarker> findForUpdate(String subjectDigest) {
        return AccountDeletionMarker.find("subjectDigest", subjectDigest)
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .firstResultOptional();
    }

    @Transactional
    public AccountDeletionMarker createPrepared(String subjectDigest, Long playerId, List<String> cleanupPaths) {
        AccountDeletionMarker existing = findForUpdate(subjectDigest).orElse(null);
        if (existing != null) {
            if (!existing.originalPlayerId.equals(playerId)) {
                throw new IllegalStateException("Deletion marker ownership mismatch");
            }
            return existing;
        }

        Instant now = Instant.now();
        AccountDeletionMarker marker = new AccountDeletionMarker();
        marker.subjectDigest = subjectDigest;
        marker.originalPlayerId = playerId;
        marker.state = AccountDeletionState.PREPARED;
        marker.createdAt = now;
        marker.updatedAt = now;
        marker.setCleanupPaths(cleanupPaths);
        marker.persistAndFlush();
        return marker;
    }

    @Transactional
    public AccountDeletionMarker transition(String subjectDigest,
                                            AccountDeletionState expected,
                                            AccountDeletionState next) {
        AccountDeletionMarker marker = findForUpdate(subjectDigest)
                .orElseThrow(() -> new IllegalStateException("Account deletion marker is missing"));
        if (marker.state == next) {
            return marker;
        }
        if (marker.state != expected || !isAllowed(expected, next)) {
            throw new IllegalStateException("Invalid account deletion transition: " + marker.state + " -> " + next);
        }
        marker.state = next;
        marker.updatedAt = Instant.now();
        marker.failureCategory = null;
        if (next == AccountDeletionState.COMPLETED) {
            marker.completedAt = marker.updatedAt;
        }
        return marker;
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void recordFailure(String subjectDigest, DeletionFailureCategory category) {
        findForUpdate(subjectDigest).ifPresent(marker -> {
            marker.failureCategory = category;
            marker.updatedAt = Instant.now();
        });
    }

    @Transactional
    public long expireCompletedMarkers(Instant now) {
        validateRetention();
        Instant cutoff = now.minus(completedRetention);
        return AccountDeletionMarker.delete("state = ?1 and completedAt is not null and completedAt < ?2",
                AccountDeletionState.COMPLETED, cutoff);
    }

    public Duration completedRetention() {
        validateRetention();
        return completedRetention;
    }

    public Duration acceptedSessionWindow() {
        return acceptedSessionWindow;
    }

    public boolean hasValidRetention() {
        return completedRetention != null
                && acceptedSessionWindow != null
                && !completedRetention.isNegative()
                && completedRetention.compareTo(acceptedSessionWindow) >= 0;
    }

    private void validateRetention() {
        if (!hasValidRetention()) {
            throw new IllegalStateException("Completed-marker retention must be at least the accepted OIDC session window");
        }
    }

    private boolean isAllowed(AccountDeletionState current, AccountDeletionState next) {
        return switch (current) {
            case PREPARED -> next == AccountDeletionState.LOCAL_DELETED;
            case LOCAL_DELETED -> next == AccountDeletionState.FILES_DELETED;
            case FILES_DELETED -> next == AccountDeletionState.COMPLETED;
            case COMPLETED -> false;
        };
    }
}
