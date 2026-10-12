# audio-transcription Specification

## Purpose

Defines consented active-session microphone transcription, including capture controls, language and provider boundaries, speaker labeling, transcript review/audience/correction/deletion, failures, and safe session-history or recap use without executable voice commands.

## ADDED Requirements

### Requirement: ATX-001 Active-session capture authority and source boundary
Only the authenticated owner-DM of a campaign SHALL be able to start and control audio transcription, and each capture SHALL target exactly one `ACTIVE` session in that campaign. The accepted source SHALL be one microphone explicitly selected on the DM's authorized browser device. Players, display clients, former members, nonmembers, guests, and DMs of another campaign MUST NOT start, control, or read a private capture merely because their voice may be present. This capability MUST NOT capture uploaded audio files, system output, a remote device, Discord audio, or background audio outside the active capture.

#### Scenario: DM selects a microphone for an active session
- **WHEN** the owner-DM selects an available microphone for the campaign's active session and every consent precondition is satisfied
- **THEN** the system makes the explicit capture controls available for that session and no other campaign

#### Scenario: Session is not active
- **WHEN** the DM attempts to start capture for a planned, completed, archived, missing, or different-campaign session
- **THEN** the system rejects capture and transfers no audio

#### Scenario: Non-DM attempts capture control
- **WHEN** a player, display client, former member, nonmember, guest, or unrelated DM attempts to start, pause, resume, stop, discard, or read a private capture
- **THEN** the system denies the action and returns no audio or private transcript data

#### Scenario: Unsupported source is selected
- **WHEN** a caller supplies an audio file, system-audio source, remote-device stream, Discord source, or unselected microphone
- **THEN** the system rejects the source and does not represent it as supported session capture

### Requirement: ATX-002 Informed and purpose-specific participant consent
Before audio is acquired or transmitted, the DM SHALL select the current campaign members expected to be audible and each selected participant SHALL explicitly consent while authenticated to capture and speech-to-text processing for that session. The disclosure SHALL identify the microphone source, supported language, speech provider/configuration, data sent, Dicekeeper raw-audio lifetime, provider retention, training-use and deletion terms, transcript ownership and default audience, correction/deletion controls, and optional downstream uses. The DM SHALL attest that no unlisted or nonconsenting person is expected within capture range. Campaign membership, presence in a session, silence, or prior consent MUST NOT imply current consent.

Member publication and external recap-provider use SHALL be separate optional consent scopes. Transcription MAY proceed as DM-only when every selected participant grants capture/transcription consent but one or more withholds an optional scope; the withheld scope MUST remain unavailable for that capture.

#### Scenario: Every selected participant grants base consent
- **WHEN** each selected current participant grants session-specific capture/transcription consent after viewing the complete disclosure and the DM provides the audible-person attestation
- **THEN** the system records the consent scope and may enable capture subject to authorization and provider readiness

#### Scenario: One participant refuses or has not answered
- **WHEN** any selected participant refuses, has not granted, or cannot provide capture/transcription consent
- **THEN** the system keeps capture disabled and sends no audio to the speech provider

#### Scenario: Participant grants transcription but not publication or recap use
- **WHEN** every selected participant consents to transcription but at least one withholds member-publication or recap-provider consent
- **THEN** the system permits only a DM-only transcript and blocks the withheld publication or downstream transfer scope

#### Scenario: Membership is mistaken for consent
- **WHEN** a current campaign member has not explicitly consented for the selected session and provider disclosure
- **THEN** the system treats that member as nonconsenting regardless of membership or prior participation

#### Scenario: Unlisted audible person is present
- **WHEN** the DM cannot attest that everyone expected within capture range is selected and consenting
- **THEN** the system does not start or resume capture

#### Scenario: Participant withdraws consent
- **WHEN** a selected participant withdraws consent while capture or provider processing is active
- **THEN** the system stops further acquisition and transfer, marks the affected capture for review or deletion, and requires a new complete consent set before any resume

### Requirement: ATX-003 Explicit capture controls and automatic stopping
The DM SHALL receive explicit `START`, `PAUSE`, `RESUME`, `STOP`, and `DISCARD` controls plus a persistent accessible indication whenever the microphone is active or paused. `PAUSE` and `STOP` SHALL cease microphone acquisition and external transfer before reporting that state. `STOP` SHALL finalize only already transferred segments for review; it MUST NOT continue listening. `DISCARD` SHALL stop capture, erase untransmitted buffers and unreviewed local results, and create no session-history excerpt. Capture SHALL stop automatically on session completion, authentication or DM-authorization loss, microphone permission/device loss, consent invalidation, or provider/configuration invalidation.

