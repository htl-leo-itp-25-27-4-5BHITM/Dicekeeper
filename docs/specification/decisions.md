# Decision Log

## Status rules

- `confirmed` means the choice is controlling for specification work.
- `proposed` means a working default or source-backed candidate still needs product acceptance where it affects behavior.
- `unresolved` means the owning task must decide it before finalizing the affected contract.
- `deferred` means the behavior is intentionally left for later scope with an owner/reason.
- `superseded` means a later recorded decision replaced it.

Evidence and implementation status are recorded separately in [`evidence.md`](evidence.md) and [`coverage.md`](coverage.md).

## Recorded decisions

| ID | Status | Decision | Rationale / consequence | Affected work |
| --- | --- | --- | --- | --- |
| DEC-001 | confirmed | Document the current application and a separately identified future scope. | User confirmation on 2026-09-21. Current and future behavior must remain distinguishable. | All tasks. |
| DEC-002 | confirmed | Keep coordination, accepted current baseline, corrective changes, and future changes separate. | Prevents planning artifacts or observed defects from being mistaken for delivered/accepted behavior. | Coordination change, baseline, tasks 8–15. |
| DEC-003 | confirmed | Desired behavior comes from explicit product decisions; code/tests provide implementation evidence; diagrams provide scope; Notion provides historical candidates. | Conflicts require a decision rather than an automatic source ranking. | All authoring tasks. |
| DEC-004 | confirmed | Use the 14 flat current capability paths listed in `overview.md` and the baseline proposal. | One canonical behavior contract per domain area; UI views reference shared capabilities. | Tasks 2–8. |
| DEC-005 | proposed | Use English specification prose while retaining original German source labels in glossary and coverage. | Editorial consistency only; not a localization decision. | All documentation. |
| DEC-006 | proposed | Treat Dicekeeper as assistance for a human DM, not an autonomous DM replacement. | Supported by README/history, but detailed AI authority still needs task 11 decisions. | Tasks 9–12. |
| DEC-007 | confirmed | Markdown, DOT, and SVG use-case artifacts are duplicate renderings; the two PlantUML files are canonical for alias counts. | Prevents false source corroboration and double-counting. | Coverage/audit. |
| DEC-008 | confirmed | Public Notion sprint notes and backlog items remain historical candidates or defect reports until accepted or reproduced. | Historical intent and implementation status must not be conflated. | All owning tasks. |
| DEC-009 | confirmed | The current baseline change is named `document-dicekeeper-baseline`. | Name was unused and scaffolded through the OpenSpec CLI in foundation task 1. | Tasks 2–8. |
| DEC-010 | confirmed | Authentication and registration are owned by the configured external identity provider; Dicekeeper stores no local password and creates a local player only after successful authentication. | Matches the OIDC boundary and prevents the “Einloggen / registrieren” use case from implying a second local account system. | `account-access`. |
| DEC-011 | confirmed | Provider email is private account data. Provider claims seed a new local profile and may replace generated placeholders, but a later sign-in does not overwrite a username or display name deliberately managed in Dicekeeper. | Separates identity linkage from user-managed profile presentation and gives synchronization a stable, testable boundary. | `account-access`, `player-profiles`. |
| DEC-012 | confirmed | The contextual public player summary is limited to player ID, username, display name, and avatar reference. It is exposed only in an authorized shared workflow; email and account settings are self-only. Campaign membership or DM status grants no broader account-profile access. | Current full-entity reads expose email more broadly than needed. The baseline adopts the least-data contract and records the source behavior as a deviation. | `player-profiles`, tasks 4 and 7 consumers. |
| DEC-013 | confirmed | Only the current player manages their profile/avatar or deletes their account. Account deletion is successful only when the external identity is absent and required local cleanup completes; an external failure leaves local data intact, while a local failure after external deletion is an explicitly incomplete outcome requiring recoverable remediation. | Prevents partial deletion from being presented as success and preserves a clear own-account boundary. | `player-profiles`, task 8 corrective tracking. |
| DEC-014 | confirmed | Account cleanup removes the player's profile/avatar, notifications, memberships, and owned campaigns through their owning deletion contracts. It preserves other players' data and does not infer character ownership from a membership reference. | The current character model has no owner, so deleting a referenced character during account cleanup would silently decide task 3's ownership question. | `player-profiles`; character dependency owned by task 3, cross-capability review by task 8. |
| DEC-015 | confirmed | Every character has exactly one player owner. Only the owner may list, directly read, create, edit, select, or delete it. A campaign DM may read a member's character only through a reference in that DM's campaign and may not mutate it; unrelated authenticated users have no direct character-library access. | Historical owner-only intent and the “Your Characters” selection flow support the least-privilege boundary. The observed model has no owner and globally exposes authenticated CRUD, so implementation alignment is tracked separately in `correct-character-library-boundaries`. | `character-library`; task 4 must consume the same boundary in `character-review`, and tasks 7/8 must reconcile view exposure and corrections. |
| DEC-016 | confirmed | Unfinished character creation is a browser-session draft isolated by player and standalone/campaign context; it is restored on return, cleared on completion or explicit discard, and never becomes a server-side character until complete validation succeeds. | Preserves the useful observed recovery flow without treating a partial multi-request record or another player's browser data as a character. | `character-library`; corrective change `correct-character-library-boundaries`. |
| DEC-017 | confirmed | Character creation requires valid class/background references, one 8–15 score per available ability within the observed 27-point budget, and a 1–100-character name; current characters start at level one. Owners may edit unreferenced or rejected characters, but any pending/approved reference locks editing and any campaign reference blocks deletion. Generic level progression is future task 10 scope. | Provides server-testable validation and preserves campaign-review integrity while separating future advancement. The current backend accepts arbitrary values, exposes partial creation, and deletes without checking references. | `character-library`; task 4 reconciles review transitions; future `character-progression`; corrective change `correct-character-library-boundaries`. |

