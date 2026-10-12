# ai-campaign-assistance Specification

## Purpose

Defines DM-controlled external-AI assistance for campaign preparation, including authorized context selection, lore authority, suggestion review, explicit commit boundaries, provider failures, and finite usage controls.

## ADDED Requirements

### Requirement: AIA-001 DM authority and supported preparation purposes
Only the authenticated owner-DM of a campaign SHALL be able to request AI campaign assistance for that campaign. A request SHALL have exactly one supported purpose: story/quest/twist ideas, NPC/place ideas, or encounter/boss preparation advice. Players, display clients, former members, nonmembers, guests, and DMs of another campaign MUST NOT request, read, review, or apply that campaign's suggestions. The current local DM chat panel MUST NOT be treated as an AI request or provider integration.

#### Scenario: DM requests story assistance
- **WHEN** the authenticated owner-DM starts a story, quest, or twist request for their campaign
- **THEN** the system opens a DM-only preparation workflow for that supported purpose

#### Scenario: DM requests encounter advice
- **WHEN** the authenticated owner-DM starts an encounter or boss-preparation request for their campaign
- **THEN** the system opens a DM-only advice workflow without starting an encounter or changing combat state

#### Scenario: Non-DM requests assistance
- **WHEN** a player, display client, former member, nonmember, guest, or unrelated DM requests or reads campaign assistance
- **THEN** the system denies the action and returns no request, context, suggestion, or provider detail

#### Scenario: Text is entered in the local chat panel
- **WHEN** the DM enters text in the current local-only chat panel
- **THEN** the system does not submit that text to an AI provider or represent it as a persisted AI request

### Requirement: AIA-002 Explicit context selection and provider submission
Every assistance request SHALL contain nonblank DM instructions and an explicit selection of authorized source projections. Supported inputs SHALL be limited to selected campaign metadata and DM-only story, selected NPC/place/quest/lore records, selected session or encounter metadata and effective history, and selected DM-authorized character or bounded combat projections needed for the chosen purpose. Before external submission, the system SHALL show the DM a context manifest identifying the selected sources, their audience and revisions, the configured external-provider disclosure, and the request-size outcome. Only an explicit DM confirmation of that manifest SHALL submit the request; merely viewing or selecting context MUST NOT transmit it.

#### Scenario: DM confirms a selected context package
- **WHEN** the DM supplies valid instructions, selects authorized same-campaign sources, reviews the manifest, and explicitly confirms submission
- **THEN** the system sends only that bounded context package and the instructions to the configured provider once

#### Scenario: DM does not confirm submission
- **WHEN** the DM previews a context manifest but cancels or leaves before confirmation
- **THEN** the system sends no campaign data or instructions to the provider and consumes no dispatched-request allowance

#### Scenario: Selected source belongs to another campaign
- **WHEN** the request selects a story, content record, session, encounter, character reference, or combat projection outside the DM's campaign
- **THEN** the system rejects the request, discloses no target data, and performs no provider call

#### Scenario: Required context is unavailable
- **WHEN** a selected source is missing, no longer authorized, stale beyond reconciliation, or required future capability data is not implemented or available
- **THEN** the system identifies the unavailable input, performs no provider call, and creates no ready suggestion

### Requirement: AIA-003 Least-data provider boundary
The provider context SHALL contain only the fields exposed by the selected owning capability's DM-authorized projection and needed for the chosen purpose. It MUST exclude account email and settings, provider identity claims, notifications, individual vote choices, browser-local player notes, unrelated characters or campaigns, raw or hidden map media, unselected campaign story/content, audio or transcripts, Discord data, credentials, secrets, and internal raw entities. Selecting a record SHALL NOT implicitly select every linked record; each additional source or bounded derived projection MUST be visible in the manifest.

#### Scenario: Selected NPC references hidden campaign data
- **WHEN** a selected NPC has relationships or source fields not needed or not selected for the request
- **THEN** the provider context omits those fields and does not traverse them implicitly

#### Scenario: Player notes exist in the campaign
- **WHEN** one or more campaign members have browser-local notes while the DM submits an AI request
- **THEN** no note content or note-existence signal enters the manifest, provider request, suggestion, or audit record

#### Scenario: Character context is selected
- **WHEN** encounter advice needs approved participant information
- **THEN** the system uses only the authorized bounded character or combat projection and omits account-private data, unrelated character sheets, and progression history not required by the request

#### Scenario: Hidden media is linked
- **WHEN** a selected place, encounter, or campaign record references original or fog-hidden map media
- **THEN** the system sends no raw or hidden media through this capability

