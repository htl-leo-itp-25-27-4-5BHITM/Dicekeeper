# Tasks

All tasks below implement future product behavior and intentionally remain unexecuted after the section-13 planning work that created this change. Executable voice commands are deferred and are not implementation tasks here. Exact provider, finite numeric limits, processing region, retention duration, deletion parameters, usage/cost scope, and test environment must be selected before production enablement; no provider default is implied.

## 1. Provider configuration and persistent privacy model

- [ ] 1.1 Add a disabled-by-default server-side speech-provider configuration requiring exact service/version, German and English support, finite segment size/duration, timeout, concurrency, usage/cost and accounting values, protected transport, processing region, maximum retention, prohibited training/secondary use, and deletion behavior; verify startup/configuration tests reject missing, unlimited, client-visible, or secret-bearing configurations.
- [ ] 1.2 Add capture, selected-participant consent manifest, participant scope decision, segment, provider attempt, transcript, immutable revision, correction/redaction request, history link, and cleanup-obligation persistence with campaign/session/DM ownership and timestamps; verify schema tests reject missing and cross-campaign relations.
- [ ] 1.3 Add uniqueness, lifecycle, version, and idempotency constraints for one participant decision per disclosure/scope, one dispatch per attempt identity, one effective transcript revision, and one session event per history-commit identity; verify concurrent persistence tests accept at most one valid outcome.
- [ ] 1.4 Add an upgrade migration that creates no inferred consent, capture, provider attempt, transcript, raw-audio record, speaker mapping, history event, recap context, or command for existing campaigns; verify forward migration and rollback-preservation tests on populated pre-change data.

## 2. Consent and browser capture controls

- [ ] 2.1 Implement DM-only active-session capture eligibility over the section-9 session boundary and an explicitly selected browser microphone; verify planned/completed/archived/missing/wrong-campaign sessions and every non-DM actor are denied before microphone access or transfer.
- [ ] 2.2 Implement the versioned disclosure and authenticated participant consent workflow for base transcription, optional member publication, and optional recap-provider use plus the DM audible-person attestation; verify membership/prior consent never substitutes for an explicit current decision and one missing/refused base consent blocks capture.
- [ ] 2.3 Implement accessible start, pause, resume, stop, and confirmed discard controls with persistent capture-state indication; verify pause/stop cease acquisition and transfer before acknowledgement, discard removes unreviewed content, and no control permits background continuation.
- [ ] 2.4 Stop capture on consent withdrawal, participant-set change, session completion, authentication/DM-authority loss, device/permission loss, provider/configuration invalidation, page close, or browser interruption; verify resume always performs fresh authorization, consent-fingerprint, language, limit, and provider checks.
- [ ] 2.5 Enforce the source boundary against file uploads, system audio, remote-device streams, Discord, unselected microphones, and background capture; verify direct API and manipulated-client tests cannot submit an unsupported source as an eligible capture.

## 3. Language, speech processing, and failures

- [ ] 3.1 Implement bounded `de-DE` and `en` segment selection and confirmed segment rollover on language change; verify omitted/unsupported languages, automatic detection, translation, and mixed-language guarantee requests transfer no audio.
- [ ] 3.2 Implement the server-side speech gateway with provider/configuration pinning, idempotent dispatch, finite preflight, credential isolation, and safe telemetry; verify ordinary logs, metrics, browser output, transcripts, and session history contain no raw audio, credential, secret, or protected provider payload.
- [ ] 3.3 Implement transient browser/server audio buffering and finalization cleanup; verify raw audio is never stored as a durable campaign record or ordinary log and is erased after success, failure, stop, discard, client interruption, and restart recovery.
- [ ] 3.4 Normalize no-sample/silence, poor/noisy/clipped/unintelligible input, permission/device loss, disabled/misconfigured provider, oversize, timeout, authentication, rate-limit, unavailable, malformed, and partial-response outcomes; verify no failure or uncertainty creates reviewed text, history, recap context, or any product mutation.
- [ ] 3.5 Implement one dispatch/result per attempt identity and deliberate retry with a new identity after an uncertain or retryable terminal outcome; verify duplicate, concurrent, late-response, and retry tests do not duplicate transfer, transcript content, usage accounting, or final state.

## 4. Speaker presentation and transcript lifecycle

