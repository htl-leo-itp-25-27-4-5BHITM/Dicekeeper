package campaign;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GameStateTest {

    @Test
    void initializeHpDoesNotOverwriteLiveState() {
        GameState.CampaignGameState state = new GameState.CampaignGameState();
        state.initializeHp(7L, 20, 20);
        state.updateHp(7L, -6);

        state.initializeHp(7L, 20, 20);

        assertEquals(14, state.playerHp.get(7L));
        assertEquals(20, state.playerMaxHp.get(7L));
    }
}