### Requirement: AIA-004 Lore and history authority
Current DM-authored campaign story and campaign-content records SHALL remain the authority for current campaign lore, while the effective amended session-event projection SHALL remain the authority for what the durable history records as having occurred. Generated text SHALL be an untrusted suggestion and MUST NOT become lore, history, a rule answer, or deterministic state merely because a provider returned it. When selected current lore conflicts with an immutable historical snapshot or two selected authoritative records disagree, the system SHALL identify the sources and conflict for DM resolution and MUST NOT silently choose, merge, or overwrite either authority.

#### Scenario: Suggestion agrees with selected lore
- **WHEN** the provider returns a suggestion consistent with the selected current lore and historical context
- **THEN** the system still labels it as a non-authoritative DM-review draft

#### Scenario: Current lore and historical snapshot conflict
- **WHEN** selected current lore differs from an audience-authorized snapshot recorded in session history
- **THEN** the system preserves both with their provenance, identifies the conflict, and requires the DM to resolve it outside the provider response

#### Scenario: Provider contradicts campaign lore
- **WHEN** a generated suggestion contradicts a selected authoritative campaign fact
- **THEN** the suggestion remains an editable or rejectable draft and changes no authoritative record

#### Scenario: Provider states a game rule
- **WHEN** generated preparation text contains a D&D rule claim or calculation
- **THEN** the system labels it as unverified suggestion text and does not treat it as a rule answer or deterministic combat instruction

### Requirement: AIA-005 Suggestion provenance and DM-only draft lifecycle
An assistance attempt SHALL have a server-assigned identity, campaign and DM identity, purpose, context-manifest fingerprint, source revisions, creation time, idempotency identity, provider/configuration identifier, usage outcome, and status `PENDING`, `READY`, `FAILED`, `REJECTED`, or `ACCEPTED`. Provider output SHALL first become a `READY` DM-only draft with visible provenance and limitations. Until a separate accepted publication or commit defined by AIA-006 succeeds, no campaign member, display client, or unrelated caller SHALL receive the instructions, selected DM-only context, provider output, or edited draft.

#### Scenario: Provider returns a suggestion
- **WHEN** the confirmed provider request succeeds
- **THEN** the system stores one `READY` DM-only draft with its manifest fingerprint, source revisions, provider/configuration identifier, and recorded usage outcome

#### Scenario: Player requests a ready draft
- **WHEN** a current campaign player requests a `READY`, `REJECTED`, or `ACCEPTED` assistance record
- **THEN** the system returns no draft text, DM instructions, DM-only context, or provider detail

#### Scenario: Request is still pending
- **WHEN** no final provider success or failure has been recorded
- **THEN** the DM sees an explicit pending outcome and no invented or partial suggestion

#### Scenario: Provider omits provenance metadata
- **WHEN** the configured provider cannot return a model or usage field
- **THEN** the system records that field as unavailable, retains its own configuration and context provenance, and does not invent a value

### Requirement: AIA-006 DM review, rejection, acceptance, and ordinary-domain commit
The campaign DM SHALL be able to edit a `READY` suggestion as plain text, reject it, or accept the reviewed text. Rejection SHALL change no campaign, content, session, encounter, combat, character, or progression state. Acceptance SHALL preserve an immutable snapshot of the reviewed text and provenance but SHALL NOT by itself mutate another capability. For story, NPC, place, or quest assistance, the DM MAY perform a separate explicit commit that revalidates the accepted snapshot and applies it through `campaign-management` or `campaign-content`; a failed validation or commit SHALL leave the authoritative record unchanged and the accepted suggestion available for correction. Encounter or boss advice SHALL remain a planning suggestion: the DM MUST use separately authorized `session-records` and `combat-automation` commands to create or change encounter/combat state.

#### Scenario: DM rejects a suggestion
- **WHEN** the DM rejects a ready story, content, or encounter suggestion
- **THEN** the system marks it `REJECTED`, changes no authoritative domain state, and offers no member publication

#### Scenario: DM edits and accepts a quest suggestion
- **WHEN** the DM edits a ready quest suggestion and explicitly accepts the reviewed text
- **THEN** the system records one `ACCEPTED` reviewed snapshot without yet creating or changing a quest

#### Scenario: DM commits accepted campaign content
- **WHEN** the DM separately confirms a valid commit of an accepted NPC, place, quest, or story suggestion
- **THEN** the owning capability validates and applies that ordinary-domain mutation while preserving the AI provenance as an audit reference

#### Scenario: Accepted content fails validation
- **WHEN** an accepted suggestion has invalid fields, stale targets, or unauthorized references at commit time
- **THEN** the system rejects the domain mutation, preserves the prior authoritative state, and returns the suggestion for DM correction

#### Scenario: DM accepts encounter advice
- **WHEN** the DM accepts generated enemy, encounter, boss, or balance advice
- **THEN** the system preserves it as reviewed preparation text and does not add combatants, set initiative or HP, reveal phases, change encounters, or mutate player characters

