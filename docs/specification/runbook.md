# Functional Specification Runbook

## Purpose and boundary

This runbook coordinates the documentation of Dicekeeper behavior. It does not authorize application implementation. The executable checklist remains [`openspec/changes/specify-dicekeeper-functionality/tasks.md`](../../openspec/changes/specify-dicekeeper-functionality/tasks.md); this file explains how to execute and hand off its sections.

The confirmed scope is the accepted current contract plus a separately identified future scope. Current contracts are published under [`openspec/specs/`](../../openspec/specs/) from the archived [`document-dicekeeper-baseline`](../../openspec/changes/archive/2026-09-22-document-dicekeeper-baseline/) review. Corrections and future behavior belong in separate changes after their product decisions are resolved.

## Required classification

Every coverage or decision record keeps these dimensions independent:

| Dimension | Values | Meaning |
| --- | --- | --- |
| Scope | `current`, `future`, `excluded`, `unresolved` | Which product horizon contains the candidate. |
| Decision | `confirmed`, `proposed`, `superseded`, `deferred`, `unresolved` | Whether the desired contract is accepted. |
| Implementation evidence | `source-observed`, `test-supported`, `runtime-verified`, `partial`, `absent`, `unknown` | What is known about implementation, independently of intent. |

Stable IDs use `SRC-*` for evidence, `DEC-*` for decisions, `CUR-*`/`FUT-*` for diagram aliases, and `ADD-*` for requirements discovered outside the canonical diagrams. Normative requirement IDs are assigned by the owning capability task.

## Ordered work packages

