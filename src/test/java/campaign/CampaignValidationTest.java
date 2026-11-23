package campaign;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CampaignValidationTest {

    @Test
    void rejectsNonPositiveMaxPlayerCount() {
        assertEquals(
                CampaignValidation.MAX_PLAYER_COUNT_ERROR,
                CampaignValidation.validateMaxPlayerCount(-1)
        );
        assertEquals(
                CampaignValidation.MAX_PLAYER_COUNT_ERROR,
                CampaignValidation.validateMaxPlayerCount(0)
        );
    }

    @Test
    void acceptsPositiveAndUnlimitedMaxPlayerCounts() {
        assertNull(CampaignValidation.validateMaxPlayerCount(5));
        assertNull(CampaignValidation.validateMaxPlayerCount(null));
    }

    @Test
    void entityValidationRejectsNonPositiveMaxPlayerCount() {
        Campaign campaign = new Campaign();
        campaign.maxPlayerCount = 0;

        assertThrows(IllegalArgumentException.class, campaign::validate);
    }

    @Test
    void acceptsStoriesUpTo5000Characters() {
        assertNull(CampaignValidation.validateStory(null));
        assertNull(CampaignValidation.validateStory(""));
        assertNull(CampaignValidation.validateStory("s".repeat(5000)));
    }

    @Test
    void rejectsStoriesOver5000Characters() {
        assertEquals(
                CampaignValidation.STORY_TOO_LONG_ERROR,
                CampaignValidation.validateStory("s".repeat(5001))
        );

        Campaign campaign = new Campaign();
        campaign.story = "s".repeat(5001);
        assertThrows(IllegalArgumentException.class, campaign::validate);
    }
}