#### Scenario: DM starts and pauses capture
- **WHEN** the DM starts an eligible capture and later selects pause
- **THEN** the interface visibly indicates each state and pause stops microphone acquisition and provider transfer until an authorized resume

#### Scenario: DM stops capture
- **WHEN** the DM selects stop during an eligible capture
- **THEN** the system ends microphone acquisition and transfer, finalizes only already submitted segments, and leaves their transcript results in review rather than continuing in the background

#### Scenario: DM discards capture
- **WHEN** the DM confirms discard before any transcript excerpt has been committed to history
- **THEN** the system stops capture, removes transient audio and unreviewed transcript content for that capture, and appends no transcript event

#### Scenario: Capture loses a required precondition
- **WHEN** the session ceases to be active, authentication or DM authority ends, the microphone becomes unavailable, consent is withdrawn, or the configured provider becomes invalid
- **THEN** capture stops automatically, identifies the reason, and does not silently resume

#### Scenario: Browser closes unexpectedly
- **WHEN** the capture page closes, reloads, or loses execution while microphone capture is active
- **THEN** the system releases the device when the client can do so, finalizes no unsent audio as a transcript, and requires a fresh authorization and consent check before another start

### Requirement: ATX-004 Language, provider, transfer, and raw-audio retention boundary
Each capture segment SHALL explicitly select `de-DE` or `en` before acquisition. The system MUST NOT silently auto-detect, translate, merge languages, or claim reliable mixed-language transcription; changing the selected language SHALL end the current segment and begin a separately identified segment after confirmation.

Speech-to-text SHALL remain disabled until the server has an exact provider/service configuration that supports both accepted languages and records finite audio-size/duration, timeout, usage/cost, and concurrency limits plus transport protection, processing location, maximum provider retention, prohibited training/secondary use, and a provider-deletion process. Before consent, the system SHALL disclose the active provider identity and these terms. Provider credentials MUST remain server-side and MUST NOT enter browser output, transcript text, ordinary logs, or session history. Dicekeeper SHALL keep raw audio only in transient capture/processing buffers, SHALL NOT persist it as a campaign record or ordinary log, and SHALL erase it after the segment reaches a final success, failure, stop, or discard outcome.

#### Scenario: DM selects German or English
- **WHEN** the DM selects `de-DE` or `en` before starting a segment
- **THEN** the system labels the segment with that language and submits it only to a configuration that supports the selection

#### Scenario: Language changes during capture
- **WHEN** the DM requests a different accepted language while a segment is active
- **THEN** the system stops and finalizes the current segment and requires confirmation before starting a new segment with the new language

#### Scenario: Automatic detection or translation is requested
- **WHEN** a caller omits the language, selects an unsupported language, or requests automatic detection, translation, or guaranteed mixed-language processing
- **THEN** the system rejects the request and transfers no audio under an inferred language

#### Scenario: Provider configuration is incomplete
- **WHEN** provider identity, language support, finite limits, retention/training terms, processing location, or deletion behavior is missing or unlimited
- **THEN** speech-to-text remains disabled and no browser or server assumes a provider default

#### Scenario: Provider configuration changes
- **WHEN** the active provider, processing location, retention terms, training-use terms, or deletion behavior changes after participants consented
- **THEN** the system invalidates that consent for future transfer and requires a new disclosure and consent set

#### Scenario: Segment processing finishes
- **WHEN** a segment reaches final success or failure or is stopped or discarded
- **THEN** Dicekeeper erases its raw-audio buffers and retains only the permitted transcript or failure metadata

### Requirement: ATX-005 Segment outcomes, poor or absent input, and provider failures
Each submitted segment SHALL have a stable identity and an observable state `PROCESSING`, `NEEDS_REVIEW`, `REVIEWED`, `FAILED`, or `DELETED`. Final transcript output SHALL preserve segment timing, selected language, provisional speaker labels, uncertainty or inaudible markers, provider/configuration identity, and request provenance without retaining raw audio. Silence, no captured samples, or wholly unintelligible input MUST NOT produce invented transcript text. Low-confidence, clipped, noisy, partial, or otherwise uncertain output SHALL be labeled `NEEDS_REVIEW` and MUST NOT be published, committed to session history, or used downstream until corrected or explicitly retained with its uncertainty visible.

