# Specification Handoff

## Current state

- Coordination change: `specify-dicekeeper-functionality`
- Schema: `spec-driven`
- Last completed work package: section 3, **Specify characters** (items 3.1–3.3)
- Overall coordination progress after this handoff: 11/50 checklist items complete
- Next work package: section 4, **Specify campaigns and participation**
- Baseline change: [`openspec/changes/document-dicekeeper-baseline/`](../../openspec/changes/document-dicekeeper-baseline/)
- Baseline state: proposal and specs artifacts are syntactically complete; `account-access`, `player-profiles`, and `character-library` contain the first 3 of 14 capability deltas; design is ready and tasks remain blocked on design, as expected until task 8
- Character correction change: [`openspec/changes/correct-character-library-boundaries/`](../../openspec/changes/correct-character-library-boundaries/) has a completed proposal and `skip_specs: true`; design/tasks remain intentionally uncreated and no correction is implemented
- Main specs: still empty; baseline publication and archive remain task 8
- Application code changed: no
- Blocking issue for starting section 4: none; section 4 must reconcile its character-review transitions with DEC-015–017 and `CHAR-005`–`CHAR-007`

## Completed in section 3

- Traced character persistence and DTOs, all authenticated CRUD/read paths, ability-score mutation, class/background/ability catalogs, the creation and selection views, browser-session drafts, campaign submission/review references, direct character deletion, and account-deletion cleanup.
- Confirmed DEC-015 through DEC-017: one player owner per character, owner-only direct management, campaign-DM contextual read-only access, isolated browser-session drafts, validated level-one completion, review-state edit locks, reference-safe deletion, and separation of future progression.
- Authored [`character-library`](../../openspec/changes/document-dicekeeper-baseline/specs/character-library/spec.md) with 8 requirements and 39 scenarios covering owner/unrelated-user/guest/DM access, catalogs and invalid references, ability allocation, completion failure, draft recovery/isolation, editing, campaign selection, deletion references, account cleanup, and the level boundary.
- Reconciled `coverage.md`, `permissions.md`, `decisions.md`, `evidence.md`, `glossary.md`, and `overview.md` with exact requirement references and decision/deviation owners.
- Recorded seven source-versus-contract deviations as DEV-CHAR-001 through DEV-CHAR-007 and resolved DEV-ACC-005's ownership dependency without changing the accepted task-2 account boundary.
- Scaffolded [`correct-character-library-boundaries`](../../openspec/changes/correct-character-library-boundaries/) through the CLI and wrote its proposal as an implementation-alignment change. It has no duplicate spec delta because the normative behavior belongs to the baseline.
- Marked only section 3 checklist items complete and stopped before section 4. No application feature, baseline design/tasks artifact, or campaign/participation capability was authored.

## Files created or updated in section 3

- [`openspec/changes/document-dicekeeper-baseline/specs/character-library/spec.md`](../../openspec/changes/document-dicekeeper-baseline/specs/character-library/spec.md)
- [`openspec/changes/correct-character-library-boundaries/.openspec.yaml`](../../openspec/changes/correct-character-library-boundaries/.openspec.yaml)
- [`openspec/changes/correct-character-library-boundaries/proposal.md`](../../openspec/changes/correct-character-library-boundaries/proposal.md)
- [`docs/specification/decisions.md`](decisions.md)
- [`docs/specification/evidence.md`](evidence.md)
- [`docs/specification/glossary.md`](glossary.md)
- [`docs/specification/permissions.md`](permissions.md)
- [`docs/specification/coverage.md`](coverage.md)
- [`docs/specification/overview.md`](overview.md)
- `docs/specification/handoff.md`
- [`openspec/changes/specify-dicekeeper-functionality/tasks.md`](../../openspec/changes/specify-dicekeeper-functionality/tasks.md) — section 3 checkboxes only

Foundation and task-2 artifacts remain part of the shared documentation set. No application source, test, runtime configuration, deployment file, baseline design/tasks artifact, or task-4 capability file changed in section 3.

