package campaign;

public class GroupDecisionDTO {
    public Long id;
    public Long campaignId;
    public String title;
    public String description;
    public String decisionMade;
    public Long createdAt;
    public Long resolvedAt;
    public String status;
    public Integer orderIndex;
    public int yesVotes;
    public int noVotes;
    public int totalPlayers;

    public GroupDecisionDTO() {}

    public GroupDecisionDTO(GroupDecision decision) {
        this.id = decision.id;
        this.campaignId = decision.campaignId;
        this.title = decision.title;
        this.description = decision.description;
        this.decisionMade = decision.decisionMade;
        this.createdAt = decision.createdAt;
        this.resolvedAt = decision.resolvedAt;
        this.status = decision.status;
        this.orderIndex = decision.orderIndex;
        this.yesVotes = decision.yesVotes;
        this.noVotes = decision.noVotes;
        this.totalPlayers = decision.totalPlayers;
    }
}

