# Functional Specification Handoff

## Final state

- Coordination change: [`specify-dicekeeper-functionality`](../../openspec/changes/specify-dicekeeper-functionality/)
- Documentation runbook: all sections 1–15 complete; coordination progress 50/50
- Published current functional baseline: 14 capabilities, 102 requirements, and 447 scenarios under [`openspec/specs/`](../../openspec/specs/)
- Separate main specification: `development-workspace`, bringing the complete main-spec inventory to 15 specs, 108 requirements, and 464 scenarios
- Accepted future planning: six active changes, nine delta specs, 82 requirements, 395 scenarios, and implementation checklists still at 0/15, 0/20, 0/27, 0/23, 0/32, and 0/32
- Corrective record: 49 indexed implementation deviations; [`correct-character-library-boundaries`](../../openspec/changes/correct-character-library-boundaries/) remains proposal-only and the other deviations remain separately scoped planning work
- No application feature, corrective task, future implementation task, migration, deployment, runtime/provider configuration, archive, or main-spec synchronization was performed by the final audit

## Section 15 completed work

- Rebuilt the specification context from the README, both canonical PlantUML diagrams, all eight shared specification documents, the complete coordination checklist, all 15 main specs, the archived baseline, the proposal-only corrective change, and every proposal/design/spec/task artifact in the six active future changes.
- Audited 33/33 current aliases, 22/22 future aliases, 25/25 additional candidates, 27 source IDs, 67 decision IDs, and 49 implementation-deviation IDs. Every item retains one scope/disposition and an owning capability or later decision owner.
- Audited all main and future normative artifacts. Requirement identifiers are unique within each audited set; every requirement has at least one testable scenario; every scenario contains explicit `WHEN` and `THEN` steps. The archived 14-capability deltas match the published functional main specs after normalizing only OpenSpec's delta/main headings.
- Reconciled terms, actors, authority, state ownership, transitions, visibility, audience projections, persistence, deletion, revocation, failure behavior, readiness gates, and explicit deferrals. No unresolved cross-artifact contradiction was found.
- Corrected five stale README links that referenced the repository's former absolute location. The repeated local-link/capability-path and placeholder-purpose audits pass.
- Completed the [specification overview and ordered implementation roadmap](overview.md#ordered-implementation-roadmap), [final evidence record](evidence.md#section-15-complete-specification-audit), [coverage audit notes](coverage.md#audit-notes), and [runbook exit record](runbook.md#final-audit-output).
- Marked only coordination items 15.1–15.5 complete after the documentation and validation review passed. Every future implementation checklist remains untouched.

## Ordered implementation choices

1. **Recommended ready product change:** apply [`add-campaign-content-and-session-records`](../../openspec/changes/add-campaign-content-and-session-records/). It has no unresolved behavior/configuration gate and supplies the campaign content, session, encounter, history, and recap-projection foundation needed by later work. Start with `$openspec-apply-change add-campaign-content-and-session-records`.
2. **Independent bounded alternative:** apply [`add-rule-assistance`](../../openspec/changes/add-rule-assistance/) for the licensed SRD 5.2.1 corpus, attribution, deterministic retrieval, citations, and `SOURCE_EXTRACTS_ONLY` path. External explanation generation is not enablement-ready until its provider/model, finite limits, accounting, and retention gate is resolved.
3. **After content/session records:** apply [`add-combat-automation-and-character-progression`](../../openspec/changes/add-combat-automation-and-character-progression/). Conditions/effects, items/loot, full-sheet progression, tactical rules, reusable monster libraries, and automatic AI application remain deferred.
4. **After content/session records, independently of audio:** [`add-discord-integration`](../../openspec/changes/add-discord-integration/) may begin once its section-9 source behavior exists, but production enablement also requires the recorded Discord application/configuration gate. Discord audio is excluded, so section 13 is not a dependency.
5. **After content/session records, and after combat for encounter/boss context:** apply [`add-ai-campaign-assistance-and-session-recaps`](../../openspec/changes/add-ai-campaign-assistance-and-session-recaps/). Production provider/model and finite usage/retention settings remain gated; generated text stays reviewed and non-applying.
6. **After session records; after recaps for transcript-derived recap integration:** apply [`add-audio-transcription`](../../openspec/changes/add-audio-transcription/). Production speech/privacy configuration remains gated and executable voice commands remain deferred.

Current-baseline correction is a separate parallel lane, not a ready monolithic apply target. Complete design/tasks for proposal-only `correct-character-library-boundaries`, split the remaining deviations into coherent corrective changes, and resolve the quantitative view/synchronization gate before classifying affected view/synchronization correction work as implementation-ready.

## Open gates and explicit blockers

- **View/synchronization corrections:** exact browser/version matrix, viewport thresholds, accessibility conformance/contrast target, propagation/reconnect/load latency, throughput/capacity, availability, and verification environment remain unresolved.
- **AI/recaps:** exact provider/model, finite context/output/time/usage/cost limits, accounting and fallback policy, price threshold, and draft retention are required before production enablement.
- **Rule provider path:** exact explanation provider/model, finite request/context/output/time/usage/cost limits, accounting, and provider retention are required; the local cited extract path is not blocked.
- **Audio transcription:** exact provider/service/version, processing region, finite segment/duration/timeout/concurrency/usage/cost limits, accounting, retention/deletion behavior, prohibited training/secondary use, and test environment are required.
- **Discord:** exact application/bot identity/version, protected credentials and rotation, callback origins, bounded permission identifiers, rate-limit/reconciliation policy, and test environment are required.
- **Explicit deferrals:** items/loot/equipment/rewards; conditions/effects; tactical combat maps and movement/range rules; full-sheet progression; reusable monster library; autonomous DM or automatic AI application; saved rule rulings; executable voice commands; Discord inbound mutation/automatic mirrors/audio/full shared views; and every other disposition recorded in [`decisions.md`](decisions.md#explicit-source-dispositions).

These gates were not silently resolved. A planning change may be schema-valid while an upstream dependency or production-enablement gate still prevents the affected whole feature from being classified as ready for release.

## Verification performed

| Check | Final result |
| --- | --- |
| Strict validation of all 15 main specs | Passed; informational long-requirement notices only. |
| Strict validation of `specify-dicekeeper-functionality` and `correct-character-library-boundaries` | Passed; expected `skip_specs` informational results, not unexplained failures. |
| Strict validation of all six active `add-*` future changes | Passed. |
| Normative structure audit | Passed: main 108 requirements/464 scenarios, including functional baseline 102/447; future 82/395; every requirement has scenarios with `WHEN`/`THEN`. |
| Coverage audit | Passed: 33/33 current aliases, 22/22 future aliases, 25/25 additional candidates, 27 sources, 67 decisions, and 49 deviations. |
| Archived baseline parity | Passed: 14/14 functional deltas match published main specs after heading normalization. |
| Internal links, capability paths, and purposes/placeholders | Passed after five stale README targets were made repository-relative; no placeholder purpose remains. |
| Future implementation checklists | Unchanged at 0/15, 0/20, 0/27, 0/23, 0/32, and 0/32. |
| Coordination checklist | 50/50 complete; only items 15.1–15.5 changed in section 15. |
| Whitespace, diff-scope, and working-tree review | Passed for the final-audit commit; no application or future implementation path is included. |

The audit was static documentation review. It makes no runtime-conformance claim and does not erase the 49 indexed implementation deviations.

## Final-audit paths

- `README.md` (five stale local links corrected)
- `docs/specification/overview.md`
- `docs/specification/evidence.md`
- `docs/specification/coverage.md`
- `docs/specification/runbook.md`
- `docs/specification/handoff.md`
- `openspec/changes/specify-dicekeeper-functionality/tasks.md` (items 15.1–15.5 only)

## Exact next instruction

> `$openspec-apply-change add-campaign-content-and-session-records` — implement the accepted section-9 foundation in task order, preserve its explicit item/loot deferral and current-baseline boundaries, run the change's required tests and strict validation, and do not archive or synchronize it until implementation and review are complete.
