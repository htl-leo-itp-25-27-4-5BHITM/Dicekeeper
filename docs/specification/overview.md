# Dicekeeper Functional Specification

## Status

This directory is the shared entry point for the Dicekeeper functional specification. The foundation and task-2 accounts/profiles/permissions stage were completed on 2026-09-21. Product requirements have not yet been published as main OpenSpec specifications.

The confirmed documentation scope is the current application plus a separately identified future scope. The current application will be documented through the active [`document-dicekeeper-baseline`](../../openspec/changes/document-dicekeeper-baseline/) change. Future behavior remains proposed until its owning task records a product decision and creates a bounded follow-on change.

The active baseline now contains draft deltas for [`account-access`](../../openspec/changes/document-dicekeeper-baseline/specs/account-access/spec.md) and [`player-profiles`](../../openspec/changes/document-dicekeeper-baseline/specs/player-profiles/spec.md). The remaining 12 capability deltas still belong to tasks 3–7, and publication remains task 8. Creating documentation or planning artifacts does not mean that application behavior has been implemented or exercised; accepted contracts that differ from source are recorded as deviations in [`evidence.md`](evidence.md).

## How to read this specification

- [`runbook.md`](runbook.md) defines the ordered work packages, capability owners, and execution protocol.
- [`evidence.md`](evidence.md) records sources, static implementation observations, historical material, and review limitations.
- [`decisions.md`](decisions.md) separates confirmed decisions, proposed defaults, unresolved questions, and exclusions.
- [`coverage.md`](coverage.md) maps all 55 diagram use cases and additional source candidates to a capability and owning task.
- [`glossary.md`](glossary.md) defines actors, domain terms, status vocabulary, and the original German labels.
- [`permissions.md`](permissions.md) is the cross-capability actor/action/data matrix. It is provisional until the owning capability requirements are accepted.
- [`handoff.md`](handoff.md) records the exact continuation point, relevant paths, validations, and next instruction.

Normative behavior will live in OpenSpec capability specifications. These shared documents provide navigation, evidence, decisions, and cross-capability checks; they do not replace requirements and scenarios.

## Current baseline capability boundaries

| Owning task | Capability | Boundary |
| --- | --- | --- |
| 2 | `account-access` | Login, logout, registration boundary, local identity synchronization, and authentication failure/expiry. |
| 2 | `player-profiles` | Profile and avatar data, visibility boundaries, account settings, and account deletion. |
| 3 | `character-library` | Character creation, drafts, reference values, editing, selection, ownership, validation, and deletion. |
| 4 | `campaign-management` | Campaign creation, metadata/story, visibility, capacity, start state, editing, and deletion. |
| 4 | `campaign-membership` | Public/private admission, campaign roles, membership listing, leave, kick, and capacity. |
| 4 | `character-review` | Character submission, resubmission, approval/rejection, and review-state transitions. |
| 4 | `notifications` | Notification recipients, triggering events, read state, deletion, references, and navigation. |
| 5 | `campaign-maps` | Active maps, markers/groups, fog, map switching, undo/reset, and map visibility. |
| 5 | `media-assets` | Avatar/map upload, validation, processing, delivery, access, replacement, and cleanup. |
| 6 | `live-play` | Turn, HP, active-player state, dice, initialization, and reset. |
| 6 | `group-decisions` | Decision creation, voting, eligibility, duplicate handling, completion, and persistence. |
| 6 | `player-notes` | Player notes, isolation, persistence lifetime, refresh, and device behavior. |
| 7 | `session-views` | DM, player, and table/display views, including supported screen/device behavior. |
| 7 | `live-synchronization` | Live event propagation, heartbeat, reconnect, stale clients, access revocation, and restart behavior. |

The capability names above are confirmed as the flat organization for the baseline planning change. Task 2 has authored and reconciled `account-access` and `player-profiles`; the behavior inside the remaining capabilities still requires evidence review and product decisions in tasks 3–7.

## Separately identified future scope

| Owning task | Candidate capability | Status |
| --- | --- | --- |
| 9 | `campaign-content`, `session-records` | Future; included objects and lifecycle unresolved. |
| 10 | `combat-automation`, `character-progression` | Future; rules edition and supported mechanics unresolved. |
| 11 | `ai-campaign-assistance`, `session-recaps` | Future; context, authority, review, audience, failure, and limits unresolved. |
| 12 | `rule-assistance` | Future; rule corpus, edition, citation, and uncertainty behavior unresolved. |
| 13 | `audio-transcription`; conditional `voice-commands` | Future; transcription is distinct from executable commands and both require decisions. |
| 14 | `discord-integration` | Future; first workflows, association model, audience, and optional audio unresolved. |

## Scope boundaries

- Dicekeeper assists a human Dungeon Master; historical sources do not establish autonomous replacement of that role.
- Documentation work does not modify application code, deployment, data, or runtime configuration.
- Existing code is implementation evidence, not automatic authority for desired behavior.
- Historical Notion notes and sprint backlogs are candidates, not accepted requirements.
- The Markdown, DOT, and SVG use-case renderings are duplicate representations of the two PlantUML sources and are not independent corroboration.
- Main specifications remain empty until the baseline has been authored, reviewed, validated, and archived in task 8.