## Confirmed character-library contract

- Every complete character has exactly one player owner. The owner alone may list, directly read, create, edit, select, or delete it.
- A campaign DM may read a character only when a membership in that DM's campaign references it. DM status grants no edit, selection, or deletion authority; unrelated users and guests receive no direct character-library data.
- The class, background, and ability catalogs are authenticated reference data. A complete character requires valid class/background identifiers, exactly one score per available ability, a trimmed 1–100-character name, and an 8–15 allocation costing no more than 27 points.
- Character completion is all-or-nothing and starts at level one. A failed completion does not expose a partial record as a complete character.
- An unfinished draft is recoverable only for the same player, browser session, and standalone/campaign context. Completion or explicit discard clears it; corrupt/unavailable draft storage cannot create a partial character.
- Owners may atomically edit unreferenced or rejected characters. Any pending or approved campaign reference locks editing. Task 4 must use matching review transitions.
- Campaign selection offers only the current player's complete characters. Selection alone does not mutate the character or review state; task 4 owns submission/resubmission and reuse rules.
- Any campaign membership reference blocks deletion. Once references are removed, confirmed owner deletion removes the character's ability/skill dependents. Account cleanup deletes only established owned characters after removing references; it never infers ownership from membership alone.
- The library displays stored level but does not provide progression. Advancement remains separately identified future task-10 scope.

## Deviations and explicit owners

| ID | Remaining discrepancy | Owner before baseline publication |
| --- | --- | --- |
| DEV-CHAR-001 | The model has no owner and authenticated character list/read/mutation/deletion is globally scoped; contextual DM read is not distinguished. | `correct-character-library-boundaries`; task 8 corrective review. |
| DEV-CHAR-002 | Server-side character/reference/ability validation does not enforce the accepted catalog, range, or point-budget contract. | `correct-character-library-boundaries`. |
| DEV-CHAR-003 | Multi-request creation can leave a partial row, and the edit route starts a creation flow instead of loading the target character. | `correct-character-library-boundaries`. |
| DEV-CHAR-004 | Draft keys separate standalone/campaign contexts but not authenticated players, and there is no explicit discard action. | `correct-character-library-boundaries`. |
| DEV-CHAR-005 | Character selection lists every character, and submission checks existence but not ownership or completeness. | `correct-character-library-boundaries`; task 4 owns review transitions. |
| DEV-CHAR-006 | Direct deletion ignores ownership and campaign references; account cleanup infers character candidates from memberships. | `correct-character-library-boundaries`; task 8 cross-capability deletion review; resolves DEV-ACC-005's task-3 dependency. |
| DEV-CHAR-007 | Generic patch accepts level changes and does not enforce pending/approved edit locks. | `correct-character-library-boundaries`; task 4 aligns review states; task 10 owns future progression. |

Task-2 deviations DEV-ACC-001 through DEV-ACC-004 remain owned by task 8. DEV-ACC-005 now has the accepted owner-based resolution above, but its implementation correction remains open as DEV-CHAR-006.

## Relevant paths for section 4

Planning and shared context:

- `openspec/changes/specify-dicekeeper-functionality/{proposal.md,design.md,tasks.md}`
- `openspec/changes/document-dicekeeper-baseline/{.openspec.yaml,proposal.md,specs/account-access/spec.md,specs/player-profiles/spec.md,specs/character-library/spec.md}`
- `openspec/changes/correct-character-library-boundaries/{.openspec.yaml,proposal.md}`
- `docs/specification/{runbook.md,evidence.md,decisions.md,coverage.md,glossary.md,permissions.md,handoff.md,overview.md}`

Campaign, membership, review, and notification evidence to inspect:

