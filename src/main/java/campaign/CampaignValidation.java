package campaign;

final class CampaignValidation {

    static final String MAX_PLAYER_COUNT_ERROR = "Maximum player count must be 1 or greater";
    static final String STORY_TOO_LONG_ERROR =
            "Story must be at most " + Campaign.STORY_MAX_LENGTH + " characters";

    private CampaignValidation() {
    }

    static String validateMaxPlayerCount(Integer maxPlayerCount) {
        return maxPlayerCount != null && maxPlayerCount < 1
                ? MAX_PLAYER_COUNT_ERROR
                : null;
    }

    static String validateStory(String story) {
        return story != null && story.length() > Campaign.STORY_MAX_LENGTH
                ? STORY_TOO_LONG_ERROR
                : null;
    }
}
