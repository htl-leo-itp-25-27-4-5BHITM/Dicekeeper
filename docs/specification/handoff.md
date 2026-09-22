# Specification Handoff

## Current state

- Coordination change: `specify-dicekeeper-functionality`
- Schema: `spec-driven`
- Last completed work package: section 7, **Specify views and synchronization** (items 7.1–7.3)
- Overall coordination progress after this handoff: 25/50 checklist items complete
- Next work package: section 8, **Review and publish the current baseline**
- Baseline change: [`openspec/changes/document-dicekeeper-baseline/`](../../openspec/changes/document-dicekeeper-baseline/)
- Baseline state: proposal and specs artifacts are complete; all 14 capability deltas exist; design is ready and tasks remain intentionally blocked on design until section 8
- Character correction change: [`openspec/changes/correct-character-library-boundaries/`](../../openspec/changes/correct-character-library-boundaries/) remains at its prior proposal-only state; section 7 did not edit, advance, validate, or implement it
- Main specs: still empty; baseline review/publication remains section 8
- Application code changed: no
- Blocking issue for starting section 8: none. The required baseline review and archive are section-8 work. Unselected quantitative view/synchronization targets block affected corrective implementation/release readiness, not review of the state-based baseline.

## Completed in section 7

- Traced the SPA routes and DM cockpit, DM live, player live, table, guide, theme, responsive CSS, map-canvas, SSE subscription/broadcaster, frontend event client, reconnect callbacks, and per-view event/reconciliation paths.
- Authored [`session-views`](../../openspec/changes/document-dicekeeper-baseline/specs/session-views/spec.md) with 10 requirements and 41 scenarios covering role/state entry, exact view projections/actions, a cross-view matrix, display authorization, device classes, keyboard/focus/status behavior, theme/language, and guide alignment.
- Authored [`live-synchronization`](../../openspec/changes/document-dicekeeper-baseline/specs/live-synchronization/spec.md) with 9 requirements and 35 scenarios covering authorized event projections, after-commit propagation, order/gaps, liveness, full snapshot reconciliation, reconnect without replay assumptions, revocation/deletion, state-specific restart, cross-instance consistency, and state-based acceptance.
- Confirmed the shared table as a read-only projection opened through and continuously bound to the authenticated campaign DM. It has no anonymous route, reusable share token, or independent application identity.
- Confirmed player live support for desktop/tablet/phone, DM cockpit/live support for desktop/tablet, and table support for shared desktop/large display and tablet landscape. Phone DM control/table support is not claimed.
- Recorded DEC-030–DEC-032 and reconciled decisions, evidence, coverage, glossary, permissions, overview, every task-7 diagram/candidate row, and historical reliability/performance dispositions.
- Recorded DEV-VIEW-001–005 and DEV-SYNC-001–005 for task-8 corrective planning. No corrective change was created or advanced.
- Marked only section 7 checklist items complete and stopped before section 8.

## Confirmed section-7 contract

- Campaign views derive access from the authenticated identity, current membership, campaign role, review readiness, and started state. Rendering a route or cached object grants no authority.
- The DM uses the cockpit before start and DM live controls after start. An approved current player uses player live after start. The table projection is DM-authenticated, read-only, and limited to campaign name, display names, HP/activity/turn, latest dice, and the fog-respecting active map/markers.
- Player live shows the player's own complete character/HP, authorized map and roster summaries, aggregate decisions plus own-vote state, latest dice, and the exact browser-local note. It excludes story, other character sheets, individual vote choices, notes, review data, DM controls, and raw fog-bypass media.
- Supported workflows must remain reachable across their accepted device classes; required controls are keyboard-operable and named, focus/status is observable, information is not color/motion-only, the accessible theme persists safely, and current view terminology is consistently German.
- Only committed mutations propagate. Events and snapshots are role-shaped, duplicates are idempotent, older events cannot regress state, and clients expose connecting/current/stale/reconciling/revoked/unavailable states rather than silently presenting unknown cached data as current.
- Reconnect, a detected gap, a malformed required event, or stale resume triggers complete authorized snapshot reconciliation. No replay buffer is assumed. A view returns to current only when every required read succeeds.
- Membership removal revokes an existing stream and clears protected state; campaign deletion terminates subscriptions. Restart recovery respects durable campaign/decision data, ephemeral live/map runtime, and browser-local note lifetimes instead of flattening them into one persistence model.
- Multi-instance deployments must route a campaign through one authoritative runtime or use shared state/event distribution. A client becomes stale/unavailable rather than diverging.
- No numeric latency, capacity, viewport, browser-version, availability, contrast, or external accessibility-conformance target was invented. DEC-032 keeps that product/test-environment decision explicit before affected corrective work can be called implementation-ready.

## Observed deviations and later-owned boundaries