Permission denial, unavailable device, disabled/misconfigured provider, oversize input, timeout, authentication error, rate limit, unavailable service, malformed response, or interrupted/partial result SHALL produce an explicit unavailable or `FAILED` outcome and MUST NOT produce a reviewed transcript or product mutation. Duplicate delivery with one idempotency identity SHALL create at most one provider dispatch and segment result. An uncertain external outcome MUST NOT be retried automatically; a deliberate retry SHALL use a new attempt identity after fresh authorization, consent, language, limit, and provider checks.

#### Scenario: Segment contains clear supported speech
- **WHEN** provider processing returns a complete transcript for an eligible segment
- **THEN** the system stores one `NEEDS_REVIEW` result with timing, language, provisional labels, provenance, and any uncertainty markers but no raw audio

#### Scenario: Segment contains silence or no samples
- **WHEN** capture produces no audio samples or no intelligible speech
- **THEN** the system reports an empty or absent-input outcome and stores no invented transcript text

#### Scenario: Audio is noisy or partly unintelligible
- **WHEN** the provider marks words uncertain or the segment is clipped, noisy, partial, or otherwise unreliable
- **THEN** the system preserves visible uncertainty or inaudible markers and prevents publication, history commit, and downstream use until review resolves the segment

#### Scenario: Microphone permission is denied
- **WHEN** the browser denies microphone permission or no selected device is available
- **THEN** the system reports capture unavailable, performs no provider transfer, and creates no transcript

#### Scenario: Provider fails or returns a partial response
- **WHEN** provider authentication, timeout, rate limit, availability, validation, or response parsing fails or only a partial result is received
- **THEN** the system records an explicit final failure, treats partial text as non-reviewable, and changes no session, recap, or other product state

#### Scenario: Same attempt is delivered twice
- **WHEN** the same logical segment request is repeated with one idempotency identity
- **THEN** the system resolves to the existing dispatch and result without duplicating external transfer, transcript content, or usage accounting

### Requirement: ATX-006 Provisional speaker attribution without identity inference
Speech-provider diarization MAY assign provisional labels such as `SPEAKER_1`; where diarization is missing or uncertain, the system SHALL use `UNKNOWN`. A provider label, acoustic similarity, spoken name, or transcript claim MUST NOT authenticate a person, map a speaker to a Dicekeeper account, or authorize an action. The DM MAY explicitly map a provisional label to one selected consenting participant for transcript presentation, and the affected participant SHALL be able to request correction or removal of that mapping. Dicekeeper MUST NOT create a reusable voiceprint or claim stable speaker identity across segments.

#### Scenario: Provider separates multiple voices
- **WHEN** the provider returns diarized segments
- **THEN** the system stores provisional non-identity labels and does not infer campaign accounts from them

#### Scenario: Speaker cannot be distinguished
- **WHEN** diarization is unavailable, conflicting, or below the accepted confidence boundary
- **THEN** the system labels the speech `UNKNOWN` instead of selecting a likely participant

#### Scenario: DM maps a provisional label
- **WHEN** the DM explicitly maps a label to one member selected in the capture's consent set
- **THEN** the system records that reviewed presentation mapping without treating it as authentication or a reusable voiceprint

#### Scenario: Participant disputes an attribution
- **WHEN** an affected participant requests correction or removal of a speaker mapping
- **THEN** the system records the request, prevents disputed attribution from becoming newly published or committed, and permits a reviewed correction or `UNKNOWN` label

#### Scenario: Speech names another user
- **WHEN** a speaker states another person's name, identifier, or command in the audio
- **THEN** the system does not use that statement to authenticate, impersonate, or attribute the speech to that person

### Requirement: ATX-007 Transcript ownership, audience, review, and correction
Each durable transcript SHALL belong to one campaign and one session and SHALL be managed by that campaign's owner-DM; it SHALL NOT become an individual player note, character record, or speaker-owned command. A new transcript SHALL default to audience `DM_ONLY`. Only the DM SHALL review transcript text, resolve or retain visible uncertainty, change supported speaker presentation, and mark a segment `REVIEWED`. Every correction SHALL create a new immutable transcript revision with editor, time, and reason rather than silently replacing the reviewed record.

A current campaign member MAY read only a `REVIEWED` transcript explicitly set to `MEMBERS` when every selected capture participant granted member-publication consent. The member projection SHALL omit provider diagnostics, consent details of other people, prior private revisions, DM-only notes, and hidden session data. Former members, nonmembers, guests, unrelated DMs, and display clients MUST NOT receive transcript text. A selected participant SHALL be able to view their own consent scopes and submit a correction, attribution-dispute, or redaction request without gaining access to a broader private transcript.

