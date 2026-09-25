# Functional Specification Handoff

## Current state

- Coordination change: [`specify-dicekeeper-functionality`](../../openspec/changes/specify-dicekeeper-functionality/)
- Last completed work package: section 14, **Specify Discord integration** (items 14.1–14.2)
- Coordination progress: 45/50 tasks complete; only section 15 (items 15.1–15.5) remains
- Next work package: section 15, **Audit the complete specification and hand off implementation**
- Published current baseline: 14 functional capabilities, 102 requirements, and 447 scenarios under [`openspec/specs/`](../../openspec/specs/), plus the separate `development-workspace` main spec
- Current implementation-deviation index: 49 static findings; none was corrected by section 14
- Accepted future plans remain active and unimplemented:
  - content/session records: 18 requirements, 75 scenarios, 0/15 tasks
  - combat/progression: 17 requirements, 88 scenarios, 0/20 tasks
  - AI/recaps: 18 requirements, 75 scenarios, 0/27 tasks
  - rule assistance: 9 requirements, 47 scenarios, 0/23 tasks
  - audio transcription: 10 requirements, 56 scenarios, 0/32 tasks; voice commands deferred
  - Discord integration: 10 requirements, 54 scenarios, 0/32 tasks; Discord audio/voice deferred

## Section 14 completed work

- Reconciled the README's long-term Discord ambition, the three future-diagram Discord aliases, repository implementation absence, and the accepted Dicekeeper authorization, session, live-roll, synchronization, audio, and no-voice-command boundaries.
- Accepted one narrowly bounded first release: one owner-DM may associate one campaign with one Discord server text channel after Dicekeeper and external-channel authority checks. No Discord account, role, name, server, or channel membership is mapped to a Dicekeeper identity, membership, or role.
- Accepted only explicit outbound text with an exact destination/payload preview and external-audience warning:
  - the owner-DM may share a minimal `MEMBERS` status for an active or completed section-9 session;
  - a current campaign member, including the DM acting as a member, may share only that authenticated member's latest server-validated standard-die result while exactly one session is active.
- Required stable delivery identities, explicit pending/delivered/failed/unknown states, safe retry/reconciliation, disconnect and reauthorization outcomes, reconnect without backfill, access revocation, unlinking, campaign cleanup, and disclosure that Discord may retain already-delivered messages.
- Deferred automatic mirrors, history/backfill, inbound Discord content or commands, external account mapping, multiple/shared channels, broad campaign/session/combat/map/AI/rule/transcript data, full online/shared views, reactions, remote edit/delete, Discord audio, and all voice-command execution.
- Created [`add-discord-integration`](../../openspec/changes/add-discord-integration/) with proposal, design, one `discord-integration` delta, and 32 unchecked implementation tasks. No application feature, prior future task, correction, runtime/provider configuration, archive, or main-spec synchronization was performed.
- Reconciled decisions, evidence, coverage, overview, glossary, permissions, runbook, handoff, and only the two section-14 coordination checkboxes. Stopped before section 15.

## Section 14 decision outcome

- Dicekeeper authentication and campaign membership remain authoritative. The external authorizer proves destination authority only; Discord participants receive no Dicekeeper read or mutation privilege.
- Discord is an external text audience, not a synchronized state replica. Every accepted message is manual, previewed, minimal, and re-authorized against its Dicekeeper source at send time.
- Session status contains only bounded campaign/session/status/time/origin fields from the member-safe active/completed session projection. Roll sharing contains only the current member's latest validated die/value/attribution plus bounded context; no history, randomness/fairness claim, or another participant's roll is exported.
- Ambiguous provider outcomes are not blindly retried. Reconnect revalidates the existing link and sends no messages missed while disconnected.
- Discord audio is not accepted. Section-13's explicitly selected owner-DM browser microphone, participant consent, provider/privacy configuration, transient raw-audio lifetime, reviewed inert text, and no-voice-command rule remain unchanged.

## Corrective and unresolved work

- The published baseline and its 49 indexed `DEV-*` implementation deviations are unchanged. Section 14 did not advance any correction.
- All six accepted future changes remain planning-complete but product-incomplete. Do not archive or synchronize them as current behavior before implementation and review.
- Exact browser/version, viewport, accessibility-conformance/contrast, latency, throughput/capacity, and availability targets remain unresolved from the baseline review.
- AI, rule-explanation, speech, and Discord production-enablement gates remain separate. Discord requires an exact application/bot identity and version, protected credentials and rotation, approved callback origins, bounded provider permission identifiers, rate-limit/reconciliation policy, and an operational test environment before enablement.
- Section 15 owns the final all-scope audit: 55 diagram aliases, 25 additional candidates, 49 deviations, terms/roles/state/audience/lifetimes, all main and active planning specs, links/paths, roadmap ordering, implementation-readiness gates, explicit deferrals, and final implementation handoff.

## Verification performed

| Check / command | Result |
| --- | --- |
| `openspec validate add-discord-integration --type change --strict --no-interactive` | Passed. |
| `openspec show add-discord-integration --json --deltas-only` | Parsed 1 capability, 10 requirements, and 54 scenarios. |
| `openspec instructions apply --change add-discord-integration --json` | Reported `ready`, with 0/32 implementation tasks complete. |
| `openspec validate specify-dicekeeper-functionality --type change --strict --no-interactive` | Passed with the expected `skip_specs` informational result. |
| `openspec validate --specs --strict --no-interactive` | Passed for all 15 unchanged published main specs (14 functional baseline capabilities plus `development-workspace`); informational long-requirement notices only. |
| Coverage/integrity audit | 33/33 current aliases, 22/22 future aliases, and 25/25 additional candidates are uniquely owned; DSI requirement IDs are contiguous and unique; all 32 Discord implementation tasks remain unchecked. |
| Markdown/local-link and placeholder audit | Passed for shared documentation, the coordination artifacts, and `add-discord-integration`. |
| Diff/whitespace and scope audit | Passed. Main specs are unchanged, and no application, corrective, section-9–13 implementation, audio, voice-command, deployment, workflow, script, or runtime-configuration path is included in section 14. |

## Changed paths in section 14

- `openspec/changes/add-discord-integration/{.openspec.yaml,proposal.md,design.md,tasks.md}`
- `openspec/changes/add-discord-integration/specs/discord-integration/spec.md`
- `docs/specification/{runbook.md,evidence.md,decisions.md,coverage.md,glossary.md,permissions.md,handoff.md,overview.md}`
- `openspec/changes/specify-dicekeeper-functionality/tasks.md` (section-14 checkboxes only)

## Exact next instruction

> `$openspec-apply-change specify-dicekeeper-functionality` — Execute only section 15, **Audit the complete specification and hand off implementation** (items 15.1–15.5). Read the published main specs, all shared specification documents, this handoff, the archived baseline record, every active corrective/future planning change, and the complete coordination checklist; audit coverage against both diagrams, README, relevant historical sources, and code-only candidates so all 55 aliases and every additional requirement have one disposition and every normative requirement has testable scenarios; reconcile terms, roles, state transitions, visibility, authority, persistence, deletion, implementation-readiness gates, and explicit deferrals across all accepted artifacts; strictly validate every active change and all main specs, audit internal links/capability paths/placeholders, complete the overview and ordered implementation roadmap, update only section-15 coordination checkboxes after the review passes, and produce the final implementation handoff. Do not implement application features, apply any future or corrective implementation task, archive or synchronize a future plan into the current baseline, silently resolve an open configuration/product gate, or begin work beyond the final audit.
