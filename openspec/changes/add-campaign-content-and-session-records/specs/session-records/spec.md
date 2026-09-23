# session-records Specification

## Purpose

Defines durable play sessions, optional encounter records, audience-safe event history, correction, retention, deletion, and downstream recap-input projections within a campaign.

## ADDED Requirements

### Requirement: SES-001 Campaign, session, and encounter hierarchy
A campaign SHALL remain the durable top-level story and membership container. A session SHALL represent one bounded play occurrence within exactly one campaign, and one campaign MAY contain multiple sessions. An encounter SHALL be an optional bounded segment within exactly one session; one session MAY contain no encounters or multiple encounters. Creating a session or encounter MUST NOT replace the campaign's one-way started state, reconstruct ephemeral live-play state, or imply combat automation.

#### Scenario: Campaign contains multiple play occurrences
- **WHEN** the campaign DM creates records for separate dates or meetings in one campaign
- **THEN** the system stores distinct sessions under that campaign without creating additional campaigns

#### Scenario: Session has no encounter
- **WHEN** a play occurrence contains exploration or narrative play without a bounded encounter
- **THEN** the system permits the session to progress and complete with no encounter record

#### Scenario: Encounter belongs to one session
- **WHEN** the DM creates an encounter for a session
- **THEN** the system assigns it to that session and its campaign and does not expose it as a campaign or standalone session

#### Scenario: Caller requests automated combat behavior
- **WHEN** a caller creates an encounter and expects initiative, conditions, attacks, damage, boss phases, or tactical enforcement
- **THEN** the system creates no such rule behavior and leaves it to the future `combat-automation` capability

### Requirement: SES-002 Session creation, metadata, and lifecycle
Only the authenticated campaign DM SHALL be able to create or change a session. A valid session SHALL have a nonblank trimmed title, optional planned and actual times, optional DM notes within a finite configured limit, audience `DM_ONLY` or `MEMBERS`, server-derived identifiers and timestamps, and status `PLANNED`, `ACTIVE`, `COMPLETED`, or `ARCHIVED`. The allowed transitions SHALL be `PLANNED -> ACTIVE`, `PLANNED -> ARCHIVED`, `ACTIVE -> COMPLETED`, and `COMPLETED -> ARCHIVED`. Activating a session SHALL require its campaign to be started and SHALL require no other active session in that campaign. Every unlisted transition MUST be rejected without changing the session.

#### Scenario: DM creates a planned session
- **WHEN** the campaign DM submits valid session metadata
- **THEN** the system stores one durable `PLANNED` session under that campaign with server-derived identity and creation time

#### Scenario: DM activates a planned session
- **WHEN** the campaign is started, no other session is active, and the DM activates a planned session
- **THEN** the system changes that session to `ACTIVE` and records its actual start time

#### Scenario: Campaign has not started
- **WHEN** the DM attempts to activate a session for a campaign whose started state is false
- **THEN** the system rejects activation and leaves the session `PLANNED`

#### Scenario: Another session is active
- **WHEN** the DM attempts to activate a second session while the campaign already has an `ACTIVE` session
- **THEN** the system rejects activation and preserves both sessions and the current active session

#### Scenario: DM completes an active session
- **WHEN** the DM completes the campaign's active session
- **THEN** the system changes it to `COMPLETED`, records its completion time, closes any still-active encounter, and accepts no new ordinary events afterward

#### Scenario: Caller attempts an unlisted transition
- **WHEN** a caller attempts to reactivate a completed or archived session, complete a planned session, or otherwise bypass the lifecycle
- **THEN** the system rejects the transition and preserves metadata, events, encounters, and timestamps

### Requirement: SES-003 Session updates, archival, and deletion
The campaign DM SHALL be able to update valid metadata and audience for a planned or active session. After completion, the DM MAY correct descriptive metadata without changing lifecycle timestamps or event history. Archival SHALL preserve the complete session, encounters, references, and history while removing it from active/default member lists. A session MAY be permanently deleted only after explicit confirmation when it has never been active and has no encounter or event history. Completed, active, historically referenced, or archived sessions MUST NOT be hard-deleted independently; campaign deletion remains their terminal cleanup owner.

#### Scenario: DM updates planned session metadata
- **WHEN** the DM submits valid metadata for a planned session
- **THEN** the system stores the complete update while preserving campaign ownership and identity

#### Scenario: DM archives a completed session
- **WHEN** the DM archives a completed session
- **THEN** the system preserves its metadata, encounters, references, and event history and removes it from active/default member lists

#### Scenario: DM deletes an unused planned session
- **WHEN** the DM confirms deletion of a planned session that was never active and has no encounter or event
- **THEN** the system permanently removes that session and no other campaign record

#### Scenario: DM attempts to delete recorded history
- **WHEN** the DM attempts to hard-delete an active, completed, archived, encountered, or event-bearing session
- **THEN** the system rejects deletion and preserves the durable record

#### Scenario: Non-DM attempts session mutation
- **WHEN** a campaign member, nonmember, former member, guest, or display client attempts to create, update, archive, or delete a session
- **THEN** the system denies the operation and changes no session record

