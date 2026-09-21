# Specification Handoff

## Current state

- Coordination change: `specify-dicekeeper-functionality`
- Schema: `spec-driven`
- Last completed work package: section 2, **Specify accounts, profiles, and permissions** (items 2.1–2.3)
- Overall coordination progress after this handoff: 8/50 checklist items complete
- Next work package: section 3, **Specify characters**
- Baseline change: [`openspec/changes/document-dicekeeper-baseline/`](../../openspec/changes/document-dicekeeper-baseline/)
- Baseline state: proposal and specs artifacts are syntactically complete; `account-access` and `player-profiles` contain the first 2 of 14 capability deltas; design is ready and tasks remain blocked on design, as expected until task 8
- Main specs: still empty; baseline publication and archive remain task 8
- Application code changed: no
- Blocking issue for starting section 3: none, but character ownership is section 3's required decision gate

## Completed in section 2

- Traced the backend and frontend authentication flow, including safe redirect handling, external-provider callbacks, browser-cached player state, local-player synchronization, expiry/failure recovery, and logout.
- Traced private/full player reads, shared profile consumers, self-service profile/avatar mutation, Keycloak administration, local account cleanup, campaign cleanup, notification cleanup, avatar/map cleanup, and conditional character deletion.
- Confirmed DEC-010 through DEC-014: external-provider registration, identity/profile synchronization boundaries, a least-data contextual public summary, own-account-only management, coordinated deletion semantics, and dependent-data ownership boundaries.
- Authored [`account-access`](../../openspec/changes/document-dicekeeper-baseline/specs/account-access/spec.md) with 5 requirements and 14 scenarios covering login/registration, identity synchronization, protected-session enforcement, failures/expiry, and logout.
- Authored [`player-profiles`](../../openspec/changes/document-dicekeeper-baseline/specs/player-profiles/spec.md) with 7 requirements and 25 scenarios covering private and public fields, own/unrelated/missing-account outcomes, profile/avatar mutation, external deletion failure, incomplete local cleanup, and dependent data.
- Reconciled `coverage.md`, `permissions.md`, `decisions.md`, `evidence.md`, `glossary.md`, and `overview.md` with exact requirement references and decision/deviation owners.
- Recorded five source-versus-contract deviations as DEV-ACC-001 through DEV-ACC-005. No observed defect was silently promoted as desired behavior, and no corrective application work was performed.
- Stopped before section 3. No `character-library` specification or application feature was authored.

## Files created or updated in section 2

- [`openspec/changes/document-dicekeeper-baseline/specs/account-access/spec.md`](../../openspec/changes/document-dicekeeper-baseline/specs/account-access/spec.md)
- [`openspec/changes/document-dicekeeper-baseline/specs/player-profiles/spec.md`](../../openspec/changes/document-dicekeeper-baseline/specs/player-profiles/spec.md)
- [`docs/specification/decisions.md`](decisions.md)
- [`docs/specification/evidence.md`](evidence.md)
- [`docs/specification/glossary.md`](glossary.md)
- [`docs/specification/permissions.md`](permissions.md)
- [`docs/specification/coverage.md`](coverage.md)
- [`docs/specification/overview.md`](overview.md)
- `docs/specification/handoff.md`
- [`openspec/changes/specify-dicekeeper-functionality/tasks.md`](../../openspec/changes/specify-dicekeeper-functionality/tasks.md) — section 2 checkboxes only

Foundation-stage files already present in the working tree remain part of the shared documentation set. No application source, test, runtime configuration, deployment file, baseline design/tasks artifact, or task-3 capability file was changed in section 2.

## Confirmed account/profile contract

- Authentication and optional registration are provider-owned. Dicekeeper stores no local password and creates a local player only after successful authentication.
- The authenticated server session is authoritative; cached player data alone grants no access. Expiry or missing authentication clears the cache and requires fresh sign-in with only a safe local continuation path.
- Provider email is account-private. Provider claims seed a profile and may replace generated placeholders, but a later sign-in does not overwrite deliberately managed username/display-name fields.
- The contextual public summary contains only player ID, username, display name, and avatar reference, and only within an authorized shared workflow. Campaign roles do not reveal email or settings.
- Profile/avatar mutation and account deletion are own-account-only; a missing local profile returns not found without touching the external identity.
- Deletion succeeds only when the external identity is absent and required local cleanup completes. External failure leaves local data intact; external success followed by local failure is an incomplete failure with a recoverable cleanup obligation.
- Cleanup removes the profile/avatar, player notifications, memberships, and owned campaigns through their deletion contracts. It preserves other players' data and does not infer character ownership from membership.

## Deviations and explicit owners

