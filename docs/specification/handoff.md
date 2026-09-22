# Specification Handoff

## Current state

- Coordination change: `specify-dicekeeper-functionality`
- Schema: `spec-driven`
- Last completed work package: section 6, **Specify live play** (items 6.1–6.4)
- Overall coordination progress after this handoff: 22/50 checklist items complete
- Next work package: section 7, **Specify views and synchronization**
- Baseline change: [`openspec/changes/document-dicekeeper-baseline/`](../../openspec/changes/document-dicekeeper-baseline/)
- Baseline state: proposal and specs artifacts are syntactically complete; 12 of 14 capability deltas now exist; design is ready and tasks remain intentionally blocked until section 8
- Character correction change: [`openspec/changes/correct-character-library-boundaries/`](../../openspec/changes/correct-character-library-boundaries/) remains exactly at its prior proposal-only state; section 6 did not edit, advance, validate, or implement it
- Main specs: still empty; baseline review/publication remains section 8
- Application code changed: no
- Blocking issue for starting section 7: none; section 7 must consume the accepted live/map/media/permission boundaries without changing their product contracts or adding persistent session history

## Completed in section 6

- Traced the campaign game-state container, turn/HP/active/dice endpoints, campaign-start reset, campaign deletion, GM/player/table live-state consumers, both decision APIs, persisted decision records, voting paths, and desktop/mobile browser-local player notes.
- Authored [`live-play`](../../openspec/changes/document-dicekeeper-baseline/specs/live-play/spec.md) with 8 requirements and 37 scenarios.
- Authored [`group-decisions`](../../openspec/changes/document-dicekeeper-baseline/specs/group-decisions/spec.md) with 8 requirements and 39 scenarios.
- Authored [`player-notes`](../../openspec/changes/document-dicekeeper-baseline/specs/player-notes/spec.md) with 5 requirements and 22 scenarios.
- Reconciled decisions, evidence, coverage, glossary, permissions, overview, and every task-6 coverage row, including CUR-UCRollDice, CUR-UCVote, CUR-UCNotes, CUR-UCTurn, CUR-UCHP, CUR-UCDecisions, CUR-UCDMDice, FUT-UCPlayerDecision, and ADD-013–015.
- Recorded DEV-LIVE-001–003, DEV-DICE-001, DEV-GRP-001–003, and DEV-NOTE-001 for task-8 corrective planning. No corrective change was created or advanced in this section.
- Confirmed browser-local notes as the current product boundary. Because server or cross-device note persistence was not accepted, section 6 created no separate player-note persistence change.
- Marked only section 6 checklist items complete and stopped before section 7.

## Confirmed section-6 contract

- Live play exists only for a started campaign. Current members may read their authorized state; only the DM initializes eligible approved players, selects turns, changes HP/activity, and confirms live reset.
- Level-one HP is derived from the approved character as at least one and otherwise 10 plus the Constitution modifier. Repeated initialization preserves damage/max/activity; HP deltas are integers clamped from zero through the initialized maximum.
- Inactive players retain HP but cannot hold the turn. Turn selection is manual and does not claim initiative calculation, tie-breaking, conditions, death rules, or other future combat automation.
- Dice are authenticated member self-reports for d4/d6/d8/d10/d12/d20/d100. Browser-generated and manual in-range values are both allowed, attribution comes from authentication, only the latest roll is live state, and there is no server-randomness/fairness or durable-log promise.
- Turn/HP/max/activity/latest dice are ephemeral campaign runtime fields. They survive view refresh/reconnect while the authoritative runtime remains but are not durable across process replacement. Confirmed reset clears only those fields and preserves the one-way started flag, map-owned state, persisted decisions, and browser-local notes.
- Group decisions use one persisted lifecycle. The DM creates a validated question for a snapshot of current `PLAYER` members; the DM and late joiners do not vote; inactive players remain eligible; removed pending voters and their votes leave the electorate.
- Each eligible player casts one immutable yes/no vote. Full participation is the only automatic quorum; strict majority produces yes/no, equal votes produce a tie, and manual DM closure is confirmed cancellation only. Aggregate results and own-vote state persist across refresh/device/restart; individual choices remain private.
- Player notes are plain text under an exact player/campaign browser-local namespace. They survive refresh, sign-out/sign-in, and browser restart only in the same profile. They are not sent to the server, DM, other members, synchronization, AI, or another device; failed local saves must not be presented as successful.

## Observed deviations and later-owned boundaries

- Current game endpoints do not consistently require a started campaign or an approved `PLAYER` target, accept caller-supplied HP initialization, allow an implicit maximum for missing HP state, and retain removed-member state. General reset lacks confirmation and also clears fog.
- Current dice publication accepts arbitrary type/result and represents DM attribution with a special null player identifier. Client-side range checks are not authoritative.
- Persisted decisions store only a numeric total plus comma-separated voter IDs. Current voting permits the DM, records invalid vote values as voters, is not concurrency-safe, ignores membership changes, favors yes on ties, and does not return durable own-vote state to a refreshed client.
- The unused DM-only decision CRUD API mutates the same rows with different visibility and arbitrary status/result/delete behavior. It has no accepted separate planning meaning and must be consolidated or retired through later corrective work.
- Current note reads/writes do not handle localStorage failures while the UI always claims automatic saving.
- Section 7 owns the DM/player/table view matrix, display-client identity, event audience, propagation, heartbeat, reconnect, stale-client behavior, membership revocation, process-restart recovery presentation, device/readability/accessibility support, and measurable performance/recovery criteria.
- Persistent play sessions/encounters remain task 9. Combat automation and progression remain task 10. Section 6 did not create either behavior.
- Implementation alignment remains section 8. `correct-character-library-boundaries` stays untouched.

