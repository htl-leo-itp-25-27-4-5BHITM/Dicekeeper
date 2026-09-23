# Tasks

All tasks below implement future product behavior and intentionally remain unexecuted after the section-9 planning work that created this change.

## 1. Persistent domain model

- [ ] 1.1 Add campaign-content, typed relationship, session, encounter, event, and amendment persistence with campaign-scoped foreign keys, versions, lifecycle constraints, audience fields, and timestamps; verify schema tests reject cross-campaign and invalid-lifecycle records.
- [ ] 1.2 Add uniqueness and idempotency constraints for one active session per campaign, one active encounter per session, monotonic event ordering, and duplicate command identities; verify concurrent persistence tests accept at most one valid result.
- [ ] 1.3 Add a migration that creates empty future collections for existing campaigns without inferring sessions or importing ephemeral/browser-local data; verify upgrade and rollback-preservation tests on a populated pre-change database.

## 2. Campaign content

- [ ] 2.1 Implement DM-authorized NPC, place, quest, and lore create/read/update operations with validation, typed same-campaign references, audience filtering, and stale-version rejection; verify unit and API tests cover each kind and every denied actor.
- [ ] 2.2 Implement content archival/restoration and confirmed reference-safe deletion; verify tests preserve historical snapshots, reject referenced and cross-campaign deletion, and cascade only on campaign deletion.
- [ ] 2.3 Add DM and member campaign-content views using server-derived projections; verify member, former-member, unrelated-DM, guest, and display-client tests expose no DM-only fields or hidden record existence.

## 3. Session and encounter lifecycle

- [ ] 3.1 Implement session create/update/activate/complete/archive/delete operations and the one-active-session guard; verify the full allowed transition table plus every unlisted transition and campaign-start precondition.
- [ ] 3.2 Implement encounter create/update/activate/complete/archive/delete operations with same-campaign content/map/member/character references and the one-active-encounter guard; verify lifecycle, cross-campaign, session-completion, and no-encounter session cases.
- [ ] 3.3 Add DM and member session/encounter views with audience-safe projections and pagination for archived records; verify access revocation and hidden-field tests agree with campaign membership and the current display-client boundary.

## 4. Durable event history

- [ ] 4.1 Implement ordered append-only events, manual DM narrative entries, idempotent command identities, and immutable corrections/redactions; verify ordering, retry, stale/concurrent, amendment, and audience-reduction tests.
- [ ] 4.2 Integrate session/encounter lifecycle and selected committed map, turn, HP, activity, dice, and group-decision outcomes with active-session history; verify failed/rolled-back commands append nothing and an acknowledged recordable mutation cannot lose or duplicate its event.
- [ ] 4.3 Preserve existing state lifetimes during restart and reconciliation; verify durable history returns after restart while lost ephemeral live/map state remains uninitialized and player-local notes never enter history.

## 5. Recap inputs, cleanup, and acceptance

- [ ] 5.1 Implement deterministic DM and member-safe recap-input projections over completed/archived sessions, effective amendments, encounters, and content snapshots; verify private votes, player notes, account data, notifications, hidden media/story, audio, and external transmission are excluded.
- [ ] 5.2 Extend campaign deletion to remove all persistent content/session dependents with an incomplete-cleanup outcome on failure; verify other campaigns and player-owned characters remain unchanged.
- [ ] 5.3 Add end-to-end authorization, lifecycle, archive/delete, restart, and recap-input tests; run the project test suite plus `openspec validate add-campaign-content-and-session-records --type change --strict --no-interactive` and verify the user guide documents future behavior only after implementation is delivered.
