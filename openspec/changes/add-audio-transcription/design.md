# Design

## Context

See [proposal.md](proposal.md) for motivation. The published baseline has campaign-specific authentication and permissions, explicit role-shaped views, observable revocation, and no audio implementation. The accepted section-9 plan adds durable sessions, append-only audience-scoped events, and recap projections while excluding audio until a later contract exists. The accepted section-11 plan keeps raw transcripts outside provider context and accepts only explicitly selected, disclosed inputs. The target diagram proposes transcription plus interpreted commands, but the historical requirements answer says audio is transcription without commands and provides no command identity, permission, validation, confirmation, or rollback semantics.

This change plans one bounded transcription layer without implementing it. The browser microphone is privacy-sensitive, speech processing is external, speaker diarization is not authentication, and transcript-derived recap content crosses a second provider boundary. Those constraints require separate consent, data-lifetime, review, and downstream gates.

## Goals / Non-Goals

**Goals:**

- Provide an auditable active-session microphone workflow controlled by the campaign DM.
- Require informed, purpose-specific consent before capture, member publication, or recap-provider transfer.
- Keep raw audio transient and make every provider, retention, language, failure, and deletion outcome explicit.
- Preserve uncertain text and provisional speaker attribution for human review instead of manufacturing confidence or identity.
- Integrate only reviewed excerpts with append-only session history and existing audience-specific recap projections.
- Make stop, discard, correction, redaction, access revocation, and campaign cleanup testable.

**Non-Goals:**

- Executable voice commands, intent interpretation, command authentication, rule queries, or any audio-triggered product mutation.
- Audio-file upload, system-audio capture, remote-device capture, Discord audio, background listening, translation, or mixed-language guarantees.
- Durable raw-audio storage, biometric speaker recognition, reusable voiceprints, or automatic account mapping.
- Automatic transcript publication, automatic event logging, automatic recap ingestion, or AI-generated transcript correction.
- Selecting repository-unsupported provider/model, numeric limits, data region, retention duration, or cost values in planning.
- Implementing application code, migrations, provider configuration, or upstream future-change tasks.

## Decisions

### 1. Accept transcription and defer executable voice commands

The accepted product change contains only `audio-transcription`. The diagram establishes voice execution as a future candidate, while the historical answer explicitly supports transcription without commands; neither source has precedence under DEC-003, and the command candidate lacks an independently complete contract. Transcript content is therefore inert, and `FUT-UCVoiceCommand`, `FUT-UCInterpretCommand`, and the action portion of `FUT-UCPlayerVoice` remain deferred.

Creating a nominal command interpreter with no allowed-action, authenticated-identity, permission, confirmation, ambiguity, rollback, or audit model was rejected because it would turn probabilistic text into unauthorized state mutation. Treating the diagram alone as acceptance was rejected because diagrams establish scope rather than controlling desired behavior.

### 2. Bind capture to the DM device and one active session

The owner-DM selects one browser microphone and controls start, pause, resume, stop, and discard for one section-9 `ACTIVE` session. The client and server recheck campaign ownership, session identity/lifecycle, consent fingerprint, language, and provider configuration on start and resume. Completion, authorization loss, consent invalidation, device loss, or configuration change stops capture.

A player-owned recorder was rejected because the target player's voice use case is command-oriented and no independent personal-dictation ownership or storage contract exists. File uploads, system audio, Discord streams, remote devices, and background capture were rejected because their source authority, consent population, duration, and deletion boundaries are not defined.

### 3. Store an immutable consent manifest per capture

Before the microphone is opened, the DM selects the current members expected to be audible. Each member records an authenticated decision for base capture/transcription and separately for member publication and recap-provider use. The manifest fingerprints the session, participant set, provider/config version, language, retention/training/deletion disclosure, microphone/source class, and selected scopes. The DM also attests that no unlisted person is expected in range.

Reusing campaign membership, an earlier session's consent, silence, or a provider's generic terms as consent was rejected. Allowing the DM to consent for other players was rejected because it is not informed participant consent. Capture may remain DM-only when optional publication/recap scopes are withheld, but it cannot start without the base scope from the complete selected set.

### 4. Segment capture and retain no durable raw audio