| Section | Work package | Dependencies | Capability ownership / output | Exit criterion |
| --- | --- | --- | --- | --- |
| 1 | Foundation | Coordination proposal | Shared documentation; baseline proposal | Eight shared files exist, all 55 diagram aliases and added candidates have owners, and the baseline proposal matches the current capability inventory. |
| 2 | Accounts and permissions | 1 | `account-access`, `player-profiles` | Identity, profile, account deletion, and cross-account boundaries have evidence-backed scenarios and explicit decision owners. |
| 3 | Characters | 2 | `character-library` | Character ownership and all CRUD/draft/reference behavior are specified without preserving accidental universal access. |
| 4 | Campaigns and participation | 3 | `campaign-management`, `campaign-membership`, `character-review`, `notifications` | Campaign, membership, review, notification, and start transitions have accepted or explicitly unresolved contracts. |
| 5 | Maps and media | 4 | `campaign-maps`, `media-assets` | Media access/processing and map editor/viewer behavior cover validation, authority, switching, undo/reset, and cleanup. |
| 6 | Live play | 5 | `live-play`, `group-decisions`, `player-notes` | Authority, state transitions, trust, quorum/ties, and persistence lifetimes are explicit. |
| 7 | Views and synchronization | 6 | `session-views`, `live-synchronization` | DM/player/table visibility, supported devices, propagation, reconnect, revocation, and restart behavior agree with upstream permissions. |
| 8 | Baseline review | 2–7 | Publish accepted current specifications | Every current use case is covered; review and strict validation pass; corrective work remains separate. |
| 9 | Content and session records | 8 | Future [`campaign-content`](../../openspec/changes/add-campaign-content-and-session-records/specs/campaign-content/spec.md), [`session-records`](../../openspec/changes/add-campaign-content-and-session-records/specs/session-records/spec.md) | Completed as the strictly valid planning change [`add-campaign-content-and-session-records`](../../openspec/changes/add-campaign-content-and-session-records/); items/loot are explicitly deferred and all 15 implementation tasks remain open. |
| 10 | Combat and progression | 8; section 9 supplies the accepted session/encounter and content-reference boundaries | Future [`combat-automation`](../../openspec/changes/add-combat-automation-and-character-progression/specs/combat-automation/spec.md), [`character-progression`](../../openspec/changes/add-combat-automation-and-character-progression/specs/character-progression/spec.md) | Completed as the strictly valid planning change [`add-combat-automation-and-character-progression`](../../openspec/changes/add-combat-automation-and-character-progression/); accepted tracker/level scope is deterministic, unanswered mechanics are explicitly deferred, AI suggestions stay in section 11, and all 20 implementation tasks remain open. |
| 11 | AI preparation and recaps | 9; 10 for encounter assistance | Future [`ai-campaign-assistance`](../../openspec/changes/add-ai-campaign-assistance-and-session-recaps/specs/ai-campaign-assistance/spec.md), [`session-recaps`](../../openspec/changes/add-ai-campaign-assistance-and-session-recaps/specs/session-recaps/spec.md) | Completed as the strictly valid planning change [`add-ai-campaign-assistance-and-session-recaps`](../../openspec/changes/add-ai-campaign-assistance-and-session-recaps/); suggestions/recaps are DM-reviewed, provider transfer and audience are explicit, finite configuration is required, direct deterministic mutation is prohibited, and all 27 implementation tasks remain open. |
| 12 | Rule assistance | 8; edition decision from 10 | Future [`rule-assistance`](../../openspec/changes/add-rule-assistance/specs/rule-assistance/spec.md) | Completed as the strictly valid planning change [`add-rule-assistance`](../../openspec/changes/add-rule-assistance/); the corpus/license, citations/attribution, fail-closed uncertainty/conflict behavior, optional provider boundary, and read-only scope are explicit, and all 23 implementation tasks remain open. |
| 13 | Audio and voice commands | 9; 11 if transcripts feed AI | Future [`audio-transcription`](../../openspec/changes/add-audio-transcription/specs/audio-transcription/spec.md); executable `voice-commands` deferred | Completed as the strictly valid planning change [`add-audio-transcription`](../../openspec/changes/add-audio-transcription/): DM-controlled active-session capture, explicit consent, provider/privacy gate, transcript lifecycle, reviewed history/recap bridge, and inert-text boundary are specified; all 32 implementation tasks remain open and no voice-command artifact exists. |
| 14 | Discord | 8; section 9 supplies the accepted session boundary; section 13 governs the explicit audio deferral | Future [`discord-integration`](../../openspec/changes/add-discord-integration/specs/discord-integration/spec.md) | Completed as the strictly valid planning change [`add-discord-integration`](../../openspec/changes/add-discord-integration/): one owner-DM-managed campaign/text-channel association, explicit minimal status/own-roll messages, external-audience preview, durable delivery identity, reconnect without backfill, cleanup, and no Discord-derived Dicekeeper authority are specified; all 32 implementation tasks remain open and Discord audio/voice are deferred. |
| 15 | Final audit | 8–14, allowing explicit deferral | Coverage, consistency, validation, overview, roadmap, final handoff | Every source candidate has a disposition and every accepted requirement has testable scenarios. |

## Start protocol

1. Read the coordination checklist, this runbook, [`decisions.md`](decisions.md), [`coverage.md`](coverage.md), and [`handoff.md`](handoff.md).
2. Run `openspec list --json` and `openspec list --specs --json`; read the relevant change/spec artifacts in full, including scenarios.
3. Check the working tree and refresh evidence for relevant files changed since the inspected revision.
4. Work only on the next incomplete section whose dependencies are met.
5. Inspect only the sources needed for that capability and resolve blocking decisions before writing a normative contract.
6. Follow the selected OpenSpec artifact instructions and stop at the requested boundary. Planning does not authorize product implementation.

## Authoring protocol

- Put observable behavior in capability specs: actors, preconditions, inputs, outputs, validation, permissions, transitions, failures, persistence, deletion, and synchronization as applicable.
- Use `SHALL` or `MUST`; give every requirement at least one `#### Scenario:` with `WHEN` and `THEN`.
- Add denial, invalid-input, boundary, and recovery scenarios where they change outcomes.
- Keep internal classes, code paths, and implementation findings in evidence/design artifacts rather than normative requirements.
- Keep one canonical capability per behavior. DM/player/table views reference shared capabilities instead of duplicating their rules.
- Do not convert observed defects, stale historical notes, blank interview answers, or future diagrams into accepted current behavior without a recorded decision.

