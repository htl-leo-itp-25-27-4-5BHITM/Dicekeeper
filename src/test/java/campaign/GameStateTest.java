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

    @Test
    void recordedDiceRollMatchesSnapshot() {
        GameState.CampaignGameState state = new GameState.CampaignGameState();

        GameState.DiceRollInfo roll = state.recordDiceRoll(3L, "alice", "d20", 17);

        GameState.DiceRollInfo snapshotRoll = (GameState.DiceRollInfo) state.snapshot().get("lastDiceRoll");
        assertEquals(roll.timestamp, snapshotRoll.timestamp);
        assertEquals(17, snapshotRoll.result);
    }
}
