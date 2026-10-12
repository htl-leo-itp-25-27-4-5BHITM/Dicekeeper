package account.deletion;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

@Entity
@Table(name = "account_deletion_marker", indexes = {
        @Index(name = "idx_account_deletion_completed_at", columnList = "completed_at")
})
public class AccountDeletionMarker extends PanacheEntity {

    @Column(name = "subject_digest", nullable = false, unique = true, length = 64, updatable = false)
    public String subjectDigest;

    @Column(name = "original_player_id", nullable = false, updatable = false)
    public Long originalPlayerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    public AccountDeletionState state;

    @Column(name = "created_at", nullable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @Column(name = "completed_at")
    public Instant completedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "failure_category", length = 32)
    public DeletionFailureCategory failureCategory;

    @Column(name = "cleanup_manifest", length = 8192)
    public String cleanupManifest;

    @Version
    public long version;

    public List<String> cleanupPaths() {
        if (cleanupManifest == null || cleanupManifest.isBlank()) {
            return List.of();
        }
        List<String> paths = new ArrayList<>();
        for (String line : cleanupManifest.split("\\R")) {
            if (!line.isBlank()) {
                paths.add(line.trim());
            }
        }
        return List.copyOf(paths);
    }

    public void setCleanupPaths(Iterable<String> paths) {
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        if (paths != null) {
            for (String path : paths) {
                if (path != null && !path.isBlank()) {
                    unique.add(path.trim());
                }
            }
        }
        String manifest = String.join("\n", unique);
        if (manifest.length() > 8192) {
            throw new IllegalArgumentException("Cleanup manifest exceeds the supported size");
        }
        cleanupManifest = manifest.isBlank() ? null : manifest;
    }
}