#### Scenario: DM reviews a transcript
- **WHEN** the campaign DM resolves the segment's text and uncertainty while retaining visible unresolved markers where necessary
- **THEN** the system creates a reviewed revision and records who reviewed it and when

#### Scenario: DM corrects reviewed text
- **WHEN** the DM corrects text or speaker presentation with a reason
- **THEN** the system creates a new revision, preserves the prior revision in the DM audit view, and uses only the latest effective revision for later projections

#### Scenario: Member-publication consent is complete
- **WHEN** a reviewed transcript has audience `MEMBERS` and every selected capture participant granted member-publication consent
- **THEN** current campaign members may read only its member-safe effective projection

#### Scenario: Publication consent is incomplete
- **WHEN** any selected participant did not grant or later withdrew member-publication consent
- **THEN** the system blocks or removes member visibility and keeps the transcript DM-only or redacted

#### Scenario: Member requests a private or unreviewed transcript
- **WHEN** an ordinary member requests a `DM_ONLY`, `PROCESSING`, `NEEDS_REVIEW`, failed, deleted, or prior private transcript revision
- **THEN** the system returns no transcript text or hidden existence detail outside that member's authorized projection

#### Scenario: Participant submits a correction or redaction request
- **WHEN** a selected participant disputes text or attribution associated with their capture
- **THEN** the system records the request for DM review, prevents the disputed content from being newly published or committed, and grants no broader transcript access

### Requirement: ATX-008 Transcript deletion, consent withdrawal, revocation, and campaign cleanup
The DM SHALL be able to delete an unreviewed transcript after explicit confirmation when no session-history excerpt references it; deletion SHALL remove its text, revisions, and transient processing data while retaining only the minimum deletion and provider-attempt metadata required to prove cleanup. Deleting a reviewed or history-linked transcript SHALL remove its text from later transcript projections, create a `DELETED` tombstone, and require redaction amendments for every committed session-history excerpt derived from it. Deletion MUST NOT renumber or forge session history.

Consent withdrawal SHALL stop future capture and transfer immediately. If withdrawal occurs before a segment is reviewed, the system SHALL delete that segment unless the participant explicitly requests a narrower permitted outcome. After review, the participant SHALL be able to request redaction; no withdrawn scope may be used for new member publication or recap transfer while the request is unresolved. Membership removal SHALL revoke later transcript access but SHALL NOT silently delete campaign-owned session history. Campaign deletion SHALL remove all owned transcript content, revisions, consent records, and provider-attempt metadata and SHALL invoke the configured external deletion process for retained provider data. Any required local or provider cleanup failure SHALL produce an incomplete outcome rather than a successful deletion claim.

#### Scenario: DM deletes an unused unreviewed transcript
- **WHEN** the DM confirms deletion of an unreviewed transcript with no history reference
- **THEN** the system removes its text and revisions, keeps only minimum cleanup proof, and returns no transcript afterward

#### Scenario: DM deletes a transcript used in session history
- **WHEN** the DM confirms deletion of a reviewed transcript that supplied one or more transcript-excerpt events
- **THEN** the system tombstones the transcript and appends redaction amendments so future effective history and recap inputs expose none of its text

#### Scenario: Participant withdraws before review
- **WHEN** a selected participant withdraws capture/transcription consent before the affected segment becomes reviewed
- **THEN** the system stops transfer and deletes that unreviewed segment unless the participant explicitly chooses an allowed narrower outcome

#### Scenario: Member loses campaign access
- **WHEN** a member leaves, is removed, or deletes their account
- **THEN** later transcript reads are denied while campaign-owned reviewed history follows its audience, attribution, redaction, and campaign-cleanup rules

#### Scenario: Campaign deletion completes
- **WHEN** campaign deletion removes all transcript records and any configured provider-side retained data
- **THEN** the system reports successful cleanup and no transcript from that campaign remains readable

#### Scenario: Provider-side deletion fails
- **WHEN** the configured provider deletion process cannot remove data that its disclosed retention terms say remains deletable
- **THEN** the system reports incomplete cleanup, records the obligation for remediation, and does not claim complete transcript deletion

### Requirement: ATX-009 Explicit session-history and recap boundary
A transcript MUST NOT enter session history or recap context automatically. The DM MAY explicitly commit a selected excerpt only from the latest `REVIEWED` transcript revision for the same active session. The committed `TRANSCRIPT_EXCERPT` event SHALL use one idempotency identity and contain only the selected text, language, bounded timing, reviewed presentation labels, transcript identity/revision, actor attribution to the committing DM, and audience-safe metadata. Its audience MUST NOT be broader than the transcript, session, and participant-publication consent permit. The immutable event and later corrections or redactions SHALL follow the `session-records` ordering and amendment contract.

