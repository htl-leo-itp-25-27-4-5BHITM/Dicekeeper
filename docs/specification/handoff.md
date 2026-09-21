# Specification Handoff

## Current state

- Coordination change: `specify-dicekeeper-functionality`
- Schema: `spec-driven`
- Last completed work package: section 5, **Specify maps and media** (items 5.1–5.3)
- Overall coordination progress after this handoff: 18/50 checklist items complete
- Next work package: section 6, **Specify live play**
- Baseline change: [`openspec/changes/document-dicekeeper-baseline/`](../../openspec/changes/document-dicekeeper-baseline/)
- Baseline state: proposal and specs artifacts are syntactically complete; 9 of 14 capability deltas now exist; design is ready and tasks remain intentionally blocked until section 8
- Character correction change: [`openspec/changes/correct-character-library-boundaries/`](../../openspec/changes/correct-character-library-boundaries/) remains exactly at its prior proposal-only state; section 5 did not edit, advance, or implement it
- Main specs: still empty; baseline review/publication remains section 8
- Application code changed: no
- Blocking issue for starting section 6: none; section 6 must define live-state lifetimes without merging map state, view synchronization, or persistent session history into its three capabilities

## Completed in section 5

- Traced map collection persistence and APIs, map create/detail/cockpit/GM/player/table flows, crop behavior, marker/group/fog/undo state, upload serving, Imagor signing and frontend fallback, avatar replacement, and campaign/account media cleanup.
- Reopened the public Sprint 10, Sprint 11, Sprint 12, and Imagor historical pages read-only and classified every relevant report as verified, contradicted, unresolved, or superseded in [`evidence.md`](evidence.md).
- Authored [`media-assets`](../../openspec/changes/document-dicekeeper-baseline/specs/media-assets/spec.md) with 7 requirements and 31 scenarios.
- Authored [`campaign-maps`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-maps/spec.md) with 8 requirements and 36 scenarios.
- Reconciled media/map decisions, evidence, glossary, permissions, overview, and every task-5 coverage row, including CUR-UCViewMap, CUR-UCEditCampaign, CUR-UCUploadMap, CUR-UCMarkers, CUR-UCFog, and ADD-010–012.
- Recorded DEV-MED-001–004 and DEV-MAP-001–004 for task-8 corrective planning. No corrective change was created or advanced in this section.
- Marked only section 5 checklist items complete and stopped before section 6.

## Confirmed section-5 contract

- Every avatar or campaign map is owned by one profile or campaign. Only that player may replace their avatar, and only the campaign DM may mutate campaign maps.
- The server accepts only nonempty, decodable JPEG/PNG content whose declaration and extension agree, with positive dimensions and a finite configured byte limit. It rejects SVG, malformed, disguised, oversized, and path-like uploads independently of browser checks.
- Map cropping permits square, wide, and custom positive rectangles. Cancellation changes nothing; upload, replacement, and cleanup either complete atomically or preserve/record a recoverable incomplete obligation.
- Originals, derived variants, signing, and fallback use the owning resource's authorization. Ordinary callers receive no global upload inventory; a non-DM map viewer receives only a fog-respecting presentation and no reusable raw path.
- Campaign maps are optional and limited to five. Only the DM adds, selects, deletes, labels, moves, groups, or splits markers and controls fog; members and display clients are read-only.
- Exactly one stored map is active. Markers, groups, fog, and the latest 20 undo states belong to each map, survive switching for that live-state lifetime, and are discarded only with their map.
- Fog reset is explicit, confirmed, and undoable. Viewport reset is local. Current maps provide static exploration and presentation, not grid, distance, terrain, line-of-sight, initiative, or combat-rule enforcement.

## Observed deviations and later-owned boundaries

- Current upload validation is extension-based and accepts SVG; original/list and Imagor-signing paths are not resource-authorized. Avatar replacement and cleanup are not atomic or durably retried.
- Current marker/fog/undo state is campaign-global rather than per-map. Marker/group validation is incomplete, members can write fog, raw paths bypass fog, and fog-only changes are not fully undoable.
- Map/media performance, intermittent loading, random refresh, live join/start updates, and email delivery remain unresolved historical reports; section 5 did not claim runtime verification or assign non-map behavior to these capabilities.
- The historical fixed non-square-map proposal and single-map automatic replacement behavior are superseded by the accepted custom-crop and optional five-map collection contracts. The historical “Imagor-only crop” and complete-fog-undo claims are contradicted by current source.
- Live turns, HP, active-player state, dice trust, group decisions, and note persistence belong to section 6. Propagation/reconnect and the final display-client identity belong to section 7; persistent sessions/encounters belong to task 9.
- Implementation alignment remains section 8. `correct-character-library-boundaries` stays untouched.

