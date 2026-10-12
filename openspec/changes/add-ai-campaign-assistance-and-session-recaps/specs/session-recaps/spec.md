# session-recaps Specification

## Purpose

Defines DM-generated, reviewed, persisted, and audience-safe session summaries and next-step suggestions derived from deterministic completed-session projections without rewriting history or other authoritative state.

## ADDED Requirements

### Requirement: REC-001 DM authority and eligible session boundary
Only the authenticated owner-DM of a campaign SHALL be able to request, review, accept, replace, or delete a generated recap for that campaign. A recap request SHALL target exactly one existing `COMPLETED` or `ARCHIVED` session in that campaign. Planned or active sessions, sessions in another campaign, and missing sessions MUST NOT be submitted. Players, display clients, former members, nonmembers, guests, and unrelated DMs MUST NOT initiate recap generation or read DM-only recap drafts.

#### Scenario: DM requests a completed-session recap
- **WHEN** the owner-DM selects a completed session in their campaign and starts recap preparation
- **THEN** the system opens a DM-only recap workflow for that session

#### Scenario: Session is still active
- **WHEN** the DM attempts to generate a recap for a planned or active session
- **THEN** the system rejects the request and performs no provider call

#### Scenario: Session belongs to another campaign
- **WHEN** a DM selects a session outside the campaign they own
- **THEN** the system denies access, reveals no session context, and performs no provider call

#### Scenario: Player requests recap generation
- **WHEN** a player or display client attempts to generate, review, accept, replace, or delete a recap
- **THEN** the system denies the mutation and returns no DM-only draft or context

### Requirement: REC-002 Audience-specific recap inputs and external disclosure
Every recap request SHALL select audience `DM_ONLY` or `MEMBERS` before provider submission. A `DM_ONLY` request SHALL use only the deterministic DM-authorized projection defined by `session-records`. A `MEMBERS` request SHALL use only the deterministic member-safe projection for that completed or archived session and MUST NOT derive its text from a broader DM projection. Before submission, the system SHALL show the DM a context manifest, source revisions, selected audience, excluded categories, request-size outcome, and external-provider disclosure; only explicit confirmation SHALL transmit the package.

#### Scenario: DM prepares a private recap
- **WHEN** the DM selects `DM_ONLY`, reviews the DM projection manifest, and confirms submission
- **THEN** the system sends only the bounded DM-authorized recap-input projection to the provider

#### Scenario: DM prepares a member recap
- **WHEN** the DM selects `MEMBERS`, reviews the member-safe manifest, and confirms submission
- **THEN** the system sends only member-visible session events, encounters, and content snapshots to the provider

#### Scenario: DM changes a private draft to member audience
- **WHEN** a recap was generated from a DM-only projection and the DM later requests member publication
- **THEN** the system requires a new generation from the member-safe projection and does not relabel the broader draft

#### Scenario: DM cancels at the disclosure preview
- **WHEN** the DM does not confirm the recap context manifest
- **THEN** the system sends no session data to the provider and creates no generated draft

### Requirement: REC-003 Recap-input exclusions and source authority
Recap context SHALL preserve the effective event order and amendments supplied by `session-records`, authorized encounter summaries, and authorized content snapshots. It MUST exclude browser-local player notes, individual vote choices, account-private data, notifications, hidden map media, unselected campaign story/content, unrelated sessions, audio or transcripts, Discord data, and any raw entity outside the chosen recap projection. Effective amended history SHALL remain authoritative for recorded events; current DM-authored lore SHALL remain authoritative for current campaign truth. Generated prose and next steps SHALL never replace either authority.

#### Scenario: Session has private player notes
- **WHEN** a selected completed session's players have browser-local notes
- **THEN** no note content or note-existence signal enters the recap context, draft, accepted recap, or provider log

#### Scenario: Session event was amended
- **WHEN** the selected projection contains an amendment or redaction
- **THEN** the provider context uses the effective authorized outcome while retaining source provenance and does not restore redacted text

#### Scenario: Current lore differs from a historical snapshot
- **WHEN** current campaign lore conflicts with an event snapshot from the completed session
- **THEN** the system labels current lore and historical occurrence separately, identifies the conflict for DM review, and silently changes neither

