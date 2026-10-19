package campaign;

import jakarta.inject.Inject;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import character.Character;
import character.ability.CharacterAbility;
import player.Player;
import security.SecurityIdentityService;

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
@Authenticated
public class GameActionResource {

    private static final Map<String, Integer> ALLOWED_DICE = new java.util.LinkedHashMap<>();
    static {
        for (int sides : new int[]{4, 6, 8, 10, 12, 20, 100}) {
            ALLOWED_DICE.put("d" + sides, sides);
        }
    }
    private static final int MAX_DM_MESSAGE_LENGTH = 500;
    private static final java.security.SecureRandom DICE_RANDOM = new java.security.SecureRandom();

    @Inject
    GameState gameState;

    @Inject
    SseBroadcaster broadcaster;

    @Inject
    DecisionVoteService decisionVoteService;

    @Inject
    SecurityIdentityService securityIdentityService;

    @Inject
    SecurityIdentity securityIdentity;

    // ===== FULL STATE SNAPSHOT (for reconnect) =====

    @GET
    @Path("state")
    public Response getState(@PathParam("campaignId") Long campaignId) {
        Response authorizationError = requireCampaignMember(campaignId);
        if (authorizationError != null) {
            return authorizationError;
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        return Response.ok(state.snapshot()).build();
    }

    // ===== TURN MANAGEMENT =====

    @POST
    @Path("turn")
    public Response setTurn(@PathParam("campaignId") Long campaignId,
                            Map<String, Object> body) {
        Response authorizationError = requireDm(campaignId);
        if (authorizationError != null) {
            return authorizationError;
        }

        Long playerId = toLong(body.get("playerId"));
        if (playerId == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Spieler fehlt").build();
        }
        CampaignPlayer target = findMembership(campaignId, playerId);
        if (target == null) {
            return Response.status(Response.Status.NOT_FOUND).entity("Spieler ist nicht in dieser Kampagne").build();
        }
        if (!isApprovedPlayer(target)) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Nur Spieler mit freigegebenem Charakter können am Zug sein").build();
        }
        String playerName = resolvePlayerLoginName(playerId);

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        state.setTurn(playerId);
        gameState.save(campaignId);

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
        Long currentPlayerId = currentPlayerId();
        CampaignPlayer membership = findMembership(campaignId, currentPlayerId);
        if (membership == null) {
            return campaignAccessDenied();
        }

        // DM rolls are shown without a player id; players always roll as themselves.
        Long playerId = "DM".equals(membership.role) ? null : currentPlayerId;
        String playerName = resolvePlayerLoginName(currentPlayerId);
        Object diceTypeValue = body != null ? body.getOrDefault("diceType", "d20") : "d20";
        String diceType = diceTypeValue instanceof String ? ((String) diceTypeValue).toLowerCase(java.util.Locale.ROOT) : null;
        Integer sides = diceType != null ? ALLOWED_DICE.get(diceType) : null;
        if (sides == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Würfeltyp muss einer von diesen sein: " + ALLOWED_DICE.keySet()).build();
        }

        int result;
        if (body != null && Boolean.TRUE.equals(body.get("manual"))) {
            // Result of a physical die at the table: accepted, but only within the die's range.
            Integer manualResult = toStrictInt(body.get("result"));
            if (manualResult == null || manualResult < 1 || manualResult > sides) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Das Ergebnis muss zwischen 1 und " + sides + " liegen").build();
            }
            result = manualResult;
        } else {
            // Digital roll: the server decides the result, a client-sent result is ignored.
            result = DICE_RANDOM.nextInt(sides) + 1;
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        GameState.DiceRollInfo roll = state.recordDiceRoll(playerId, playerName, diceType, result);
        gameState.save(campaignId);

        // Same timestamp as the state snapshot so clients can de-duplicate replayed rolls.
        broadcaster.broadcast(campaignId, "dice", Map.of(
                "playerId", playerId != null ? playerId : -1,
                "playerName", playerName,
                "diceType", diceType,
                "result", result,
                "timestamp", roll.timestamp
        ));

        return Response.ok(Map.of("result", result, "diceType", diceType, "timestamp", roll.timestamp)).build();
    }

    // ===== HP MANAGEMENT =====