### Requirement: AIA-007 Provider failures, retries, and idempotency
A provider-disabled state, authentication/configuration error, timeout, unavailable response, rate limit, malformed response, or rejected request SHALL produce an explicit failed or unavailable outcome and MUST NOT create a `READY` draft or mutate authoritative product state. A retry with the same request idempotency identity SHALL resolve to the original dispatched attempt or its recorded final outcome rather than dispatching or charging the same logical request twice. A deliberate retry after a final retryable failure SHALL require a new attempt identity while retaining the failed attempt for DM-visible diagnosis without protected provider payloads in ordinary logs.

#### Scenario: Provider is disabled or misconfigured
- **WHEN** the DM confirms submission while no usable provider configuration is enabled
- **THEN** the system reports assistance unavailable, sends no context, creates no ready draft, and changes no campaign state

#### Scenario: Provider times out or rate-limits
- **WHEN** a dispatched request times out or the provider reports unavailable capacity or a rate limit
- **THEN** the system records an explicit retryable failure and returns no partial provider text as a ready suggestion

#### Scenario: Same request is delivered twice
- **WHEN** the confirmed request is retried with the same idempotency identity
- **THEN** the system returns the same pending or final outcome without a duplicate provider dispatch, draft, or usage reservation

#### Scenario: DM starts a deliberate retry
- **WHEN** the DM retries a final retryable failure with a new attempt identity
- **THEN** the system performs a new preflight and context-revision check before any provider dispatch

### Requirement: AIA-008 Finite usage and capacity policy
AI assistance SHALL be disabled until a finite server-configured policy defines at least maximum request context, maximum output, and an available usage/cost capacity pool. Before dispatch, the system SHALL report whether the request fits those configured limits and whether capacity is available; it SHALL reject an oversized request, disabled capability, exhausted pool, or unavailable provider capacity without transmission. A dispatched logical attempt SHALL reserve and account for capacity at most once, finalize the provider-reported usage when available, and release a reservation only when the system can establish that no provider dispatch occurred. Exact numeric allowances, accounting scope, provider model/version, timeout, and monetary threshold MUST NOT be inferred from historical text and SHALL be selected before production enablement.

#### Scenario: Request fits configured limits
- **WHEN** the confirmed context and requested output fit the configured maxima and capacity is available
- **THEN** the system reserves the logical attempt once and may dispatch it to the configured provider

#### Scenario: Context exceeds the configured maximum
- **WHEN** the selected context is larger than the configured request limit
- **THEN** the system identifies the limit outcome, performs no provider call, and allows the DM to remove selected sources

#### Scenario: Usage capacity is exhausted
- **WHEN** no configured capacity remains for the request's accounting scope
- **THEN** the system reports AI capacity unavailable, sends no context, and creates no ready suggestion

#### Scenario: Provider usage is unavailable
- **WHEN** a completed provider response does not report exact token or cost usage
- **THEN** the system records usage as unavailable under the configured fallback accounting rule and does not fabricate a provider value

#### Scenario: Production limits have not been chosen
- **WHEN** deployment attempts to enable AI assistance without finite numeric limits and an accounting scope
- **THEN** the capability remains disabled rather than assuming an unlimited or zero-cost service

### Requirement: AIA-009 Deferred and prohibited assistance scope
This capability SHALL NOT answer rule questions, select a licensed rules corpus, ingest audio or transcripts, publish to Discord, generate character portraits, create a reusable monster library, create items/loot/rewards, apply conditions/effects, perform full character progression, execute voice commands, act as an autonomous DM, or mutate deterministic combat or character state. A later change admitting any such behavior MUST define its own sources, authority, audience, acceptance, failure, retention, and usage boundaries.

#### Scenario: DM requests a rule answer
- **WHEN** the DM asks campaign assistance to provide an authoritative D&D rule answer or citation
- **THEN** the system declines that authority and leaves the workflow to `rule-assistance`

#### Scenario: DM selects an audio transcript
- **WHEN** the DM attempts to include captured audio or a transcript before a separately accepted audio-to-AI contract exists
- **THEN** the system excludes it from context and performs no implicit transcript ingestion

#### Scenario: Suggestion includes loot or a condition
- **WHEN** generated text describes an item, reward, condition, effect, or complete level-up choice
- **THEN** the text remains non-authoritative narrative suggestion and creates no corresponding product state

#### Scenario: Caller requests autonomous combat changes
- **WHEN** a caller asks the provider response to change initiative, turns, HP, boss state, progression, or another deterministic value automatically
- **THEN** the system performs no such mutation and requires the owning manual workflow