#### Scenario: Generated recap invents an event
- **WHEN** provider output states an occurrence not supported by the selected effective history
- **THEN** the text remains an untrusted editable draft and is not appended to session history or current lore

### Requirement: REC-004 Missing, empty, or contradictory context outcome
The system MUST NOT dispatch recap generation when the selected recap projection is missing, unavailable, unauthorized, stale beyond reconciliation, or contains no event or narrative context from which a recap can be grounded. It SHALL identify the missing input for the DM without exposing hidden data. When authorized sources conflict, the system MAY submit them only with explicit provenance and a conflict marker after DM confirmation; the resulting draft SHALL remain flagged until the DM edits or explicitly accepts the unresolved interpretation.

#### Scenario: Recap projection is unavailable
- **WHEN** the completed session exists but its required authorized recap-input projection cannot be produced
- **THEN** the system reports the missing context, performs no provider call, and creates no ready recap

#### Scenario: Completed session has no recap evidence
- **WHEN** the selected projection contains no effective event or authorized narrative context
- **THEN** the system reports that recap generation lacks context instead of asking the provider to invent a session

#### Scenario: Authorized sources contradict one another
- **WHEN** the manifest contains conflicting lore or history sources and the DM confirms submission with that conflict
- **THEN** the system preserves each source's provenance and flags the returned draft for explicit DM resolution

#### Scenario: DM declines contradictory input
- **WHEN** the DM does not confirm a context package containing a detected conflict
- **THEN** the system performs no provider call and leaves every source unchanged

### Requirement: REC-005 Draft review, editing, rejection, and acceptance
Provider output SHALL first become a DM-only recap draft containing a summary and optional next-step suggestions plus the source-manifest fingerprint, source revisions, selected audience, provider/configuration identifier, creation time, idempotency identity, usage outcome, and explicit AI/untrusted label. The DM SHALL be able to edit the draft as plain text, reject it, or explicitly accept the reviewed version. Rejection SHALL create no published recap. Acceptance SHALL persist one immutable reviewed version linked to the session and MUST NOT append a session event, amend history, change lore, create content, or mutate combat, character, progression, item, or rule state.

#### Scenario: Provider returns a recap
- **WHEN** a confirmed recap request succeeds
- **THEN** the system creates one DM-only editable draft with summary, optional next steps, provenance, selected audience, and AI labeling

#### Scenario: DM rejects a recap draft
- **WHEN** the DM rejects the generated or edited draft
- **THEN** the system records rejection, publishes no recap, and changes no authoritative source

#### Scenario: DM edits and accepts a recap
- **WHEN** the DM edits a current draft and explicitly accepts the reviewed text
- **THEN** the system persists that exact reviewed version once and preserves its source/provenance link

#### Scenario: Acceptance is retried
- **WHEN** the same accepted version is submitted again with the same idempotency identity
- **THEN** the system returns the original accepted recap without creating another version or domain mutation

### Requirement: REC-006 Recap audience and member publication
An accepted `DM_ONLY` recap SHALL be readable only by the campaign DM. An accepted `MEMBERS` recap, generated solely from the member-safe projection, SHALL become readable after explicit DM publication by current campaign members through a server-derived member projection. Former members, nonmembers, guests, unrelated DMs, and the current display client MUST NOT receive either recap. The member projection MUST omit provider diagnostics, DM instructions, rejected text, DM-only provenance details, and any field not permitted by the selected member-safe sources.

#### Scenario: DM reads a private accepted recap
- **WHEN** the owner-DM requests an accepted `DM_ONLY` recap
- **THEN** the system returns its reviewed text and DM-authorized provenance

#### Scenario: Current member reads a published recap
- **WHEN** a current member requests an accepted and published `MEMBERS` recap for a shared completed session
- **THEN** the system returns only the reviewed member text and safe source attribution

#### Scenario: Member requests a private or unpublished recap
- **WHEN** a player requests a `DM_ONLY`, draft, rejected, or not-yet-published recap
- **THEN** the system returns no recap text or existence detail outside that player's authorized projection

#### Scenario: Former member reuses recap access
- **WHEN** membership is removed after a member recap was published
- **THEN** later recap reads are denied and no protected recap content is returned

#### Scenario: Table projection requests recaps
- **WHEN** the current display client requests a session recap
- **THEN** the system returns no recap through this capability

