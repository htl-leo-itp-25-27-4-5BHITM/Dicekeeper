# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. This design is the runbook for authoring the functional specification; it is not an application architecture redesign.

Discovery was performed on 2026-09-21 against commit `b7c8fe2d789258efdf2c30286ca630b6888fbd6a` and the local working tree. OpenSpec 1.13.1 resolved this repository as its root, using the `spec-driven` schema, with no main specifications or active changes before this change was created. The user confirmed: **current application plus a separately identified future scope**.

The source review was delegated to the requested GPT-5.5 subagent and key findings were checked in the parent task. It was a static review: no services were started and no application tests were run. Existing tests were read. Source findings are starting evidence, not proof of deployed behavior.

### Source register seed

Repository paths below are relative to the repository root. Preserve paths and the inspected commit in the execution-time evidence register, and add exact symbols or current line references when tracing individual requirements.

| ID | Source | What was reviewed / how to use it |
| --- | --- | --- |
| SRC-01 | `README.md` | Product purpose, DM-assistance boundary, three views, future ambitions, and development/deployment notes. Its React/MariaDB stack summary conflicts with current source. |
| SRC-02 | `docs/usecase-aktueller-stand.puml` | All 33 current use cases and actor relationships. Initial current-scope checklist; the diagram's implementation claims still need evidence. |
| SRC-03 | `docs/usecase-sollzustand-5-klasse.puml` | All 22 target use cases and external actors. Candidate future scope, subject to decisions. |
| SRC-04 | `docs/usecase-diagramme.md`, corresponding `.dot` and `.svg` files | Alternate presentations of SRC-02/03; do not count them as independent corroborating sources. |
| SRC-05 | `pom.xml`, `src/main/java/`, `src/main/resources/META-INF/resources/app/` | Quarkus/Java backend, PostgreSQL dependency, JavaScript SPA, REST endpoints, and campaign SSE. See the implementation findings below. |
| SRC-06 | `src/test/java/campaign/GameStateTest.java`, `src/test/java/campaign/CampaignValidationTest.java` | Tests for HP initialization and campaign player-count validation. These do not establish coverage of permissions, complete workflows, or synchronization. |
| SRC-07 | [Notion project index](https://regenblau.notion.site/Dicekeeper-2946a24f98f28054b8bce2f53801ceed) | Read through the public browser after web search could not retrieve/index the content. Linked pages were sampled for requirements; not every sprint was reviewed. |
| SRC-08 | [Original project proposal](https://regenblau.notion.site/Project-Proposal-Dicekeeper-2786a24f98f280a690cbd6ea669f5cdb) | Historical goals, stack, and early character/session assumptions. |
| SRC-09 | [Requirements interview 1](https://regenblau.notion.site/Fragerunde-1-2fc6a24f98f28007b81af7c52221e06f) | Historical MVP priorities, actors, invitation codes, D&D edition, AI, maps, audio, and Discord. Audio means transcription without commands here. |
| SRC-10 | [Requirements interview 2](https://regenblau.notion.site/Fragerunde-2-2fc6a24f98f280588c25f8be9a2b3d7e) | Historical answers include read-only table view, character ownership, campaign/session distinction, creator as DM, and group initiative. Many answers are blank; a blank is not a decision. |
| SRC-11 | [Frontend requirements](https://regenblau.notion.site/Front-End-Anforderungen-f-r-Projekt-2c56a24f98f280db9faeec1eeccdd4d9) | Player capacity, campaign visibility, campaign overview, and player management. |
| SRC-12 | [Sprint 12 backlog](https://regenblau.notion.site/Sprint-12-current-Back-Log-3436a24f98f280429f3ddc1eea1e1142) | Historical reports of slow map/campaign loading, missed updates, multiple-map work, and image handling. Reproduce or compare with source before treating reports as current defects. |
| SRC-13 | [Next-year notes](https://regenblau.notion.site/F-r-n-chstes-Jahr-36d6a24f98f280c9855adaca00771809) | Informal ideas including character privacy; these are not accepted scope. |
| SRC-14 | [Test von Indooro](https://regenblau.notion.site/Test-von-Indooro-3896a24f98f2806c81ffce9bf05b6790) | Content concerns another application's layout editor/beacons; exclude from Dicekeeper requirements unless later evidence establishes relevance. |

### Implementation findings to preserve

| Finding | Evidence | Specification consequence |
| --- | --- | --- |
| The current frontend is a JavaScript SPA; the backend uses Quarkus and PostgreSQL. | `src/main/resources/META-INF/resources/app/main.js`; `pom.xml` | Record actual architecture as context; resolve stale stack references without turning this into a framework migration. |
| OIDC login creates/synchronizes a local player; profile operations use the current identity. | `security/AuthResource.java`, `security/SecurityIdentityService.java`, `player/PlayerResource.java` under `src/main/java/` | Specify account identity, synchronization, expiry, profile privacy, and deletion boundaries. |
| Campaign creation assigns the authenticated creator as owner and DM member. | `src/main/java/campaign/CampaignResource.java`, `src/main/java/campaign/CampaignPlayer.java` | DM is campaign-specific; do not infer a global Keycloak DM role. |
| Character records have no owner field and authenticated CRUD is not scoped to an owner. | `src/main/java/character/Character.java`, `src/main/java/character/CharacterResource.java` | Ownership/privacy is a decision and implementation gap, not a requirement to preserve universal access. |
| Campaign detail hides story from non-DMs, but list endpoints return raw campaign entities. | `src/main/java/campaign/CampaignResource.java`, `src/main/java/campaign/CampaignDTO.java` | Review visibility across all read paths and record the discrepancy separately from accepted behavior. |
| Public joining checks membership/capacity; the join endpoint rejects private campaigns. | `src/main/java/campaign/CampaignPlayerResource.java` | Historical invite-code behavior is not established as implemented. |
| Character submissions use NONE/PENDING/APPROVED/REJECTED states and produce notifications. The resubmission endpoint lacks the current-player check used by submission. | `src/main/java/campaign/CampaignPlayerResource.java`, `src/main/java/notification/NotificationResource.java` | Specify transitions and permissions separately, including resubmission and edits/deletion after approval. |
| The campaign has a started flag; there is no separate persistent session entity in the inspected domain. | `src/main/java/campaign/Campaign.java`; domain inventory | Distinguish current campaign play from the future campaign/session/encounter model. |
| Turn, HP, active flags, dice, markers, fog, and map undo live in application memory. | `src/main/java/campaign/GameState.java` | Restart and multi-instance expectations require explicit decisions. Existing live state is not a durable session history. |
| Dice results are client-supplied; fog saving permits campaign members. | `src/main/java/campaign/GameActionResource.java` | Decide trust and fog authority before defining stronger contracts. |
| Voting is persisted, rejects repeat voters, resolves once the counted votes reach the total, and favors yes on a tie. Two decision APIs overlap. | `src/main/java/campaign/GroupDecision.java`, `src/main/java/campaign/GameActionResource.java`, `src/main/java/campaign/GroupDecisionResource.java` | Decide eligibility, quorum, membership changes, tie behavior, and the meaning of planning versus live decisions. |
| SSE subscription checks membership and the broadcaster includes heartbeats. | `src/main/java/campaign/GameSseResource.java`, `src/main/java/campaign/SseBroadcaster.java`, `src/main/resources/META-INF/resources/app/services/campaignEvents.js` | Specify observable synchronization, reconnect, and access-revocation behavior; static source does not demonstrate reliable delivery. |
| Player notes use localStorage; the GM chat send handler appends a local message. | `src/main/resources/META-INF/resources/app/views/PlayerView.js`, `src/main/resources/META-INF/resources/app/views/GMView.js` | Neither UI establishes server-persisted notes, multi-client chat, or an AI integration. |
| Uploads and an upload listing endpoint are public; an Imagor signing path also exists. | `src/main/java/tool/UploadServeResource.java`, `src/main/java/tool/ImagorSignedImageResource.java` | Specify access and processing separately; verify old backlog image-security reports against current source. |
| Account deletion coordinates external account deletion and local cascades. | `src/main/java/player/PlayerResource.java`, `src/main/java/player/PlayerDeletionService.java`; campaign/character deletion services | Cross-capability deletion and partial failure need scenarios. |
| Only two application test files were found in `src/test`. | SRC-06 | Mark behavior as source-observed unless a relevant test or later runtime check supports it. |

## Goals / Non-Goals

**Goals:**

- Make every task resumable from repository artifacts, with explicit evidence and decision ownership.
- Keep one canonical requirement per capability and link related views/actions to it.
- Separate observed behavior, accepted contracts, implementation gaps, and future proposals.
- Turn accepted behavior into testable OpenSpec requirements without prescribing implementation details unnecessarily.
- Make readiness auditable through source coverage, scenarios, and validation.

**Non-Goals:**

- Implementing or repairing application behavior while writing the specification.
- Replacing the framework, database, identity provider, or deployment architecture.
- Treating historical Notion answers, diagrams, or existing defects as automatically approved requirements.
- Declaring future features delivered when their planning artifacts exist.
- Producing Word/PDF exports, rewriting all diagrams, or changing OpenSpec schemas/configuration as part of this runbook.

## Decisions

### 1. Separate coordination, baseline, and product changes

This change coordinates documentation and sets `skip_specs: true`. It owns the runbook and its execution checklist, not product delta specifications. The alternative of inventing a product capability named "specification workflow" would pollute the functional specification without describing Dicekeeper behavior.

During execution, create `document-dicekeeper-baseline` with `openspec new change` after checking that the name is unused. Its proposal will list the agreed product capabilities, and tasks 2-7 will author its specs. Its checklist covers documentation and validation only. Use the CLI's resolved paths and artifact instructions; never manually scaffold a change directory.

Promote only reviewed, accepted current behavior at task 8. Do not enshrine a defect as desired behavior or silently describe an unimplemented correction as already current. Preserve a deviation in the evidence/coverage registers and create a separate corrective change when its target behavior is agreed. Main baseline specs should carry only explicitly accepted limitations; unresolved concerns stay visible in the coverage index.

Future changes hold proposed behavior and, once decisions are resolved, their own design and implementation tasks. Do not sync/archive future behavior into the baseline merely because planning is complete. Application implementation and completion of those changes happen in later work. This coordination change can finish when the specification work is reviewed, even while future product changes remain unimplemented.

### 2. Use explicit evidence and status fields

Authority for desired behavior comes from current user decisions and subsequently confirmed product decisions. Source code and tests establish evidence about implementation; diagrams establish intended scope; older Notion material supplies historical candidates. Conflicts require a recorded decision, not an automatic ranking that turns code into product intent.

Track three independent fields:

- **Scope:** current, future, excluded, unresolved.
- **Decision:** proposed, confirmed, superseded, deferred.
- **Implementation evidence:** source-observed, test-supported, runtime-verified, partial, absent, unknown. Record test commands/results when available; do not imply execution from a test file's presence.

Keep stable source IDs, decision IDs, and requirement IDs, for example `SRC-09`, `DEC-004`, `CHAR-003`. Preserve the diagram's aliases prefixed with `CUR-` or `FUT-` so aliases shared by both diagrams stay distinct. Each coverage row maps source/use case to capability, requirement/scenario references, implementation evidence, disposition, and owning task.

The alternative of a single "done" flag would conflate specified, approved, and implemented.

### 3. Keep a small shared documentation set

Create these execution outputs under `docs/specification/` in task 1 and subsequent owning tasks:

| File | Responsibility |
| --- | --- |
| `runbook.md` | Task index, dependencies, scope, and the shared execution protocol. Seed it from this design; keep this change's `tasks.md` as the execution checklist. |
| `evidence.md` | Source register, inspected revision/date, implementation findings, historical conflicts, and verification limitations. |
| `decisions.md` | Confirmed decisions, proposed defaults, unresolved questions, deferrals, rationale, and affected capabilities. |
| `coverage.md` | All 55 diagram use cases plus additional requirements discovered in code, README, or Notion, with dispositions and links. |
| `glossary.md` | Actors and domain terms, including game/campaign/session/encounter, player/account/character, and DM/display client. |
| `permissions.md` | Actor-action-data matrix, including owner, unrelated user, campaign DM/member, and display client. Reference canonical requirements. |
| `handoff.md` | Current task, last completed task, changed files, decisions, blockers, validation results, and exact next instruction. |
| `overview.md` | Human-readable functional specification entry point, linking to baseline capabilities and future changes. Avoid duplicating normative requirements. |

Use English prose by default, retaining original German source labels in the glossary/coverage matrix. This is an editorial default, not a product localization decision. Keep notes and extracted summaries relevant; do not copy credentials, environment files, or large unrelated reference texts.

### 4. Author specifications by capability

Each specification defines observable behavior: actors, preconditions, inputs, outputs, validation, permissions, state transitions, failures, persistence, deletion, and synchronization as applicable. Use `SHALL` or `MUST` and at least one `#### Scenario:` with `WHEN`/`THEN` per requirement. Add denial, invalid-input, boundary, and recovery scenarios where they matter. Avoid mechanically duplicating scenarios that add no coverage.

Use the installed OpenSpec instructions for `Purpose`, delta headers, and exact paths. Keep internal class names, code locations, technical choices, and implementation steps in the evidence/design/task artifacts. Lifecycle tables and permission matrices support the specs; they must reference rather than contradict their requirements.

Proposed flat capability paths are listed in the runbook below. Confirm them in task 1, then reuse the exact paths. Do not create duplicate capabilities per UI screen: DM/player/table views reference shared campaign and live-play behavior.

### 5. Execute the following bounded tasks

Tasks 1-8 run in order. Each row is intended for a separate conversation. Start a new task at the next incomplete checklist item if a row itself exceeds a useful conversation size. Tasks 9-14 follow their dependencies; task 15 requires each of them to be completed or explicitly deferred with an owner and reason.

| Task | Dependencies | Scope and candidate capability paths | Output / exit criterion |
| --- | --- | --- | --- |
| 1. Foundation | This proposal | Seed the documentation set, glossary, source/decision registers, all use-case aliases, and capability inventory. Check unreviewed Notion links for relevant omissions without redoing completed research. | Shared files exist; every diagram use case has an owner; baseline change is scaffolded with its proposal and capability contract. |
| 2. Accounts and permissions | 1 | `account-access`, `player-profiles`: login/logout, registration boundary, identity sync/expiry, profile/avatar, public profile fields, deletion, and campaign-specific roles. | Requirements and permission matrix distinguish unauthenticated, own-account, unrelated-user, DM/member, and display access; deletion dependencies are recorded. |
| 3. Characters | 2 | `character-library`: create/edit/select/delete, reference data, scores, ownership, visibility, validation, and unfinished drafts. | Decide ownership and record deviations; no requirement silently grants universal access because code does. Separate future progression. |
| 4. Campaigns and participation | 3 | `campaign-management`, `campaign-membership`, `character-review`, `notifications`: CRUD, visibility, capacity, public/private join, leave/kick, submit/resubmit/approve/reject, notices, and campaign start. | Lifecycle/approval transitions and all access cases are specified; invitations, edits after approval, and recipient rules have decisions or explicit deferrals. |
| 5. Maps and media | 4 | `campaign-maps`, `media-assets`: upload/process/select/delete, map limits, markers/groups, fog, undo/reset, access, and cleanup. | Rules cover invalid media, map changes, visibility, editor authority, and deletion. Separate exploration maps from any future tactical rules. |
| 6. Live play | 5 | `live-play`, `group-decisions`, `player-notes`: turn/HP/active state, dice, votes, notes, and reset. | Explicit action/transition rules, voting ties/quorum/membership changes, dice trust, and persistence; scope of overlapping decision APIs is resolved. |
| 7. Views and synchronization | 6 | `session-views`, `live-synchronization`: DM/player/table views, mobile/tablet, update propagation, reconnect, stale clients, revocation, and restart. | View matrix and recovery scenarios agree with upstream permissions/state; supported devices and measurable reliability targets are decided. |
| 8. Baseline review | 2-7 | Reconcile all current capabilities, deletion cascades, and complete journeys. | Every current use case has a disposition; accepted baseline passes review and strict validation; archive the completed documentation baseline change; corrections stay separately tracked. |
| 9. Content and session records | 8 | Future `campaign-content`, `session-records`: sessions, encounters, NPCs, places, quests, lore, notes, and event history. | Confirm included objects and lifecycle/persistence rules; record explicit decisions on items/loot and other historical candidates; create a bounded follow-on proposal or document deferral. |
| 10. Combat and progression | 8; 9 where entities are shared | Future `combat-automation`, `character-progression`: initiative, conditions/effects, advancement, boss mechanics, and manual overrides. | Rules edition, supported mechanics, initiative ties/groups, and encounter-scale expectations are confirmed; accepted scope has scenarios and a follow-on change. |
| 11. AI preparation and recaps | 9; 10 for encounter recommendations | Future `ai-campaign-assistance`, `session-recaps`: story/quest/NPC suggestions, encounter recommendations, context/lore, and summaries. | Specify allowed context, DM acceptance/editing, visibility, failures, and usage limits; planning change covers accepted scope. |
| 12. Rule assistance | 8; rules edition decision from 10 | Future `rule-assistance`: D&D 5e (2024) questions, source corpus, citations, and uncertain/conflicting answers. | Resolve source access and answer behavior before implementation tasks; produce the accepted proposal or explicit deferral. |
| 13. Audio | 9; 11 if feeding AI context | Future `audio-transcription`; conditional `voice-commands`: recording, speakers, languages, correction, retention, and optional action execution. | Decide transcription versus commands explicitly; accepted scope defines controls, failure cases, and access. A rejected/deferred command feature remains covered by its disposition. |
| 14. Discord | 8 and relevant web contracts; 13 only if Discord audio is accepted | Future `discord-integration`: account/campaign/channel association, visibility, status/rolls, reconnection, and optional audio. | Web and Discord roles agree; accepted integration scope has a proposal with explicit dependencies and acceptance scenarios. |
| 15. Final audit | 8-14, with explicit deferrals permitted | Complete source/use-case coverage, consistent contracts, overview, validation, and implementation ordering. | Documentation is coherent; each accepted implementation-ready change is free of behavior-changing open questions; deferred capabilities remain visible in the roadmap. |

The exact child change names are chosen when each accepted scope is known. Record those names in the runbook and coverage matrix. Every child change uses the appropriate OpenSpec workflow and its own instructions; this coordination change does not bypass its planning boundary.

### 6. Resolve product decisions where they become necessary

These known questions are work inputs to the named tasks. They do not block creating this documentation runbook, but they do block finalizing the affected product contract or implementation tasks. Ask one focused question at a time after checking the relevant evidence; do not repeat the unanswered historical questionnaire wholesale.

| Decision | Owning task | Why it matters |
| --- | --- | --- |
| Character ownership, DM access, and edits/deletion after approval | 3, then 4 | Notion owner-only editing conflicts with the unscoped character model and campaign review workflow. |
| Campaign story, profile fields, private maps, and upload visibility | 2, 4, 5 | Read paths currently expose different data; a permission matrix must govern all delivery paths. |
| Private campaign invitations and admission after start | 4 | Notion describes invite codes while the current join endpoint rejects private campaigns. |
| Start prerequisites and campaign versus session lifecycle | 4, then 9 | A started flag is not a persistent history of multiple sessions. |
| Fog authority, hidden information, and exploration versus tactical maps | 5 | Member-writable fog and old tactical-map exclusions need reconciliation. |
| Dice trust, vote ties/quorum, late joiners/leavers, and planning/live decisions | 6 | Existing implementation choices must be deliberately accepted or changed. |
| Persistence across refresh/device/restart and multi-instance operation | 6-7 | In-memory live state, browser-local notes, and persistent votes have different lifetimes. |
| Responsive/readable views, accessibility, and measurable performance/recovery targets | 7 | Historical mobile and usability goals need observable acceptance criteria, not vague "fast"/"real-time" requirements. |
| D&D edition, progression, conditions, and boss scope | 10 | Resolved in DEC-038–043: the edition, bounded manual combat, and tracked advancement are accepted; conditions/effects and full mechanical advancement are deferred. |
| D&D rule source corpus, access, citations, and uncertain/conflicting answers | 12 | The edition is fixed to D&D 5e (2024), but source authority and answer behavior still require a bounded contract before implementation tasks. |
| AI context visibility, lore authority, acceptance, errors, and limits | 11 | UI text/chat alone is not an AI contract; sensitive DM information must have explicit audience rules. |
| Transcription only versus executable voice commands | 13 | SRC-09 conflicts directly with SRC-03; neither is silently preferred. |
| Audio source, speaker attribution, languages, storage/retention, and correction | 13 | Determines observable capture/transcript behavior and integration requirements. |
| Discord's first supported workflows and optional audio | 14 | Historical online-play ambition does not specify an implementable integration. |

### 7. Use a repeatable handoff protocol

At the start of each task:

1. Read this change's remaining checklist plus the shared runbook, decisions, coverage, and handoff. For task 1, use this design as the seed.
2. Run `openspec list --json` and `openspec list --specs --json`; resolve and read the relevant existing change/spec artifacts in full, including scenarios. Check working-tree changes and refresh evidence for files changed since the inspected revision.
3. Work only on the next incomplete task or explicitly requested task whose dependencies are satisfied. Inspect the relevant code/docs and resolve the listed decision gates before authoring affected contracts.
4. Use the selected skill's planning/write boundaries. A proposal task produces its planning artifacts and stops; a later task authorizes application implementation separately.

At the end of each task:

1. Validate the touched change/specs, review links and requirement/scenario coverage, and distinguish syntax success from semantic completeness.
2. Update evidence, decisions, coverage, and permissions where affected. Mark checklist items done only when their stated verification passes.
3. Write the handoff: completed work, files, confirmed and pending decisions, validation commands/results, remaining items, and one exact next instruction. If blocked, record the specific decision and continue only independent work.

Reusable task instruction:

> Execute task N of `specify-dicekeeper-functionality`. Read the shared decisions, coverage, handoff, and relevant OpenSpec artifacts. For task 1, seed them from this change's design. Inspect only the source material needed for the capability. Distinguish observed behavior, accepted requirements, implementation gaps, and future proposals. Resolve blocking product decisions with focused questions. Produce the authorized documentation/planning artifacts, validate them, and update coverage and the handoff. Stop at the task boundary; do not implement application features.

### 8. Define completion through evidence and acceptance

For each authoring task, check scenario coverage of its relevant permissions, state transitions, invalid input, and recovery cases. Main current-scope journeys include:

- Sign in, create a character and campaign, join a public campaign, submit a character, reject/resubmit/approve, receive notifications, and enter the live views.
- Upload/select a map, manage markers/fog, change turns/HP, roll dice, vote, and observe the permitted information in DM/player/table clients.
- Refresh/reconnect, change membership, leave/kick, delete a character/campaign/account, and assess the expected effect on state, references, assets, and notifications.

These are scenario review targets, not claims that the flows have been exercised in this task. Runtime verification, when authorized and necessary, uses local/test data and records results; static evidence can remain explicitly marked as such.

Use these commands after artifacts exist:

```sh
openspec validate <change-name> --type change --strict --no-interactive
openspec validate --specs --strict --no-interactive
```

Final completion requires all 55 diagram use cases and every additional accepted source requirement to have a coverage disposition; normative requirements to have testable scenarios; permissions, terminology, lifecycle, and data visibility to agree across capabilities; and current versus proposed behavior to remain explicit. Do not invent latency targets, product priorities, or unconfirmed features to close checklist items. A deferred feature is accounted for but is not implementation-ready.

## Risks / Trade-offs

- **Historical material may be stale** -> Preserve dates/source IDs, confirm consequential choices, and record rejected or superseded statements.
- **Source behavior may be mistaken for intent** -> Keep the implementation status independent of the requirement decision and track corrective changes separately.
- **Parallel edits may duplicate or contradict capabilities** -> Follow the dependencies, assign one task as each capability's owner, and reconcile the shared matrices before publishing the baseline.
- **A single task may still be too large** -> Split at checklist boundaries and use the written handoff; preserve task IDs and dependencies.
- **Diagram coverage may overlook code-only functionality** -> Include deletion, notifications, uploads, failure paths, and extra source findings in the same coverage register.
- **Validation can pass incomplete requirements** -> Require semantic scenario/permission review as well as CLI validation.
- **Documentation-only completion can be confused with feature delivery** -> Keep all future implementation tasks open in their own changes and label the overview accordingly.

## Migration Plan

There is no runtime rollout or database migration. Adoption proceeds by seeding the shared documentation, authoring/reviewing the baseline change, publishing its accepted specifications at task 8, and adding future planning changes without prematurely promoting them. Verify the resulting main specs after baseline archive.

If review discovers an incorrect published baseline statement, correct it through a scoped, reviewed documentation/spec update and preserve the decision history. Do not overwrite unrelated user work or remove future plans merely to make validation pass. Existing application code remains untouched throughout this documentation effort.
