# Evidence Register

## Review metadata and limits

- Discovery date: 2026-09-21.
- Inspected revision: `b7c8fe2d789258efdf2c30286ca630b6888fbd6a`, together with the local working tree at discovery time.
- Method: static repository review plus read-only review of public Notion pages. No service was started, no application workflow was exercised, and no application test was run during discovery or this foundation task.
- Existing tests were read. A test file is not recorded as test-supported evidence unless its command was actually run successfully for the relevant behavior.
- Source observations establish implementation evidence, not desired product intent. Historical plans remain candidates until accepted.
- The public Notion pages were inspected through a browser because the text-only web reader could not access them. Content that stayed loading, exposed only navigation labels, or was unrelated is marked accordingly.
- No credentials, environment values, or unrelated reference text were copied into this register.

## Evidence vocabulary

| Status | Use |
| --- | --- |
| `source-observed` | Relevant code or static content was inspected. |
| `test-supported` | A relevant test was run successfully and its result was recorded. |
| `runtime-verified` | The behavior was exercised in a running system and its result was recorded. |
| `partial` | Evidence covers only part of the candidate behavior or conflicts across paths. |
| `absent` | The reviewed source showed no implementation for the candidate. |
| `unknown` | The relevant source has not established the behavior. |

## Canonical and previously reviewed sources