- `src/main/java/campaign/Campaign.java`
- `src/main/java/campaign/CampaignDTO.java`
- `src/main/java/campaign/CampaignResource.java`
- `src/main/java/campaign/CampaignDeletionService.java`
- `src/main/java/campaign/CampaignPlayer.java`
- `src/main/java/campaign/CampaignPlayerResource.java`
- `src/main/java/campaign/CharacterSubmitDTO.java`
- `src/main/java/campaign/CharacterRejectDTO.java`
- `src/main/java/notification/Notification.java`
- `src/main/java/notification/NotificationResource.java`
- `src/main/resources/META-INF/resources/app/views/CampaignsView.js`
- `src/main/resources/META-INF/resources/app/views/CampaignCreateView.js`
- `src/main/resources/META-INF/resources/app/views/CampaignDetailView.js`
- `src/main/resources/META-INF/resources/app/views/CharacterSelectView.js`
- `src/main/resources/META-INF/resources/app/views/CharacterReviewView.js`
- `src/main/resources/META-INF/resources/app/components/header.js`

Section 4 owns `campaign-management`, `campaign-membership`, `character-review`, and `notifications`. It must preserve `CHAR-001`/`CHAR-006` owner checks; align `NONE`/`PENDING`/`APPROVED`/`REJECTED` transitions with `CHAR-005` edit locks and `CHAR-007` reference deletion; and decide how leaving, kicking, resubmission, replacement, or campaign deletion removes a character reference.

## Verification performed

| Check / command | Result |
| --- | --- |
| `git diff --check` | Passed; no whitespace errors. |
| `openspec validate document-dicekeeper-baseline --type change --strict --no-interactive` | Passed with all three authored baseline capability deltas. This validates the current deltas, not semantic completeness of the remaining 11 proposal capabilities. |
| `openspec show document-dicekeeper-baseline --json --deltas-only` | Parsed 20 requirements total: 5 account-access/14 scenarios, 7 player-profiles/25 scenarios, and 8 character-library/39 scenarios. Every parsed requirement contains scenarios. |
| `openspec validate correct-character-library-boundaries --type change --strict --no-interactive` | Passed; `skip_specs: true` correctly records that it aligns implementation to the baseline rather than changing product requirements. |
| `openspec validate specify-dicekeeper-functionality --type change --strict --no-interactive` | Passed; the coordination-only change still validly uses `skip_specs`. |
| `openspec status --change document-dicekeeper-baseline --json` | Proposal/specs `done`; design `ready`; tasks blocked only on design. The baseline remains intentionally incomplete: 11 capability files, design, and tasks are outstanding for tasks 4–8. |
| `openspec status --change correct-character-library-boundaries --json` | Proposal `done`, specs `skipped`, design `ready`, tasks blocked on design. No implementation work is authorized or complete. |
| Permission/validation/deletion semantic review | Owner, unrelated-user, guest, contextual-DM, invalid reference/allocation, draft failure/isolation, review lock, referenced deletion, missing character, dependent cleanup, and account cleanup cases have requirements or explicit task-4 owners. |
| Application tests/runtime | Not run; section 3 is documentation-only and all implementation evidence remains static/source-observed. |

## Exact next instruction

> Execute task 4 of `specify-dicekeeper-functionality`. Read the shared decisions, coverage, permissions, evidence, glossary, runbook, and this handoff, plus the three existing baseline capability specs and the character correction proposal. Run the OpenSpec status/instructions workflow before writing. Trace only campaign CRUD/list/detail, membership/admission/capacity/start behavior, character-review transitions, notifications, and the listed views/resources. Resolve story/list visibility, private admission/invitations, start prerequisites, admission after start, and the `NONE`/`PENDING`/`APPROVED`/`REJECTED` transition table. Preserve character owner-only selection, contextual DM read-only access, pending/approved edit locks, and reference-safe deletion from `CHAR-001`/`CHAR-005`–`CHAR-007`. Author only `campaign-management`, `campaign-membership`, `character-review`, and `notifications` in `document-dicekeeper-baseline`, update the shared matrices and this handoff, validate the touched artifacts, mark only section 4 items complete, and stop before section 5. Do not implement application features or advance `correct-character-library-boundaries`.
