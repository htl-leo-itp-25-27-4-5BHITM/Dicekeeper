package campaign;

final class CampaignValidation {

    static final String MAX_PLAYER_COUNT_ERROR = "Die maximale Spielerzahl muss mindestens 1 sein";
    static final String STORY_TOO_LONG_ERROR =
            "Die Story darf h\u00f6chstens " + Campaign.STORY_MAX_LENGTH + " Zeichen lang sein";

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
