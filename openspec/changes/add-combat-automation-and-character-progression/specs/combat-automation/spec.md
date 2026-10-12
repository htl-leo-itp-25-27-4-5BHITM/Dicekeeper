# combat-automation Specification

## Purpose

Defines D&D 5e (2024) encounter combat tracking for combatants, initiative, turns, hit points, manually controlled boss state, history, synchronization, and role-filtered views without inventing unresolved rules.

## ADDED Requirements

### Requirement: COM-001 Rules profile and active-encounter boundary
Combat automation SHALL use the D&D 5e (2024) rules profile selected for Dicekeeper and SHALL belong to exactly one `ACTIVE` encounter within one `ACTIVE` session of a started campaign. At most one combat tracker SHALL be active for an encounter. Only the authenticated owner-DM of that campaign SHALL start, complete, or cancel the tracker. Starting a tracker MUST NOT create an encounter, change the campaign-start state, or activate a second session or encounter.

#### Scenario: DM starts combat for an active encounter
- **WHEN** the campaign is started, its session and encounter are active, no combat tracker is active for that encounter, and the campaign DM starts combat
- **THEN** the system creates one D&D 5e (2024) encounter tracker owned by that encounter

#### Scenario: Session or encounter is not active
- **WHEN** the DM attempts to start combat for a planned, completed, archived, missing, or wrong-campaign session or encounter
- **THEN** the system rejects the request and creates no combat state

#### Scenario: A tracker is already active
- **WHEN** a caller attempts to start a second combat tracker for the same active encounter
- **THEN** the system rejects the duplicate and preserves the existing tracker

#### Scenario: Non-DM starts or closes combat
- **WHEN** a player, display client, former member, nonmember, or unrelated DM attempts to start, complete, or cancel combat
- **THEN** the system denies the operation and changes no combat or encounter state

#### Scenario: Another edition is requested
- **WHEN** a caller asks the combat tracker to apply a different D&D edition or another game system
- **THEN** the system rejects that rules profile and does not mix its mechanics into the encounter

### Requirement: COM-002 Encounter combatant roster
The campaign DM SHALL manage a combat roster containing eligible player combatants and encounter-local enemy combatants. A player combatant SHALL reference a current `PLAYER` membership with an existing complete `APPROVED` character in the same campaign and SHALL retain that player's identity exactly once. An enemy SHALL have an encounter-local identifier, a nonblank display name, a kind of `ENEMY`, `MINI_BOSS`, or `MAIN_BOSS`, and the hit-point fields required by COM-005. Enemy entries MAY carry a portrait reference and DM-only descriptive traits, but they MUST NOT create a reusable monster library, campaign-content NPC statistics, an AI-generated encounter, an item, or a character.

#### Scenario: DM adds eligible players
- **WHEN** the DM initializes the combat roster from current approved campaign players
- **THEN** the system adds each eligible player at most once and preserves the campaign membership and character references

#### Scenario: Player is not eligible
- **WHEN** roster initialization encounters a DM membership, former member, missing or incomplete character, or review state other than `APPROVED`
- **THEN** the system omits that identity and does not create a substitute combatant

#### Scenario: DM creates an enemy
- **WHEN** the DM submits a valid encounter-local enemy name, supported kind, and hit-point fields
- **THEN** the system creates one enemy combatant inside that encounter without creating a global or campaign-content record

#### Scenario: Enemy input is invalid
- **WHEN** an enemy has a blank name, unsupported kind, invalid hit-point field, caller-supplied campaign ownership, or reference to another campaign
- **THEN** the system rejects the complete mutation and creates no partial combatant

#### Scenario: Current combatant is removed
- **WHEN** the DM removes a combatant that owns the current initiative turn
- **THEN** the system removes it from the encounter roster, clears the current turn, and requires an explicit valid successor selection or advance

#### Scenario: Caller requests a reusable or AI-created enemy
- **WHEN** a caller asks this capability to select from an unaccepted monster library or generate or balance an enemy with AI
- **THEN** the system provides no such result and leaves reusable libraries and AI encounter assistance outside this capability

### Requirement: COM-003 Initiative submission and enemy groups
Every active combatant SHALL have at most one initiative entry. A current player SHALL be able to submit initiative only for their own player combatant as either a manually entered finite integer total or a built-in d20 result with an optional finite integer modifier and exactly one roll mode of `NORMAL`, `ADVANTAGE`, or `DISADVANTAGE`. The built-in roller SHALL use one d20 for `NORMAL`, the higher of two d20 results for `ADVANTAGE`, and the lower for `DISADVANTAGE`, then apply the modifier. The DM SHALL be able to submit or replace any combatant's total and SHALL be able to place two or more enemy combatants into one initiative group that shares one total and one turn slot. A player combatant MUST NOT be placed in an enemy initiative group. Macros and automatic stat-derived modifiers are outside this capability.

