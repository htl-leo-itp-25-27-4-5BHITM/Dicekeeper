# Specification Handoff

## Current state

- Coordination change: `specify-dicekeeper-functionality`
- Schema: `spec-driven`
- Last completed work package: section 11, **Specify AI preparation and recaps** (items 11.1–11.3)
- Overall coordination progress after this handoff: 38/50 checklist items complete
- Next work package: section 12, **Specify rule assistance**; it has not been started
- Published current baseline: 14 main capabilities under [`openspec/specs/`](../../openspec/specs/), containing 102 requirements and 447 scenarios
- Accepted future content/session plan: [`add-campaign-content-and-session-records`](../../openspec/changes/add-campaign-content-and-session-records/) contains 18 requirements and 75 scenarios; strict validation passes and all 15 implementation tasks remain open
- Accepted future combat/progression plan: [`add-combat-automation-and-character-progression`](../../openspec/changes/add-combat-automation-and-character-progression/) contains 17 requirements and 88 scenarios; strict validation passes and all 20 implementation tasks remain open
- Accepted future AI/recap plan: [`add-ai-campaign-assistance-and-session-recaps`](../../openspec/changes/add-ai-campaign-assistance-and-session-recaps/) contains 18 requirements and 75 scenarios; strict validation passes and all 27 implementation tasks remain open
- Character correction change: [`correct-character-library-boundaries`](../../openspec/changes/correct-character-library-boundaries/) remains proposal-only and unchanged
- Application code changed: no
- Blocking issue for starting section 12: none. The D&D 5e (2024) edition is fixed, but section 12 must still resolve the licensed/accessible rule source corpus, citation format, and uncertain or conflicting answer behavior before creating implementation tasks.

## Completed in section 11

- Read the coordination proposal/design/tasks, shared runbook/decisions/coverage/handoff, relevant published main contracts, and the accepted section-9/10 planning artifacts.
- Reconciled the README and future-diagram AI candidates with current source evidence showing that the existing DM chat handler is local-only and is not an AI integration.
- Accepted owner-DM-only story/quest/twist, NPC/place, and encounter/boss preparation workflows using nonblank instructions and an explicitly selected, previewed, authorization-filtered context manifest.
- Kept current DM-authored story/content authoritative for current lore and effective amended session history authoritative for recorded events. Generated output is an untrusted DM-only draft that the DM may edit, reject, or accept.
- Required a separate validated ordinary-domain commit for accepted story/NPC/place/quest suggestions. Encounter/boss advice remains non-applying prose and never mutates encounter, combat, character, progression, item, condition/effect, or rule state.
- Accepted DM-triggered recaps only for one completed or archived session. `DM_ONLY` and `MEMBERS` recaps use separate SES-009 projections; a broader private draft cannot be relabeled or sanitized for members.
- Required explicit member publication plus current-membership checks, immutable accepted versions, stale-source detection, replacement versions, provider provenance, and safe failure/idempotency outcomes.
- Required AI to remain disabled until a finite provider/usage configuration exists. Exact provider/model and numeric context/output/time/usage/cost limits, accounting scope, fallback accounting, price threshold, and draft retention remain an explicit production-enablement gate rather than invented defaults.
- Explicitly deferred rule answers/citations, audio/transcript input, Discord delivery, portraits, reusable monster libraries, items/loot/rewards, conditions/effects, full advancement, tactical enforcement, voice execution, player-initiated generation, autonomous-DM behavior, direct combat import, and silent/model-generated context compression.
- Created the future change's proposal, two spec deltas, design, and implementation checklist. No product implementation task was checked or executed, and no main spec was modified.
- Reconciled decisions, evidence, coverage, dependency index, overview, glossary, permissions, runbook, handoff, and only the section-11 coordination checkboxes. Stopped before section 12.

## Section 11 decision outcome

- `ai-campaign-assistance` owns the external-provider boundary for the three accepted DM preparation purposes, explicit same-campaign source selection, provider disclosure, context limits, provenance, failure/idempotency outcomes, draft review, and the separate ordinary-domain commit boundary.
- `session-recaps` owns DM-generated summary/next-step drafts, audience-specific inputs, review/acceptance, explicit member publication, staleness/replacement, persistence, deletion/cleanup, and current-membership enforcement.
- Provider output never becomes lore, history, rules, or deterministic state by itself. Ordinary manual campaign-content, session-record, and combat workflows remain available when AI is disabled or unavailable.
- Member recap generation is isolated at input time: only the member-safe section-9 projection reaches the provider, and no post-generation filtering may downgrade a DM-only recap.
- The planning change is valid and bounded, but it is not implementation-ready for production enablement until its upstream section-9/10 capabilities exist where required and the finite provider/model/limit/accounting configuration is explicitly selected.

