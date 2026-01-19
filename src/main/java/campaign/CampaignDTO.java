package campaign;

/**
 * DTO for Campaign that hides story from non-DM players.
 */
public class CampaignDTO {
    public Long id;
    public String name;
    public String description;
    public String story; // Only populated for DM
    public Long playerId;
    public String mapImagePath;
    public Boolean isPublic;
    public Integer maxPlayerCount;

    public CampaignDTO() {}

    public CampaignDTO(Campaign campaign, boolean includeStory) {
        this.id = campaign.id;
        this.name = campaign.name;
        this.description = campaign.description;
        this.playerId = campaign.playerId;
        this.mapImagePath = campaign.mapImagePath;
        this.isPublic = campaign.isPublic;
        this.maxPlayerCount = campaign.maxPlayerCount;

        // Only include story if requester is DM
        if (includeStory) {
            this.story = campaign.story;
        }
    }
}

