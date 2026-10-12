# Design

## Context

See [proposal.md](proposal.md) for motivation. The published baseline owns a started campaign, approved player characters, an ephemeral manual turn/HP/activity tracker, role-shaped DM/player/table views, exploration maps, and state-based synchronization. The accepted section-9 change adds durable sessions, optional encounters, and ordered event history, but it deliberately defines no combat or progression rules.

Repository evidence selects D&D 5e (2024), 3–10 typical players, a realistic large encounter of 25 enemies, manual or built-in initiative rolls, enemy group initiative, player-facing enemy information except resistances/immunities, and manually managed main-boss phases, legendary actions, multiple health bars, and enrage. Follow-up answers for initiative ties, official/custom conditions, duration and automatic effect semantics, skill points, complete level-up behavior, and the rule corpus are blank. Those omissions constrain the design: accepted tracking behavior is explicit, and unanswered mechanical behavior is deferred rather than embedded in implementation tasks.

## Goals / Non-Goals

**Goals:**

- Attach durable combat state to the accepted active encounter boundary without rewriting the current baseline.
- Make initiative, enemy groups, turns/rounds, HP, manual boss state, overrides, authorization, visibility, and restart behavior deterministic.
- Add a narrow owner-controlled level transition that can coexist with approved campaign references.
- Use one auditable command/history path for accepted combat and progression changes.
- Preserve explicit deferrals as product boundaries that implementation cannot silently fill.

**Non-Goals:**

- Selecting or importing a complete rules corpus, answering rule questions, or supporting another edition.
- Automatic conditions/effects, attacks, damage-type resolution, death rules, skill points, class choices, spells, feats, multiclassing, XP/milestones, or level-derived HP.
- Tactical-grid movement, line of sight, terrain, collision, physical-camera/shake dice, monster-library authoring, items/loot, or rewards.
- AI encounter generation or balance recommendations; section 11 owns those suggestions and their acceptance workflow.
- Implementing application code, migrations, APIs, views, tests, or any section-9 product task during this planning change.

## Decisions

### 1. Pin the behavior profile to D&D 5e (2024)

Persist a stable profile identifier such as `DND_5E_2024` on combat trackers and progression records. Do not interpret “current version” dynamically at runtime: a silent future edition switch would change stored behavior and test outcomes. Section 12 may later define the licensed/source corpus for rule assistance, but combat/progression needs only the small normative rules stated in these specs.

A system-agnostic profile was rejected because SRC-09 explicitly selects D&D and identifies 5e (2024) as the standard version. Pulling a full rules database into this change was rejected because its source, access, citations, and conflict handling remain section-12 decisions.

### 2. Give an active encounter one durable combat aggregate

Store one versioned combat aggregate keyed by the section-9 encounter. It owns combatants, initiative entries and enemy groups, tie positions, order, round/current slot, HP fields, boss state, command identities, and override audit records. Encounter activation remains owned by `session-records`; combat start requires that accepted lifecycle instead of introducing a second encounter state machine.

Reusing the current application-scoped `GameState` was rejected because it is campaign-wide, player-only, and intentionally ephemeral. Replaying session events as the tracker was rejected because section 9 makes history an outcome record rather than current-state authority.

### 3. Represent combatants separately from source records

Player combatants hold typed references to current approved campaign memberships and characters. Enemy combatants are encounter-local snapshots with their own identity and HP; optional campaign-content or portrait references remain references rather than ownership transfers. Removal from the tracker never deletes a player character, content record, or map.

Making campaign-content NPCs into stat blocks was rejected because section 9 accepts descriptive NPC records only. Creating a global monster library in this change was rejected because ownership, source data, editing, sharing, and import behavior are unanswered.

### 4. Model initiative as ordered slots with explicit tie state

Persist initiative submissions separately from initiative slots. A player or enemy occupies an individual slot; two or more enemies may share a group slot while retaining separate combatant state. Primary sort is descending total. Equal totals remain an unresolved set until the DM stores a complete relative order. A later confirmed order override stores the reason and before/after positions without changing totals or groups.

An automatic Dexterity, alphabetical, random, or identifier tie-break was rejected because the follow-up question is unanswered. Treating group members as one combatant was rejected because the 25-enemy scale and HP visibility require separate identities.

### 5. Keep HP and defensive traits informational and DM-authored

Store current, maximum, and temporary HP plus optional resistance, immunity, and vulnerability descriptors on enemy combatants. Commands target an explicit field and validated value; they do not execute an attack or infer typed damage. Resistance and immunity remain DM-only, while the accepted shared projection may include vulnerabilities.

Automatic damage transformation was rejected because attack resolution, condition interactions, and the authoritative rule corpus are not defined. Silently recalculating live or combat HP after character advancement was rejected because current clients already disagree on future-level HP formulas and the historical answers do not choose a method.

### 6. Treat boss features as manual state, not a hidden rules engine

Main-boss configuration may contain ordered phase records, sequential HP-bar records, manually managed legendary-action availability, and an enrage flag/description. Only explicit DM commands reveal/activate phases, switch bars, or toggle enrage. A zero HP bar produces an “awaiting DM resolution” state rather than an automatic transition. Mini bosses cannot have phases.

Automatic thresholds, legendary-action reset timing, costs, enrage effects, and rewards were rejected because the sources confirm the feature names but do not define their mechanics. The manual model preserves the human-DM assistance boundary and provides auditable presentation without pretending those rules were answered.

### 7. Defer condition/effect entities entirely

