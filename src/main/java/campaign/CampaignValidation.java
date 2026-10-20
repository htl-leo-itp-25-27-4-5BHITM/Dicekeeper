package campaign;

final class CampaignValidation {

    static final String MAX_PLAYER_COUNT_ERROR = "Die maximale Spielerzahl muss mindestens 1 sein";

    private CampaignValidation() {
    }

    static String validateMaxPlayerCount(Integer maxPlayerCount) {
        return maxPlayerCount != null && maxPlayerCount < 1
                ? MAX_PLAYER_COUNT_ERROR
                : null;
    }
}