## Relevant paths for section 7

Planning and shared context:

- `openspec/changes/specify-dicekeeper-functionality/{proposal.md,design.md,tasks.md}`
- `openspec/changes/document-dicekeeper-baseline/{.openspec.yaml,proposal.md,specs/**/spec.md}`
- `docs/specification/{runbook.md,evidence.md,decisions.md,coverage.md,glossary.md,permissions.md,handoff.md,overview.md}`

View and synchronization evidence to inspect:

- `src/main/java/campaign/GameSseResource.java`
- `src/main/java/campaign/SseBroadcaster.java`
- `src/main/java/campaign/GameActionResource.java`
- `src/main/java/campaign/CampaignResource.java`
- `src/main/java/campaign/CampaignPlayerResource.java`
- `src/main/resources/META-INF/resources/app/main.js`
- `src/main/resources/META-INF/resources/app/services/campaignEvents.js`
- `src/main/resources/META-INF/resources/app/services/theme.js`
- `src/main/resources/META-INF/resources/app/views/CockpitView.js`
- `src/main/resources/META-INF/resources/app/views/GMView.js`
- `src/main/resources/META-INF/resources/app/views/PlayerView.js`
- `src/main/resources/META-INF/resources/app/views/TableView.js`
- `src/main/resources/META-INF/resources/app/views/GuideView.js`
- `src/main/resources/META-INF/resources/app/guide/guideContent.js`

Section 7 owns only `session-views` and `live-synchronization`. It must preserve DEC-012/019/023–029; CAM-006's one-way start; MEM-004–007 admission/revocation; REV-007 review privacy; MAP-005's fog-respecting read-only presentation; MED-004/005 authorized delivery; LIVE-001/006/007 authority/trust/lifetime; GRP-007/008 visibility/persistence; and NOTE-001/002/004 local privacy. It must not silently convert ephemeral live state into durable session history or expose browser-local notes.

## Verification performed

| Check / command | Result |
| --- | --- |
| Relevant-source revision check | Current pre-edit `HEAD` was `14d423f2bc027c7e6f632a550df644ab727b90f4`; no relevant application or test file differed from the originally inspected `b7c8fe2d789258efdf2c30286ca630b6888fbd6a`. |
| `./mvnw -Dtest=GameStateTest test` | Passed: 1 test, 0 failures/errors/skips. This supports only that repeated HP initialization does not overwrite current/max values; it does not establish endpoint authorization, validation, persistence, reset, voting, note, or synchronization behavior. |
| `openspec validate document-dicekeeper-baseline --type change --strict --no-interactive` | Passed with all twelve authored baseline capability deltas. This validates schema, not semantic completeness of the two capabilities still owned by section 7. |
| `openspec validate specify-dicekeeper-functionality --type change --strict --no-interactive` | Passed; the informational `skip_specs` message is expected because this coordination change declares no behavior deltas. |
| `openspec show document-dicekeeper-baseline --json --deltas-only` | Parsed 83 requirements and 371 scenarios total. Section 6 contributes 21 requirements and 98 scenarios: LIVE 8/37, GRP 8/39, NOTE 5/22. |
| Live-state semantic review | Started/member/DM authority, eligible initialization, repeated initialization, HP bounds, active/turn transitions, invalid targets, dice trust/range/attribution, refresh/runtime lifetime, reset scope/confirmation, deletion, and future-combat boundary have requirements or explicit deviations. |
| Decision semantic review | One lifecycle, creation validation, electorate, player-only voting, duplicate/concurrency denial, ties, full quorum, late membership changes, cancellation-only closure, vote privacy, persistence, live-reset survival, and campaign deletion have requirements or explicit deviations. |
| Note semantic review | Exact player/campaign namespace, same-profile refresh/sign-out/restart, other-device absence, autosave/latest text, clear/read/write failure, plain-text execution safety, no campaign transmission, and deletion limits have requirements or explicit boundaries. |
| Application runtime | Not run. Apart from the isolated unit test above, section-6 implementation evidence is static/source-observed; UI, database workflow, SSE, restart, browser, multi-instance, and end-to-end behavior were not exercised. |
| Application implementation | None. No application source, runtime configuration, deployment, baseline design/tasks, main spec, or corrective-change artifact was changed. |

## Exact next instruction

> `$openspec-apply-change specify-dicekeeper-functionality` — Execute only section 7, **Specify views and synchronization** (items 7.1–7.3). Read the shared documentation and all twelve existing baseline capability specs, run the OpenSpec status/instructions workflow, trace only DM/player/table views, display-client access, SSE propagation/recovery, device/readability/accessibility, and measurable performance/recovery sources; author only `session-views` and `live-synchronization`, update shared documentation and this handoff, validate, mark only section 7 complete, and stop before section 8. Do not implement application features or advance `correct-character-library-boundaries`.
