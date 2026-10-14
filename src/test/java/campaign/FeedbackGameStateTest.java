package campaign;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.*;

/** Regression tests for bug 13 (lost votes) and bug 14 (game state lost on restart). */
@QuarkusTest
class FeedbackGameStateTest {

    @Inject
    DecisionVoteService decisionVoteService;

    @Inject
    GameState gameState;

    @Inject
    ObjectMapper objectMapper;

    @BeforeEach
    void clean() {
        FeedbackTestData.clean();
    }

    @Test
    void simultaneousVotesAreAllCountedAndCloseTheDecision() throws Exception {
        for (int attempt = 0; attempt < 8; attempt++) {
            Long dm = FeedbackTestData.player("dm" + attempt);
            Long campaign = FeedbackTestData.campaign(dm, true, true, null);
            List<Long> players = new ArrayList<>();
            for (int i = 0; i < 3; i++) {
                Long player = FeedbackTestData.player("p" + attempt + "-" + i);
                FeedbackTestData.join(campaign, player, null);
                players.add(player);
            }
            Long decisionId = QuarkusTransaction.requiringNew().call(() -> {
                GroupDecision decision = new GroupDecision(campaign, "Tür öffnen?", "", 3);
                decision.persist();
                return decision.id;
            });

            ExecutorService pool = Executors.newFixedThreadPool(3);
            CountDownLatch start = new CountDownLatch(1);
            List<Future<DecisionVoteService.VoteOutcome>> results = new ArrayList<>();
            for (Long player : players) {
                results.add(pool.submit(() -> {
                    start.await();
                    return decisionVoteService.vote(campaign, decisionId, player, "yes");
                }));
            }
            start.countDown();
            for (Future<DecisionVoteService.VoteOutcome> result : results) {
                assertNotNull(result.get().decision(), "every vote must be accepted");
            }
            pool.shutdown();

            GroupDecision decision = QuarkusTransaction.requiringNew().call(() -> GroupDecision.findById(decisionId));
            assertEquals(3, decision.yesVotes, "attempt " + attempt);
            assertEquals("RESOLVED", decision.status, "attempt " + attempt);
            assertEquals(3, QuarkusTransaction.requiringNew().call(() -> GroupDecisionVote.count("decisionId", decisionId)));
        }
    }

    @Test
    void duplicateVoteIsRejected() {
        Long dm = FeedbackTestData.player("dm");
        Long campaign = FeedbackTestData.campaign(dm, true, true, null);
        Long player = FeedbackTestData.player("p");
        FeedbackTestData.join(campaign, player, null);
        Long decisionId = QuarkusTransaction.requiringNew().call(() -> {
            GroupDecision decision = new GroupDecision(campaign, "Rasten?", "", 2);
            decision.persist();
            return decision.id;
        });

        assertNotNull(decisionVoteService.vote(campaign, decisionId, player, "yes").decision());
        assertEquals(jakarta.ws.rs.core.Response.Status.CONFLICT,
                decisionVoteService.vote(campaign, decisionId, player, "no").status());
    }

    @Test
    void gameStateSurvivesRestart() {
        Long dm = FeedbackTestData.player("dm");
        Long campaign = FeedbackTestData.campaign(dm, true, true, null);

        GameState.CampaignGameState state = gameState.getOrCreate(campaign);
        state.setTurn(42L);
        state.initializeHp(42L, 12, 12);
        state.updateHp(42L, -5);
        state.recordDiceRoll(42L, "p", "d20", 17);
        String markerId = state.nextMarkerId();
        state.mapMarkers.put(markerId, new GameState.MapMarker(markerId, "player", "P", 0.5, 0.5, null, "42", "🧙"));
        state.stampPlayerMarkers();
        gameState.save(campaign);

        // A fresh instance has an empty memory, like the server after a restart.
        GameState restarted = new GameState();
        restarted.objectMapper = objectMapper;
        GameState.CampaignGameState restored = restarted.getOrCreate(campaign);

        assertEquals(42L, restored.currentTurnPlayerId);
        assertEquals(7, restored.playerHp.get(42L));
        assertEquals(12, restored.playerMaxHp.get(42L));
        assertEquals(17, restored.lastDiceRoll.result);
        assertEquals(0.5, restored.mapMarkers.get(markerId).x);
        assertEquals(state.fogExploration(), restored.fogExploration());
        assertNotNull(restored.fogExploration());
        assertNotEquals(markerId, restored.nextMarkerId(), "marker ids must not be reused after restart");

        QuarkusTransaction.requiringNew().run(() -> gameState.remove(campaign));
        assertEquals(0, QuarkusTransaction.requiringNew().call(() -> GameStateRecord.count()));
    }
}
