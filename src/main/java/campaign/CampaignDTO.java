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
    public java.util.List<String> mapImagePaths;
    public java.util.List<CampaignMapDTO> maps;
    public Integer selectedMapIndex;
    public Boolean isPublic;
    public Integer maxPlayerCount;
    public Boolean started;

    public CampaignDTO() {}

    public CampaignDTO(Campaign campaign, boolean includeStory) {
        this.id = campaign.id;
        this.name = campaign.name;
        this.description = campaign.description;
        this.playerId = campaign.playerId;
        this.mapImagePaths = parseMapPaths(campaign);
        this.selectedMapIndex = normalizeSelectedMapIndex(campaign.selectedMapIndex, this.mapImagePaths.size());
        this.mapImagePath = this.mapImagePaths.isEmpty() ? null : this.mapImagePaths.get(this.selectedMapIndex);
        this.maps = new java.util.ArrayList<>();
        for (int i = 0; i < this.mapImagePaths.size(); i++) {
            this.maps.add(new CampaignMapDTO(i, "Karte " + (i + 1), this.mapImagePaths.get(i), i == this.selectedMapIndex));
        }
        this.isPublic = campaign.isPublic;
        this.maxPlayerCount = campaign.maxPlayerCount;
        this.started = campaign.started;

        // Only include story if requester is DM
        if (includeStory) {
            this.story = campaign.story;
        }
    }

    private java.util.List<String> parseMapPaths(Campaign campaign) {
        java.util.List<String> paths = new java.util.ArrayList<>();
        if (campaign.mapImagePaths != null && !campaign.mapImagePaths.isBlank()) {
            for (String path : campaign.mapImagePaths.split("\\R")) {
                if (path != null && !path.isBlank() && !paths.contains(path.trim())) {
                    paths.add(path.trim());
                }
            }
        }
        if (paths.isEmpty() && campaign.mapImagePath != null && !campaign.mapImagePath.isBlank()) {
            paths.add(campaign.mapImagePath);
        }
        return paths;
    }

    private int normalizeSelectedMapIndex(Integer index, int size) {
        if (size <= 0) return 0;
        if (index == null || index < 0) return 0;
        return Math.min(index, size - 1);
    }

    public static class CampaignMapDTO {
        public int index;
        public String name;
        public String path;
        public boolean selected;

        public CampaignMapDTO() {}

        public CampaignMapDTO(int index, String name, String path, boolean selected) {
            this.index = index;
            this.name = name;
            this.path = path;
            this.selected = selected;
        }
    }
}