### Requirement: SES-004 Encounter records and lifecycle
Only the campaign DM SHALL be able to create or change an encounter in a session. An encounter SHALL have a nonblank trimmed name, optional description, audience `DM_ONLY` or `MEMBERS`, optional same-campaign content, map, member, or character references, and status `PLANNED`, `ACTIVE`, `COMPLETED`, or `ARCHIVED`. The allowed transitions SHALL be `PLANNED -> ACTIVE`, `PLANNED -> ARCHIVED`, `ACTIVE -> COMPLETED`, and `COMPLETED -> ARCHIVED`. Activation SHALL require the owning session to be `ACTIVE` and no other active encounter in that session. Encounter archival and deletion SHALL follow the same preservation rule as sessions: only a never-active planned encounter with no event history MAY be permanently deleted after confirmation.

#### Scenario: DM plans an encounter
- **WHEN** the DM creates a valid encounter with authorized same-campaign references
- **THEN** the system stores it as `PLANNED` under the selected session

#### Scenario: DM activates an encounter
- **WHEN** its session is active and no other encounter in that session is active
- **THEN** the system changes the encounter to `ACTIVE` and appends the lifecycle event defined by SES-006

#### Scenario: Encounter targets another campaign
- **WHEN** an encounter references content, a map, membership, character, or session outside its owning campaign
- **THEN** the system rejects the operation and changes no encounter or target

#### Scenario: Session is not active
- **WHEN** the DM attempts to activate an encounter in a planned, completed, or archived session
- **THEN** the system rejects activation and preserves the encounter as planned

#### Scenario: Session completes with an active encounter
- **WHEN** the DM completes a session while one encounter remains active
- **THEN** the system completes that encounter first with the same completion time and then completes the session

### Requirement: SES-005 Session and encounter audience
The campaign DM SHALL receive the complete authorized session, encounter, and event record for their campaign. A current campaign member SHALL receive only sessions and encounters with audience `MEMBERS` plus member-visible event projections; DM notes, DM-only content, hidden encounter references, private vote choices, account-private data, notifications, and another player's browser-local notes MUST be omitted. Former members, nonmembers, guests, and unrelated DMs MUST NOT receive session records. The current display client SHALL receive no session or encounter history unless a later accepted view change defines a bounded projection.

#### Scenario: Member reads a shared completed session
- **WHEN** a current campaign member requests a completed session with audience `MEMBERS`
- **THEN** the system returns its member-visible metadata, encounters, and event projections without DM-only fields

#### Scenario: Member requests a private session
- **WHEN** an ordinary member requests a `DM_ONLY` session or encounter
- **THEN** the system returns no private record or hidden-reference detail

#### Scenario: Former member requests session history
- **WHEN** a player whose campaign membership was removed requests any member session record
- **THEN** the system denies access and returns no history

#### Scenario: Table projection requests session history
- **WHEN** the current shared table client requests session, encounter, or event-history data
- **THEN** the system returns no record through this capability

### Requirement: SES-006 Ordered durable event history
Each active session SHALL own an append-only event history with a monotonically ordered campaign-session sequence. Every event SHALL contain a server-assigned identifier, session and campaign identifiers, server-recorded time, authenticated actor or system attribution, supported event kind, audience, and an immutable audience-safe payload; it MAY reference the active encounter and same-campaign content. Successful session and encounter lifecycle changes and DM-authored narrative entries SHALL append events. When later integration records a committed map, turn, HP, activity, dice, or group-decision outcome during an active session, it SHALL append exactly one event only after the source mutation is accepted. Failed or rolled-back actions MUST append no success event, and a retried request MUST NOT duplicate history.

#### Scenario: DM records a narrative event
- **WHEN** the DM adds a valid manual narrative entry to an active session
- **THEN** the system appends one ordered event attributed to that DM with the selected audience

#### Scenario: Supported play mutation commits
- **WHEN** an integrated turn, HP, activity, dice, map, or decision mutation succeeds during an active session
- **THEN** the system appends exactly one ordered event containing only the authorized historical projection of that outcome

#### Scenario: Play mutation fails
- **WHEN** an integrated source mutation is denied, invalid, or rolled back
- **THEN** the system appends no successful history event

#### Scenario: Event request is retried
- **WHEN** the same accepted mutation or manual-entry request is delivered more than once with the same idempotency identity
- **THEN** the history contains one event and its sequence remains stable

#### Scenario: No session is active
- **WHEN** current live-play behavior occurs while the campaign has no active session
- **THEN** the existing live behavior follows its owning capability and no durable session event is invented

#### Scenario: Player note changes
- **WHEN** a player edits their browser-local campaign note during an active session
- **THEN** no player-note text or note-existence event is appended to session history

### Requirement: SES-007 Immutable events, amendments, and visibility reduction
A stored event's actor, ordering, original time, kind, and payload MUST NOT be edited in place. Only the campaign DM SHALL be able to correct or redact an event, and each correction or redaction SHALL append an immutable amendment that identifies the target event, reason, actor, time, and replacement member-visible projection or redacted state. A redaction SHALL remove protected content from later authorized projections without renumbering history or erasing the fact that an amendment occurred. The system MUST NOT use an amendment to forge another actor, change the source domain outcome, or expose data to a broader audience than the original event and referenced records permit.

