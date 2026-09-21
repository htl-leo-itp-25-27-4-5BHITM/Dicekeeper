# Specification Handoff

## Current state

- Coordination change: `specify-dicekeeper-functionality`
- Schema: `spec-driven`
- Last completed work package: section 4, **Specify campaigns and participation** (items 4.1–4.4)
- Overall coordination progress after this handoff: 15/50 checklist items complete
- Next work package: section 5, **Specify maps and media**
- Baseline change: [`openspec/changes/document-dicekeeper-baseline/`](../../openspec/changes/document-dicekeeper-baseline/)
- Baseline state: proposal and specs artifacts are syntactically complete; 7 of 14 capability deltas now exist; design is ready and tasks remain blocked on design as intentionally planned until section 8
- Character correction change: [`openspec/changes/correct-character-library-boundaries/`](../../openspec/changes/correct-character-library-boundaries/) remains exactly at its prior proposal-only state; section 4 did not edit, advance, or implement it
- Main specs: still empty; baseline review/publication remains section 8
- Application code changed: no
- Blocking issue for starting section 5: none; section 5 must preserve CAM-003/004's metadata/story boundary and settle media paths, processing, access, replacement, and cleanup before task 8 plans corrections

## Completed in section 4

- Traced campaign persistence/DTOs, CRUD/list/detail/story paths, capacity validation, create/edit/detail/cockpit views, membership/role/join/leave/removal paths, character selection/review transitions, notification persistence/APIs/header navigation, account/campaign cleanup, and the generated workflow guide.
- Authored [`campaign-management`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-management/spec.md) with 7 requirements and 37 scenarios.
- Authored [`campaign-membership`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-membership/spec.md) with 7 requirements and 31 scenarios.
- Authored [`character-review`](../../openspec/changes/document-dicekeeper-baseline/specs/character-review/spec.md) with 7 requirements and 33 scenarios, including the closed `NONE`/`PENDING`/`APPROVED`/`REJECTED` transition table.
- Authored [`notifications`](../../openspec/changes/document-dicekeeper-baseline/specs/notifications/spec.md) with 6 requirements and 27 scenarios.
- Reconciled campaign/participation decisions, evidence, glossary, permissions, overview, and every task-4 coverage row. All current campaign/participation diagram aliases and ADD-006–009 now have requirement links or explicit disposition.
- Recorded DEV-CAM-001–004, DEV-MEM-001–003, DEV-REV-001–003, and DEV-NOT-001 for task-8 corrective planning. No corrective change was created or advanced in this section.
- Marked only section 4 checklist items complete and stopped before section 5.

## Confirmed section-4 contract

- An authenticated creator becomes the campaign's sole owner/DM. Creation is atomic with the DM membership, new campaigns are not started, and the create draft is isolated by player/browser session.
- Authenticated players may discover sanitized public campaign metadata. Private campaigns are member-only. Story is manually authored, DM-only data and never belongs in public/member list paths or notifications.
- Capacity counts `PLAYER` memberships and excludes the DM. Public join is available only before start and must enforce the final place atomically. Private self-service admission and invitation codes are not in the current baseline; historical invitations are explicitly deferred.
- Players may leave and the DM may remove `PLAYER` members before or after start, with confirmation, reference cleanup, and immediate access revocation. The owner-DM cannot leave or be removed.
- Start is a one-way DM transition requiring at least one player and an existing complete approved character for every player. Maps and story are optional. Started campaigns accept no new members and do not imply persistent session/encounter history.
- Review permits only `NONE -> PENDING -> APPROVED`, or `NONE -> PENDING -> REJECTED -> PENDING`. The affected player submits/resubmits; the same-campaign DM approves/rejects. Rejected players may correct or replace their owned character; approved references are terminal until membership removal.
- One owned complete character may be reviewed independently in multiple campaigns. Any pending/approved reference locks editing, any review reference blocks deletion, and removal recalculates locks without deleting the character.
- Submission/resubmission notifies the DM; approval/rejection notifies the affected player. Notifications are recipient-owned, use authorization-checked destinations, and are cleaned up with their recipient or campaign/membership references.

## Deferred or later-owned boundaries