Do not create a generic condition table, free-text “validated condition,” duration counter, or automatic modifier in this change. Narrative session events may mention fictional states, but the API and views do not treat them as combat rules. The decision log and capability boundary identify the exact questions a later change must answer.

A nominal tag-only model was rejected because users could mistake an unchecked label for an official D&D condition, while custom-entry, duration, stacking, visibility, and mechanical consequences are all unanswered.

### 8. Implement progression as a separate level command and audit stream

Progression updates the player-owned character through a dedicated owner-authorized command rather than the generic character patch. It checks completeness, rules profile, levels 1–20, exactly-one-level advancement, confirmation, character version, review locks, and idempotency. The level update and immutable history append share one transaction. An approved campaign reference remains approved; a pending reference blocks advancement.

A complete character-builder redesign was rejected because skill points and class-specific advancement are unanswered. DM-authored progression was rejected because DEC-015 and SRC-10 preserve player ownership and deny DM character editing. Level-down/correction remains deferred rather than rewriting audit history without an accepted workflow.

### 9. Derive projections and synchronization from authoritative state

Produce separate DM, player, and DM-authorized table projections. The DM projection includes hidden defensive/boss fields and controls; the shared projection contains the fields enumerated by COM-008. Progression history is owner/authorized-DM data, while other players and the table receive current level only. Every projection is server-derived from the current identity and campaign role.

Committed commands advance an aggregate revision and publish/invalidate role-specific projections. Reconnect and detected gaps use full authorized snapshot reconciliation under the published synchronization contract. No common payload contains hidden fields for client-side removal.

### 10. Couple accepted mutations to section-9 history

For an active session, commit the combat mutation and its one audience-safe session event atomically when they share storage. A stable command identity enforces idempotency. If a distributed boundary is unavoidable, use an outbox/coordination state that withholds final acknowledgement and publication until the durable history append is guaranteed. Progression history remains character-owned; a future integration may append a session event only when a separately authorized active-session workflow requests it.

Best-effort history subscribers were rejected because section 9 requires recordable active-session outcomes not to disappear. Writing history first and then exposing a failed combat mutation was also rejected because it would record an outcome that never became authoritative.

### 11. Use the historical scale as a correctness fixture

Create acceptance fixtures for 3–10 players and up to 25 individually tracked enemies, including grouped enemy slots, ties, boss records, projections, reconnect, and idempotent retries. Do not convert this fixture into an invented response-time, throughput, or deployment-size target; those remain under the quantitative readiness gate recorded by DEC-032.

An unbounded guarantee was rejected because the first interview's “no upper limit” was later refined to a realistic 25-enemy case and cannot support infinite capacity.

## Data and transaction shape

Future implementation should introduce persistent records equivalent to:

- combat tracker: encounter/session/campaign ids, rules profile, status, round, current slot, version, and lifecycle times;
- combatant: tracker id, typed player/member/character references or encounter-local enemy identity, kind, portrait reference, HP fields, hidden defensive traits, and version;
- initiative submission: combatant/group id, total, roll mode, dice/modifier audit, actor, and revision;
- initiative group/slot: tracker id, ordered member ids, shared total, tie position, and stable position;
- boss phase/bar/state: main-boss id, ordered phase and bar values, revealed/current flags, legendary-action availability, enrage state, and version;
- combat command/audit: idempotency identity, actor, before/after revision, command kind, optional override reason, and time;
- character progression: character id, rules profile, from/to level, owner, idempotency identity, character version, and time.

Foreign keys and service-level checks enforce campaign/encounter/owner boundaries. Unique constraints enforce one active tracker per encounter, one combatant membership per tracker, one initiative membership per combatant, unique slot positions, one command result per idempotency identity, and one progression transition per accepted command.

## Risks / Trade-offs

- **Manual boss controls can diverge from a group's table rules** -> Label them as DM-authored state, retain audit history, and apply no hidden mechanical effect.
- **Level-only progression may feel incomplete** -> Present the boundary explicitly and keep every unanswered character mutation out of the implementation checklist.
- **Current live-play and future encounter combat can show different state** -> Scope the future tracker visibly to its active encounter and never silently copy, reconstruct, or label baseline live state as combat state.
- **A 25-enemy encounter can produce large projections and histories** -> Use stable identities, group slots, revisioned snapshots, pagination for completed history, and acceptance fixtures at the reference scale.
- **Hidden boss or defense data could leak through events** -> Build audience-specific payloads at write time and test each DM/player/table projection independently.
- **Ties can pause combat setup** -> Make unresolved ties prominent and require one explicit DM ordering rather than applying an undocumented fallback.

## Migration Plan

1. Add progression history and encounter-combat persistence with constraints, profile identifiers, versions, and command idempotency; create no inferred tracker or progression row for existing data.
2. Add owner-only progression commands and read projections behind a rollout boundary; existing characters retain their stored level and have empty history until their first future advancement.
3. Add DM combat setup, roster, initiative/group/tie, HP, boss-state, and completion commands against active section-9 encounters.
4. Add DM/player/table projections and revisioned synchronization, preserving current views until the future feature is enabled for an encounter.
5. Integrate accepted combat commands with section-9 event history and verify rollback/idempotency across the combined transaction boundary.
6. Run authorization, scale, restart, reconciliation, deletion, and migration tests before exposing the future workflows.

Rollback disables future entry points and event integration before removing schema. Persisted combat and progression records remain intact until a separately reviewed data-retention migration removes them; rollback never rewrites character levels or session history silently.
