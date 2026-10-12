package account.deletion;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.Instant;

@ApplicationScoped
class AccountDeletionMarkerTransactions {

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    AccountDeletionMarker findOrCreate(String subjectDigest, Long playerId) {
        AccountDeletionMarker existing = AccountDeletionMarker.find("subjectDigest", subjectDigest).firstResult();
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
        marker.persistAndFlush();
        return marker;
    }
}