#### Scenario: DM corrects a narrative detail
- **WHEN** the DM submits a reasoned correction for an existing event in their campaign
- **THEN** the system appends an amendment and later projections show the corrected interpretation while retaining the original audit chain for the DM

#### Scenario: DM redacts member-visible text
- **WHEN** the DM redacts protected text from an event that was visible to members
- **THEN** later member projections show a redacted event at the same sequence position and no longer expose the protected text

#### Scenario: Member attempts event correction
- **WHEN** an ordinary member attempts to edit, correct, redact, reorder, or delete an event
- **THEN** the system denies the operation and preserves the history

#### Scenario: Amendment broadens audience
- **WHEN** a correction attempts to make DM-only or hidden referenced data visible to members
- **THEN** the system rejects that broader projection and preserves the existing authorization boundary

### Requirement: SES-008 Durable persistence and lifecycle cleanup
Sessions, encounters, event sequences, amendments, audiences, and references SHALL persist across browser, device, application restart, and deployment replacement until campaign deletion. They SHALL NOT be reconstructed from browser caches or ephemeral live state after loss. Archiving SHALL not shorten this lifetime. Campaign deletion SHALL remove all owned session records and history together with the campaign; failure of required persistent cleanup MUST produce an incomplete outcome rather than a successful deletion claim.

#### Scenario: Application restarts during an active session
- **WHEN** the application restarts and the campaign and active session still exist
- **THEN** the system restores the durable session, encounter, events, amendments, audiences, and sequence while current ephemeral live values follow their own recovery contract

#### Scenario: Live runtime is lost
- **WHEN** ephemeral turn, HP, activity, dice, marker, or fog state is unavailable after restart
- **THEN** the system preserves recorded history but does not replay it as authoritative current live state

#### Scenario: Campaign is deleted
- **WHEN** campaign deletion completes with all required persistent cleanup
- **THEN** the system removes that campaign's sessions, encounters, events, amendments, and references and does not affect another campaign

#### Scenario: Session cleanup fails during campaign deletion
- **WHEN** required persistent session-record cleanup fails
- **THEN** the campaign-deletion workflow reports an incomplete outcome or durable cleanup obligation and does not claim complete deletion

### Requirement: SES-009 Downstream recap-input projections
For a selected completed or archived session, Dicekeeper SHALL be able to produce a deterministic DM-authorized recap-input projection containing session metadata, ordered effective events with amendment outcomes, authorized encounter summaries, and authorized snapshots of referenced campaign content. A member-safe projection SHALL contain only data that the requesting member could read from `MEMBERS` records and event audiences. The projection MUST exclude browser-local player notes, individual vote choices, account-private data, notifications, hidden map media, unselected campaign story, and any audio transcript or external data not accepted by a later capability. Producing the projection SHALL not call an AI provider, create a recap, or change the source records.

#### Scenario: DM requests recap inputs
- **WHEN** the campaign DM selects a completed session for downstream recap preparation
- **THEN** the system returns its ordered effective history and DM-authorized referenced context without generating a recap

#### Scenario: Member-safe recap inputs are requested
- **WHEN** an authorized current member requests the member-safe projection for a shared completed session
- **THEN** the system returns only member-visible events, encounters, and content snapshots and omits every DM-only or private field

#### Scenario: Referenced content is later archived or renamed
- **WHEN** a projection includes an event snapshot whose source content has since changed or been archived
- **THEN** the projection preserves the recorded snapshot and may separately identify the current reference state without rewriting the event

#### Scenario: Future AI recap is requested
- **WHEN** a caller requests generated prose, next steps, or provider submission from recap inputs
- **THEN** this capability performs no generation or transmission and leaves that behavior to the future `session-recaps` contract

### Requirement: SES-010 Scope boundary for deferred features
Session and encounter records SHALL organize durable history and references only. They MUST NOT define initiative calculation, conditions or effects, attacks, damage automation, boss mechanics, character advancement, items or loot, AI suggestions or recap generation, audio capture or transcription, rule answers, Discord delivery, or a new anonymous/shared-view identity. Those behaviors require their separately accepted future capabilities. Manual narrative events MAY describe game fiction but MUST NOT mutate another capability's authoritative state.

#### Scenario: DM records a spell or reward in narrative text
- **WHEN** the DM adds a manual event describing a spell, treasure, or other fictional outcome
- **THEN** the system preserves it as plain narrative history without creating a rules-engine effect, item record, inventory transfer, or character mutation

#### Scenario: Caller requests automated recap or transcription
- **WHEN** a caller asks session records to transcribe audio or generate a summary and next steps
- **THEN** the system does not claim that behavior and exposes only the bounded downstream input projection

#### Scenario: Caller requests item or loot management
- **WHEN** a caller attempts to create, assign, equip, transfer, or consume an item through session records
- **THEN** the system rejects the operation because items and loot remain deferred
