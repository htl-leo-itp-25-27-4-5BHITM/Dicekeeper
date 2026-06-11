package campaign;

final class CampaignValidation {

    static final String MAX_PLAYER_COUNT_ERROR = "Maximum player count must be 0 or greater";

    private CampaignValidation() {
    }

    static String validateMaxPlayerCount(Integer maxPlayerCount) {
        return maxPlayerCount != null && maxPlayerCount < 0
                ? MAX_PLAYER_COUNT_ERROR
                : null;
    }
}
