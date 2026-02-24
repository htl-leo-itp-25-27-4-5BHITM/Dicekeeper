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

        return Response.ok(Map.of("playerId", playerId, "hp", hp, "maxHp", maxHp)).build();
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
}

