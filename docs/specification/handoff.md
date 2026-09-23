# Specification Handoff

## Current state

- Coordination change: `specify-dicekeeper-functionality`
- Schema: `spec-driven`
- Last completed work package: section 9, **Specify future content and session records** (items 9.1–9.3)
- Overall coordination progress after this handoff: 32/50 checklist items complete
- Next work package: section 10, **Specify future combat and progression**; it has not been started
- Published current baseline: 14 main capabilities under [`openspec/specs/`](../../openspec/specs/), containing 102 requirements and 447 scenarios
- Accepted future plan: [`add-campaign-content-and-session-records`](../../openspec/changes/add-campaign-content-and-session-records/) contains 18 requirements and 75 scenarios across `campaign-content` and `session-records`; strict validation passes and all 15 implementation tasks remain open
- Character correction change: [`correct-character-library-boundaries`](../../openspec/changes/correct-character-library-boundaries/) remains proposal-only and unchanged
- Application code changed: no
- Blocking issue for starting section 10: none. Section 10 must still resolve its edition, progression, condition/effect, initiative, boss, and encounter-scale decisions before authoring combat/progression contracts.

## Completed in section 9

- Read the coordination proposal/design/tasks, all 14 published main specs, shared decisions, coverage, dependency runbook, handoff, glossary, permissions, overview, and the relevant evidence.
- Refreshed the two historical interview sources needed for campaign/session/encounter, core objects, history, recaps, items/loot, and lore; blank follow-up answers were not treated as decisions.
- Confirmed that a campaign is the durable story/membership container, a session is one durable play occurrence within it, and an encounter is an optional session segment with no implied combat automation.
- Accepted DM-managed NPC, place, quest, and lore records with DM-only defaults, explicit member audience, durable persistence, same-campaign references, archival, and reference-safe deletion.
- Deferred items/loot because inventory ownership, transfer, equipment, rewards, character mutation, audience, and deletion rules remain unspecified.
- Defined append-only ordered event history, immutable amendments/redactions, audience-safe downstream recap inputs, and the boundary that preserves ephemeral live state and browser-local player notes.
- Created the future change through the OpenSpec CLI and completed its proposal, two spec deltas, design, and implementation checklist. No product task was checked or executed.
- Updated decisions, evidence, coverage, dependency index, overview, glossary, permissions, handoff, and the section-9 coordination checkboxes. Stopped before section 10.

## Section 9 decision outcome

- `campaign-content` contains only NPC, place, quest, and lore records. It does not become a generic item store, AI generator, or combat rules model.
- `session-records` owns `PLANNED`, `ACTIVE`, `COMPLETED`, and `ARCHIVED` session/encounter lifecycles, at most one active session per campaign and one active encounter per session, durable event ordering, correction, cleanup, and recap-input projections.
- Content/session mutation belongs to the campaign owner-DM. Current members see only explicit `MEMBERS` projections. Guests, unrelated/former users, and the current display client receive no future record through these capabilities.
- Event history may later capture committed map/live/dice/decision outcomes during an active session, but it does not reconstruct their current runtime state and never captures private browser-local notes.
- Combat automation/progression remains section 10; AI generation/recaps remains section 11; audio/transcription remains section 13. Those later changes may consume stable section-9 records without broadening their audience.

## Corrective and unresolved work

- The published baseline and its 49 indexed `DEV-*` implementation deviations are unchanged. Section 9 did not advance any correction.
- `add-campaign-content-and-session-records` is planning-complete but product-incomplete at 0/15 tasks. Do not archive or sync it as current behavior before implementation and review.
- Items/loot are explicitly deferred under DEC-035 and ADD-021. Section 10 and section 11 must not assume an inventory, equipment, transfer, reward, or character-mutation contract.
- Exact browser/version, viewport, accessibility-conformance/contrast, latency, throughput/capacity, and availability targets remain unresolved from the baseline review.
- Section 10 still owns D&D edition, advancement, conditions/effects, initiative groups/ties, boss mechanics, and encounter-scale behavior; section 12 depends on its edition decision.

## Verification performed

| Check / command | Result |
| --- | --- |
| `openspec validate add-campaign-content-and-session-records --type change --strict --no-interactive` | Passed. |
| `openspec show add-campaign-content-and-session-records --json --deltas-only` | Parsed 2 capabilities, 18 requirements, and 75 scenarios: 8/30 for `campaign-content`, 10/45 for `session-records`. |
| `openspec instructions apply --change add-campaign-content-and-session-records --json` | Reported `ready`, with 0/15 implementation tasks complete. |
| `openspec validate --specs --strict --no-interactive` | Passed for the unchanged 14 published main specs. |
| Coverage audit | 33/33 current aliases, 22/22 future aliases, and 21/21 additional IDs are unique and owned; section-9 rows link to their future requirements. |
| Markdown/local-link audit | Passed for shared documentation and the new future change. |
| `git diff --check` | Passed. |
| Application/corrective implementation | None. No application source, test, runtime configuration, deployment file, or `correct-character-library-boundaries` artifact changed. |

## Changed paths in section 9

- `openspec/changes/add-campaign-content-and-session-records/{proposal.md,design.md,tasks.md}`
- `openspec/changes/add-campaign-content-and-session-records/specs/{campaign-content,session-records}/spec.md`
- `docs/specification/{runbook.md,evidence.md,decisions.md,coverage.md,glossary.md,permissions.md,handoff.md,overview.md}`
- `openspec/changes/specify-dicekeeper-functionality/tasks.md` (section 9 checkboxes only)

## Exact next instruction

> `$openspec-apply-change specify-dicekeeper-functionality` — Execute only section 10, **Specify future combat and progression** (items 10.1–10.3). Read the published main specs, shared decisions, coverage, dependency runbook, this handoff, and the accepted `add-campaign-content-and-session-records` planning artifacts; resolve the rules edition, supported advancement and conditions/effects, initiative ties/groups, boss mechanics, and encounter-scale decisions; create only the bounded future `combat-automation` and `character-progression` planning artifacts authorized by those decisions; validate and update shared documentation; then stop before section 11. Do not implement application features, apply section-9 implementation tasks, assume deferred items/loot behavior, or advance unrelated corrective changes.