- [ ] 4.1 Store provider diarization only as provisional labels with `UNKNOWN` fallback and no voiceprint or cross-segment identity; verify spoken names, acoustic similarity, provider labels, and transcript claims never authenticate or automatically map an account.
- [ ] 4.2 Implement DM-reviewed mapping of provisional labels only to selected consenting participants plus participant attribution-dispute/removal requests; verify disputed mappings are blocked from new publication/history use and corrections may restore `UNKNOWN` without broadening access.
- [ ] 4.3 Implement `PROCESSING`, `NEEDS_REVIEW`, `REVIEWED`, `FAILED`, and `DELETED` transcript states, visible uncertainty, immutable reasoned revisions, and DM-only default audience; verify invalid transitions, stale edits, unreviewed publication, and silent overwrite are rejected.
- [ ] 4.4 Add role-filtered DM and member transcript projections; verify members receive only latest reviewed `MEMBERS` text after unanimous selected-participant publication consent and never receive provider diagnostics, other consent details, prior revisions, DM notes, or hidden session data.
- [ ] 4.5 Add participant access to their own consent scopes and correction, attribution-dispute, and redaction requests without broader transcript access; verify former members, nonmembers, guests, unrelated DMs, and display clients receive no transcript content.

## 5. Session-history and recap integration

- [ ] 5.1 Implement explicit DM commit of a bounded excerpt from the latest reviewed same-session revision as one audience-safe `TRANSCRIPT_EXCERPT` event with stable source revision and idempotency; verify processing/uncertain/failed/deleted/stale/different-session content appends no event.
- [ ] 5.2 Enforce transcript, session, and participant-publication audience intersections on the event payload; verify member-audience attempts are rejected when any selected participant withheld or withdrew publication consent and no raw audio, full transcript, prior revision, or consent record enters history.
- [ ] 5.3 Extend recap-manifest assembly to admit only effective transcript-excerpt events after unanimous selected-participant recap consent and explicit DM selection/confirmation; verify raw audio, direct transcript records, unreviewed text, provider diagnostics, and implicit transcript traversal never enter the recap provider context.
- [ ] 5.4 Propagate transcript revision, consent, and redaction changes into downstream staleness: append history amendments, block prior recap-draft acceptance, and retire affected member recap publication until replacement; verify accepted audit versions remain immutable while current projections expose no redacted text.

## 6. Deletion, revocation, synchronization, and cleanup

- [ ] 6.1 Implement confirmed hard deletion for unused unreviewed transcripts and tombstone-plus-amendment deletion for reviewed/history-linked transcripts; verify no operation renumbers/forges history and later transcript/history/recap projections expose no deleted text.
- [ ] 6.2 Implement immediate stop on consent withdrawal, pre-review segment deletion, post-review redaction requests, and blocking of withdrawn publication/recap scopes; verify unresolved requests cannot be bypassed by a cached manifest or prior client state.
- [ ] 6.3 Revoke transcript reads on membership/account access loss and publish only role-filtered transcript status invalidations; verify no common live event payload contains audio, transcript text, consent details, provider diagnostics, or DM-only revision data for unauthorized clients.
- [ ] 6.4 Extend campaign deletion to remove transcript content, revisions, consent records, attempts, links, and local cleanup data and to invoke configured provider deletion with retryable incomplete-cleanup reporting; verify another campaign remains unchanged and failure is never reported as complete.
- [ ] 6.5 Restore durable attempts/transcripts/revisions/consent state after restart without restoring raw buffers, resuming capture, redispatching provider calls, or executing transcript content; verify pending/final/deleted recovery and live-view reconciliation outcomes.

## 7. Acceptance, configuration selection, and documentation

- [ ] 7.1 Add end-to-end authorization, consent, capture-control, source-boundary, language, provider-failure, poor/absent-input, idempotency, speaker-dispute, audience, correction, deletion, history, recap-staleness, revocation, restart, and cleanup tests; verify every ATX scenario has a passing automated test or an explicitly documented external-provider/browser test boundary.
- [ ] 7.2 Select and record the exact production speech provider/service, processing region, finite size/duration/timeout/concurrency/usage/cost values, accounting scope, retention duration, deletion procedure, prohibited training/secondary-use terms, and test environment through product/operations review; verify transcription remains disabled until the consent disclosure and integration tests reflect those values.
- [ ] 7.3 Add adversarial no-command tests at API, UI, event, provider-response, transcript-rendering, history, and recap layers; verify spoken or transcribed dice, HP, combat, rule, map, vote, character, AI, Discord, markup, script, prompt, or tool instructions remain inert text and create no mutation or automatic query.
- [ ] 7.4 Reconcile user and operations documentation only after future behavior is delivered, run the project test suite plus `openspec validate add-audio-transcription --type change --strict --no-interactive` and main-spec validation, and verify transcription is not presented as implemented and voice commands or Discord audio are not presented as accepted.