## Relevant paths for section 6

Planning and shared context:

- `openspec/changes/specify-dicekeeper-functionality/{proposal.md,design.md,tasks.md}`
- `openspec/changes/document-dicekeeper-baseline/{.openspec.yaml,proposal.md,specs/**/spec.md}`
- `docs/specification/{runbook.md,evidence.md,decisions.md,coverage.md,glossary.md,permissions.md,handoff.md,overview.md}`

Live-play, decision, and notes evidence to inspect:

- `src/main/java/campaign/GameState.java`
- `src/main/java/campaign/GameActionResource.java`
- `src/main/java/campaign/GroupDecision.java`
- `src/main/java/campaign/GroupDecisionDTO.java`
- `src/main/java/campaign/GroupDecisionResource.java`
- `src/main/java/campaign/CampaignDeletionService.java`
- `src/main/resources/META-INF/resources/app/services/diceIcons.js`
- `src/main/resources/META-INF/resources/app/views/CockpitView.js`
- `src/main/resources/META-INF/resources/app/views/GMView.js`
- `src/main/resources/META-INF/resources/app/views/PlayerView.js`
- `src/main/resources/META-INF/resources/app/views/TableView.js`

Section 6 owns only `live-play`, `group-decisions`, and `player-notes`. It must preserve CAM-006's one-way start boundary, MAP-002/MAP-006's per-map state and undo boundary, the membership/review authorities, and the section-7 ownership of delivery/reconnect behavior.

## Verification performed

| Check / command | Result |
| --- | --- |
| Relevant-source revision check | Current `HEAD` was `d92fbc6cde928d599552c41f6b34ed07b6683989`; no relevant application file differed from the originally inspected `b7c8fe2d789258efdf2c30286ca630b6888fbd6a`. |
| `openspec validate document-dicekeeper-baseline --type change --strict --no-interactive` | Passed with all nine authored baseline capability deltas. This validates schema, not semantic completeness of the five capabilities still owned by sections 6–7. |
| `openspec validate specify-dicekeeper-functionality --type change --strict --no-interactive` | Passed; the informational `skip_specs` message is expected because this coordination change declares no behavior deltas. |
| `openspec show document-dicekeeper-baseline --json --deltas-only` | Parsed 62 requirements and 273 scenarios total. Section 5 contributes 15 requirements and 67 scenarios: MED 7/31 and MAP 8/36. |
| `openspec instructions apply --change specify-dicekeeper-functionality --json` | Ready; 18/50 complete, 32 remaining; next incomplete item is 6.1. |
| Map/media semantic review | Upload validation, authority, original/derived delivery, crop/cancel/failure, replacement/cleanup, five-map selection/deletion, marker/group validation, fog visibility, per-map state, undo/reset, and exploration-only scope have requirements or explicit deviations. |
| Historical report review | Every relevant Sprint 10–12 and Imagor report is labeled verified, contradicted, unresolved, or superseded in `evidence.md`. |
| Application runtime | Not run. Section-5 implementation evidence is static/source-observed; performance, availability, browser, deployment, and end-to-end behavior were not exercised. |
| Application implementation | None. No application source, test, runtime configuration, deployment, baseline design/tasks, main spec, or corrective-change artifact was changed. |

## Exact next instruction

> `$openspec-apply-change specify-dicekeeper-functionality` — Execute only section 6, **Specify live play** (items 6.1–6.4). Read the shared documentation and all nine existing baseline capability specs, run the OpenSpec status/instructions workflow, trace only live state, decision, dice, and note sources, author only `live-play`, `group-decisions`, and `player-notes`, update shared documentation and this handoff, validate, mark only section 6 complete, and stop before section 7. Do not implement application features or advance `correct-character-library-boundaries`.
