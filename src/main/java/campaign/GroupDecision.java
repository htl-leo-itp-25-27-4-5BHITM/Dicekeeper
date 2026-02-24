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

    @Column(name = "yes_votes", nullable = false)
    public int yesVotes = 0;

    @Column(name = "no_votes", nullable = false)
    public int noVotes = 0;

    @Column(name = "total_players", nullable = false)
    public int totalPlayers = 0;

    // Comma-separated list of player IDs that have voted
    @Column(name = "voted_player_ids", length = 2000)
    public String votedPlayerIds = "";

    public GroupDecision() {}

    public GroupDecision(Long campaignId, String title, String description, int totalPlayers) {
        this.campaignId = campaignId;
        this.title = title;
        this.description = description;
        this.createdAt = System.currentTimeMillis();
        this.status = "PENDING";
        this.totalPlayers = totalPlayers;
    }

    public boolean hasPlayerVoted(Long playerId) {
        if (votedPlayerIds == null || votedPlayerIds.isEmpty()) return false;
        return ("," + votedPlayerIds + ",").contains("," + playerId + ",");
    }

    public void addVote(Long playerId, String voteType) {
        if (hasPlayerVoted(playerId)) return;
        if ("yes".equals(voteType)) yesVotes++;
        else if ("no".equals(voteType)) noVotes++;
        if (votedPlayerIds == null || votedPlayerIds.isEmpty()) {
            votedPlayerIds = String.valueOf(playerId);
        } else {
            votedPlayerIds += "," + playerId;
        }
    }

    public boolean allVoted() {
        return totalPlayers > 0 && (yesVotes + noVotes) >= totalPlayers;
    }
}

