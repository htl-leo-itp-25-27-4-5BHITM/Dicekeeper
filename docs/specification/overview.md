# Dicekeeper Functional Specification

## Status

This directory is the shared entry point for the Dicekeeper functional specification. Sections 1–10 of the documentation runbook are complete. On 2026-09-22 the accepted current baseline passed semantic review and strict validation, and its 14 capabilities were published as main OpenSpec specifications with 102 requirements and 447 scenarios. On 2026-09-23 sections 9 and 10 added separately validated future plans for campaign content/session records and bounded combat/tracked-level progression; none of their 15 or 20 implementation tasks was executed.

The confirmed documentation scope is the accepted current contract plus a separately identified future scope. The publication record is archived under [`2026-09-22-document-dicekeeper-baseline`](../../openspec/changes/archive/2026-09-22-document-dicekeeper-baseline/). Accepted future behavior remains outside the main specs and is not delivered merely because its owning section has produced a bounded follow-on change.

The published baseline is the accepted product contract, not a claim that the application already conforms to it. Static review found 49 implementation deviations. Character-library corrections remain proposal-only in [`correct-character-library-boundaries`](../../openspec/changes/correct-character-library-boundaries/); that change was not advanced. All other deviations remain indexed in [`evidence.md`](evidence.md) for separate corrective planning. No application behavior was implemented or exercised during publication. Exact quantitative view/synchronization targets and their test environment remain unresolved and block calling affected corrective implementation work ready, but they do not invalidate the state-based current contract.

## How to read this specification

- [`runbook.md`](runbook.md) defines the ordered work packages, capability owners, and execution protocol.
- [`evidence.md`](evidence.md) records sources, static implementation observations, historical material, and review limitations.
- [`decisions.md`](decisions.md) separates confirmed decisions, proposed defaults, unresolved questions, and exclusions.
- [`coverage.md`](coverage.md) maps all 55 diagram use cases and additional source candidates to a capability and owning task.
- [`glossary.md`](glossary.md) defines actors, domain terms, status vocabulary, and the original German labels.
- [`permissions.md`](permissions.md) is the reviewed cross-capability actor/action/data matrix; the main capability specs remain normative if a summary ever drifts.
- [`handoff.md`](handoff.md) records the exact continuation point, relevant paths, validations, and next instruction.

Normative behavior lives in the main OpenSpec capability specifications. These shared documents provide navigation, evidence, decisions, and cross-capability checks; they do not replace requirements and scenarios.

## Current baseline capability boundaries

| Owning task | Capability | Boundary |
| --- | --- | --- |
| 2 | [`account-access`](../../openspec/specs/account-access/spec.md) | Login, logout, registration boundary, local identity synchronization, and authentication failure/expiry. |
| 2 | [`player-profiles`](../../openspec/specs/player-profiles/spec.md) | Profile and avatar data, visibility boundaries, account settings, and account deletion. |
| 3 | [`character-library`](../../openspec/specs/character-library/spec.md) | Character creation, drafts, reference values, editing, selection, ownership, validation, and deletion. |
| 4 | [`campaign-management`](../../openspec/specs/campaign-management/spec.md) | Campaign creation, metadata/story, visibility, capacity, start state, editing, and deletion. |
| 4 | [`campaign-membership`](../../openspec/specs/campaign-membership/spec.md) | Public/private admission, campaign roles, membership listing, leave, kick, and capacity. |
| 4 | [`character-review`](../../openspec/specs/character-review/spec.md) | Character submission, resubmission, approval/rejection, and review-state transitions. |
| 4 | [`notifications`](../../openspec/specs/notifications/spec.md) | Notification recipients, triggering events, read state, deletion, references, and navigation. |
| 5 | [`campaign-maps`](../../openspec/specs/campaign-maps/spec.md) | Active maps, markers/groups, fog, map switching, undo/reset, and map visibility. |
| 5 | [`media-assets`](../../openspec/specs/media-assets/spec.md) | Avatar/map upload, validation, processing, delivery, access, replacement, and cleanup. |
| 6 | [`live-play`](../../openspec/specs/live-play/spec.md) | Turn, HP, active-player state, dice, initialization, and reset. |
| 6 | [`group-decisions`](../../openspec/specs/group-decisions/spec.md) | Decision creation, voting, eligibility, duplicate handling, completion, and persistence. |
| 6 | [`player-notes`](../../openspec/specs/player-notes/spec.md) | Player notes, isolation, persistence lifetime, refresh, and device behavior. |
| 7 | [`session-views`](../../openspec/specs/session-views/spec.md) | DM, player, and table/display views, including supported screen/device behavior. |
| 7 | [`live-synchronization`](../../openspec/specs/live-synchronization/spec.md) | Live event propagation, heartbeat, reconnect, stale clients, access revocation, and restart behavior. |