| ID | Remaining discrepancy | Owner before baseline publication |
| --- | --- | --- |
| DEV-ACC-001 | An explicit provider display-name claim can overwrite a locally managed display name. | Task 8 corrective change. |
| DEV-ACC-002 | Arbitrary authenticated player-ID lookup returns the full entity, and a shared review view renders email. | Task 8 corrective change; tasks 4 and 7 consume the accepted summary boundary. |
| DEV-ACC-003 | Server-side profile update does not enforce UI lengths/nonblank values and accepts a direct avatar-reference mutation. | Task 8 corrective change; task 5 owns media validation/replacement. |
| DEV-ACC-004 | External-first deletion has no durable cleanup obligation or authenticated retry after local cleanup fails. | Task 8 corrective/operational design. |
| DEV-ACC-005 | Account cleanup may delete a membership-linked character even though character ownership is not modeled. | Task 3 resolves ownership; task 8 records the resulting corrective change. |

Deletion dependencies that are not owned by task 2 remain explicit rather than assumed: task 3 owns character ownership/deletion; task 4 owns campaign/membership/notification contract details; task 5 owns media cleanup and delivery; task 7 owns display consumption; task 8 owns cross-capability review and corrective-change separation.

## Relevant paths for section 3

Planning and shared context:

- `openspec/changes/specify-dicekeeper-functionality/{proposal.md,design.md,tasks.md}`
- `openspec/changes/document-dicekeeper-baseline/{.openspec.yaml,proposal.md,specs/account-access/spec.md,specs/player-profiles/spec.md}`
- `docs/specification/{runbook.md,evidence.md,decisions.md,coverage.md,glossary.md,permissions.md,handoff.md,overview.md}`

Character and cross-capability evidence to inspect:

- `src/main/java/character/Character.java`
- `src/main/java/character/CharacterResource.java`
- `src/main/java/character/CharacterDTO.java`
- `src/main/java/character/CharacterUpdateDTO.java`
- `src/main/java/character/CharacterDeletionService.java`
- `src/main/java/character/ability/`
- `src/main/java/character/skill/`
- `src/main/java/characterclass/`
- `src/main/java/background/`
- `src/main/java/campaign/CampaignPlayer.java`
- `src/main/java/campaign/CampaignPlayerResource.java`
- `src/main/resources/META-INF/resources/app/views/CharacterCreateView.js`
- `src/main/resources/META-INF/resources/app/views/CharacterSelectView.js`
- `src/main/resources/META-INF/resources/app/services/sessionDraft.js`

Coverage candidates initially owned by task 3 are `CUR-UCCharacter`, `CUR-UCCharacterDetails`, `ADD-004`, and `ADD-005`. Task 3 must also resolve DEV-ACC-005 without rewriting the accepted task-2 account boundary.

## Verification performed

| Check / command | Result |
| --- | --- |
| `openspec validate document-dicekeeper-baseline --type change --strict --no-interactive` | Passed with both task-2 delta files. This validates the currently authored deltas, not semantic completeness of all 14 proposal capabilities. |
| `openspec show document-dicekeeper-baseline --json --deltas-only` | Parsed 12 requirements across `account-access` and `player-profiles`; every parsed requirement contains scenarios. |
| `openspec validate specify-dicekeeper-functionality --type change --strict --no-interactive` | Passed; the coordination-only change still validly uses `skip_specs`. |
| `openspec status --change document-dicekeeper-baseline --json` | Proposal/specs `done`; design `ready`; tasks blocked only on design. The baseline remains intentionally incomplete: 12 capability files, design, and tasks are still outstanding for tasks 3–8. |
| Permission/deletion semantic review | Own-account, unrelated-account, missing-account, external failure, incomplete cleanup, dependent-data, campaign-role, guest, and display-client cases have requirements or explicit later owners. |
| Application tests/runtime | Not run; section 2 is documentation-only and all implementation evidence remains static/source-observed. |

## Exact next instruction

> Execute task 3 of `specify-dicekeeper-functionality`. Read the shared decisions, coverage, permissions, evidence, glossary, runbook, and this handoff, plus both relevant OpenSpec changes and the two existing baseline capability specs. Run the OpenSpec status/instructions workflow before writing. Trace only character CRUD, ability scores, reference data, draft recovery, selection/submission dependencies, and deletion sources listed above. Resolve character ownership, unrelated-user and campaign-DM access, invalid reference values, and deletion while referenced, explicitly reconciling DEV-ACC-005. Author only the `character-library` delta specification in `document-dicekeeper-baseline`, update the shared matrices and this handoff, validate the touched artifacts, mark only section 3 items complete, and stop before section 4. Do not implement application features.