- Historical private invitation/access-code behavior is explicitly deferred; it is neither current implementation nor implementation-ready scope.
- Story presets are not a current capability. AI story generation remains task 11.
- Persistent sessions/encounters remain task 9; current campaign start is only a one-way campaign flag.
- Map visibility, original/derived media access, map limits, file validation, Imagor behavior, replacement/deletion cleanup, and display delivery remain section 5.
- Live-state reset/start propagation remains sections 6–7.
- Implementation alignment for all recorded deviations remains section 8; `correct-character-library-boundaries` stays untouched.

## Relevant paths for section 5

Planning and shared context:

- `openspec/changes/specify-dicekeeper-functionality/{proposal.md,design.md,tasks.md}`
- `openspec/changes/document-dicekeeper-baseline/{.openspec.yaml,proposal.md,specs/**/spec.md}`
- `docs/specification/{runbook.md,evidence.md,decisions.md,coverage.md,glossary.md,permissions.md,handoff.md,overview.md}`

Map and media evidence to inspect:

- `src/main/java/campaign/Campaign.java`
- `src/main/java/campaign/CampaignDTO.java`
- `src/main/java/campaign/CampaignResource.java`
- `src/main/java/campaign/CampaignDeletionService.java`
- `src/main/java/campaign/GameActionResource.java`
- `src/main/java/campaign/GameState.java`
- `src/main/java/tool/UploadServeResource.java`
- `src/main/java/tool/ImagorSignedImageResource.java`
- `src/main/java/tool/UploadPermissionUtil.java`
- `src/main/java/player/PlayerResource.java`
- `src/main/resources/META-INF/resources/app/components/mapCanvas.js`
- `src/main/resources/META-INF/resources/app/components/mapCropModal.js`
- `src/main/resources/META-INF/resources/app/services/utils.js`
- `src/main/resources/META-INF/resources/app/views/CampaignCreateView.js`
- `src/main/resources/META-INF/resources/app/views/CampaignDetailView.js`
- `src/main/resources/META-INF/resources/app/views/CockpitView.js`
- `src/main/resources/META-INF/resources/app/views/GMView.js`
- `src/main/resources/META-INF/resources/app/views/PlayerView.js`
- `src/main/resources/META-INF/resources/app/views/TableView.js`

Section 5 owns only `media-assets` and `campaign-maps`. It must preserve the sanitized campaign boundary in CAM-003, the DM-only story rule in CAM-004, campaign deletion linkage in CAM-007, and the member/nonmember access rules in MEM-001/004–007.

## Verification performed

| Check / command | Result |
| --- | --- |
| `./mvnw -Dtest=CampaignValidationTest test` | Passed: 3 tests, 0 failures/errors/skips. This supports only positive/null versus non-positive capacity validation, not campaign workflows. |
| `openspec validate document-dicekeeper-baseline --type change --strict --no-interactive` | Passed with all seven authored baseline capability deltas. This validates their schema, not semantic completeness of the remaining seven proposal capabilities. |
| `openspec show document-dicekeeper-baseline --json --deltas-only` | Parsed 47 requirements and 206 scenarios total. Section 4 contributes 27 requirements and 128 scenarios: CAM 7/37, MEM 7/31, REV 7/33, NOT 6/27. |
| `openspec instructions apply --change specify-dicekeeper-functionality --json` | Ready; 15/50 complete, 35 remaining; next incomplete item is 5.1. |
| Campaign/participation semantic review | Create/edit/delete, public/private list/detail/story, capacity, join/leave/kick/start, all allowed and forbidden review transitions, reuse/locks, recipient/read/delete/navigation, invitations, and dependent cleanup have requirements or explicit deferral. |
| Application runtime | Not run. Apart from the targeted unit test above, implementation evidence remains static/source-observed. |
| Application implementation | None. No source, runtime configuration, deployment, baseline design/tasks, main spec, or corrective-change artifact was changed. |

## Exact next instruction

> `$openspec-apply-change specify-dicekeeper-functionality` — Execute only section 5, **Specify maps and media** (items 5.1–5.3). Read the shared documentation and all seven existing baseline capability specs, run the OpenSpec status/instructions workflow, trace only map/media sources, author only `media-assets` and `campaign-maps`, update shared documentation and this handoff, validate, mark only section 5 complete, and stop before section 6. Do not implement application features or advance `correct-character-library-boundaries`.
