package campaign;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CampaignValidationTest {

    @Test
    void rejectsNegativeMaxPlayerCount() {
        assertEquals(
                CampaignValidation.MAX_PLAYER_COUNT_ERROR,
                CampaignValidation.validateMaxPlayerCount(-1)
        );
    }

    @Test
    void acceptsZeroPositiveAndUnlimitedMaxPlayerCounts() {
        assertNull(CampaignValidation.validateMaxPlayerCount(0));
        assertNull(CampaignValidation.validateMaxPlayerCount(5));
        assertNull(CampaignValidation.validateMaxPlayerCount(null));
    }

    @Test
    void entityValidationRejectsNegativeMaxPlayerCount() {
        Campaign campaign = new Campaign();
        campaign.maxPlayerCount = -1;

        assertThrows(IllegalArgumentException.class, campaign::validate);
    }
}
