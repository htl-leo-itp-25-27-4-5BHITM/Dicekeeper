# Proposal

## Why

Dicekeeper has current application behavior and supporting diagrams but no accepted OpenSpec capability specifications. A reviewed baseline is needed so developers can distinguish desired current behavior from source-observed gaps, historical plans, and separately proposed future functionality.

## What Changes

- Document the accepted current contracts for accounts, profiles, characters, campaigns, participation, maps/media, live play, views, and synchronization.
- Add testable scenarios for permissions, validation, state transitions, failures, persistence, deletion, visibility, and recovery where applicable.
- Reconcile current diagram scope with source evidence and explicit product decisions without treating implementation defects as desired behavior.
- Keep corrective behavior and future capabilities in separate changes; this change documents the baseline and does not implement application features.

## Capabilities

### New Capabilities

- `account-access`: Login, logout, registration boundary, local identity synchronization, and authentication failure or expiry.
- `player-profiles`: Profile and avatar data, visibility boundaries, account settings, and account deletion outcomes.
- `character-library`: Character creation, drafts, reference values, editing, selection, ownership, validation, and deletion.
- `campaign-management`: Campaign creation, metadata and story, visibility, capacity, start state, editing, and deletion.
- `campaign-membership`: Public/private admission, campaign roles, membership listing, leave, kick, and capacity behavior.
- `character-review`: Character submission, resubmission, approval/rejection, authorization, and review-state transitions.
- `notifications`: Notification recipients, triggering events, read state, deletion, references, and navigation.
- `campaign-maps`: Active maps, markers/groups, fog, map switching, undo/reset, and map visibility.
- `media-assets`: Avatar/map upload, validation, processing, delivery, access, replacement, and cleanup.
- `live-play`: Turn, HP, active-player state, dice, initialization, and reset behavior.
- `group-decisions`: Decision creation, voting, eligibility, duplicate handling, completion, and persistence.
- `player-notes`: Player-note isolation, persistence lifetime, refresh, and device behavior.
- `session-views`: DM, player, and table/display views, including supported screen/device behavior and cross-capability visibility.
- `live-synchronization`: Event propagation, heartbeat, reconnect, stale clients, access revocation, and restart behavior.

### Modified Capabilities

None. The project has no existing main specifications.

## Impact

- Adds documentation-only capability specifications under this change and, after review and archive, under `openspec/specs/`.
- Uses `docs/specification/` for evidence, decisions, glossary, coverage, permissions, overview, runbook, and handoff records.
- References current REST/SSE APIs, frontend views, Keycloak identity handling, PostgreSQL persistence, browser storage, in-memory game state, uploads, and Imagor only as evidence/context.
- Makes no application, API, database, dependency, deployment, or runtime change.
