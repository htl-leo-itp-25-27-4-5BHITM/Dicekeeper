# Tasks

All tasks below implement future product behavior and intentionally remain unexecuted after the section-10 planning work that created this change. Deferred mechanics named in the specs are not implementation tasks.

## 1. Persistence and migration boundaries

- [ ] 1.1 Add versioned D&D 5e (2024) encounter-combat, combatant, initiative submission/group/slot, boss state, command-audit, and character-progression persistence linked to existing campaign/session/encounter/character identities; verify schema tests reject missing and cross-campaign ownership.
- [ ] 1.2 Add uniqueness, version, and idempotency constraints for one tracker per encounter, one roster/initiative membership per combatant, unique slot positions, one result per combat command, and atomic from/to-level transitions; verify concurrent persistence tests accept at most one valid outcome.
- [ ] 1.3 Add an upgrade migration that creates no inferred combat tracker, enemy, advancement record, condition/effect, item, or session event for existing data and preserves existing character levels; verify forward migration and rollback-preservation tests on populated pre-change data.

## 2. Combat lifecycle and roster

- [ ] 2.1 Implement DM-authorized combat start/complete/cancel operations against one active section-9 encounter and active session in a started campaign; verify every invalid lifecycle, duplicate tracker, missing record, wrong-campaign, and denied-actor case from COM-001.
- [ ] 2.2 Implement roster initialization from current approved player memberships plus encounter-local `ENEMY`, `MINI_BOSS`, and `MAIN_BOSS` CRUD with validation and stale-version checks; verify tests cover ineligible players, duplicate identities, invalid enemy input, removal of the current combatant, and no global/content record creation.
- [ ] 2.3 Add reference-scale roster tests for 3–10 players and up to 25 individually tracked enemies, including grouped enemies, and verify identity, HP, authorization, and correctness without asserting an invented latency or unbounded-capacity target.

## 3. Initiative, groups, turns, and overrides

- [ ] 3.1 Implement owner-only player initiative submission, DM submission/replacement, d20 normal/advantage/disadvantage audit, integer modifiers, and enemy-only group slots; verify range, attribution, duplicate, wrong-target, invalid-group, and no-macro scenarios.
- [ ] 3.2 Implement descending initiative order, explicit unresolved ties, DM tie ordering, one current slot, round advancement, group-slot turns, and removed-slot handling; verify deterministic order and every blocked/invalid transition in COM-004.
- [ ] 3.3 Implement confirmed DM order overrides with nonblank reasons and immutable before/after audit; verify incomplete, duplicate, omitted, extra-slot, stale, and retried overrides change nothing or resolve idempotently as specified.

## 4. Hit points and manual boss state

- [ ] 4.1 Implement DM-only current/maximum/temporary HP commands and enemy defensive descriptors without automatic typed-damage or death logic; verify validation, exact-target atomicity, player denial, zero-HP behavior, and DM-only resistance/immunity projections.
- [ ] 4.2 Implement main-boss phases, sequential health bars, manually managed legendary-action availability, enrage state, and explicit awaiting-DM resolution at zero HP; verify mini-boss phase rejection and that no threshold, reset, effect, reward, or phase transition occurs automatically.
- [ ] 4.3 Enforce the conditions/effects and excluded-combat boundary at request and view surfaces; verify official/custom condition, duration, macro, tactical-map, physical/shake dice, monster-library, item/reward, rule-answer, and AI-balance requests create no authoritative combat state.

## 5. Character level progression

- [ ] 5.1 Implement the dedicated owner-authorized D&D 5e (2024) one-level transition from levels 1–19, including confirmation, complete-character validation, pending-review denial, approved-reference preservation, and non-owner/DM denial; verify boundary tests for skip, repeat, decrease, below-one, and above-twenty requests.
- [ ] 5.2 Persist the character-level update and immutable progression record atomically with version and idempotency checks; verify stale, concurrent, failed-write, retry, restart, and deletion/cleanup tests preserve one coherent history.
- [ ] 5.3 Keep advancement side effects limited to level/version/history and add owner, authorized-DM, player-shared, and table-level projections; verify no HP, review, skill, class, spell, feat, multiclass, condition, item, reward, combat, or other-character history mutation or disclosure occurs.

## 6. Views, synchronization, and session history

- [ ] 6.1 Add server-derived DM, player, and DM-authorized table combat projections with the exact COM-008 field matrix; verify current/former/unrelated actor tests and hidden-field tests for resistances, immunities, boss phases/triggers, DM traits, other character sheets, and mutation controls.
- [ ] 6.2 Integrate each accepted active-session combat command with exactly one audience-safe section-9 event through transactional or durable coordination; verify rollback, append failure, retry, ordering, attribution, visibility, and no player-note or private-field capture.
- [ ] 6.3 Add revisioned combat update propagation, gap/reconnect snapshot reconciliation, membership revocation, restart restoration, tracker completion freeze, and campaign cleanup; verify clients become stale/unavailable rather than diverging and history is never replayed as current combat or baseline live state.

## 7. Acceptance and documentation

- [ ] 7.1 Add end-to-end authorization, lifecycle, initiative/tie/group, turn/round, HP, boss, progression, persistence, idempotency, reference-scale, and role-visibility tests; run the project test suite and verify every accepted requirement has a passing scenario or an explicitly documented test boundary.
- [ ] 7.2 Reconcile the user guide and implementation documentation only after the future behavior is delivered, run `openspec validate add-combat-automation-and-character-progression --type change --strict --no-interactive` plus main-spec validation, and verify no deferred condition/effect, full character advancement, tactical, library, loot, rule-assistance, or AI behavior is presented as implemented.
