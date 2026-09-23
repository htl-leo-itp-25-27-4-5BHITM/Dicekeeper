# Specification Handoff

## Current state

- Coordination change: `specify-dicekeeper-functionality`
- Schema: `spec-driven`
- Last completed work package: section 10, **Specify future combat and progression** (items 10.1–10.3)
- Overall coordination progress after this handoff: 35/50 checklist items complete
- Next work package: section 11, **Specify AI preparation and recaps**; it has not been started
- Published current baseline: 14 main capabilities under [`openspec/specs/`](../../openspec/specs/), containing 102 requirements and 447 scenarios
- Accepted future content/session plan: [`add-campaign-content-and-session-records`](../../openspec/changes/add-campaign-content-and-session-records/) contains 18 requirements and 75 scenarios; strict validation passes and all 15 implementation tasks remain open
- Accepted future combat/progression plan: [`add-combat-automation-and-character-progression`](../../openspec/changes/add-combat-automation-and-character-progression/) contains 17 requirements and 88 scenarios; strict validation passes and all 20 implementation tasks remain open
- Character correction change: [`correct-character-library-boundaries`](../../openspec/changes/correct-character-library-boundaries/) remains proposal-only and unchanged
- Application code changed: no
- Blocking issue for starting section 11: none. Section 11 must still resolve its suggestion/recap workflows, authorized context, lore authority, DM acceptance/editing, audiences, provider failures, and usage limits before authoring AI contracts.

## Completed in section 10

- Read the coordination proposal/design/tasks, shared runbook/decisions/coverage/handoff, accepted section-9 artifacts, and the relevant published character, campaign, map, live-play, view, and synchronization contracts.
- Re-read the two public historical requirement interviews and sparse progression sprint notes. Confirmed answers were used; blank condition, tie, progression, and rules questions were not treated as decisions.
- Fixed the product profile to D&D 5e (2024), a functional reference scale of 3–10 players plus up to 25 enemies, enemy group initiative, explicit DM tie ordering, and manual/built-in d20 initiative with modifiers and advantage/disadvantage but no macros.
- Accepted durable active-encounter combat tracking with deterministic order/rounds, current/maximum/temporary HP, reasoned overrides, role-filtered projections, idempotency, restart persistence, and exactly-once section-9 history integration.
- Accepted manually controlled main-boss phases, optional sequential health bars, legendary-action availability, and enrage state. Mini bosses have no phases; zero HP never auto-transitions or applies an unstated rule.
- Accepted owner-controlled, confirmed, one-level-at-a-time D&D 5e (2024) progression from level 1 through 20 with immutable history. Pending review blocks advancement; approved references remain approved; no HP or other character/combat field changes automatically.
- Explicitly deferred conditions/effects, full character-sheet advancement, XP/milestones, skill points, class/spell/feat/multiclass choices, level-derived HP, tactical rules, reusable monster libraries, physical/shake dice, automatic boss effects, and item/loot/reward behavior.
- Kept AI encounter generation and balance advice in section 11 and the rules corpus/citation workflow in section 12.
- Created the future change through the OpenSpec CLI and completed its proposal, two spec deltas, design, and implementation checklist. No product task was checked or executed.
- Updated decisions, evidence, coverage, dependency index, overview, glossary, permissions, handoff, and the section-10 coordination checkboxes. Stopped before section 11.

## Section 10 decision outcome

- `combat-automation` owns exactly one durable D&D 5e (2024) tracker per active section-9 encounter, encounter-local player/enemy combatants, enemy-only group slots, explicit tied-slot ordering, turn/round state, manual HP/boss controls, role-filtered views, revision/idempotency, restart, cleanup, and active-session history integration.
- Conditions/effects are not nominal tags or hidden implementation choices: their catalog, custom-entry policy, duration, stacking, expiration, visibility, and rule consequences are deferred under DEC-041.
- `character-progression` owns only the player-owner level transition and immutable history. It does not decide why advancement is earned or mutate skills, features, spells, feats, ability scores, HP, items, rewards, review, or combat state.
- The future player/table projections may show shared combat state and current player levels, while resistance/immunity, unrevealed boss data, DM traits, other character sheets, and progression histories retain their narrower audiences.
- Section 11 may consume bounded content/session/combat projections for suggestions, but it must not mutate deterministic combat state without a separate accepted DM review/commit action.