| ID | Source | Review/disposition |
| --- | --- | --- |
| SRC-01 | [`README.md`](../../README.md) | Product purpose, DM-assistance boundary, three views, future ambitions, and development/deployment context. Its React/MariaDB stack summary is stale relative to current source. |
| SRC-02 | [`docs/usecase-aktueller-stand.puml`](../usecase-aktueller-stand.puml) | Canonical current diagram: 33 aliases and their direct/include actor relationships. Diagram claims still require code and product-decision evidence. |
| SRC-03 | [`docs/usecase-sollzustand-5-klasse.puml`](../usecase-sollzustand-5-klasse.puml) | Canonical future diagram: 22 aliases, relationships, and external actors. It identifies candidates, not accepted contracts. |
| SRC-04 | [`docs/usecase-diagramme.md`](../usecase-diagramme.md), `.dot`, and `.svg` renderings | Duplicate presentations of SRC-02/03. They are not independent corroborating sources and are not counted again in coverage. |
| SRC-05 | `pom.xml`, `src/main/java/`, `src/main/resources/META-INF/resources/app/` | Current Quarkus/Java backend, PostgreSQL dependency, JavaScript SPA, REST endpoints, SSE, views, guide, drafts, theme, and browser-local behavior. |
| SRC-06 | `src/test/java/campaign/GameStateTest.java`, `src/test/java/campaign/CampaignValidationTest.java` | Tests exist for HP initialization and campaign player-count validation. They were read, not executed, and do not establish permission/workflow/synchronization coverage. |
| SRC-07 | [Notion project index](https://regenblau.notion.site/Dicekeeper-2946a24f98f28054b8bce2f53801ceed) | Public index. Linked pages were reviewed selectively for Dicekeeper requirements; sprint notes are historical and often incomplete. |
| SRC-08 | [Original project proposal](https://regenblau.notion.site/Project-Proposal-Dicekeeper-2786a24f98f280a690cbd6ea669f5cdb) | Previously reviewed historical goals, stack, and early character/session assumptions. |
| SRC-09 | [Requirements interview 1](https://regenblau.notion.site/Fragerunde-1-2fc6a24f98f28007b81af7c52221e06f) | Previously reviewed historical MVP priorities, actors, invitation codes, D&D edition, AI, maps, audio, and Discord. It describes audio as transcription without commands. |
| SRC-10 | [Requirements interview 2](https://regenblau.notion.site/Fragerunde-2-2fc6a24f98f280588c25f8be9a2b3d7e) | Previously reviewed owner-only character editing, read-only table view, campaign/session distinction, creator-as-DM, and group initiative. Blank answers are not decisions. |
| SRC-11 | [Frontend requirements](https://regenblau.notion.site/Front-End-Anforderungen-f-r-Projekt-2c56a24f98f280db9faeec1eeccdd4d9) | Previously reviewed capacity, campaign visibility/overview, and player-management candidates. |
| SRC-12 | [Sprint 12 backlog](https://regenblau.notion.site/Sprint-12-current-Back-Log-3436a24f98f280429f3ddc1eea1e1142) | Previously reviewed reports of slow map/campaign loading, missed updates, multiple-map work, and image handling. Historical defect reports require reproduction or source comparison. |
| SRC-13 | [Next-year notes](https://regenblau.notion.site/F-r-n-chstes-Jahr-36d6a24f98f280c9855adaca00771809) | Previously reviewed informal ideas such as character privacy. Not accepted scope by itself. |
| SRC-14 | [Test von Indooro](https://regenblau.notion.site/Test-von-Indooro-3896a24f98f2806c81ffce9bf05b6790) | About another application's layout editor/beacons. Excluded unless future evidence establishes Dicekeeper relevance. |

## Foundation review of remaining Notion links

| ID | Source | Relevant finding and disposition |
| --- | --- | --- |
| SRC-15 | [Next Sprint Infos](https://regenblau.notion.site/Next-Sprint-Infos-2946a24f98f2809b8d38c1a10aea81de), [Sprint 2](https://regenblau.notion.site/Sprint-2-2946a24f98f280deb00ff23d711647b1), [Sprint 3](https://regenblau.notion.site/Sprint-3-2966a24f98f280bc9d7ee633c5641d43) | Historical character-editor and backend-import/level-up notes. Character editing is owned by task 3; progression is future task 10. Database setup is non-functional implementation context. |
| SRC-16 | [Sprint 4](https://regenblau.notion.site/Sprint-4-2966a24f98f2802e94f1f4397653db17), [Sprint 5](https://regenblau.notion.site/Sprint-5-2c56a24f98f28099bf38e1ad17ae818b), [Sprint 6](https://regenblau.notion.site/Sprint-6-2e16a24f98f280ca9329c2dff1e81331) | Historical campaign create/join/list/capacity/roles, lock/start, character review, and destructive-action confirmation candidates. Owned by tasks 3–4; none is accepted solely from sprint text. |
| SRC-17 | [Sprint 7](https://regenblau.notion.site/Sprint-7-2e16a24f98f2804397ccca10f4751e3b), [Sprint 8](https://regenblau.notion.site/Sprint-8-2fd6a24f98f2800c9a32ec32f743dc45), [Sprint 9](https://regenblau.notion.site/Sprint-9-3126a24f98f280c8b56ef836f6e9f19a) | Historical cockpit/story notes, AI as selectable assistance, live notifications, player/DM view content, readability/language, voice input, map movement, table display, and square-map constraints. Routed to tasks 5, 7, 10, 11, and 13 as candidates. |
| SRC-18 | [Sprint 10](https://regenblau.notion.site/Sprint-10-3206a24f98f280169793f1dec31380c3), [Sprint 11](https://regenblau.notion.site/Sprint-11-32e6a24f98f280f99c05d861ae4fd2fb) | Historical fog undo, bounded non-square maps, accessible color options, Imagor, replacement cleanup, and story-preset candidates. Routed to tasks 4, 5, and 7; exact constraints remain unresolved. |
| SRC-19 | [Questionnaire template](https://regenblau.notion.site/Fragenkatalog-Dicekeeper-Antwort-Template-2fc6a24f98f280a3957af4c4e3a091f2) | Only links to the two already reviewed interview rounds were visible. It adds no independent answer or requirement. |
| SRC-20 | [Print & Design research](https://regenblau.notion.site/Print-Design-Recherche-Konzeption-2966a24f98f2808ba7eccee95ec266e0) | The public page remained at “Loading…” and exposed no reviewable requirement content. Marked inaccessible for this task rather than silently treated as reviewed. |
| SRC-21 | [Wording](https://regenblau.notion.site/2b76a24f98f2804591c3c907fc4bbf67) | The public database exposed only “Home” and “Search”; no concrete product contract was reviewable. Language/readability remains owned by task 7. |
| SRC-22 | [UML](https://regenblau.notion.site/UML-3026a24f98f280669ed9d8584e429b87) | Contains general coursework questions about UML and AI, not Dicekeeper functionality. Excluded from product requirements. |
| SRC-23 | [Imagor](https://regenblau.notion.site/Imagor-3436a24f98f2805a95f9cd8c61acf55b) | Shows original and resized avatar/map URL examples for small, large, preview, table, and phone variants. This supports task 5 investigation; it does not decide access control or required sizes. |
| SRC-24 | [Team notes](https://regenblau.notion.site/Dani-s-und-aller-anderer-Notitzen-3206a24f98f2808ab7fefb42628a197e) | Historical candidates and bug reports: onboarding, invitations, waiting-for-DM, per-map fog, multi-map switching, validation/readability/update issues, and experimental physical/mobile dice or AI portraits. Routed by capability in coverage; bugs require reproduction and ideas remain proposed. |

The index and every visible child link were assigned one of: previously reviewed (SRC-08–14), newly reviewed/routed (SRC-15–19, SRC-23–24), inaccessible/insufficient public content (SRC-20–21), or excluded as unrelated (SRC-14, SRC-22).

## Static implementation findings to preserve

| Finding | Evidence | Consequence / owner |
| --- | --- | --- |
| The frontend is a JavaScript SPA and the backend uses Quarkus with PostgreSQL. | SRC-05: `app/main.js`, `pom.xml` | Treat README React/MariaDB text as stale context, not a migration requirement. |
| OIDC login creates/synchronizes a local player; profile calls use the current identity. | `security/AuthResource.java`, `security/SecurityIdentityService.java`, `player/PlayerResource.java` | Task 2 owns identity sync, expiry/failure, profile privacy, and deletion. |
| Campaign creation assigns the authenticated creator as owner and DM member. | `campaign/CampaignResource.java`, `campaign/CampaignPlayer.java` | DM is campaign-specific; do not infer a global Keycloak DM role. |
| Character records have no owner field and authenticated CRUD is not owner-scoped. | `character/Character.java`, `character/CharacterResource.java` | Task 3 must resolve ownership; universal access is an implementation gap, not an accepted contract. |
| Campaign detail hides story from non-DMs, while list endpoints return raw campaign entities. | `campaign/CampaignResource.java`, `campaign/CampaignDTO.java` | Tasks 2 and 4 must reconcile visibility across read paths. |
| Public joining checks membership/capacity; the join endpoint rejects private campaigns. | `campaign/CampaignPlayerResource.java` | Task 4 owns private admission/invitation behavior. |
| Character submissions use NONE/PENDING/APPROVED/REJECTED and create notifications; resubmission lacks the current-player check used by submission. | `campaign/CampaignPlayerResource.java`, `notification/NotificationResource.java` | Task 4 owns transitions and authorization, including resubmission and edits/deletion after approval. |
| A campaign has a started flag; no separate persistent session entity was found. | `campaign/Campaign.java`; domain inventory | Tasks 4 and 9 must distinguish current play from future session/encounter history. |
| Turn, HP, active flags, dice, markers, fog, and map undo are held in application memory. | `campaign/GameState.java` | Tasks 5–7 own lifetime, restart, and multi-instance expectations. |
| Dice results are client-supplied and fog saving permits campaign members. | `campaign/GameActionResource.java` | Tasks 5–6 must decide trust and authority before strengthening contracts. |
| Voting is persisted, rejects repeat voters, resolves at a counted total, favors yes on ties, and has overlapping APIs. | `campaign/GroupDecision.java`, `campaign/GameActionResource.java`, `campaign/GroupDecisionResource.java` | Task 6 owns eligibility, quorum, membership changes, ties, closure, and API meaning. |
| SSE subscription checks membership and the broadcaster emits heartbeats. | `campaign/GameSseResource.java`, `campaign/SseBroadcaster.java`, `app/services/campaignEvents.js` | Task 7 owns observable propagation, reconnect, stale clients, and revocation. Static source does not prove reliable delivery. |
| Player notes use `localStorage`; GM chat appends a local message. | `app/views/PlayerView.js`, `app/views/GMView.js` | Task 6 owns note lifetime. The chat UI is not evidence of server chat or AI integration. |
| Upload delivery/listing is public in the reviewed source; an Imagor signing path also exists. | `tool/UploadServeResource.java`, `tool/ImagorSignedImageResource.java` | Task 5 owns media access and processing; historical security reports require current verification. |
| Account deletion coordinates external identity deletion and local cascades. | `player/PlayerResource.java`, `player/PlayerDeletionService.java`, campaign/character deletion services | Task 2 owns partial failure and dependent-data outcomes. |
| Campaign and character creation use browser session drafts; notes and theme have different browser persistence. | `app/services/sessionDraft.js`, creation views, `app/services/theme.js`, `app/views/PlayerView.js` | Tasks 3, 4, 6, and 7 must state lifetimes separately. |
| A generated user guide and accessible theme are reachable from the SPA. | `app/guide/guideContent.js`, `app/views/GuideView.js`, `app/services/theme.js` | Task 7 owns help/view/accessibility behavior; generated text is evidence, not a normative contract. |
| Only two application test files were found under `src/test`. | SRC-06 | Keep findings `source-observed` until targeted tests or runtime checks are executed. |

## Task 2 account and profile trace

Task 2 refreshed the following static evidence on 2026-09-21. The relevant application files had no working-tree diff, so the findings still describe the inspected source revision plus the previously recorded local tree. No application test or runtime flow was executed.

| ID | Source evidence | Observation | Contract consequence / owner |
| --- | --- | --- | --- |
| ACC-E01 | `AuthResource.java:33-91`; `auth.js:23-69`; `LoginView.js:11-131`; `application.properties:17-43` | OIDC owns sign-in/logout; login redirects are constrained to local paths; a successful callback fetches `/api/auth/me`; provider errors and expiry return to the login view. There is no local password or registration endpoint. | DEC-010; `ACC-001`, `ACC-003`–`ACC-005`. Registration availability remains provider configuration, not a Dicekeeper account operation. |
| ACC-E02 | `SecurityIdentityService.java:31-103,164-257` | The local player is looked up by normalized email or a subject-derived fallback. First login creates it; later login may upgrade a synthetic email and synchronize generated identity fields. An explicit provider display-name claim currently overwrites a locally edited display name. | `ACC-002`; DEC-011. Preserving an intentionally managed display name is DEV-ACC-001, owned by task 8 corrective planning. |
| ACC-E03 | `auth.js:75-125`; `LoginView.js:70-130` | The SPA caches the player in session storage, marks same-origin API requests, clears the cache and restarts login after an authentication response, and shows explicit provider/expiry/synchronization outcomes. | `ACC-003`, `ACC-004`. Static source does not prove every infrastructure-generated unauthenticated response uses the expected client signal. |
| PRO-E01 | `Player.java:7-14`; `PlayerResource.java:44-73`; profile consumers in `CharacterReviewView.js:45-92`, `CharacterSelectView.js:44-48`, `CampaignDetailView.js`, `CockpitView.js`, `GMView.js`, `PlayerView.js`, and `TableView.js` | Any authenticated caller can request any player by ID and receives the full entity, including email. Several campaign views need a name/avatar summary; character review also displays the email. | DEC-012; `PRO-001`, `PRO-002`. Replacing full-entity reads with contextual summaries and removing email from shared views is DEV-ACC-002, owned by task 8 and reconciled with tasks 4 and 7. |
| PRO-E02 | `PlayerResource.java:75-160`; `ProfileView.js:34-124` | Avatar upload and profile mutation enforce current-player identity. The UI limits username/display name to 50/100 characters, but the backend does not enforce nonblank/length validation. The general patch also accepts a caller-supplied avatar path. | `PRO-003`, `PRO-004`. Server validation and separation of avatar mutation are DEV-ACC-003, owned by task 8; media validation/delivery/cleanup remains task 5. |
| PRO-E03 | `PlayerResource.java:163-189`; `KeycloakAdminService.java:34-101`; `ProfileView.js:146-168`; `README.md:214-227` | Deletion is self-only and confirmed in the UI. It deletes the external identity before local data; an external failure prevents local cleanup, a missing external identity is accepted, and any exception returns an incomplete error. The development deployment deliberately disables external deletion. | DEC-013; `PRO-005`, `PRO-006`. There is no durable cleanup obligation or authenticated retry after external success/local failure: DEV-ACC-004, owned by task 8. Disabled provider administration is an explicit failed-deletion outcome, not local-only success. |
| PRO-E04 | `PlayerDeletionService.java:31-70`; `CampaignDeletionService.java:25-41`; `CharacterDeletionService.java:10-23` | Local cleanup deletes owned campaigns and their decisions, notifications, memberships, map files, and live state; then removes remaining memberships, membership/player notifications, conditionally referenced characters, the avatar, and the player. File cleanup errors are logged rather than propagated. | `PRO-007`; DEC-014. Character deletion based on membership references conflicts with unresolved ownership (DEV-ACC-005, task 3 then task 8). Complete asset-cleanup guarantees remain task 5. |

### Task 2 implementation deviations

| ID | Accepted contract versus observed source | Owner / disposition |
| --- | --- | --- |
| DEV-ACC-001 | `ACC-002` preserves deliberately managed profile presentation; an explicit provider display-name claim currently overwrites the local display name. | Task 8 must place the accepted correction in a separate corrective change before baseline publication or explicitly document why the implementation will remain divergent. |
| DEV-ACC-002 | `PRO-002` exposes only a contextual public summary; the current ID lookup returns the full player entity and some shared views render email. | Task 8 corrective change; tasks 4 and 7 must consume the same summary boundary in campaign/review/view requirements. |
| DEV-ACC-003 | `PRO-003` validates profile fields and prevents general profile edits from changing the avatar reference; current server-side patching does neither. | Task 8 corrective change; task 5 owns media validation and replacement behavior. |
| DEV-ACC-004 | `PRO-006` requires a recoverable incomplete-cleanup obligation; current external-first deletion only returns an error if later local cleanup fails. | Task 8 corrective change and operational design. |
| DEV-ACC-005 | `PRO-007` does not infer character ownership from membership; current account cleanup may delete an unreferenced membership character. | Task 3 resolves ownership; task 8 then records the corrective product change and cross-capability deletion rule. |

## Verification record

Foundation and task 2 review are static. Validation results for the coordination change and the evolving baseline are recorded in [`handoff.md`](handoff.md). Later tasks must append exact test/runtime commands and outcomes here when they materially change implementation evidence.