A recap provider MAY receive transcript-derived content only through the effective `TRANSCRIPT_EXCERPT` event in the selected session-record projection, only when every selected capture participant granted recap-provider consent, and only after the DM explicitly selects and confirms that event in the existing recap manifest and provider disclosure. Raw audio, full transcript records, unreviewed text, prior revisions, consent records, provider diagnostics, and direct transcript storage MUST NOT enter recap context. A transcript correction or deletion SHALL mark unaccepted downstream drafts stale; a published member recap derived from text that is later redacted SHALL be retired from member access until the DM accepts and publishes a replacement from the current projection.

#### Scenario: DM commits a reviewed excerpt
- **WHEN** the DM selects text from the latest reviewed revision for the active session, chooses a permitted audience, and explicitly confirms the history commit
- **THEN** the system appends one idempotent `TRANSCRIPT_EXCERPT` event with the bounded reviewed projection and no raw audio

#### Scenario: Transcript is unreviewed or belongs to another session
- **WHEN** the DM attempts to commit processing, uncertain, failed, deleted, stale-revision, or different-session transcript content
- **THEN** the system rejects the commit and appends no session event

#### Scenario: Member audience exceeds consent
- **WHEN** a transcript excerpt is marked for members but any selected capture participant withheld or withdrew member-publication consent
- **THEN** the system rejects the broader event audience and changes no history

#### Scenario: DM selects transcript-derived recap context
- **WHEN** every selected participant granted recap-provider consent and the DM explicitly selects and confirms an effective transcript-excerpt event in a completed or archived session's recap manifest
- **THEN** the recap workflow may transmit only that authorized event projection under its existing provider, limit, and audience rules

#### Scenario: Recap consent is absent
- **WHEN** any selected participant did not grant or withdrew recap-provider consent before dispatch
- **THEN** the system excludes the transcript-derived event from provider context and performs no transcript-based recap transfer

#### Scenario: Transcript changes after recap drafting
- **WHEN** correction, attribution removal, consent withdrawal, or deletion changes a transcript-derived effective event after a recap draft was generated
- **THEN** the system marks the draft stale, blocks acceptance from the prior projection, and requires a newly confirmed current projection

#### Scenario: Published member recap depends on redacted text
- **WHEN** a transcript deletion or redaction removes text used by a currently published member recap
- **THEN** the system retires that member publication until a replacement is generated, reviewed, accepted, and published from the current member-safe projection

### Requirement: ATX-010 Inert text and deferred executable voice commands
Audio and transcript content SHALL be treated as inert plain text. Rendering, reviewing, correcting, publishing, or committing a transcript excerpt MUST NOT execute markup, instructions, prompts, commands, or embedded data. A voice, provisional speaker label, spoken name, or transcript MUST NOT authenticate an actor, satisfy action confirmation, establish rule authority, or invoke `live-play`, `group-decisions`, `rule-assistance`, `campaign-maps`, `session-records` lifecycle, `combat-automation`, character/progression, AI-assistance, recap, Discord, or any other mutation or query automatically.

The `voice-commands` capability is deferred. Any future acceptance SHALL require a separate reviewed change that defines allowed actions, authenticated initiating identity, owning permissions, exact parameter validation, ambiguity and low-confidence outcomes, explicit confirmation, idempotency, rollback, audit, denial, and failure behavior; this transcription capability creates none of those semantics.

#### Scenario: Transcript contains command-like text
- **WHEN** a transcript says to roll dice, change HP, start an encounter, reveal a map, cast a vote, advance a character, or perform another action
- **THEN** the system preserves the words as inert transcript text and performs no action

#### Scenario: Transcript contains a rule question
- **WHEN** captured speech resembles a D&D rule question or ruling
- **THEN** the system performs no rule-assistance query and treats the text as no source of rule authority

#### Scenario: Transcript contains markup or prompt instructions
- **WHEN** transcript text contains HTML, script, links, tool instructions, or prompt-like content
- **THEN** the system renders it as text and executes or follows none of it

#### Scenario: Speaker label is mapped to a member
- **WHEN** a reviewed transcript presentation maps a provisional label to an authenticated campaign member
- **THEN** the mapping grants no command authority and does not satisfy authentication or confirmation for any product action

#### Scenario: Executable voice behavior is requested
- **WHEN** a caller asks transcription to interpret intent or execute an action
- **THEN** the system reports that executable voice commands are deferred and leaves every owning capability unchanged