## Corrective and unresolved work

- The published baseline and its 49 indexed `DEV-*` implementation deviations are unchanged. Section 10 did not advance any correction.
- Both future changes are planning-complete but product-incomplete: `add-campaign-content-and-session-records` is 0/15 and `add-combat-automation-and-character-progression` is 0/20. Do not archive or sync them as current behavior before implementation and review.
- Items/loot remain deferred under DEC-035/DEC-043 and ADD-021. AI work must not infer inventory, equipment, transfers, rewards, or character mutation.
- Exact browser/version, viewport, accessibility-conformance/contrast, latency, throughput/capacity, and availability targets remain unresolved from the baseline review.
- Section 12 still owns the D&D 5e (2024) rule source corpus, license/access, citations, and uncertain/conflicting answer behavior. The edition is no longer unresolved.
- Section 11 owns AI story/quest/NPC/encounter suggestions and recaps, including context/audience, lore authority, DM acceptance/editing, provider failures, and usage limits.

## Verification performed

| Check / command | Result |
| --- | --- |
| `openspec validate add-combat-automation-and-character-progression --type change --strict --no-interactive` | Passed. |
| `openspec show add-combat-automation-and-character-progression --json --deltas-only` | Parsed 2 capabilities, 17 requirements, and 88 scenarios: 10/55 for `combat-automation`, 7/33 for `character-progression`. |
| `openspec instructions apply --change add-combat-automation-and-character-progression --json` | Reported `ready`, with 0/20 implementation tasks complete. |
| `openspec validate add-campaign-content-and-session-records --type change --strict --no-interactive` | Passed for the unchanged section-9 future plan. |
| `openspec validate --specs --strict --no-interactive` | Passed for the unchanged 14 published main specs. |
| Coverage audit | 33/33 current aliases, 22/22 future aliases, and 22/22 additional IDs are unique and owned; section-10 rows link to future requirements or explicit deferrals. |
| Markdown/local-link audit | Passed for shared documentation and both future changes. |
| `git diff --check` | Passed for section-10 changes. |
| Application/corrective implementation | None. No application source, test, runtime configuration, deployment file, section-9 product artifact, or `correct-character-library-boundaries` artifact changed. |

## Changed paths in section 10

- `openspec/changes/add-combat-automation-and-character-progression/{.openspec.yaml,proposal.md,design.md,tasks.md}`
- `openspec/changes/add-combat-automation-and-character-progression/specs/{combat-automation,character-progression}/spec.md`
- `docs/specification/{runbook.md,evidence.md,decisions.md,coverage.md,glossary.md,permissions.md,handoff.md,overview.md}`
- `openspec/changes/specify-dicekeeper-functionality/{design.md,tasks.md}` (resolved task-10/task-12 edition dependency wording and section-10 checkboxes)

An unrelated concurrent task created `openspec/changes/add-kubernetes-development-box/`. It was not inspected, edited, validated, staged, or included in the section-10 commit.

## Exact next instruction

> `$openspec-apply-change specify-dicekeeper-functionality` — Execute only section 11, **Specify AI preparation and recaps** (items 11.1–11.3). Read the published main specs, shared decisions, coverage, dependency runbook, this handoff, and the accepted `add-campaign-content-and-session-records` plus `add-combat-automation-and-character-progression` planning artifacts; resolve accepted story/quest/NPC/encounter-suggestion and recap workflows, authorized context sources, lore authority, DM acceptance/editing, audience, provider failures, and usage limits; create only the bounded future `ai-campaign-assistance` and `session-recaps` planning artifacts authorized by those decisions; validate and update shared documentation; then stop before section 12. Do not implement application features, apply section-9/10 implementation tasks, infer deferred item/loot/condition/full-progression behavior, or let AI suggestions mutate deterministic combat state without an explicit accepted DM action.