## Open decision gates

| Decision gate | Status | Owner | Blocks |
| --- | --- | --- | --- |
| Character submission/resubmission transitions, reuse across campaigns, and removal of a campaign reference; ownership and library locks are fixed by DEC-015–017 | unresolved | Task 4 | `character-review` acceptance and the path that unlocks character edit/deletion. |
| Campaign story visibility across list/detail paths and private campaign admission/invitations | unresolved | Task 4 | `campaign-management` and `campaign-membership`. |
| Start prerequisites and admission after start | unresolved | Task 4 | Campaign start/membership transitions. |
| Campaign versus persistent session/encounter lifecycle | unresolved | Task 4, then task 9 | Current started-state contract and future records. |
| Underlying avatar/map/upload delivery paths, derived media access, and replacement cleanup | unresolved | Tasks 4–5 | `media-assets` and campaign/map visibility contracts. Task 2 fixed only which avatar reference may appear in a contextual public profile summary. |
| Map limits, replacement/cleanup, fog authority, hidden information, and exploration versus tactical scope | unresolved | Task 5 | `campaign-maps`, `media-assets`. |
| Dice trust and who may set or publish a result | unresolved | Task 6 | `live-play`. |
| Vote eligibility, duplicate handling, ties, quorum, late joins/leaves, closure, and overlap of planning/live APIs | unresolved | Task 6 | `group-decisions`. |
| Note and live-state persistence across refresh, device, restart, and multiple instances | unresolved | Tasks 6–7 | `player-notes`, `live-play`, `live-synchronization`. |
| Display-client access model, mobile/tablet support, language/readability, accessibility, and measurable recovery/performance criteria | unresolved | Task 7 | `session-views`, `live-synchronization`. |
| Included campaign-content/session objects, lifecycles, ownership, references, and history | unresolved | Task 9 | `campaign-content`, `session-records`. |
| D&D edition, progression, conditions/effects, initiative groups/ties, boss mechanics, encounter scale, and rule corpus | unresolved | Tasks 10 and 12 | Combat/progression/rule-assistance changes. |
| AI input/context visibility, lore authority, DM acceptance/editing, audience, failures, and limits | unresolved | Task 11 | AI assistance and recap changes. |
| Transcription-only versus executable voice commands | unresolved | Task 13 | `voice-commands`; SRC-09 conflicts with the future diagram. |
| Audio source, controls, attribution, languages, correction, retention/access, and downstream use | unresolved | Task 13 | `audio-transcription`. |
| Initial Discord workflows, associations, audience, status/roll sharing, reconnect, and optional audio | unresolved | Task 14 | `discord-integration`. |

## Explicit source dispositions

| Source/candidate | Disposition |
| --- | --- |
| Indooro layout-editor/beacon material (SRC-14) | Excluded as unrelated unless later evidence establishes Dicekeeper relevance. |
| UML coursework questions (SRC-22) | Excluded from product requirements. |
| Print/design page (SRC-20) | Inaccessible in the public view; no behavior inferred. |
| Wording database (SRC-21) | Insufficient public content; language/readability remains an unresolved task-7 decision. |
| Physical-camera dice, mobile shake dice, and evolving AI portraits (SRC-24) | Proposed historical ideas; not part of the confirmed baseline or accepted future scope. Owner task 10/11 only if explicitly selected later. |
