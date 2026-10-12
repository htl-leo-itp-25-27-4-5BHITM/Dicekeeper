package security;

import account.deletion.AccountDeletionMarker;
import account.deletion.AccountDeletionMarkerService;
import account.deletion.AccountDeletionState;
import account.deletion.AccountDeletionStatusException;
import account.deletion.SubjectDigest;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.security.runtime.QuarkusPrincipal;
import io.quarkus.security.runtime.QuarkusSecurityIdentity;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import player.Player;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class SecurityIdentityDeletionGuardTest {

    @Inject
    SecurityIdentityService identityService;

    @Inject
    AccountDeletionMarkerService markerService;

    @Inject
    SubjectDigest subjectDigest;

    @BeforeEach
    void clean() {
        QuarkusTransaction.requiringNew().run(() -> {
            AccountDeletionMarker.deleteAll();
            Player.deleteAll();
        });
    }

    @Test
    void createsNormalAndUnrelatedPlayers() {
        Player first = identityService.getOrCreateCurrentPlayer(identity("normal-subject", "normal@example.test"));
        markerService.startOrGet(subjectDigest.digest("pending-subject"), 999L);
        Player unrelated = identityService.getOrCreateCurrentPlayer(identity("other-subject", "other@example.test"));

        assertNotNull(first.id);
        assertNotNull(unrelated.id);
        assertNotEquals(first.id, unrelated.id);
    }

    @Test
    void pendingAndCompletedMarkersPreventPlayerRecreation() {
        String pendingSubject = "pending-subject";
        String pendingDigest = subjectDigest.digest(pendingSubject);
        markerService.startOrGet(pendingDigest, 41L);
        AccountDeletionStatusException pending = assertThrows(AccountDeletionStatusException.class,
                () -> identityService.getOrCreateCurrentPlayer(identity(pendingSubject, "pending@example.test")));
        assertEquals(AccountDeletionState.PREPARED, pending.state());

        String completedSubject = "completed-subject";
        String completedDigest = subjectDigest.digest(completedSubject);
        markerService.startOrGet(completedDigest, 42L);
        markerService.transition(completedDigest, AccountDeletionState.PREPARED, AccountDeletionState.LOCAL_DELETED);
        markerService.transition(completedDigest, AccountDeletionState.LOCAL_DELETED, AccountDeletionState.FILES_DELETED);
        markerService.transition(completedDigest, AccountDeletionState.FILES_DELETED, AccountDeletionState.COMPLETED);
        AccountDeletionStatusException completed = assertThrows(AccountDeletionStatusException.class,
                () -> identityService.getOrCreateCurrentPlayer(identity(completedSubject, "completed@example.test")));
        assertEquals(AccountDeletionState.COMPLETED, completed.state());
        assertEquals(0, Player.count());
    }

    private SecurityIdentity identity(String subject, String email) {
        return QuarkusSecurityIdentity.builder()
                .setPrincipal(new QuarkusPrincipal(subject))
                .addAttribute("sub", subject)
                .addAttribute("email", email)
                .build();
    }
}