## Corrective and unresolved work

- The published baseline and its 49 indexed `DEV-*` implementation deviations are unchanged. Section 11 did not advance any correction.
- All three accepted future changes remain planning-complete but product-incomplete: content/session is 0/15, combat/progression is 0/20, and AI/recaps is 0/27. Do not archive or synchronize them as current behavior before implementation and review.
- AI portraits, reusable monster libraries, items/loot/rewards, conditions/effects, full advancement, tactical enforcement, transcripts, Discord, rule answers, player-triggered generation, and autonomous mutation remain excluded or deferred under DEC-049 and their earlier owning decisions.
- Exact browser/version, viewport, accessibility-conformance/contrast, latency, throughput/capacity, and availability targets remain unresolved from the baseline review.
- Section 12 owns the D&D 5e (2024) rule source corpus, license/access, citation format, and uncertain/conflicting-answer behavior. Generated preparation or recap text is not a source of rule authority.
- Section 13 owns audio/transcription and the separate voice-command disposition; section 14 owns Discord workflows and associations.

## Verification performed

| Check / command | Result |
| --- | --- |
| `openspec validate add-ai-campaign-assistance-and-session-recaps --type change --strict --no-interactive` | Passed. |
| `openspec show add-ai-campaign-assistance-and-session-recaps --json --deltas-only` | Parsed 2 capabilities, 18 requirements, and 75 scenarios: 9/38 for `ai-campaign-assistance`, 9/37 for `session-recaps`. |
| `openspec instructions apply --change add-ai-campaign-assistance-and-session-recaps --json` | Reported `ready`, with 0/27 implementation tasks complete. |
| `openspec validate specify-dicekeeper-functionality --type change --strict --no-interactive` | Passed with the expected `skip_specs` informational result. |
| `openspec validate --specs --strict --no-interactive` | Passed for all 14 unchanged published main specs; informational long-requirement notices only. |
| Upstream strict validation | Passed for the unchanged section-9 and section-10 future changes. |
| Coverage/integrity audit | 33/33 current aliases, 22/22 future aliases, and 22/22 additional candidates remain uniquely owned; AI requirement IDs are contiguous and unique; all 27 future implementation tasks remain unchecked. |
| Markdown/local-link and placeholder audit | Passed for shared documentation, the coordination artifacts, and the AI/recap change. |
| Diff/whitespace and scope audit | Passed. Main specs are unchanged, and no application, corrective, section-9/10, devbox, Kubernetes, deployment, workflow, README, script, or runtime-configuration path is included in section 11. |

## Changed paths in section 11

- `openspec/changes/add-ai-campaign-assistance-and-session-recaps/{.openspec.yaml,proposal.md,design.md,tasks.md}`
- `openspec/changes/add-ai-campaign-assistance-and-session-recaps/specs/{ai-campaign-assistance,session-recaps}/spec.md`
- `docs/specification/{runbook.md,evidence.md,decisions.md,coverage.md,glossary.md,permissions.md,handoff.md,overview.md}`
- `openspec/changes/specify-dicekeeper-functionality/tasks.md` (section-11 checkboxes only)

Concurrent devbox/Kubernetes work remains outside this section. Its workflow, README, devbox, Kubernetes, development-box documentation, scripts, runtime configuration, and `add-kubernetes-development-box` paths were not inspected for content, edited, validated, staged, or included in the section-11 commit.

## Exact next instruction

> `$openspec-apply-change specify-dicekeeper-functionality` — Execute only section 12, **Specify rule assistance** (items 12.1–12.2). Read the published main specs, shared decisions, evidence, coverage, runbook, this handoff, and the accepted D&D 5e (2024) boundary from `add-combat-automation-and-character-progression`; resolve the rule source corpus, license/access, citation format, and behavior for missing, uncertain, conflicting, or wrong-edition evidence before authoring tasks; create only the bounded future `rule-assistance` planning artifacts authorized by those decisions; strictly validate the new change, the coordination change, and main specs; update shared documentation and only the section-12 coordination checkboxes; then stop before section 13. Do not implement application features, apply section-9/10/11 implementation tasks, use generated AI prose as rule authority, or infer audio, voice-command, Discord, item/loot, condition/effect, or full-progression behavior.
