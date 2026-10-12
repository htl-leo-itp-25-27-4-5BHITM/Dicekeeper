package account.deletion;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class AccountDeletionMarkerServiceTest {

    @Inject
    AccountDeletionMarkerService markerService;

    @Inject
    EntityManager entityManager;

    @BeforeEach
    void clean() {
        QuarkusTransaction.requiringNew().run(() -> AccountDeletionMarker.deleteAll());
    }

    @Test
    void persistsEveryStateAndOnlyApprovedColumns() {
        QuarkusTransaction.requiringNew().run(() -> {
            int index = 0;
            for (AccountDeletionState state : AccountDeletionState.values()) {
                AccountDeletionMarker marker = marker("state-" + index++, (long) index, state);
                marker.persist();
            }
        });

        List<AccountDeletionMarker> persisted = AccountDeletionMarker.listAll();
        assertEquals(Set.of(AccountDeletionState.values()),
                persisted.stream().map(marker -> marker.state).collect(java.util.stream.Collectors.toSet()));

        @SuppressWarnings("unchecked")
        List<String> rawColumns = entityManager.createNativeQuery("""
                select column_name from information_schema.columns
                where upper(table_name) = 'ACCOUNT_DELETION_MARKER'
                """).getResultList();
        Set<String> columns = new HashSet<>();
        rawColumns.forEach(column -> columns.add(column.toLowerCase()));
        assertTrue(columns.containsAll(Set.of("subject_digest", "original_player_id", "state",
                "created_at", "updated_at", "completed_at", "failure_category", "cleanup_manifest")));
        for (String forbidden : List.of("email", "display_name", "subject", "credential", "token", "upstream_body")) {
            assertFalse(columns.contains(forbidden), "forbidden marker column: " + forbidden);
        }
    }

    @Test
    void enforcesTransitionsAndMakesConcurrentStartsConverge() throws Exception {
        String digest = "c".repeat(64);
        try (var pool = Executors.newFixedThreadPool(2)) {
            Callable<Long> start = () -> markerService.startOrGet(digest, 77L).id;
            List<java.util.concurrent.Future<Long>> results = pool.invokeAll(List.of(start, start));
            assertEquals(results.get(0).get(), results.get(1).get());
        }
        assertEquals(1, AccountDeletionMarker.count("subjectDigest", digest));

        markerService.transition(digest, AccountDeletionState.PREPARED, AccountDeletionState.LOCAL_DELETED);
        assertThrows(IllegalStateException.class, () -> markerService.transition(
                digest, AccountDeletionState.LOCAL_DELETED, AccountDeletionState.COMPLETED));
        markerService.transition(digest, AccountDeletionState.LOCAL_DELETED, AccountDeletionState.FILES_DELETED);
        markerService.transition(digest, AccountDeletionState.FILES_DELETED, AccountDeletionState.COMPLETED);
        assertEquals(AccountDeletionState.COMPLETED, markerService.find(digest).orElseThrow().state);
    }

    @Test
    void expiresOnlyCompletedMarkersPastRetention() {
        Instant now = Instant.now();
        QuarkusTransaction.requiringNew().run(() -> {
            AccountDeletionMarker active = marker("a".repeat(64), 1L, AccountDeletionState.LOCAL_DELETED);
            active.createdAt = now.minus(30, ChronoUnit.DAYS);
            active.updatedAt = active.createdAt;
            active.persist();

            AccountDeletionMarker recent = marker("b".repeat(64), 2L, AccountDeletionState.COMPLETED);
            recent.completedAt = now.minus(1, ChronoUnit.DAYS);
            recent.persist();

            AccountDeletionMarker expired = marker("d".repeat(64), 3L, AccountDeletionState.COMPLETED);
            expired.completedAt = now.minus(8, ChronoUnit.DAYS);
            expired.persist();
        });

        assertTrue(markerService.hasValidRetention());
        assertEquals(1, markerService.expireCompletedMarkers(now));
        assertEquals(2, AccountDeletionMarker.count());
        assertTrue(markerService.find("a".repeat(64)).isPresent());
        assertTrue(markerService.find("b".repeat(64)).isPresent());
        assertTrue(markerService.find("d".repeat(64)).isEmpty());
    }

    @Test
    void lookupLazilyExpiresAnEligibleCompletedMarker() {
        String digest = "e".repeat(64);
        QuarkusTransaction.requiringNew().run(() -> {
            AccountDeletionMarker expired = marker(digest, 9L, AccountDeletionState.COMPLETED);
            expired.completedAt = Instant.now().minus(8, ChronoUnit.DAYS);
            expired.persist();
        });

        assertTrue(markerService.find(digest).isEmpty());
        assertEquals(0, AccountDeletionMarker.count("subjectDigest", digest));
    }

    private AccountDeletionMarker marker(String digest, Long playerId, AccountDeletionState state) {
        AccountDeletionMarker marker = new AccountDeletionMarker();
        marker.subjectDigest = digest.length() == 64 ? digest : new SubjectDigest().digest(digest);
        marker.originalPlayerId = playerId;
        marker.state = state;
        marker.createdAt = Instant.now();
        marker.updatedAt = marker.createdAt;
        marker.setCleanupPaths(List.of("profiles/" + playerId + ".png"));
        if (state == AccountDeletionState.COMPLETED) {
            marker.completedAt = marker.updatedAt;
        }
        return marker;
    }
}