Capture is divided into bounded segments selected under the finite provider configuration. Audio exists only in browser/server processing buffers and is erased after a final success/failure, stop, or discard. Durable state begins with attempt/segment metadata and reviewable transcript text; ordinary logs and metrics contain identities/status/sizes/timing categories but no audio or transcript body.

Durable audio archives were rejected because the sources provide no playback, storage, audience, export, retention, or deletion requirement. Whole-session unbounded streaming was rejected because it weakens stop semantics, failure isolation, idempotency, language changes, and finite transfer limits.

### 5. Disable processing until provider and finite privacy terms are configured

One server-side speech gateway normalizes supported language, bounded segment transfer, idempotency, failures, usage, and safe telemetry. Enablement requires an exact provider/service and configuration version, German/English support, finite size/duration/timeout/usage/cost/concurrency limits, protected transport, processing location, maximum retention, prohibited training/secondary use, and a working deletion route. Credentials stay server-side. Any material provider-term change creates a new disclosure version and invalidates future use of prior consent.

Pinning a current provider, model, region, duration, or price was rejected because the repository contains no selected values. Unlimited defaults, provider auto-detection, and unspecified provider retention were rejected. The configuration gate resolves observable behavior: the capability is unavailable until every required value and term is explicitly selected and testable.

### 6. Treat language and speaker attribution as reviewed metadata

Each segment declares German (`de-DE`) or English (`en`) before capture. A language change closes the segment. No automatic detection, translation, or mixed-language guarantee is made. Provider diarization is stored only as provisional labels; uncertain output uses `UNKNOWN`. The DM may explicitly map a label to a consenting participant for presentation, but the mapping creates neither authentication nor a biometric profile and a participant may dispute it.

Automatic account mapping from spoken names, acoustic similarity, or provider labels was rejected because none authenticates an actor. Stable cross-segment voice identity was rejected because it would introduce biometric retention and false-attribution risks absent from the accepted scope.

### 7. Separate processing attempts, transcript revisions, and effective views

Future persistence should distinguish:

- capture with campaign/session/DM, selected source, language, consent-manifest fingerprint, start/stop outcome, and state;
- participant consent decisions and disclosure/configuration version for base, member-publication, and recap-provider scopes;
- provider attempt with segment/idempotency identity, safe status/failure, provider/configuration identity, sizes/timings, and usage outcome;
- transcript segment with timing, language, provisional labels, uncertainty markers, audience, and lifecycle;
- immutable transcript revisions with editor, reason, time, corrected text, label mapping, and effective/deleted state;
- correction/redaction requests and cleanup obligations;
- links from reviewed revisions to idempotent session-history excerpt events.

New transcripts default to DM-only. Server-derived projections expose complete review/audit data only to the owner-DM and expose reviewed member text only when audience and consent permit. A mutable transcript row was rejected because silent correction would make later session events and recaps unreproducible.

### 8. Reuse append-only session history as the only recap bridge

The DM explicitly selects text from the latest reviewed revision and commits one `TRANSCRIPT_EXCERPT` event through section 9 with source revision, language, bounded timing, presentation labels, audience, and an idempotency identity. Session-record authorization, ordering, audience, amendment, and deletion rules then control the effective event. A correction or transcript deletion appends an amendment/redaction instead of rewriting history.

Section-11 recaps receive only the effective event already present in the selected SES-009 projection, never raw audio or direct transcript storage. They additionally require the transcript-specific recap consent, explicit manifest selection, and the existing audience/provider confirmation. Passing a whole transcript automatically to the recap provider was rejected because it would bypass participant consent, DM excerpt review, member-safe projection, context limits, and the upstream event audit.

### 9. Make deletion remove content without forging history

An unused unreviewed transcript can be hard-deleted after confirmation. A reviewed or history-linked transcript becomes a content-free tombstone and causes redaction amendments for linked events. Local raw buffers and transcript content are removed; provider-side deletion follows the configured route, and failure remains an incomplete cleanup obligation. Campaign deletion owns terminal cleanup. Membership removal revokes access but does not silently destroy campaign-owned history.

Deleting history rows or renumbering the session stream was rejected because it contradicts the accepted append-only audit model. Retaining deleted transcript text in hidden ordinary revisions was rejected because deletion would become misleading; only minimum tombstone and cleanup proof remain.

### 10. Fail closed for missing input, uncertainty, and external errors

