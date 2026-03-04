package campaign;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

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
        /** Tracks which players are active (not sitting out). True = active. */
        public final ConcurrentHashMap<Long, Boolean> playerActive = new ConcurrentHashMap<>();
        public volatile DiceRollInfo lastDiceRoll;

        /** Base64-encoded PNG of the 256×256 fog exploration memory canvas (nullable). */
        public volatile String fogExploration;

        // Map markers: markerId -> MapMarker
        public final ConcurrentHashMap<String, MapMarker> mapMarkers = new ConcurrentHashMap<>();
        private final AtomicLong markerSeq = new AtomicLong(1);

        public String nextMarkerId() {
            return "m" + markerSeq.getAndIncrement();
        }

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
            snap.put("playerActive", new ConcurrentHashMap<>(playerActive));
            if (lastDiceRoll != null) {
                snap.put("lastDiceRoll", lastDiceRoll);
            }
            snap.put("mapMarkers", new ArrayList<>(mapMarkers.values()));
            if (fogExploration != null) {
                snap.put("fogExploration", fogExploration);
            }
            return snap;
        }
    }

    public static class MapMarker {
        public String id;
        /** "player-group", "player", "structure", "quest", "checkpoint" */
        public String type;
        public String label;
        public double x; // 0.0–1.0 relative to map
        public double y; // 0.0–1.0 relative to map
        public String groupId; // null for non-grouped, group id for grouped markers
        /** Comma-separated player IDs (for player/player-group type) */
        public String playerIds;
        public String icon; // emoji or icon id

        public MapMarker() {}

        public MapMarker(String id, String type, String label, double x, double y, String groupId, String playerIds, String icon) {
            this.id = id;
            this.type = type;
            this.label = label;
            this.x = x;
            this.y = y;
            this.groupId = groupId;
            this.playerIds = playerIds;
            this.icon = icon;
        }

        public Map<String, Object> toMap() {
            Map<String, Object> m = new HashMap<>();
            m.put("id", id);
            m.put("type", type);
            m.put("label", label != null ? label : "");
            m.put("x", x);
            m.put("y", y);
            m.put("groupId", groupId);
            m.put("playerIds", playerIds);
            m.put("icon", icon);
            return m;
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