- Current routes and reads do not consistently enforce every role/review/start precondition; an ordinary member can reach the table data path.
- Current views compose raw campaign, membership, player, character, and media responses. This can overexpose email, other character attributes, review fields, story/media paths, or other data outside the accepted matrix.
- The current table client receives raw map access and can write exploration/fog through the shared map canvas despite the accepted read-only contract.
- Responsive thresholds disagree between player JavaScript and CSS, resize/orientation changes are not fully observed, and keyboard/focus/status/reduced-motion/theme-failure/language behavior is incomplete.
- The public guide exists but its table audience and some workflow claims must be reconciled with the accepted baseline before publication.
- SSE membership is checked at initial subscribe only; one shared payload is broadcast to campaign sinks; existing removed-member sinks are not explicitly revoked.
- Event order is process-local, no replay/gap protocol exists, parse/transport failures are mostly console-only, and reconnect reconciliation can partially fail without leaving an observable stale state.
- Player/table handlers omit some roster/deletion consequences, and current connections, sequence, broadcaster, and live/map state have no cross-instance authority or distribution.
- Persistent play sessions/encounters remain task 9; combat automation/progression remains task 10. Section 7 did not create either behavior.
- Application alignment remains section 8 corrective planning. `correct-character-library-boundaries` remains untouched.

## Relevant paths for section 8

Planning and shared context:

- `openspec/changes/specify-dicekeeper-functionality/{proposal.md,design.md,tasks.md}`
- `openspec/changes/document-dicekeeper-baseline/{.openspec.yaml,proposal.md,specs/**/spec.md}`
- `docs/specification/{runbook.md,evidence.md,decisions.md,coverage.md,glossary.md,permissions.md,handoff.md,overview.md}`
- `openspec/changes/correct-character-library-boundaries/proposal.md` is reference-only and must remain open/unadvanced

Section 8 must run the baseline artifact instructions before writing `design.md` or `tasks.md`, review the end-to-end journeys and deletion effects, reconcile all 14 capability deltas and shared matrices, obtain the required review, strictly validate, archive/publish to main specs, and keep implementation corrections separate. It must not interpret documentation completion as delivered application behavior.

## Verification performed

| Check / command | Result |
| --- | --- |
| Relevant-source revision check | Pre-edit `HEAD` was `7e71fa33ef11d00cb11e920f87a02d8d6b22c3dc`; no relevant application or test file differed from the originally inspected `b7c8fe2d789258efdf2c30286ca630b6888fbd6a`. |
| `openspec validate document-dicekeeper-baseline --type change --strict --no-interactive` | Passed with all 14 baseline capability deltas. This validates schema; section 8 still owns semantic review and publication. |
| `openspec validate specify-dicekeeper-functionality --type change --strict --no-interactive` | Passed; the informational `skip_specs` message is expected because the coordination change declares no behavior deltas. |
| `openspec show document-dicekeeper-baseline --json --deltas-only` | Parsed 102 requirements and 447 scenarios total. Section 7 contributes 19 requirements and 76 scenarios: VIEW 10/41 and SYNC 9/35. |
| `openspec instructions apply --change specify-dicekeeper-functionality --json` | Ready at 25/50 complete; task 26 (section 8.1) is the next incomplete item. |
| `openspec status --change document-dicekeeper-baseline --json` | Proposal/specs done; design ready; tasks blocked only on design. This is the intentional pre-section-8 state. |
| `git diff --check` | Passed. |
| View semantic review | Entry roles/states, exact data/actions, cockpit/live/player/table boundaries, display identity, device classes, responsive continuity, keyboard/focus/status, theme/language, and guide alignment have requirements or explicit deviations. |
| Synchronization semantic review | Subscription projection, after-commit updates, ordering/duplicates/gaps, liveness states, malformed/partial recovery, reconnect, revocation/deletion, restart lifetimes, multi-instance consistency, and state-based acceptance have requirements or explicit deviations. |
| Application runtime/tests | Not run. Section 7 was documentation-only static/source review; no browser, accessibility, SSE failure, restart, multi-instance, load, or performance workflow was exercised. |
| Application/corrective implementation | None. No application source, test, runtime configuration, deployment, main spec, baseline design/tasks, or corrective-change artifact was changed. |

## Exact next instruction

> `$openspec-apply-change specify-dicekeeper-functionality` — Execute only section 8, **Review and publish the current baseline** (items 8.1–8.4). Read the shared documentation and all 14 baseline capability specs, follow the baseline change's CLI instructions to complete its design/tasks, perform the end-to-end and cross-capability review, obtain the required review, validate and archive/publish the baseline, update shared documentation and this handoff, and stop before section 9. Do not implement application features or advance `correct-character-library-boundaries`; keep corrective work open and separate.