#### Scenario: Player enters a manual initiative total
- **WHEN** a current player submits a finite integer initiative total for their own eligible combatant
- **THEN** the system records that total with the authenticated player's attribution and manual-entry mode

#### Scenario: Player uses advantage
- **WHEN** a current player requests a built-in d20 initiative roll with `ADVANTAGE` and a valid modifier
- **THEN** the system records both d20 results, selects the higher result, applies the modifier once, and stores the resulting total

#### Scenario: Player targets another combatant
- **WHEN** a player attempts to submit or replace initiative for another player or an enemy
- **THEN** the system denies the request and preserves every initiative entry

#### Scenario: DM creates an enemy initiative group
- **WHEN** the DM groups two or more enemy combatants and assigns a valid shared initiative total
- **THEN** the system places each named enemy exactly once in one shared initiative slot while preserving each enemy's separate hit points and identity

#### Scenario: Initiative group is invalid
- **WHEN** a group contains a player, a duplicate enemy, fewer than two enemies, a removed combatant, or an enemy from another encounter
- **THEN** the system rejects the entire grouping operation and preserves the previous initiative structure

#### Scenario: Unsupported roll automation is requested
- **WHEN** a caller requests a macro, an automatically derived ability modifier, or another dice expression
- **THEN** the system rejects that automation without changing the stored initiative entry

### Requirement: COM-004 Tie resolution, order, turns, and rounds
Dicekeeper SHALL order initiative slots by descending total. Equal totals SHALL remain explicitly tied until the campaign DM assigns a complete relative order among those tied slots; the system MUST NOT infer a Dexterity, alphabetical, random, or hidden fallback. Combat MUST NOT begin or advance through an unresolved tie. After all ties are resolved, the system SHALL expose exactly one current slot, advance through the complete order, increment the round after the last slot, and skip removed slots without silently reordering survivors. The DM SHALL be able to apply a confirmed manual order override with a nonblank reason; the override SHALL preserve totals, group membership, and an auditable before/after order.

#### Scenario: Initiative totals have no tie
- **WHEN** every submitted slot has a distinct total and the DM starts the order
- **THEN** the system selects the highest total as the first current slot and records round one

#### Scenario: Initiative totals are tied
- **WHEN** two or more slots have the same total and no DM tie order exists
- **THEN** the system marks those slots unresolved and does not select or advance a current slot through the tie

#### Scenario: DM resolves a tie
- **WHEN** the DM assigns every tied slot a unique relative position
- **THEN** the system stores that ordering while preserving the shared totals and produces one complete deterministic initiative order

#### Scenario: Enemy group becomes current
- **WHEN** initiative advances to a valid enemy group slot
- **THEN** the group is the sole current slot and the DM may manage its member actions without creating separate positions in the round order

#### Scenario: Last slot completes its turn
- **WHEN** the DM advances from the last valid initiative slot
- **THEN** the system increments the round by one and selects the first valid slot in the preserved order

#### Scenario: DM overrides the established order
- **WHEN** the DM confirms a complete valid replacement order and supplies a nonblank reason
- **THEN** the system applies the order, preserves initiative totals and groups, and records the reason plus before/after positions

#### Scenario: Order override is incomplete or invalid
- **WHEN** an override omits, duplicates, or adds a slot or has no reason
- **THEN** the system rejects it and preserves the current order, turn, and round

### Requirement: COM-005 Encounter hit points and defensive information
Every combatant SHALL have finite integer maximum and current hit points greater than or equal to zero, with current hit points no greater than maximum, and MAY have finite integer temporary hit points greater than or equal to zero. Only the DM SHALL change those values. A hit-point command SHALL identify the exact field and signed integer change or replacement, SHALL clamp neither an invalid maximum nor a negative value into acceptance, and SHALL change no other combatant. Enemy vulnerabilities MAY be member-visible, while resistance and immunity information SHALL remain DM-only. Resistance, immunity, vulnerability, temporary hit points, and hit-point changes SHALL be tracked as information only; this capability MUST NOT calculate attacks, damage types, saving throws, death, unconsciousness, or automatic damage reduction.

#### Scenario: DM applies a valid current-HP change
- **WHEN** the DM applies a finite integer change whose result remains between zero and the combatant's maximum hit points
- **THEN** the system stores the exact resulting current value and preserves maximum and temporary hit points

#### Scenario: DM records temporary hit points
- **WHEN** the DM sets a valid nonnegative temporary-hit-point value
- **THEN** the system stores that value separately without changing current or maximum hit points

#### Scenario: Hit-point request is invalid
- **WHEN** a request has a non-integer value, negative maximum or temporary hit points, current hit points above maximum, or a missing or wrong-encounter combatant
- **THEN** the system rejects the request and changes no combat state

