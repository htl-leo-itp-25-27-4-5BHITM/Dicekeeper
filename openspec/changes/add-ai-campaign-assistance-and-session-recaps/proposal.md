# Proposal

## Why

Dicekeeper's future content, session-record, and combat plans provide authoritative campaign context, but they deliberately do not send that context to an AI provider or turn generated text into product state. The accepted future scope needs a reviewable DM-assistance workflow for campaign preparation and session recaps that preserves lore authority, audience boundaries, deterministic combat, and predictable failure/capacity outcomes.

## What Changes

- Add DM-initiated story, quest, NPC/place, encounter, and boss-preparation suggestions using only an explicitly selected, previewed, authorization-filtered campaign context package.
- Treat generated output as an untrusted DM-only draft. The DM may edit, reject, or explicitly accept it; only a separate validated commit may update the existing manual campaign story or create supported campaign-content records, and no suggestion directly mutates active session, combat, character, progression, item, or rules state.
- Add DM-initiated recap generation for a selected completed or archived session. DM-only recaps use the DM recap-input projection, while recaps intended for members use only the member-safe projection.
- Preserve DM-authored current campaign records and immutable/amended session history as the authorities for present lore and historical events. Contradictory inputs and generated claims remain visible for DM resolution rather than being silently selected or written back.
- Define provider-disabled, missing-context, invalid/oversized request, provider timeout/error/rate-limit, retry/idempotency, and configured-capacity exhaustion outcomes without treating the current local chat panel as an AI integration.
- Require a finite configured usage/capacity policy and preflight visibility before provider submission. Exact request/token/cost allowances, provider model/version, timeout values, and price thresholds remain deployment/product configuration decisions because repository evidence supplies no defensible numbers.
- Keep rule answers/citations, audio/transcript input, Discord delivery, AI portraits, reusable monster libraries, items/loot/rewards, conditions/effects, full progression mechanics, and autonomous combat changes outside this change.

## Capabilities

### New Capabilities

- `ai-campaign-assistance`: DM-only preparation requests, authorized context selection, external-provider submission, untrusted suggestion review, lore-conflict handling, explicit acceptance/commit boundaries, failures, and usage/capacity limits.
- `session-recaps`: DM-generated and reviewed session summaries/next steps from deterministic recap-input projections, with member-safe publication, provenance, failure handling, and persistence boundaries.

### Modified Capabilities

None. The published current capabilities and the active future `campaign-content`, `session-records`, `combat-automation`, and `character-progression` plans remain unchanged. This change consumes their authorized projections and mutation contracts without redefining or publishing them as current behavior.

## Impact

- Future implementation will require an external AI-provider adapter, secret/configuration handling, request and usage accounting, bounded context assembly, idempotent job/result storage, DM review interfaces, accepted-recap storage, and authorization/audit tests.
- `campaign-management`, `campaign-membership`, `player-profiles`, `character-library`, `player-notes`, `session-views`, and `live-synchronization` remain upstream privacy and presentation contracts.
- `campaign-content` and `session-records` supply authoritative content, lifecycle, history, and recap projections; `combat-automation` supplies a bounded DM projection for encounter advice. Those future dependencies must exist before the corresponding integrated workflow can be enabled.
- No application source, migration, runtime configuration, deployment resource, published main spec, or section-9/10 implementation task changes in this planning change.