No samples or silence yields no text. Low-confidence, noisy, clipped, partial, or unintelligible output stays visibly uncertain and blocked from publication/history/recap use. Provider-disabled, permission, device, limit, timeout, authentication, rate-limit, unavailable, malformed, and interrupted outcomes create no reviewed transcript. Duplicate delivery reuses one attempt; an uncertain provider outcome is never blindly retried.

Filling gaps with a model, autocorrecting unknown speakers, accepting partial streaming text, or continuing capture after a control/precondition failure was rejected because each can fabricate content or violate consent.

## Data and transaction shape

Future implementation should use stable capture, segment, attempt, consent-manifest, transcript, revision, correction/redaction-request, history-link, and cleanup-obligation identities. Unique constraints enforce one dispatch per attempt identity, one effective revision per transcript revision chain, one participant decision per disclosure/scope, and one session event per history-commit identity. Foreign keys and service checks enforce campaign/session/member boundaries.

Capture start is a short authorization/consent/configuration transaction followed by external streaming or segment upload outside the database transaction. Attempt finalization uses compare-and-set semantics so duplicate or late provider results cannot replace a terminal state. Transcript review/revision is durable before a history event is committed. The history append and audio history-link must be atomic where they share storage; otherwise a durable coordination record withholds success until both sides are guaranteed. Provider deletion and campaign cleanup use retryable obligations and never report complete while a required external deletion remains unresolved.

## Risks / Trade-offs

- **A room microphone may capture an unlisted person** -> Require the selected-participant manifest, DM audible-person attestation, persistent active indicator, immediate stop, and no background/file/system capture.
- **Provider terms may change after consent** -> Version the provider disclosure, invalidate prior consent for future transfer, and disable the gateway until the new terms are configured.
- **Diarization can misattribute sensitive speech** -> Keep labels provisional, support `UNKNOWN`, prohibit identity inference, and block disputed content from new publication/history use.
- **No durable raw audio limits later verification** -> Preserve uncertainty and revisions; do not claim the text can be checked against deleted audio. This privacy trade-off is explicit.
- **Long or noisy sessions can exceed limits or yield poor text** -> Segment capture, enforce finite preflight, surface uncertainty, and allow manual review rather than silent truncation or fabrication.
- **Transcript deletion can invalidate recaps** -> Redact effective session events, stale pending drafts, and retire affected member publication until a replacement uses the current projection.
- **Provider failure can interrupt session convenience** -> Keep session play and manual history fully usable; transcription failure creates no gameplay dependency or mutation.

## Migration Plan

1. Add disabled transcript/provider configuration, consent/capture/attempt/transcript/revision/history-link/cleanup persistence, constraints, and empty collections for existing campaigns; infer no consent, capture, or transcript.
2. Add role-filtered transcript and consent APIs plus provider-disclosure/configuration validation while keeping microphone and provider dispatch disabled.
3. Add bounded German/English browser capture, explicit controls, stop conditions, gateway dispatch, failure mapping, raw-buffer cleanup, and DM-only review behind an explicit rollout boundary.
4. Add provisional speaker presentation, member-safe publication, correction/redaction, access revocation, and campaign/provider cleanup after privacy and authorization tests pass.
5. Enable explicit `TRANSCRIPT_EXCERPT` history commits only after section-9 session records exist and atomic/idempotent integration tests pass.
6. Enable transcript-derived recap inputs only after section-11 recap manifests can enforce audio-specific consent, audience, staleness, redaction, and member-publication retirement.
7. Select and record every exact provider, region, finite numeric limit, retention/deletion, training-use, usage/cost, and test-environment value before production enablement; no value is inferred from this plan.

Rollback first disables capture, resume, provider dispatch, member publication, and new history/recap integration. In-flight attempts reach a recorded terminal state and raw buffers are erased. Reviewed transcripts and event links remain protected until a separately reviewed cleanup migration removes them; rollback never turns transcript text into a command or deletes immutable session history in place.

## Deferred configuration decisions

The exact speech provider/service version, processing region, maximum segment bytes/duration, timeout, concurrency, usage/cost allowance and accounting scope, provider-retention duration, deletion-service parameters, and operational test environment have no repository-supported values. They are mandatory finite configuration, not open functional behavior: production transcription remains disabled until product/operations records them and the consent disclosure renders them accurately.
