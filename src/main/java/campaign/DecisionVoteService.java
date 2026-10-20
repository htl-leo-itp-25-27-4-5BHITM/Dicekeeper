package campaign;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.core.Response;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * Records group-decision votes.
 *
 * <p>The decision row is locked for the whole transaction, so votes that arrive at the same time
 * are applied one after another and none of them is lost. Every vote is its own row in
 * {@code group_decision_vote}; the counters are recounted from those rows.</p>
 */
@ApplicationScoped
public class DecisionVoteService {

    @Inject
    SseBroadcaster broadcaster;

    public record VoteOutcome(Response.Status status, String error, GroupDecision decision) {
        static VoteOutcome failed(Response.Status status, String error) {
            return new VoteOutcome(status, error, null);
        }
    }

    @Transactional
    public VoteOutcome vote(Long campaignId, Long decisionId, Long playerId, String voteType) {
        GroupDecision decision = GroupDecision.findById(decisionId, LockModeType.PESSIMISTIC_WRITE);
        if (decision == null || !decision.campaignId.equals(campaignId)) {
            return VoteOutcome.failed(Response.Status.NOT_FOUND, "Abstimmung nicht gefunden");
        }
        if ("RESOLVED".equals(decision.status)) {
            return VoteOutcome.failed(Response.Status.BAD_REQUEST, "Die Abstimmung ist bereits beendet");
        }
        if (GroupDecisionVote.count("decisionId = ?1 and playerId = ?2", decisionId, playerId) > 0) {
            return VoteOutcome.failed(Response.Status.CONFLICT, "Du hast bereits abgestimmt");
        }

        new GroupDecisionVote(decision, playerId, voteType).persist();
        decision.yesVotes = (int) GroupDecisionVote.count("decisionId = ?1 and vote = 'yes'", decisionId);
        decision.noVotes = (int) GroupDecisionVote.count("decisionId = ?1 and vote = 'no'", decisionId);
        decision.votedPlayerIds = GroupDecisionVote.<GroupDecisionVote>find("decisionId = ?1 order by id", decisionId)
                .stream()
                .map(v -> String.valueOf(v.playerId))
                .collect(Collectors.joining(","));

        // Broadcast only the totals (sent after commit): who voted what stays secret.
        broadcaster.broadcast(campaignId, "vote", Map.of(
                "decisionId", decisionId,
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
        return new VoteOutcome(Response.Status.OK, null, decision);
    }
}
