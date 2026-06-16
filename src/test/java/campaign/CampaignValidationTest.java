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
}
