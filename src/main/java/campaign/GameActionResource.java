package campaign;

import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST endpoints for game actions: turn management, dice rolls, HP changes.
 * All actions broadcast via SSE to all connected clients.
 */
@Path("/api/campaign/{campaignId}/game")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class GameActionResource {

    @Inject
    GameState gameState;

    @Inject
    SseBroadcaster broadcaster;

    // ===== FULL STATE SNAPSHOT (for reconnect) =====

    @GET
    @Path("state")
    public Response getState(@PathParam("campaignId") Long campaignId) {
        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        return Response.ok(state.snapshot()).build();
    }

    // ===== TURN MANAGEMENT =====

    @POST
    @Path("turn")
    public Response setTurn(@PathParam("campaignId") Long campaignId,
                            Map<String, Object> body) {
        Long playerId = toLong(body.get("playerId"));
        String playerName = (String) body.getOrDefault("playerName", "Unknown");

        if (playerId == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("playerId required").build();
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        state.setTurn(playerId);

        broadcaster.broadcast(campaignId, "turn", Map.of(
                "playerId", playerId,
                "playerName", playerName
        ));

        return Response.ok(Map.of("currentTurnPlayerId", playerId)).build();
    }

    // ===== DICE ROLL =====

    @POST
    @Path("dice")
    public Response rollDice(@PathParam("campaignId") Long campaignId,
                             Map<String, Object> body) {
        Long playerId = toLong(body.get("playerId"));
        String playerName = (String) body.getOrDefault("playerName", "DM");
        String diceType = (String) body.getOrDefault("diceType", "d20");
        Integer result = toInt(body.get("result"));

        if (result == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("result required").build();
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        state.recordDiceRoll(playerId, playerName, diceType, result);

        broadcaster.broadcast(campaignId, "dice", Map.of(
                "playerId", playerId != null ? playerId : -1,
                "playerName", playerName,
                "diceType", diceType,
                "result", result,
                "timestamp", System.currentTimeMillis()
        ));

        return Response.ok(Map.of("result", result)).build();
    }

    // ===== HP MANAGEMENT =====

    @PATCH
    @Path("hp")
    public Response updateHp(@PathParam("campaignId") Long campaignId,
                             Map<String, Object> body) {
        Long playerId = toLong(body.get("playerId"));
        Integer delta = toInt(body.get("delta"));

        if (playerId == null || delta == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("playerId and delta required").build();
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        int newHp = state.updateHp(playerId, delta);
        int maxHp = state.playerMaxHp.getOrDefault(playerId, 0);

        broadcaster.broadcast(campaignId, "hp", Map.of(
                "playerId", playerId,
                "currentHp", newHp,
                "maxHp", maxHp,
                "delta", delta
        ));

        return Response.ok(Map.of("playerId", playerId, "currentHp", newHp, "maxHp", maxHp)).build();
    }

    // ===== INIT HP (called once per player on game load) =====

    @POST
    @Path("init-hp")
    public Response initHp(@PathParam("campaignId") Long campaignId,
                           Map<String, Object> body) {
        Long playerId = toLong(body.get("playerId"));
        Integer hp = toInt(body.get("hp"));
        Integer maxHp = toInt(body.get("maxHp"));

        if (playerId == null || hp == null || maxHp == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("playerId, hp, and maxHp required").build();
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        state.setHp(playerId, hp, maxHp);
        // Also initialize active state if not set
        state.playerActive.putIfAbsent(playerId, true);

        return Response.ok(Map.of("playerId", playerId, "hp", hp, "maxHp", maxHp)).build();
    }

    // ===== PLAYER ACTIVE STATE =====

    @POST
    @Path("player-active")
    public Response setPlayerActive(@PathParam("campaignId") Long campaignId,
                                    Map<String, Object> body) {
        Long playerId = toLong(body.get("playerId"));
        Boolean active = body.get("active") instanceof Boolean ? (Boolean) body.get("active") : null;

        if (playerId == null || active == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("playerId and active required").build();
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        state.playerActive.put(playerId, active);

        broadcaster.broadcast(campaignId, "player_active", Map.of(
                "playerId", playerId,
                "active", active
        ));

        return Response.ok(Map.of("playerId", playerId, "active", active)).build();
    }

    // ===== GROUP DECISION =====

    @GET
    @Path("decisions")
    public Response getDecisions(@PathParam("campaignId") Long campaignId) {
        List<GroupDecision> list = GroupDecision.find(
                "campaignId = ?1 order by createdAt desc", campaignId).list();
        return Response.ok(list.stream().map(d -> Map.of(
                "id", d.id,
                "title", d.title != null ? d.title : "",
                "text", d.description != null ? d.description : "",
                "yes", d.yesVotes,
                "no", d.noVotes,
                "totalPlayers", d.totalPlayers,
                "status", d.status != null ? d.status : "PENDING",
                "createdAt", d.createdAt != null ? d.createdAt : 0
        )).collect(Collectors.toList())).build();
    }

    @POST
    @Path("decision")
    @Transactional
    public Response createDecision(@PathParam("campaignId") Long campaignId,
                                   Map<String, Object> body) {
        String title = (String) body.get("title");
        String text = (String) body.get("text");

        if (title == null || text == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("title and text required").build();
        }

        // Count how many PLAYER entries are in this campaign (not DM)
        long playerCount = CampaignPlayer.find(
                "campaignId = ?1 and role = 'PLAYER'", campaignId).count();

        GroupDecision decision = new GroupDecision(campaignId, title, text, (int) playerCount);
        decision.persist();

        Map<String, Object> payload = Map.of(
                "id", decision.id,
                "title", title,
                "text", text,
                "yes", 0,
                "no", 0,
                "totalPlayers", (int) playerCount,
                "status", "PENDING",
                "createdAt", decision.createdAt
        );

        broadcaster.broadcast(campaignId, "decision", payload);

        return Response.ok(payload).build();
    }

    // ===== VOTE =====

    @POST
    @Path("vote")
    @Transactional
    public Response vote(@PathParam("campaignId") Long campaignId,
                         Map<String, Object> body) {
        Long decisionId = toLong(body.get("decisionId"));
        String voteType = (String) body.get("vote"); // "yes" or "no"
        String playerName = (String) body.getOrDefault("playerName", "Unknown");
        Long playerId = toLong(body.get("playerId"));

        if (decisionId == null || voteType == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("decisionId and vote required").build();
        }

        GroupDecision decision = GroupDecision.findById(decisionId);
        if (decision == null || !decision.campaignId.equals(campaignId)) {
            return Response.status(Response.Status.NOT_FOUND).entity("Decision not found").build();
        }

        if ("RESOLVED".equals(decision.status)) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Decision already resolved").build();
        }

        if (playerId != null && decision.hasPlayerVoted(playerId)) {
            return Response.status(Response.Status.CONFLICT).entity("Already voted").build();
        }

        decision.addVote(playerId, voteType);

        // Broadcast the vote
        broadcaster.broadcast(campaignId, "vote", Map.of(
                "decisionId", decisionId,
                "vote", voteType,
                "playerName", playerName,
                "yes", decision.yesVotes,
                "no", decision.noVotes
        ));

        // Auto-close if all players voted
        if (decision.allVoted()) {
            decision.status = "RESOLVED";
            decision.resolvedAt = System.currentTimeMillis();
            String result = decision.yesVotes >= decision.noVotes ? "Ja" : "Nein";
            decision.decisionMade = result + " (" + decision.yesVotes + " Ja / " + decision.noVotes + " Nein)";

            broadcaster.broadcast(campaignId, "decision_resolved", Map.of(
                    "decisionId", decisionId,
                    "status", "RESOLVED",
                    "result", result,
                    "yes", decision.yesVotes,
                    "no", decision.noVotes,
                    "decisionMade", decision.decisionMade
            ));
        }

        return Response.ok(Map.of(
                "status", decision.status,
                "yes", decision.yesVotes,
                "no", decision.noVotes
        )).build();
    }

    // ===== MAP MARKERS =====

    @GET
    @Path("map-markers")
    public Response getMapMarkers(@PathParam("campaignId") Long campaignId) {
        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        List<Map<String, Object>> markers = state.mapMarkers.values().stream()
                .map(GameState.MapMarker::toMap)
                .collect(Collectors.toList());
        return Response.ok(markers).build();
    }

    @POST
    @Path("map-marker")
    public Response addOrMoveMarker(@PathParam("campaignId") Long campaignId,
                                     Map<String, Object> body) {
        String markerId = (String) body.get("id");
        String type = (String) body.getOrDefault("type", "structure");
        String label = (String) body.getOrDefault("label", "");
        Double x = toDouble(body.get("x"));
        Double y = toDouble(body.get("y"));
        String groupId = (String) body.get("groupId");
        String playerIds = (String) body.get("playerIds");
        String icon = (String) body.getOrDefault("icon", "📌");

        if (x == null || y == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("x and y required").build();
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);

        if (markerId != null && state.mapMarkers.containsKey(markerId)) {
            // Move existing marker
            GameState.MapMarker marker = state.mapMarkers.get(markerId);
            marker.x = x;
            marker.y = y;
            if (label != null && !label.isEmpty()) marker.label = label;

            broadcaster.broadcast(campaignId, "marker_move", marker.toMap());
            return Response.ok(marker.toMap()).build();
        } else {
            // Add new marker
            String newId = state.nextMarkerId();
            GameState.MapMarker marker = new GameState.MapMarker(newId, type, label, x, y, groupId, playerIds, icon);
            state.mapMarkers.put(newId, marker);

            broadcaster.broadcast(campaignId, "marker_add", marker.toMap());
            return Response.ok(marker.toMap()).build();
        }
    }

    @DELETE
    @Path("map-marker/{markerId}")
    public Response removeMarker(@PathParam("campaignId") Long campaignId,
                                  @PathParam("markerId") String markerId) {
        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        GameState.MapMarker removed = state.mapMarkers.remove(markerId);
        if (removed == null) {
            return Response.status(Response.Status.NOT_FOUND).entity("Marker not found").build();
        }

        broadcaster.broadcast(campaignId, "marker_remove", Map.of("id", markerId));
        return Response.ok(Map.of("id", markerId)).build();
    }

    /**
     * Group/split player markers.
     * body: { action: "group"|"split", markerIds: ["m1","m2",...] }
     */
    @POST
    @Path("map-group")
    public Response groupSplit(@PathParam("campaignId") Long campaignId,
                                Map<String, Object> body) {
        String action = (String) body.get("action");
        @SuppressWarnings("unchecked")
        List<String> markerIds = (List<String>) body.get("markerIds");

        if (action == null || markerIds == null || markerIds.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity("action and markerIds required").build();
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);

        if ("group".equals(action)) {
            // Validate: only player/player-group markers can be grouped
            for (String mid : markerIds) {
                GameState.MapMarker m = state.mapMarkers.get(mid);
                if (m != null && !"player".equals(m.type) && !"player-group".equals(m.type)) {
                    return Response.status(Response.Status.BAD_REQUEST)
                            .entity("Only player markers can be grouped").build();
                }
            }

            // Merge markers into one group marker
            StringBuilder allPlayerIds = new StringBuilder();
            StringBuilder allLabels = new StringBuilder();
            double avgX = 0, avgY = 0;
            int count = 0;

            for (String mid : markerIds) {
                GameState.MapMarker m = state.mapMarkers.get(mid);
                if (m != null) {
                    if (m.playerIds != null && !m.playerIds.isEmpty()) {
                        if (allPlayerIds.length() > 0) allPlayerIds.append(",");
                        allPlayerIds.append(m.playerIds);
                    }
                    if (m.label != null && !m.label.isEmpty()) {
                        if (allLabels.length() > 0) allLabels.append(", ");
                        allLabels.append(m.label);
                    }
                    avgX += m.x;
                    avgY += m.y;
                    count++;
                }
            }

            if (count == 0) {
                return Response.status(Response.Status.BAD_REQUEST).entity("No valid markers").build();
            }

            avgX /= count;
            avgY /= count;

            // Remove old markers
            for (String mid : markerIds) {
                state.mapMarkers.remove(mid);
            }

            // Create group marker
            String groupMarkerId = state.nextMarkerId();
            GameState.MapMarker groupMarker = new GameState.MapMarker(
                    groupMarkerId, "player-group", allLabels.toString(),
                    avgX, avgY, groupMarkerId, allPlayerIds.toString(), "👥"
            );
            state.mapMarkers.put(groupMarkerId, groupMarker);

            List<Map<String, Object>> allMarkers = state.mapMarkers.values().stream()
                    .map(GameState.MapMarker::toMap).collect(Collectors.toList());

            broadcaster.broadcast(campaignId, "marker_group", Map.of(
                    "action", "group",
                    "removedIds", markerIds,
                    "newMarker", groupMarker.toMap(),
                    "allMarkers", allMarkers
            ));

            return Response.ok(Map.of("marker", groupMarker.toMap())).build();

        } else if ("split".equals(action)) {
            // Split a group marker into individual player markers
            if (markerIds.size() != 1) {
                return Response.status(Response.Status.BAD_REQUEST).entity("split requires exactly one markerId").build();
            }

            String groupId = markerIds.get(0);
            GameState.MapMarker group = state.mapMarkers.get(groupId);
            if (group == null || group.playerIds == null || group.playerIds.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST).entity("Invalid group marker").build();
            }

            @SuppressWarnings("unchecked")
            List<String> splitPlayerIds = body.get("splitPlayerIds") != null
                    ? (List<String>) body.get("splitPlayerIds")
                    : null;

            String[] allPids = group.playerIds.split(",");
            List<String> toSplit = splitPlayerIds != null ? splitPlayerIds :
                    java.util.Arrays.asList(allPids);
            List<String> remaining = new java.util.ArrayList<>();

            for (String pid : allPids) {
                if (!toSplit.contains(pid.trim())) {
                    remaining.add(pid.trim());
                }
            }

            // Remove old group
            state.mapMarkers.remove(groupId);

            // If remaining > 1, recreate group; if 1, make single player marker
            double baseX = group.x;
            double baseY = group.y;

            if (remaining.size() > 1) {
                String newGroupId = state.nextMarkerId();
                GameState.MapMarker newGroup = new GameState.MapMarker(
                        newGroupId, "player-group", "Gruppe",
                        baseX, baseY, newGroupId,
                        String.join(",", remaining), "👥"
                );
                state.mapMarkers.put(newGroupId, newGroup);
            } else if (remaining.size() == 1) {
                String soloId = state.nextMarkerId();
                GameState.MapMarker solo = new GameState.MapMarker(
                        soloId, "player", remaining.get(0),
                        baseX, baseY, null, remaining.get(0), "🧙"
                );
                state.mapMarkers.put(soloId, solo);
            }

            // Create markers for split players: group if >1, solo if 1
            double offset = 0.03;
            if (toSplit.size() > 1) {
                // Create a new group for the split players
                String newSplitGroupId = state.nextMarkerId();
                String splitPids = toSplit.stream().map(String::trim).collect(java.util.stream.Collectors.joining(","));
                GameState.MapMarker splitGroup = new GameState.MapMarker(
                        newSplitGroupId, "player-group", "Gruppe",
                        Math.max(0, Math.min(1, baseX + offset)),
                        Math.max(0, Math.min(1, baseY + offset)),
                        newSplitGroupId, splitPids, "👥"
                );
                state.mapMarkers.put(newSplitGroupId, splitGroup);
            } else if (toSplit.size() == 1) {
                String pid = toSplit.get(0).trim();
                String soloId = state.nextMarkerId();
                GameState.MapMarker solo = new GameState.MapMarker(
                        soloId, "player", pid,
                        Math.max(0, Math.min(1, baseX + offset)),
                        Math.max(0, Math.min(1, baseY + offset)),
                        null, pid, "🧙"
                );
                state.mapMarkers.put(soloId, solo);
            }

            List<Map<String, Object>> allMarkers = state.mapMarkers.values().stream()
                    .map(GameState.MapMarker::toMap).collect(Collectors.toList());

            broadcaster.broadcast(campaignId, "marker_group", Map.of(
                    "action", "split",
                    "removedIds", List.of(groupId),
                    "allMarkers", allMarkers
            ));

            return Response.ok(Map.of("markers", allMarkers)).build();

        } else {
            return Response.status(Response.Status.BAD_REQUEST).entity("action must be 'group' or 'split'").build();
        }
    }

    // ===== FOG EXPLORATION PERSISTENCE =====

    @GET
    @Path("fog-exploration")
    public Response getFogExploration(@PathParam("campaignId") Long campaignId) {
        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        String data = state.fogExploration;
        if (data == null) {
            return Response.ok(Map.of("data", "")).build();
        }
        return Response.ok(Map.of("data", data)).build();
    }

    @PUT
    @Path("fog-exploration")
    public Response saveFogExploration(@PathParam("campaignId") Long campaignId,
                                       Map<String, Object> body) {
        String data = (String) body.get("data");
        if (data == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("data required").build();
        }
        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        state.fogExploration = data;
        return Response.ok(Map.of("saved", true)).build();
    }

    // ===== RESET GAME STATE =====

    @DELETE
    @Path("state")
    public Response resetState(@PathParam("campaignId") Long campaignId) {
        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        state.fogExploration = null;
        state.currentTurnPlayerId = null;
        state.playerHp.clear();
        state.playerMaxHp.clear();
        state.playerActive.clear();
        state.lastDiceRoll = null;
        // Keep map markers (they are placed before the game starts)
        return Response.ok(Map.of("reset", true)).build();
    }

    // ===== HELPER =====

    private Long toLong(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) return ((Number) obj).longValue();
        try { return Long.parseLong(obj.toString()); } catch (Exception e) { return null; }
    }

    private Integer toInt(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) return ((Number) obj).intValue();
        try { return Integer.parseInt(obj.toString()); } catch (Exception e) { return null; }
    }

    private Double toDouble(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        try { return Double.parseDouble(obj.toString()); } catch (Exception e) { return null; }
    }
}

