# Proposal

## Why

Dicekeeper's accepted baseline can display manually managed turn and hit-point state, but it has no encounter-owned initiative roster, enemy or boss tracker, or authorized way to advance a character beyond level one. The future scope needs a bounded D&D combat and progression plan that builds on durable session/encounter records without inventing unanswered rules or folding AI encounter suggestions into deterministic gameplay.

## What Changes

- Add a D&D 5e (2024) encounter tracker that attaches to one active encounter and supports player/enemy combatants, manually entered or built-in initiative rolls, enemy group initiative, DM-resolved ties, ordered turns/rounds, current/maximum/temporary HP, and role-filtered combat views.
- Add manually controlled boss presentation for main-boss phases, optional sequential health bars, legendary-action availability, and enrage state. The tracker does not infer phase triggers, action resets, or rule effects that the historical answers did not define.
- Define the reference encounter scale as 3–10 players plus up to 25 enemy units, with grouped enemies still represented individually for HP and visibility. This is a functional correctness target, not a numeric latency or deployment-capacity promise.
- Add owner-controlled, one-level-at-a-time character level tracking for D&D 5e (2024), including validation, immutable advancement history, campaign/view visibility, and explicit separation from generic character editing.
- Defer automatic condition/effect mechanics, skill-point allocation, class-feature/spell/feat/multiclass automation, XP or milestone award rules, automatic HP recalculation on advancement, reusable monster libraries, tactical grid/movement rules, and automated boss trigger/effect rules because repository evidence does not resolve them.
- Keep reusable/AI-generated encounter suggestions and balance advice in section 11. Keep rules-corpus sourcing and rule-question behavior in section 12, and keep items, loot, equipment, rewards, and character mutation from those systems deferred.
- Preserve the published current baseline until this future change is implemented and reviewed; planning these capabilities does not make combat or progression behavior current.

## Capabilities

### New Capabilities

- `combat-automation`: Encounter-scoped combatants, initiative ordering and groups, turn/round advancement, HP tracking, manual boss-state controls, persistence, history integration, authority, and role-filtered visibility.
- `character-progression`: Owner-controlled one-level advancement and durable level history, with bounded validation and explicit deferrals for unanswered mechanical choices.

### Modified Capabilities

None. The existing `live-play`, `character-library`, `session-views`, and `live-synchronization` contracts already reserve future combat and progression behavior for separate capabilities; their accepted current behavior remains unchanged by this planning change.

## Impact

- Future implementation will require persistent encounter-combat state, combatant and initiative-group records, boss-state records, character advancement history, authorized APIs/views, synchronization events, and integration with `session-records` history.
- `campaign-management`, `campaign-membership`, `character-library`, `live-play`, `campaign-maps`, `session-views`, and `live-synchronization` remain upstream authorization, reference, and presentation contracts.
- `session-records` supplies the active session/encounter lifecycle and durable event-history boundary. Combat commands must not reconstruct or silently replace the accepted current live state.
- No application code, migration, runtime configuration, deployment resource, current main spec, section-9 implementation task, or AI feature is changed by this planning work.
