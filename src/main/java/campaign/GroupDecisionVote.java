package campaign;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * One player's vote on a group decision. The unique constraint guarantees one vote per player,
 * even if two requests from the same player race each other.
 */
@Entity
@Table(name = "group_decision_vote",
        uniqueConstraints = @UniqueConstraint(name = "uk_group_decision_vote_player",
                columnNames = {"decision_id", "player_id"}))
public class GroupDecisionVote extends PanacheEntity {

    @Column(name = "decision_id", nullable = false)
    public Long decisionId;

    @Column(name = "campaign_id", nullable = false)
    public Long campaignId;

    @Column(name = "player_id", nullable = false)
    public Long playerId;

    /** "yes" or "no" */
    @Column(name = "vote", nullable = false, length = 8)
    public String vote;

    @Column(name = "created_at", nullable = false)
    public Long createdAt;

    public GroupDecisionVote() {}

    public GroupDecisionVote(GroupDecision decision, Long playerId, String vote) {
        this.decisionId = decision.id;
        this.campaignId = decision.campaignId;
        this.playerId = playerId;
        this.vote = vote;
        this.createdAt = System.currentTimeMillis();
    }
}