    @PATCH
    @Path("hp")
    public Response updateHp(@PathParam("campaignId") Long campaignId,
                             Map<String, Object> body) {
        Response authorizationError = requireDm(campaignId);
        if (authorizationError != null) {
            return authorizationError;
        }

        Long playerId = toLong(body.get("playerId"));
        Integer delta = toInt(body.get("delta"));

        if (playerId == null || delta == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Spieler und Änderung fehlen").build();
        }
        if (findMembership(campaignId, playerId) == null) {
            return Response.status(Response.Status.NOT_FOUND).entity("Spieler ist nicht in dieser Kampagne").build();
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        int newHp = state.updateHp(playerId, delta);
        int maxHp = state.playerMaxHp.getOrDefault(playerId, 0);
        gameState.save(campaignId);

        broadcaster.broadcast(campaignId, "hp", Map.of(
                "playerId", playerId,
                "currentHp", newHp,
                "maxHp", maxHp,
                "delta", delta
        ));

        return Response.ok(Map.of("playerId", playerId, "currentHp", newHp, "maxHp", maxHp)).build();
    }

    // ===== INIT HP (called once per player on game load) =====

    /**
     * Initializes a player's HP if the game has none yet. The values are calculated on the server
     * from the approved character; HP values sent by the client are ignored.
     */
    @POST
    @Path("init-hp")
    public Response initHp(@PathParam("campaignId") Long campaignId,
                           Map<String, Object> body) {
        Long playerId = toLong(body != null ? body.get("playerId") : null);
        if (playerId == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Spieler fehlt").build();
        }
        CampaignPlayer target = findMembership(campaignId, playerId);
        if (target == null) {
            return Response.status(Response.Status.NOT_FOUND).entity("Spieler ist nicht in dieser Kampagne").build();
        }

        Long currentPlayerId = currentPlayerId();
        boolean isDm = isDm(campaignId, currentPlayerId);
        if (!isDm && !currentPlayerId.equals(playerId)) {
            return campaignAccessDenied();
        }

        int maxHp = calculateMaxHp(target.characterId);
        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        state.initializeHp(playerId, maxHp, maxHp);
        // Also initialize active state if not set
        state.playerActive.putIfAbsent(playerId, true);
        gameState.save(campaignId);

        return Response.ok(Map.of(
                "playerId", playerId,
                "hp", state.playerHp.get(playerId),
                "maxHp", state.playerMaxHp.get(playerId)
        )).build();
    }

    /** Same as {@link #calculateMaxHp(int, int, int)} with a d10 hit die. */
    static int calculateMaxHp(int level, int constitution) {
        return calculateMaxHp(level, constitution, 10);
    }

    /**
     * D&amp;D 5e hit points: level 1 = hit die maximum + CON modifier, every further level = average
     * roll of the hit die (die / 2 + 1) + CON modifier. Each level adds at least 1 HP.
     */
    static int calculateMaxHp(int level, int constitution, int hitDie) {
        int conMod = Math.floorDiv(constitution - 10, 2);
        int lvl = Math.max(1, level);
        int die = hitDie > 0 ? hitDie : 8;
        int hp = Math.max(1, die + conMod);
        for (int i = 2; i <= lvl; i++) {
            hp += Math.max(1, die / 2 + 1 + conMod);
        }
        return hp;
    }

    private int calculateMaxHp(Long characterId) {
        Character character = characterId != null ? Character.findById(characterId) : null;
        if (character == null) {
            return calculateMaxHp(1, 10);
        }
        int constitution = CharacterAbility.<CharacterAbility>list("character", character)
                .stream()
                .filter(ca -> ca.ability != null && "constitution".equalsIgnoreCase(ca.ability.name))
                .mapToInt(ca -> ca.score)
                .findFirst()
                .orElse(10);
        characterclass.CharacterClass clazz = character.classId != 0
                ? characterclass.CharacterClass.findById(character.classId) : null;
        return calculateMaxHp(character.level, constitution,
                characterclass.GermanContent.hitDie(clazz != null ? clazz.name : null));
    }

    // ===== DM MESSAGES =====

    /** The DM sends a message to all players of the campaign. */
    @POST
    @Path("message")
    public Response sendDmMessage(@PathParam("campaignId") Long campaignId,
                                  Map<String, Object> body) {
        Response authorizationError = requireDm(campaignId);
        if (authorizationError != null) {
            return authorizationError;
        }

        Object value = body != null ? body.get("text") : null;
        String text = value instanceof String ? ((String) value).trim() : "";
        if (text.isEmpty() || text.length() > MAX_DM_MESSAGE_LENGTH) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Die Nachricht muss 1 bis " + MAX_DM_MESSAGE_LENGTH + " Zeichen lang sein").build();
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        GameState.DmMessage message = state.addDmMessage(resolvePlayerLoginName(currentPlayerId()), text);
        gameState.save(campaignId);

        broadcaster.broadcast(campaignId, "dm_message", message);
        return Response.ok(message).build();
    }

    // ===== PLAYER ACTIVE STATE =====

    @POST
    @Path("player-active")
    public Response setPlayerActive(@PathParam("campaignId") Long campaignId,
                                    Map<String, Object> body) {
        Response authorizationError = requireDm(campaignId);
        if (authorizationError != null) {
            return authorizationError;
        }

        Long playerId = toLong(body.get("playerId"));
        Boolean active = body.get("active") instanceof Boolean ? (Boolean) body.get("active") : null;

        if (playerId == null || active == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Spieler und Status fehlen").build();
        }
        if (findMembership(campaignId, playerId) == null) {
            return Response.status(Response.Status.NOT_FOUND).entity("Spieler ist nicht in dieser Kampagne").build();
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        state.playerActive.put(playerId, active);
        gameState.save(campaignId);

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
        Response authorizationError = requireCampaignMember(campaignId);
        if (authorizationError != null) {
            return authorizationError;
        }

        // Oldest first: clients append live decisions at the end, so the order stays stable
        List<GroupDecision> list = GroupDecision.find(
                "campaignId = ?1 order by createdAt asc, id asc", campaignId).list();
        Long viewerId = currentPlayerId();
        return Response.ok(list.stream().map(d -> Map.of(
                "id", d.id,
                "title", d.title != null ? d.title : "",
                "text", d.description != null ? d.description : "",
                "yes", d.yesVotes,
                "no", d.noVotes,
                "totalPlayers", d.totalPlayers,
                "status", d.status != null ? d.status : "PENDING",
                "createdAt", d.createdAt != null ? d.createdAt : 0,
                "decisionMade", d.decisionMade != null ? d.decisionMade : "",
                "hasVoted", GroupDecisionVote.count("decisionId = ?1 and playerId = ?2", d.id, viewerId) > 0
        )).collect(Collectors.toList())).build();
    }

    @POST
    @Path("decision")
    @Transactional
    public Response createDecision(@PathParam("campaignId") Long campaignId,
                                   Map<String, Object> body) {
        Response authorizationError = requireDm(campaignId);
        if (authorizationError != null) {
            return authorizationError;
        }

        String title = (String) body.get("title");
        String text = (String) body.get("text");

        if (title == null || text == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Titel und Text sind erforderlich").build();
        }

        // Electorate: players with an approved character (the DM does not vote)
        long playerCount = CampaignPlayer.find(
                "campaignId = ?1 and role = 'PLAYER' and characterStatus = 'APPROVED'", campaignId).count();

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
    public Response vote(@PathParam("campaignId") Long campaignId,
                         Map<String, Object> body) {
        if (Campaign.findById(campaignId) == null) {
            return Response.status(Response.Status.NOT_FOUND).entity("Kampagne nicht gefunden").build();
        }
        Long playerId = currentPlayerId();
        CampaignPlayer membership = findMembership(campaignId, playerId);
        if (membership == null) {
            return campaignAccessDenied();
        }
        if (!isApprovedPlayer(membership)) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Nur Spieler mit freigegebenem Charakter können abstimmen").build();
        }

        Long decisionId = toLong(body.get("decisionId"));
        Object voteValue = body.get("vote");
        String voteType = voteValue instanceof String ? (String) voteValue : null; // "yes" or "no"
        if (decisionId == null || !("yes".equals(voteType) || "no".equals(voteType))) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Abstimmung und Stimme (Ja/Nein) fehlen").build();
        }

        DecisionVoteService.VoteOutcome outcome =
                decisionVoteService.vote(campaignId, decisionId, playerId, voteType);
        if (outcome.decision() == null) {
            return Response.status(outcome.status()).entity(outcome.error()).build();
        }
        GroupDecision decision = outcome.decision();
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
        Response authorizationError = requireCampaignMember(campaignId);
        if (authorizationError != null) {
            return authorizationError;
        }

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
        Response authorizationError = requireDm(campaignId);
        if (authorizationError != null) {
            return authorizationError;
        }

        String markerId = (String) body.get("id");
        String type = (String) body.getOrDefault("type", "structure");
        String label = (String) body.getOrDefault("label", "");
        Double x = toDouble(body.get("x"));
        Double y = toDouble(body.get("y"));
        String groupId = (String) body.get("groupId");
        String playerIds = (String) body.get("playerIds");
        String icon = (String) body.getOrDefault("icon", "📌");

        if (x == null || y == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Position (x und y) fehlt").build();
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        state.pushUndo();

        if (markerId != null && state.mapMarkers.containsKey(markerId)) {
            // Move existing marker
            GameState.MapMarker marker = state.mapMarkers.get(markerId);
            marker.x = x;
            marker.y = y;
            if (label != null && !label.isEmpty()) marker.label = label;

            broadcaster.broadcast(campaignId, "marker_move", marker.toMap());
            afterMapChange(campaignId, state);
            return Response.ok(marker.toMap()).build();
        } else {
            // Add new marker
            String newId = state.nextMarkerId();
            GameState.MapMarker marker = new GameState.MapMarker(newId, type, label, x, y, groupId, playerIds, icon);
            state.mapMarkers.put(newId, marker);

            broadcaster.broadcast(campaignId, "marker_add", marker.toMap());
            afterMapChange(campaignId, state);
            return Response.ok(marker.toMap()).build();
        }
    }

    @DELETE
    @Path("map-marker/{markerId}")
    public Response removeMarker(@PathParam("campaignId") Long campaignId,
                                  @PathParam("markerId") String markerId) {
        Response authorizationError = requireDm(campaignId);
        if (authorizationError != null) {
            return authorizationError;
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        state.pushUndo();
        GameState.MapMarker removed = state.mapMarkers.remove(markerId);
        if (removed == null) {
            return Response.status(Response.Status.NOT_FOUND).entity("Marker nicht gefunden").build();
        }

        broadcaster.broadcast(campaignId, "marker_remove", Map.of("id", markerId));
        gameState.save(campaignId);
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
        Response authorizationError = requireDm(campaignId);
        if (authorizationError != null) {
            return authorizationError;
        }

        String action = (String) body.get("action");
        @SuppressWarnings("unchecked")
        List<String> markerIds = (List<String>) body.get("markerIds");

        if (action == null || markerIds == null || markerIds.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Aktion und Marker fehlen").build();
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        state.pushUndo();

        if ("group".equals(action)) {
            // Validate: only player/player-group markers can be grouped
            for (String mid : markerIds) {
                GameState.MapMarker m = state.mapMarkers.get(mid);
                if (m != null && !"player".equals(m.type) && !"player-group".equals(m.type)) {
                    return Response.status(Response.Status.BAD_REQUEST)
                            .entity("Nur Spieler-Marker können gruppiert werden").build();
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
                return Response.status(Response.Status.BAD_REQUEST).entity("Keine gültigen Marker").build();
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
            afterMapChange(campaignId, state);

            return Response.ok(Map.of("marker", groupMarker.toMap())).build();

        } else if ("split".equals(action)) {
            // Split a group marker into individual player markers
            if (markerIds.size() != 1) {
                return Response.status(Response.Status.BAD_REQUEST).entity("Zum Aufteilen genau einen Marker auswählen").build();
            }

            String groupId = markerIds.get(0);
            GameState.MapMarker group = state.mapMarkers.get(groupId);
            if (group == null || group.playerIds == null || group.playerIds.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST).entity("Ungültiger Gruppen-Marker").build();
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
            afterMapChange(campaignId, state);

            return Response.ok(Map.of("markers", allMarkers)).build();

        } else {
            return Response.status(Response.Status.BAD_REQUEST).entity("Aktion muss „group“ oder „split“ sein").build();
        }
    }

    // ===== FOG EXPLORATION =====

    /**
     * Explored areas of the map. The fog is calculated on the server from player marker positions;
     * clients only read it (there is deliberately no endpoint to upload fog data).
     */
    @GET
    @Path("fog-exploration")
    public Response getFogExploration(@PathParam("campaignId") Long campaignId) {
        Response authorizationError = requireCampaignMember(campaignId);
        if (authorizationError != null) {
            return authorizationError;
        }

        String data = gameState.getOrCreate(campaignId).fogExploration();
        return Response.ok(Map.of("data", data != null ? data : "")).build();
    }

    // ===== UNDO LAST MAP CHANGE =====

    @POST
    @Path("undo")
    public Response undoLastMapChange(@PathParam("campaignId") Long campaignId) {
        Response authorizationError = requireDm(campaignId);
        if (authorizationError != null) {
            return authorizationError;
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        GameState.MapUndoSnapshot snap = state.popUndo();
        if (snap == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Nichts zum Rückgängigmachen").build();
        }

        gameState.save(campaignId);
        List<Map<String, Object>> allMarkers = state.mapMarkers.values().stream()
                .map(GameState.MapMarker::toMap)
                .collect(Collectors.toList());

        String fog = state.fogExploration();
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("allMarkers", allMarkers);
        payload.put("fogExploration", fog != null ? fog : "");

        broadcaster.broadcast(campaignId, "undo", payload);
        return Response.ok(payload).build();
    }

    // ===== RESET GAME STATE =====

    @DELETE
    @Path("state")
    public Response resetState(@PathParam("campaignId") Long campaignId) {
        Response authorizationError = requireDm(campaignId);
        if (authorizationError != null) {
            return authorizationError;
        }

        GameState.CampaignGameState state = gameState.getOrCreate(campaignId);
        state.resetSession();
        // Keep map markers (they are placed before the game starts)
        if (isCampaignStarted(campaignId)) {
            state.stampPlayerMarkers();
        }
        gameState.save(campaignId);
        broadcaster.broadcast(campaignId, "state_reset", state.snapshot());
        return Response.ok(Map.of("reset", true)).build();
    }

    // ===== HELPER =====

    /** Persists the map change and, once the game runs, reveals the fog around player markers. */
    private void afterMapChange(Long campaignId, GameState.CampaignGameState state) {
        if (isCampaignStarted(campaignId) && state.stampPlayerMarkers()) {
            String fog = state.fogExploration();
            broadcaster.broadcast(campaignId, "fog_updated", Map.of("data", fog != null ? fog : ""));
        }
        gameState.save(campaignId);
    }

    private static boolean isApprovedPlayer(CampaignPlayer membership) {
        return "PLAYER".equals(membership.role) && "APPROVED".equals(membership.characterStatus);
    }

    private boolean isCampaignStarted(Long campaignId) {
        Campaign campaign = Campaign.findById(campaignId);
        return campaign != null && Boolean.TRUE.equals(campaign.started);
    }

    /** Accepts only whole numbers (no 2.7, no "3abc"). */
    private Integer toStrictInt(Object obj) {
        if (obj instanceof Integer || obj instanceof Long || obj instanceof Short) {
            long value = ((Number) obj).longValue();
            return value >= Integer.MIN_VALUE && value <= Integer.MAX_VALUE ? (int) value : null;
        }
        if (obj instanceof String) {
            try { return Integer.parseInt(((String) obj).trim()); } catch (NumberFormatException e) { return null; }
        }
        return null;
    }

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

    private Long currentPlayerId() {
        return securityIdentityService.getCurrentPlayerId(securityIdentity);
    }

    private String resolvePlayerLoginName(Long playerId) {
        if (playerId == null) {
            return "Unknown";
        }
        Player player = Player.findById(playerId);
        if (player == null) {
            return "Unknown";
        }
        if (player.username != null && !player.username.isBlank()) {
            return player.username;
        }
        return "Player " + playerId;
    }

    private Response requireCampaignMember(Long campaignId) {
        if (Campaign.findById(campaignId) == null) {
            return Response.status(Response.Status.NOT_FOUND).entity("Kampagne nicht gefunden").build();
        }
        if (findMembership(campaignId, currentPlayerId()) == null) {
            return campaignAccessDenied();
        }
        return null;
    }

    private Response requireDm(Long campaignId) {
        if (Campaign.findById(campaignId) == null) {
            return Response.status(Response.Status.NOT_FOUND).entity("Kampagne nicht gefunden").build();
        }
        if (!isDm(campaignId, currentPlayerId())) {
            return Response.status(Response.Status.FORBIDDEN).entity("Nur der DM kann das tun").build();
        }
        return null;
    }

    private CampaignPlayer findMembership(Long campaignId, Long playerId) {
        return CampaignPlayer.find("campaignId = ?1 and playerId = ?2", campaignId, playerId).firstResult();
    }

    private boolean isDm(Long campaignId, Long playerId) {
        CampaignPlayer membership = findMembership(campaignId, playerId);
        return membership != null && "DM".equals(membership.role);
    }

    private Response campaignAccessDenied() {
        return Response.status(Response.Status.FORBIDDEN)
                .entity("Du bist kein Mitglied dieser Kampagne")
                .build();
    }
}
