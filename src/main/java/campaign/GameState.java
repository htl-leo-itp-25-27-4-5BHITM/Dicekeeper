package campaign;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory per-campaign game state for real-time synchronization.
 */
@ApplicationScoped
public class GameState {

    private final ConcurrentHashMap<Long, CampaignGameState> states = new ConcurrentHashMap<>();

    public CampaignGameState getOrCreate(Long campaignId) {
        return states.computeIfAbsent(campaignId, id -> new CampaignGameState());
    }

    public static class CampaignGameState {
        public volatile Long currentTurnPlayerId;
        public final ConcurrentHashMap<Long, Integer> playerHp = new ConcurrentHashMap<>();
        public final ConcurrentHashMap<Long, Integer> playerMaxHp = new ConcurrentHashMap<>();
        public volatile DiceRollInfo lastDiceRoll;

        public void setTurn(Long playerId) {
            this.currentTurnPlayerId = playerId;
        }

        public int updateHp(Long playerId, int delta) {
            Integer maxHp = playerMaxHp.getOrDefault(playerId, 999);
            return playerHp.merge(playerId, delta, (current, d) -> {
                int newHp = current + d;
                if (newHp < 0) newHp = 0;
                if (newHp > maxHp) newHp = maxHp;
                return newHp;
            });
        }

        public void setHp(Long playerId, int hp, int max) {
            playerHp.put(playerId, hp);
            playerMaxHp.put(playerId, max);
        }

        public void recordDiceRoll(Long playerId, String playerName, String diceType, int result) {
            this.lastDiceRoll = new DiceRollInfo(playerId, playerName, diceType, result, System.currentTimeMillis());
        }

        /** Returns a snapshot for initial state load */
        public Map<String, Object> snapshot() {
            var snap = new ConcurrentHashMap<String, Object>();
            snap.put("currentTurnPlayerId", currentTurnPlayerId != null ? currentTurnPlayerId : -1);
            snap.put("playerHp", new ConcurrentHashMap<>(playerHp));
            snap.put("playerMaxHp", new ConcurrentHashMap<>(playerMaxHp));
            if (lastDiceRoll != null) {
                snap.put("lastDiceRoll", lastDiceRoll);
            }
            return snap;
        }
    }

    public static class DiceRollInfo {
        public Long playerId;
        public String playerName;
        public String diceType;
        public int result;
        public long timestamp;

        public DiceRollInfo() {}

        public DiceRollInfo(Long playerId, String playerName, String diceType, int result, long timestamp) {
            this.playerId = playerId;
            this.playerName = playerName;
            this.diceType = diceType;
            this.result = result;
            this.timestamp = timestamp;
        }
    }
}

