package campaign;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Per-campaign live game state for real-time synchronization.
 *
 * <p>The state is kept in memory for fast access and written through to the database after every
 * change ({@link #save(Long)}), so a server restart or deployment restores running games. Only the
 * map undo history is memory-only.</p>
 */
@ApplicationScoped
public class GameState {

    private static final Logger LOG = Logger.getLogger(GameState.class);

    @Inject
    ObjectMapper objectMapper;

    private final ConcurrentHashMap<Long, CampaignGameState> states = new ConcurrentHashMap<>();

    public CampaignGameState getOrCreate(Long campaignId) {
        return states.computeIfAbsent(campaignId, this::load);
    }

    /** Persists the current state of a campaign. Call after every change. */
    public void save(Long campaignId) {
        CampaignGameState state = states.get(campaignId);
        if (state == null) return;
        // Serialize and write under the state's lock so an older snapshot can never overwrite a newer one.
        synchronized (state) {
            String json;
            try {
                json = objectMapper.writeValueAsString(state.toPersisted());
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Could not serialize game state of campaign " + campaignId, e);
            }
            QuarkusTransaction.requiringNew().run(() -> {
                GameStateRecord record = GameStateRecord.findById(campaignId);
                if (record == null) {
                    record = new GameStateRecord();
                    record.campaignId = campaignId;
                    record.stateJson = json;
                    record.updatedAt = System.currentTimeMillis();
                    record.persist();
                } else {
                    record.stateJson = json;
                    record.updatedAt = System.currentTimeMillis();
                }
            });
        }
    }

    /** Removes the state from memory and database. Runs in the caller's transaction. */
    public void remove(Long campaignId) {
        if (campaignId != null) {
            states.remove(campaignId);
            GameStateRecord.deleteById(campaignId);
        }
    }

    /** Called once when the DM starts the campaign: the start positions count as explored. */
    public void onCampaignStarted(Long campaignId) {
        CampaignGameState state = getOrCreate(campaignId);
        state.stampPlayerMarkers();
        save(campaignId);
    }

    private CampaignGameState load(Long campaignId) {
        GameStateRecord record = QuarkusTransaction.requiringNew().call(() -> GameStateRecord.findById(campaignId));
        if (record == null || record.stateJson == null) {
            return new CampaignGameState();
        }
        try {
            return CampaignGameState.fromPersisted(objectMapper.readValue(record.stateJson, PersistedState.class));
        } catch (JsonProcessingException e) {
            LOG.errorv(e, "Stored game state of campaign {0} is unreadable; starting with an empty state", campaignId);
            return new CampaignGameState();
        }
    }

    /** JSON shape of the persisted state. */
    public static class PersistedState {
        public Long currentTurnPlayerId;
        public Map<Long, Integer> playerHp = new HashMap<>();
        public Map<Long, Integer> playerMaxHp = new HashMap<>();
        public Map<Long, Boolean> playerActive = new HashMap<>();
        public DiceRollInfo lastDiceRoll;
        public String fogExploration;
        public List<MapMarker> mapMarkers = new ArrayList<>();
        public long markerSeq = 1;
        public List<DmMessage> dmMessages = new ArrayList<>();
    }

    public static class MapUndoSnapshot {
        public final Map<String, MapMarker> markers;
        public final byte[] fogAlpha;

        public MapUndoSnapshot(Map<String, MapMarker> markers, byte[] fogAlpha) {
            this.markers = markers;
            this.fogAlpha = fogAlpha;
        }
    }

    public static class CampaignGameState {
        public volatile Long currentTurnPlayerId;
        public final ConcurrentHashMap<Long, Integer> playerHp = new ConcurrentHashMap<>();
        public final ConcurrentHashMap<Long, Integer> playerMaxHp = new ConcurrentHashMap<>();
        /** Tracks which players are active (not sitting out). True = active. */
        public final ConcurrentHashMap<Long, Boolean> playerActive = new ConcurrentHashMap<>();
        public volatile DiceRollInfo lastDiceRoll;

        /** Explored areas as 256×256 alpha values, derived on the server from player marker positions. */
        private byte[] fogAlpha = FogOfWar.empty();
        /** Cached PNG data URL of {@link #fogAlpha} (null = nothing explored). */
        private String fogExploration;

        // Map markers: markerId -> MapMarker
        public final ConcurrentHashMap<String, MapMarker> mapMarkers = new ConcurrentHashMap<>();
        private final AtomicLong markerSeq = new AtomicLong(1);

        private static final int MAX_UNDO = 20;
        static final int MAX_DM_MESSAGES = 50;
        /** Latest messages the DM sent to the players (oldest first). */
        private final java.util.Deque<DmMessage> dmMessages = new java.util.ArrayDeque<>();
        private final java.util.Deque<MapUndoSnapshot> undoStack = new java.util.ArrayDeque<>();

        static CampaignGameState fromPersisted(PersistedState persisted) {
            CampaignGameState state = new CampaignGameState();
            state.currentTurnPlayerId = persisted.currentTurnPlayerId;
            if (persisted.playerHp != null) state.playerHp.putAll(persisted.playerHp);
            if (persisted.playerMaxHp != null) state.playerMaxHp.putAll(persisted.playerMaxHp);
            if (persisted.playerActive != null) state.playerActive.putAll(persisted.playerActive);
            state.lastDiceRoll = persisted.lastDiceRoll;
            if (persisted.mapMarkers != null) {
                for (MapMarker marker : persisted.mapMarkers) {
                    if (marker != null && marker.id != null) state.mapMarkers.put(marker.id, marker);
                }
            }
            state.markerSeq.set(Math.max(1, persisted.markerSeq));
            if (persisted.dmMessages != null) {
                persisted.dmMessages.stream().filter(Objects::nonNull).forEach(state.dmMessages::addLast);
            }
            state.fogAlpha = FogOfWar.fromDataUrl(persisted.fogExploration);
            state.fogExploration = FogOfWar.toDataUrl(state.fogAlpha);
            return state;
        }

        synchronized PersistedState toPersisted() {
            PersistedState persisted = new PersistedState();
            persisted.currentTurnPlayerId = currentTurnPlayerId;
            persisted.playerHp = new HashMap<>(playerHp);
            persisted.playerMaxHp = new HashMap<>(playerMaxHp);
            persisted.playerActive = new HashMap<>(playerActive);
            persisted.lastDiceRoll = lastDiceRoll;
            persisted.fogExploration = fogExploration;
            persisted.mapMarkers = new ArrayList<>(mapMarkers.values());
            persisted.markerSeq = markerSeq.get();
            persisted.dmMessages = new ArrayList<>(dmMessages);
            return persisted;
        }

        /** Save a snapshot of current markers + fog before a map mutation. */
        public synchronized void pushUndo() {
            Map<String, MapMarker> snap = new HashMap<>();
            for (Map.Entry<String, MapMarker> e : mapMarkers.entrySet()) {
                MapMarker m = e.getValue();
                snap.put(e.getKey(), new MapMarker(m.id, m.type, m.label, m.x, m.y, m.groupId, m.playerIds, m.icon));
            }
            undoStack.push(new MapUndoSnapshot(snap, fogAlpha.clone()));
            while (undoStack.size() > MAX_UNDO) {
                undoStack.removeLast();
            }
        }

        /** Pop and restore the last snapshot. Returns null if nothing to undo. */
        public synchronized MapUndoSnapshot popUndo() {
            MapUndoSnapshot snap = undoStack.poll();
            if (snap == null) return null;
            mapMarkers.clear();
            mapMarkers.putAll(snap.markers);
            setFogAlpha(snap.fogAlpha.clone());
            return snap;
        }

        public synchronized boolean hasUndo() {
            return !undoStack.isEmpty();
        }

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

        public void initializeHp(Long playerId, int hp, int max) {
            playerMaxHp.putIfAbsent(playerId, max);
            playerHp.putIfAbsent(playerId, hp);
        }

        public DiceRollInfo recordDiceRoll(Long playerId, String playerName, String diceType, int result) {
            DiceRollInfo roll = new DiceRollInfo(playerId, playerName, diceType, result, System.currentTimeMillis());
            this.lastDiceRoll = roll;
            return roll;
        }

        public synchronized DmMessage addDmMessage(String senderName, String text) {
            DmMessage message = new DmMessage(senderName, text, System.currentTimeMillis());
            dmMessages.addLast(message);
            while (dmMessages.size() > MAX_DM_MESSAGES) {
                dmMessages.removeFirst();
            }
            return message;
        }

        public synchronized List<DmMessage> dmMessages() {
            return new ArrayList<>(dmMessages);
        }

        public synchronized void clearDmMessages() {
            dmMessages.clear();
        }

        /** Current fog as PNG data URL, or null when nothing has been explored yet. */
        public synchronized String fogExploration() {
            return fogExploration;
        }

        /** Marks the surroundings of every player marker as explored. Returns true if the fog changed. */
        public synchronized boolean stampPlayerMarkers() {
            byte[] next = fogAlpha.clone();
            for (MapMarker marker : mapMarkers.values()) {
                if ("player".equals(marker.type) || "player-group".equals(marker.type)) {
                    FogOfWar.stamp(next, marker.x, marker.y);
                }
            }
            if (Arrays.equals(next, fogAlpha)) return false;
            setFogAlpha(next);
            return true;
        }

        /** Clears everything that belongs to a running session but keeps the prepared map markers. */
        public synchronized void resetSession() {
            clearFog();
            currentTurnPlayerId = null;
            playerHp.clear();
            playerMaxHp.clear();
            playerActive.clear();
            lastDiceRoll = null;
            clearDmMessages();
            undoStack.clear();
        }

        public synchronized void clearFog() {
            setFogAlpha(FogOfWar.empty());
        }

        private void setFogAlpha(byte[] alpha) {
            fogAlpha = alpha;
            fogExploration = FogOfWar.toDataUrl(alpha);
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
            snap.put("dmMessages", dmMessages());
            String fog = fogExploration();
            if (fog != null) {
                snap.put("fogExploration", fog);
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

    public static class DmMessage {
        public String playerName;
        public String text;
        public long timestamp;

        public DmMessage() {}

        public DmMessage(String playerName, String text, long timestamp) {
            this.playerName = playerName;
            this.text = text;
            this.timestamp = timestamp;
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