#### Scenario: Player changes hit points
- **WHEN** a player or display client attempts to alter their own or another combatant's current, maximum, or temporary hit points
- **THEN** the system denies the mutation and preserves the authoritative values

#### Scenario: Damage type is supplied
- **WHEN** a caller supplies a damage type against a combatant with resistance, immunity, or vulnerability information
- **THEN** the system does not automatically transform the hit-point change and requires the DM to submit the intended authoritative value

#### Scenario: Combatant reaches zero hit points
- **WHEN** the DM sets current hit points to zero
- **THEN** the system stores zero without inferring death, unconsciousness, a condition, a phase transition, or a reward

### Requirement: COM-006 Manually controlled boss state
An enemy kind `MAIN_BOSS` MAY have one or more ordered phases, optional sequential health bars, a nonnegative legendary-action availability value, and an enrage state. A `MINI_BOSS` or ordinary `ENEMY` MUST NOT have phases. Only the DM SHALL reveal or activate a main-boss phase, move to another health bar, change legendary-action availability, or activate/deactivate enrage. Reaching zero hit points or another described trigger MUST NOT cause an automatic transition; the system SHALL wait for an explicit valid DM command. Boss controls MUST NOT apply unrecorded rule effects, reset legendary actions automatically, or create items, rewards, or character progression.

#### Scenario: DM configures a main boss
- **WHEN** the DM creates a valid main boss with ordered phases, one or more valid health bars, legendary-action availability, and optional enrage description
- **THEN** the system stores the complete DM-authorized boss configuration and exposes only the current revealed state to shared views

#### Scenario: DM advances a boss phase
- **WHEN** the DM explicitly selects the next valid phase and its configured health bar
- **THEN** the system changes the current phase and bar once and records the previous and new state

#### Scenario: Boss health reaches zero
- **WHEN** the current boss health bar reaches zero without a DM transition command
- **THEN** the system preserves the zero value, marks the boss as awaiting DM resolution, and does not reveal or activate another phase automatically

#### Scenario: DM changes legendary-action availability
- **WHEN** the DM submits a valid nonnegative availability value
- **THEN** the system stores that value without inferring an action cost, refresh timing, or combat effect

#### Scenario: DM toggles enrage
- **WHEN** the DM explicitly activates or deactivates the boss's configured enrage state
- **THEN** the system records the selected state without automatically changing initiative, hit points, conditions, or other combatants

#### Scenario: Mini boss receives phases
- **WHEN** a caller attempts to configure one or more phases for a `MINI_BOSS` or ordinary enemy
- **THEN** the system rejects the phase configuration and preserves the enemy's prior state

### Requirement: COM-007 Conditions and effects are explicitly deferred
This change SHALL NOT define an official-condition catalog, custom conditions, effect duration, automatic expiration, stacking, concentration, advantage/disadvantage from effects, or any rules-driven buff/debuff outcome. Combat views and APIs MUST NOT present a free-text label or unchecked source value as a validated D&D condition or as having an automatic mechanical effect. Admitting conditions or effects later SHALL require a separately accepted contract that defines the supported catalog, custom-entry policy, duration and removal rules, visibility, and rule consequences.

#### Scenario: DM requests an official condition
- **WHEN** the DM attempts to apply a named D&D condition through this capability
- **THEN** the system reports that condition automation is deferred and changes no initiative, HP, boss, or character state

#### Scenario: Caller supplies a custom buff or debuff
- **WHEN** a caller submits a custom effect name, duration, stacking rule, or automatic modifier
- **THEN** the system stores no validated combat effect and does not apply the requested rule outcome

#### Scenario: Narrative mentions a condition
- **WHEN** an authorized session event or DM note describes a fictional condition in plain text
- **THEN** the text remains narrative only and does not become authoritative condition or effect state

### Requirement: COM-008 Role-filtered combat visibility
The campaign DM SHALL receive the complete combat roster, initiative details, hidden boss configuration, resistance and immunity information, and all mutation controls. A current campaign player SHALL receive the shared combat projection: combatant display identities and portraits, initiative totals/groups/order, round and current slot, current/maximum/temporary HP, enemy kind, visible vulnerabilities, current revealed boss phase and health bar, legendary-action availability, and enrage state. A player MUST NOT receive another player's character sheet, resistance or immunity information, DM-only traits, unrevealed boss phases or triggers, or mutation controls. The DM-authorized table projection SHALL be read-only and SHALL receive the same shared combat fields without character sheets or player-only interaction state. Guests, nonmembers, former members, and unrelated DMs MUST NOT receive combat data.

