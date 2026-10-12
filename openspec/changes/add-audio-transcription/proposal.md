# Proposal

## Why

Dicekeeper's future session records and recap workflow deliberately exclude audio until capture, consent, transcription, privacy, retention, and failure behavior are defined. The target diagram also proposes executable voice commands, while the historical requirements answer supports transcription without commands, so the two behaviors must remain separate and only the supportable transcription scope should advance.

## What Changes

- Add DM-controlled microphone capture for one active play session, with explicit start, pause, resume, stop, and discard controls and no background, uploaded-file, system-audio, or Discord capture.
- Require informed, purpose-specific consent from every selected current participant before audio leaves the capture device. Capture stops when consent or authorization is lost, and membership alone never implies consent.
- Add German and English speech-to-text segments with an explicitly selected language, provisional non-identity speaker labels, poor-input and provider-failure outcomes, and no automatic translation or mixed-language guarantee.
- Keep application audio buffers transient. Durable records contain reviewable transcript text and metadata, not raw audio; external transfer, provider identity, finite limits, retention, training-use, and deletion terms must be configured and disclosed before enablement.
- Add a campaign/session-owned transcript lifecycle with DM-only default visibility, bounded member publication, immutable correction history, participant correction requests, confirmed deletion/redaction, campaign cleanup, and access revocation.
- Permit downstream recap use only when the DM explicitly commits a reviewed, consented transcript excerpt as an audience-safe session-history event. Raw audio and whole transcript drafts never enter recap or AI context automatically.
- Defer `voice-commands`: transcript text is inert and MUST NOT authenticate a speaker, execute an action, answer a rule question, publish a die result, or mutate campaign, session, encounter, combat, character, decision, map, AI, recap, Discord, or other product state.

## Capabilities

### New Capabilities

- `audio-transcription`: Active-session microphone capture, informed consent, language and provider boundaries, speaker labeling, transcript review/audience/correction/deletion, failure handling, and explicitly reviewed session-history/recap integration.

### Modified Capabilities

None. The accepted current baseline and the active future session-record and recap plans retain their ownership boundaries; this capability supplies the separately authorized transcript-to-history contract they reserved for later audio work.

## Impact

- Future implementation will require browser microphone controls, consent and participant-state records, a disabled-until-configured speech-to-text adapter, transient audio buffering, transcript/revision persistence, role-filtered APIs/views, session-event integration, and cleanup/audit tests.
- `account-access`, `campaign-membership`, `session-views`, and `live-synchronization` remain upstream authentication, authorization, view, and revocation contracts.
- Future `session-records` supplies the active-session boundary and append-only event history; future `session-recaps` may consume only the resulting effective audience-safe history after the audio-specific consent and review gates pass.
- No voice-command capability, application source, migration, runtime/provider configuration, current main spec, Discord artifact, or section-9/10/11/12 implementation task is changed by this planning work.
