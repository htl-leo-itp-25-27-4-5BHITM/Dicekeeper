# Proposal

## Why

Dicekeeper currently treats a started campaign as one continuous live runtime, so it cannot represent the campaign's separate play sessions, preserve a durable event history, or maintain reusable campaign knowledge for later recaps. The future scope needs a bounded content and record model before combat, AI, audio, or recap work can depend on it.

## What Changes

- Add DM-managed campaign content for NPCs, places, quests, and lore, with explicit member visibility, archival state, durable persistence, and reference-safe deletion.
- Add durable play sessions beneath a campaign and optional encounter records beneath a session, without defining initiative, conditions, damage rules, or other combat automation.
- Add an append-only, audience-scoped session event history with corrections, cross-campaign reference rejection, and stable projections that later recap work may consume.
- Keep the current campaign `started` flag distinct from session lifecycle and keep current live-play values ephemeral; creating planning artifacts does not migrate or implement those records.
- Defer items and loot because the historical candidate does not define inventory ownership, transfer, equipment, rewards, visibility, or deletion semantics.
- Leave AI generation/recaps, audio transcription, Discord, rules assistance, and combat/progression behavior to their owning future changes.

## Capabilities

### New Capabilities

- `campaign-content`: DM-authored NPC, place, quest, and lore records, including lifecycle, audience, references, persistence, archival, and deletion.
- `session-records`: Durable campaign session and encounter records, audience-safe event history, lifecycle, corrections, retention, and downstream recap-input projections.

### Modified Capabilities

None. Existing campaign, map, live-play, decision, note, view, and synchronization contracts remain the current baseline; this future change adds separately owned durable records and integrations without redefining their present behavior.

## Impact

- Future implementation will require persistent campaign-content, session, encounter, reference, and event-history storage plus authorized APIs and views.
- `campaign-management`, `campaign-membership`, `campaign-maps`, `character-library`, `live-play`, `group-decisions`, and `session-views` are upstream reference and authorization contracts; their data is copied into history only through the projections defined here.
- `combat-automation`, `ai-campaign-assistance`, `session-recaps`, and `audio-transcription` may depend on these records in later changes, but none of their behavior is included here.
- This change contains planning artifacts only. It does not change application code, runtime data, migrations, deployment, or the published current specifications.
