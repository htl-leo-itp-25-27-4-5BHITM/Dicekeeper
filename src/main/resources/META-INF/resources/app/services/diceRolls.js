/**
 * Shared dice-roll helpers for the live game views.
 */

const SUBMIT_RETRIES = 2;
const RETRYABLE_STATUS = new Set([502, 503, 504]);

/** Identifies one roll, whether it arrived as an SSE event or in the state snapshot. */
export function diceRollKey(roll) {
  const playerId = roll?.playerId ?? -1;
  return playerId + ':' + (roll?.timestamp ?? '') + ':' + (roll?.diceType ?? '') + ':' + (roll?.result ?? '');
}

/**
 * Tracks which rolls a view has already shown so replays and snapshot
 * reconciliation never display the same roll twice.
 */
export function createDiceRollTracker(limit = 50) {
  const seen = [];
  return {
    /** Returns true the first time a roll is seen. */
    accept(roll) {
      if (!roll || roll.result === undefined || roll.result === null) return false;
      const key = diceRollKey(roll);
      if (seen.includes(key)) return false;
      seen.push(key);
      if (seen.length > limit) seen.shift();
      return true;
    },
    /** Marks rolls that were already on screen before the live stream started. */
    markSeen(roll) {
      if (roll) this.accept(roll);
    }
  };
}

/**
 * Sends a roll to the server so it is broadcast to every participant.
 * Retries only gateway errors (the request never reached the app, so no duplicate roll)
 * and throws if the roll could not be delivered.
 */
export async function submitDiceRoll(campaignId, payload) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('/api/campaign/' + encodeURIComponent(campaignId) + '/game/dice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) return res.json().catch(() => null);
    if (!RETRYABLE_STATUS.has(res.status) || attempt >= SUBMIT_RETRIES) {
      throw new Error((await res.text().catch(() => '')) || 'HTTP ' + res.status);
    }
    await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
  }
}
