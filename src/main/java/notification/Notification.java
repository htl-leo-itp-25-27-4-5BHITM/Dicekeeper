package notification;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity
public class Notification extends PanacheEntity {

    @Column(name = "player_id", nullable = false)
    public Long playerId;

    // Type: CHARACTER_SUBMITTED, CHARACTER_APPROVED, CHARACTER_REJECTED
    @Column(nullable = false)
    public String type;

    @Column(nullable = false)
    public String title;

    @Column(length = 1000)
    public String message;

    // For navigation - e.g., campaignId, characterId, campaignPlayerId
    @Column(name = "reference_id")
    public Long referenceId;

    @Column(name = "secondary_reference_id")
    public Long secondaryReferenceId;

    @Column(name = "is_read", nullable = false)
    public Boolean isRead = false;

    @Column(name = "created_at", nullable = false)
    public Long createdAt;

    public Notification() {
        this.createdAt = System.currentTimeMillis();
        this.isRead = false;
    }

    public Notification(Long playerId, String type, String title, String message, Long referenceId) {
        this();
        this.playerId = playerId;
        this.type = type;
        this.title = title;
        this.message = message;
        this.referenceId = referenceId;
    }

    public Notification(Long playerId, String type, String title, String message, Long referenceId, Long secondaryReferenceId) {
        this(playerId, type, title, message, referenceId);
        this.secondaryReferenceId = secondaryReferenceId;
    }
}

