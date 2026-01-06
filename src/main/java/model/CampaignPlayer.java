package model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "campaign_player")
public class CampaignPlayer extends PanacheEntity {
    @Column(name = "campaign_id", nullable = false)
    public Long campaignId;

    @Column(name = "player_id", nullable = false)
    public Long playerId;

    @Column(name = "role", nullable = false)
    public String role; // "DM" or "PLAYER"

    @Column(name = "joined_at", nullable = false)
    public Long joinedAt; // timestamp when player joined

    public CampaignPlayer() {}

    public CampaignPlayer(Long campaignId, Long playerId, String role) {
        this.campaignId = campaignId;
        this.playerId = playerId;
        this.role = role;
        this.joinedAt = System.currentTimeMillis();
    }
}