## End and handoff protocol

1. Validate touched changes/specs and distinguish syntax success from semantic completeness.
2. Reconcile evidence, decisions, coverage, glossary, and permissions for the affected behavior.
3. Mark checklist items complete only after their stated verification passes.
4. Update [`handoff.md`](handoff.md) with completed work, exact changed paths, decisions, blockers, command results, remaining work, and one exact next instruction.
5. Stop at the section boundary. Do not continue into the next work package in the same task unless the user explicitly requests it.

## Validation

Use the CLI-resolved project root and artifact paths. Typical final checks are:

```sh
openspec validate <change-name> --type change --strict --no-interactive
openspec validate --specs --strict --no-interactive
```

A successful syntax/schema validation does not establish source coverage, product acceptance, implementation, or runtime correctness. Record static review as static review, test execution as test-supported evidence, and runtime exercise as runtime-verified evidence.

## Foundation outputs

The foundation owns the eight files in this directory plus the archived baseline planning record at [`openspec/changes/archive/2026-09-22-document-dicekeeper-baseline/`](../../openspec/changes/archive/2026-09-22-document-dicekeeper-baseline/). Sections 2–7 authored the baseline deltas; section 8 completed their planning artifacts, performed the semantic review, published all 14 main specs, and kept 49 implementation deviations separate.

## Future planning outputs

| Section | Change | Capabilities | Planning validation | Product implementation |
| --- | --- | --- | --- | --- |
| 9 | [`add-campaign-content-and-session-records`](../../openspec/changes/add-campaign-content-and-session-records/) | `campaign-content`, `session-records` | Strict validation passed; 18 requirements and 75 scenarios | 0/15 tasks complete; not archived or published as current behavior |
| 10 | [`add-combat-automation-and-character-progression`](../../openspec/changes/add-combat-automation-and-character-progression/) | `combat-automation`, `character-progression` | Strict validation passed; 17 requirements and 88 scenarios | 0/20 tasks complete; not archived or published as current behavior |
| 11 | [`add-ai-campaign-assistance-and-session-recaps`](../../openspec/changes/add-ai-campaign-assistance-and-session-recaps/) | `ai-campaign-assistance`, `session-recaps` | Strict validation passed; 18 requirements and 75 scenarios | 0/27 tasks complete; not archived or published as current behavior; production provider/model and finite numeric limit configuration remain explicitly gated |
| 12 | [`add-rule-assistance`](../../openspec/changes/add-rule-assistance/) | `rule-assistance` | Strict validation passed; 9 requirements and 47 scenarios | 0/23 tasks complete; not archived or published as current behavior; external explanation generation remains separately gated while local cited retrieval and extract-only answers are specified |
| 13 | [`add-audio-transcription`](../../openspec/changes/add-audio-transcription/) | `audio-transcription`; executable `voice-commands` deferred | Strict validation passed; 10 requirements and 56 scenarios | 0/32 tasks complete; not archived or published as current behavior; transcription remains disabled pending exact provider/privacy/limit configuration and no voice-command change was created |
| 14 | [`add-discord-integration`](../../openspec/changes/add-discord-integration/) | `discord-integration`; Discord audio and voice commands deferred | Strict validation passed; 10 requirements and 54 scenarios | 0/32 tasks complete; not archived or published as current behavior; Discord remains disabled pending exact protected application/bot, callback, permission, rate-limit/reconciliation, and test-environment configuration |

Continue with section 15 only in a new explicitly requested task. Section 15 must audit all 55 diagram aliases and every additional candidate, accepted requirement/scenario, term, role, state, audience, persistence/deletion boundary, active planning change, link, capability path, overview entry, roadmap dependency, and remaining gate/deferral. It must not implement application behavior, apply future tasks, archive or synchronize future plans into current specs, or silently resolve open product/operations configuration gates.