### Requirement: REC-007 Source revision, staleness, and replacement
Before acceptance, the system SHALL verify that the recap draft's source-manifest fingerprint and source revisions still match the authorized effective session projection. An intervening amendment, redaction, audience reduction, content change that affects the projection, or loss of authorization SHALL mark the draft stale and block acceptance until regeneration from a current projection. An accepted recap SHALL preserve its reviewed text and source revision rather than silently rewriting itself after later amendments. The DM MAY generate and accept a replacement from the new projection; member publication SHALL identify only the current accepted version.

#### Scenario: Session event changes before acceptance
- **WHEN** an event amendment or redaction changes the effective projection after recap generation but before acceptance
- **THEN** the system marks the draft stale and requires regeneration before it can be accepted

#### Scenario: Audience narrows before member acceptance
- **WHEN** a selected source becomes DM-only after a member recap draft was generated
- **THEN** the system blocks acceptance/publication and regenerates only from the current member-safe projection after confirmation

#### Scenario: Source changes after acceptance
- **WHEN** history is amended after a recap was accepted
- **THEN** the system preserves the accepted version and source revision, identifies that a newer source projection exists, and does not rewrite the recap silently

#### Scenario: DM accepts a replacement
- **WHEN** the DM generates and accepts a revised recap from the current source projection
- **THEN** the system stores a new reviewed version and makes only that version current for later member publication

### Requirement: REC-008 Provider failure and usage-capacity behavior
Session recap generation SHALL use the provider failure, idempotency, and finite configured usage/capacity policy defined by `ai-campaign-assistance`. A provider-disabled state, authentication/configuration error, timeout, malformed response, rate limit, oversized context, exhausted configured capacity, or unavailable provider capacity MUST NOT produce a ready recap or consume a second reservation for the same logical attempt. Existing accepted recaps and authoritative session records SHALL remain unchanged.

#### Scenario: Provider fails during recap generation
- **WHEN** a dispatched recap request times out, fails authentication, returns a malformed response, or is rate-limited
- **THEN** the system reports an explicit failure, creates no ready recap, and changes no existing recap or session record

#### Scenario: Recap context exceeds the configured limit
- **WHEN** the selected completed-session projection is larger than the configured request maximum
- **THEN** the system performs no provider call and directs the DM to use an accepted bounded context option rather than silently truncating history

#### Scenario: Recap capacity is unavailable
- **WHEN** the configured usage pool or provider capacity cannot accept another recap request
- **THEN** the system reports recap generation unavailable and sends no session data

#### Scenario: Same recap request is retried
- **WHEN** the same logical recap attempt is delivered more than once with one idempotency identity
- **THEN** the system resolves one provider dispatch, one usage reservation, and at most one ready draft

### Requirement: REC-009 Persistence, deletion, and scope boundary
Accepted recap versions, selected audience, publication state, provenance, and source revisions SHALL persist across browser, device, service restart, and deployment replacement until the owning campaign is deleted. The DM SHALL be able to delete an unaccepted draft after confirmation and SHALL be able to retire a current accepted recap by replacing it; ordinary deletion MUST NOT erase or rewrite session history. Campaign deletion SHALL remove every owned recap and draft through required persistent cleanup, and a cleanup failure MUST produce an incomplete outcome. This capability SHALL NOT transcribe audio, answer rules, publish to Discord, update quests/lore automatically, award items or progression, or rebuild missing history.

#### Scenario: Service restarts after recap acceptance
- **WHEN** the application restarts after a recap has been accepted or published
- **THEN** the system restores the reviewed text, audience, publication state, provenance, and source revision

#### Scenario: DM deletes an unaccepted draft
- **WHEN** the DM confirms deletion of a draft that has not been accepted
- **THEN** the system removes the draft content without deleting provider-accounting metadata required for audit or changing session history

#### Scenario: Campaign is deleted
- **WHEN** campaign deletion completes with required persistent cleanup
- **THEN** the system removes that campaign's recap drafts and accepted versions without affecting another campaign

#### Scenario: Caller requests automatic next-step execution
- **WHEN** generated next steps describe a quest, encounter, item, reward, rule, combat change, or character advancement
- **THEN** the system preserves them only as reviewed recap prose and applies no product-state mutation