The capability names above are the confirmed flat organization of the published current baseline. Section 8 reviewed end-to-end journeys, deletion effects, permissions, transitions, and storage lifetimes before publishing them. The archived change preserves the proposal, design, task checklist, and original deltas used for that review.

## Corrective and unresolved work

- [`correct-character-library-boundaries`](../../openspec/changes/correct-character-library-boundaries/) remains an open proposal for `DEV-CHAR-001`–`DEV-CHAR-007` and the character-ownership part of `DEV-ACC-005`. It has no design or implementation tasks and was not advanced by section 8.
- [`add-campaign-content-and-session-records`](../../openspec/changes/add-campaign-content-and-session-records/) is a complete, strictly valid future plan for two new capabilities, with 18 requirements, 75 scenarios, and 0/15 implementation tasks complete. It has not been applied, archived, or promoted into the current baseline.
- [`add-combat-automation-and-character-progression`](../../openspec/changes/add-combat-automation-and-character-progression/) is a complete, strictly valid future plan for two new capabilities, with 17 requirements, 88 scenarios, and 0/20 implementation tasks complete. It has not been applied, archived, or promoted into the current baseline; unanswered conditions/effects and full-sheet progression remain explicit deferrals.
- The remaining accepted-contract implementation gaps are grouped and linked in the [implementation deviation index](coverage.md#implementation-deviation-index). They remain outside the normative baseline and require separately scoped corrective planning before implementation.
- The quantitative view/synchronization target gate and all future product decisions remain listed in [`decisions.md`](decisions.md#open-decision-gates). Current, missing, and future behavior therefore remain distinguishable without relying on the publication conversation.

## Separately identified future scope

| Owning task | Candidate capability | Status |
| --- | --- | --- |
| 9 | [`campaign-content`](../../openspec/changes/add-campaign-content-and-session-records/specs/campaign-content/spec.md), [`session-records`](../../openspec/changes/add-campaign-content-and-session-records/specs/session-records/spec.md) | Future plan accepted and strictly valid; DM-owned NPC/place/quest/lore plus durable session/encounter history are specified, items/loot are deferred, and implementation remains 0/15. |
| 10 | [`combat-automation`](../../openspec/changes/add-combat-automation-and-character-progression/specs/combat-automation/spec.md), [`character-progression`](../../openspec/changes/add-combat-automation-and-character-progression/specs/character-progression/spec.md) | Future plan accepted and strictly valid; D&D 5e (2024) encounter combat, reference scale, groups/ties, manual HP/boss state, views/history, and owner-controlled one-level tracking are specified, explicit mechanics are deferred, and implementation remains 0/20. |
| 11 | `ai-campaign-assistance`, `session-recaps` | Future; context, authority, review, audience, failure, and limits unresolved. |
| 12 | `rule-assistance` | Future; the edition is fixed to D&D 5e (2024), while rule-corpus access, citation, and uncertainty behavior remain unresolved. |
| 13 | `audio-transcription`; conditional `voice-commands` | Future; transcription is distinct from executable commands and both require decisions. |
| 14 | `discord-integration` | Future; first workflows, association model, audience, and optional audio unresolved. |

## Scope boundaries

- Dicekeeper assists a human Dungeon Master; historical sources do not establish autonomous replacement of that role.
- Documentation work does not modify application code, deployment, data, or runtime configuration.
- Existing code is implementation evidence, not automatic authority for desired behavior.
- Historical Notion notes and sprint backlogs are candidates, not accepted requirements.
- The Markdown, DOT, and SVG use-case renderings are duplicate representations of the two PlantUML sources and are not independent corroboration.
- Main specifications contain the accepted current baseline. Their presence establishes an approved contract, not implementation conformance or runtime verification.
- Future combat/progression planning preserves AI encounter suggestions for section 11, rule-corpus choices for section 12, and the existing item/loot deferral; no implementation task may absorb those boundaries silently.