#### Scenario: DM opens the combat tracker
- **WHEN** the owner-DM opens an active encounter's combat view
- **THEN** the system returns the complete authorized tracker and DM controls

#### Scenario: Player opens the combat projection
- **WHEN** an approved current player opens the active encounter
- **THEN** the system returns the shared combat projection and omits every DM-only or other-character field

#### Scenario: Player inspects an enemy
- **WHEN** a player reads an enemy or boss in the shared projection
- **THEN** the system includes the defined shared HP, initiative, vulnerability, and current boss state but omits resistance, immunity, hidden phases, triggers, and DM traits

#### Scenario: Table projection is active
- **WHEN** the authenticated campaign DM opens the read-only table view for the active encounter
- **THEN** the table receives the shared combat projection and no combat mutation action

#### Scenario: Former member reuses combat access
- **WHEN** a removed member, guest, nonmember, or unrelated DM requests or subscribes to combat state
- **THEN** the system denies access, returns no protected state, and stops later updates

### Requirement: COM-009 Durable state, idempotent commands, history, and completion
Combat roster, initiative, order, round, hit points, boss state, revisions, and manual-override audit data SHALL persist with the encounter across browser, device, service restart, and deployment replacement until campaign deletion. Every accepted mutation SHALL advance a tracker revision and use an idempotency identity so a retry produces one outcome. During an active session, every accepted combat mutation SHALL append exactly one audience-safe `session-records` event before the mutation is acknowledged as complete; a failed or rolled-back mutation MUST append no success event. Completing or cancelling combat SHALL freeze its final state, clear its current turn, and prevent later mutation. Combat history MUST NOT be replayed as current baseline `live-play` state or mutate a player-owned character.

#### Scenario: Service restarts during combat
- **WHEN** the application restarts while the session, encounter, and combat tracker remain active
- **THEN** the system restores the durable tracker, revision, current order, round, HP, and boss state from their authoritative source

#### Scenario: Combat command is retried
- **WHEN** an accepted command is delivered again with the same idempotency identity
- **THEN** the system returns the original result without changing state twice or appending a duplicate history event

#### Scenario: History append fails
- **WHEN** a combat mutation cannot append its required active-session event
- **THEN** the system does not acknowledge the combat mutation as complete and preserves the prior authoritative state

#### Scenario: DM completes combat
- **WHEN** the DM explicitly completes the active tracker
- **THEN** the system freezes its final state, clears the current slot, appends the completion event, and accepts no later combat mutation

#### Scenario: Caller requests live-state reconstruction
- **WHEN** a caller asks to rebuild current turn, HP, or boss state by replaying session events after the tracker is missing
- **THEN** the system refuses reconstruction and reports the authoritative tracker unavailable rather than inventing current state

#### Scenario: Campaign is deleted
- **WHEN** campaign deletion completes with required persistent cleanup
- **THEN** the system removes its combat trackers and dependents without affecting another campaign or player-owned character

### Requirement: COM-010 Reference scale and excluded combat candidates
The combat tracker SHALL preserve authorization, validation, initiative uniqueness, group membership, ordering, idempotency, and role-filtered projections for a reference encounter containing 3–10 player combatants and up to 25 enemy combatants. Grouping enemies MUST NOT reduce the number of independently tracked enemy identities or HP records. This reference scale SHALL NOT imply a fixed latency, throughput, deployment-capacity target, or a promise of unbounded enemies. Tactical grid movement, distance, terrain, collision, line of sight, automated attack/damage rules, physical-camera or shake-to-roll dice, reusable monster libraries, items/loot/rewards, rule answers, and AI encounter creation or balancing SHALL remain outside this capability.

#### Scenario: Reference-scale encounter is used
- **WHEN** an authorized encounter contains ten eligible players and twenty-five enemies, including enemy initiative groups
- **THEN** the system preserves one identity and HP record per combatant, one valid slot per individual or group, deterministic order, and correct role-filtered views

#### Scenario: Grouped enemies are counted
- **WHEN** eight enemies share one initiative group
- **THEN** the system retains eight separate enemy combatants and counts all eight toward the reference enemy scale

#### Scenario: Caller requests an unbounded guarantee
- **WHEN** a caller asks the product to promise correct performance for an unlimited number of combatants or a numeric response time
- **THEN** the system makes no such claim and leaves operational targets to a separately recorded decision and verification environment

#### Scenario: Caller requests tactical-map enforcement
- **WHEN** a caller asks combat automation to validate movement, range, terrain, collision, or line of sight on a campaign map
- **THEN** the system provides no tactical-rule outcome and preserves the exploration-map boundary

#### Scenario: Caller requests AI encounter balancing
- **WHEN** a caller asks combat automation to generate, recommend, or balance an encounter or boss
- **THEN** the system does not invoke an AI provider and leaves that workflow to section 11
