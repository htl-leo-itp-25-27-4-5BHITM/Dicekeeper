package campaign;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "group_decision")
public class GroupDecision extends PanacheEntity {

    @Column(name = "campaign_id", nullable = false)
    public Long campaignId;

    @Column(name = "title", nullable = false)
    public String title;

    @Column(name = "description", length = 2000)
    public String description;

    @Column(name = "decision_made", length = 1000)
    public String decisionMade;

    @Column(name = "created_at", nullable = false)
    public Long createdAt;

    @Column(name = "resolved_at")
    public Long resolvedAt;

    // Status: PENDING, RESOLVED
    @Column(name = "status", nullable = false)
    public String status = "PENDING";

    @Column(name = "order_index")
    public Integer orderIndex;

    public GroupDecision() {}

    public GroupDecision(Long campaignId, String title, String description) {
        this.campaignId = campaignId;
        this.title = title;
        this.description = description;
        this.createdAt = System.currentTimeMillis();
        this.status = "PENDING";
    }
}

