# Functional Specification Runbook

## Purpose and boundary

This runbook coordinates the documentation of Dicekeeper behavior. It does not authorize application implementation. The executable checklist remains [`openspec/changes/specify-dicekeeper-functionality/tasks.md`](../../openspec/changes/specify-dicekeeper-functionality/tasks.md); this file explains how to execute and hand off its sections.

The confirmed scope is the current application plus a separately identified future scope. Current contracts are authored in [`document-dicekeeper-baseline`](../../openspec/changes/document-dicekeeper-baseline/). Corrections and future behavior belong in separate changes after their product decisions are resolved.

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
| 9 | Content and session records | 8 | Future `campaign-content`, `session-records` | Accepted future objects and lifecycle have a bounded change, or a reasoned deferral. |
| 10 | Combat and progression | 8; 9 if shared entities are needed | Future `combat-automation`, `character-progression` | Edition and mechanics are resolved and proposed with deterministic/manual-override scenarios, or deferred. |
| 11 | AI preparation and recaps | 9; 10 for encounter assistance | Future `ai-campaign-assistance`, `session-recaps` | Context, authority, review, audience, limits, and failure behavior are proposed or deferred. |
| 12 | Rule assistance | 8; edition decision from 10 | Future `rule-assistance` | Corpus/access/citation/uncertainty are resolved before implementation tasks. |
| 13 | Audio and voice commands | 9; 11 if transcripts feed AI | Future `audio-transcription`; conditional `voice-commands` | Transcription and action execution have separate explicit dispositions. |
| 14 | Discord | 8; 13 only if audio is included | Future `discord-integration` | Initial workflows and web-role mapping are proposed or deferred. |
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

The foundation owns the eight files in this directory plus the proposal at [`openspec/changes/document-dicekeeper-baseline/proposal.md`](../../openspec/changes/document-dicekeeper-baseline/proposal.md). Tasks 2–7 fill the baseline specs. Task 8 completes its remaining planning artifacts, reviews it, archives it, and verifies the resulting main specs.
