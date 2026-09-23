# live-play Specification

## Purpose

Defines the campaign-scoped runtime state for turns, hit points, active players, and self-reported dice results, including authority, validation, initialization, reset, and lifetime boundaries.

## Requirements

### Requirement: LIVE-001 Started-campaign live-play boundary
Live-play state SHALL belong to one started campaign. Only authenticated current campaign members SHALL be able to read it; only the campaign DM SHALL be able to change turns, hit points, active-player state, initialization, or reset, while dice publication SHALL follow LIVE-006. Guests, unrelated authenticated users, and former members MUST NOT receive or mutate live-play state. Display-client access remains governed by `session-views`.

#### Scenario: Current member reads live state
- **WHEN** an authenticated current member requests live-play state for their started campaign
- **THEN** the system returns the state fields authorized for that member without data from another campaign

#### Scenario: Campaign has not started
- **WHEN** a member attempts a live-play action for a campaign that is not started
- **THEN** the system rejects the action and creates no live-play state

#### Scenario: Nonmember requests live state
- **WHEN** a guest, unrelated authenticated user, or former member requests or mutates campaign live state
- **THEN** the system denies the request and returns no live-play data

#### Scenario: Campaign is missing
- **WHEN** a caller targets an unknown campaign identifier
- **THEN** the system returns a not-found outcome without creating state under that identifier

### Requirement: LIVE-002 Eligible-player initialization
The live player set SHALL contain only current `PLAYER` memberships whose referenced characters are complete and `APPROVED`; the campaign DM SHALL NOT be an HP or turn target. When live state is first initialized, the system SHALL derive each eligible level-one player's maximum hit points as at least one and otherwise 10 plus the character's Constitution modifier, set current hit points to that maximum, set the player active, and leave the current turn unset. Initialization MUST be atomic for each player and MUST NOT accept caller-supplied hit-point authority.

#### Scenario: Started campaign is initialized
- **WHEN** live state is first initialized for a started campaign with eligible approved players
- **THEN** the system creates current and maximum hit points from each approved character, marks each player active, and leaves the current turn unset

#### Scenario: Initialization is repeated after damage
- **WHEN** initialization is requested again for a player whose live current hit points, maximum hit points, or active state already exist
- **THEN** the system preserves all existing live values instead of restoring character defaults

#### Scenario: Membership is not an eligible player
- **WHEN** initialization encounters the campaign DM, a missing character, an incomplete character, or a non-approved review state
- **THEN** the system does not create HP, active, or turn state for that membership

#### Scenario: Approved character produces nonpositive base hit points
- **WHEN** the level-one hit-point calculation would be less than one
- **THEN** the system initializes both current and maximum hit points to one

### Requirement: LIVE-003 Turn selection
At most one eligible active player SHALL be the current turn target. Only the campaign DM SHALL be able to select that player. Selecting an inactive, removed, missing, non-player, or different-campaign identity MUST be rejected. If the current player becomes inactive or is removed, the current turn SHALL be cleared until the DM selects another eligible active player. This capability MUST NOT claim an automated initiative order, tie-breaker, or combat-turn rule.

#### Scenario: DM selects an active player
- **WHEN** the campaign DM selects an eligible active player for the turn
- **THEN** the system stores that player as the sole current turn target

#### Scenario: DM selects an invalid turn target
- **WHEN** the DM selects an inactive, removed, missing, non-player, or different-campaign identity
- **THEN** the system rejects the selection and preserves the prior turn

#### Scenario: Non-DM selects a turn
- **WHEN** an ordinary campaign member attempts to set the current turn
- **THEN** the system denies the action and preserves the current turn

#### Scenario: Current player becomes unavailable
- **WHEN** the current turn player is marked inactive or their membership is removed
- **THEN** the system clears the current turn without choosing an initiative successor

#### Scenario: Caller requests automated initiative
- **WHEN** a caller asks live play to calculate initiative order or resolve initiative ties
- **THEN** the system does not claim that behavior is supported by the current baseline

### Requirement: LIVE-004 DM-managed hit points
Only the campaign DM SHALL be able to apply a finite integer hit-point delta to an eligible player. The system SHALL apply the delta to the authoritative current value and clamp the result from zero through that player's initialized maximum hit points. The operation MUST NOT change maximum hit points, character data, or another player's state. Ordinary players and display clients SHALL be read-only consumers of authorized HP values.

#### Scenario: DM applies damage
- **WHEN** the DM applies a valid negative hit-point delta to an eligible player
- **THEN** the system decreases current hit points without going below zero and leaves maximum hit points unchanged

#### Scenario: DM applies healing
- **WHEN** the DM applies a valid positive hit-point delta to an eligible player
- **THEN** the system increases current hit points without exceeding the initialized maximum

#### Scenario: Hit points are not initialized
- **WHEN** the DM attempts to change a player whose live HP state has not been validly initialized
- **THEN** the system rejects the change rather than assuming an arbitrary current or maximum value

#### Scenario: HP input is invalid
- **WHEN** an HP request contains a non-integer, missing, or non-finite delta or an ineligible player identifier
- **THEN** the system rejects the request and changes no live state

#### Scenario: Player changes their own hit points
- **WHEN** a non-DM member attempts to damage, heal, or replace current or maximum hit points
- **THEN** the system denies the operation and preserves the authoritative values

#### Scenario: Hit points reach zero
- **WHEN** damage reduces current hit points to zero
- **THEN** the system stores zero without inferring death, unconsciousness, a condition, or another future combat rule

### Requirement: LIVE-005 Active-player state
Only the campaign DM SHALL be able to mark an eligible player active or inactive. An inactive player SHALL retain their HP values but MUST NOT be selected as the current turn target. Reactivating a player SHALL make them eligible for later DM turn selection without assigning the turn automatically. Activity state MUST NOT change campaign membership, character review, decision eligibility, or map membership.

#### Scenario: DM makes a player inactive
- **WHEN** the DM marks an eligible player inactive
- **THEN** the system preserves that player's HP, prevents turn selection, and clears the turn if that player was current

#### Scenario: DM reactivates a player
- **WHEN** the DM marks an inactive eligible player active
- **THEN** the player becomes eligible for later turn selection but does not automatically receive the turn

#### Scenario: Player changes activity state
- **WHEN** an ordinary member attempts to change their own or another player's active state
- **THEN** the system denies the action and preserves all activity and turn state

### Requirement: LIVE-006 Self-reported dice publication
An authenticated current campaign member SHALL be able to publish a dice result attributed only to their server-authenticated identity. Supported dice types SHALL be d4, d6, d8, d10, d12, d20, and d100, and the result MUST be an integer from one through the selected die's sides. Both the browser-generated roll and a manual value within that range SHALL be accepted as self-reported play aids; the current baseline SHALL NOT claim server-side randomness, cryptographic fairness, or an audited roll log. The system SHALL retain at most the latest published roll in live state.

#### Scenario: Player publishes a browser-generated roll
- **WHEN** a current campaign player submits a supported die and an in-range generated result
- **THEN** the system records it as that authenticated player's latest roll and makes the die, result, attribution, and time available to authorized campaign views

#### Scenario: DM publishes a roll
- **WHEN** the campaign DM submits a supported die and an in-range result
- **THEN** the system records and attributes the roll to the DM rather than to a player named by the request

#### Scenario: Member publishes a manual result
- **WHEN** a current member explicitly enters an integer within the selected die's range
- **THEN** the system publishes it under the same self-reported trust model and does not label it server-generated

#### Scenario: Caller forges another identity
- **WHEN** a member supplies another player identifier or display name with a dice result
- **THEN** the system ignores the claimed attribution and uses the authenticated member's identity

#### Scenario: Dice input is invalid
- **WHEN** the die type is unsupported or the result is missing, non-integer, below one, or above that die's sides
- **THEN** the system rejects the publication and preserves the prior latest roll

#### Scenario: Member publishes another roll
- **WHEN** a valid dice result is published after an earlier result
- **THEN** the latest-roll state is replaced without claiming a persistent server-side history

### Requirement: LIVE-007 Live-state lifetime, reset, and cleanup
Current turn, player current and maximum HP, player activity, and the latest dice result SHALL be campaign-scoped ephemeral runtime state. They SHALL survive view navigation, browser refresh, and client reconnect while the same authoritative runtime state remains available, but SHALL NOT be a durable session or encounter history and are not promised across service restart, deployment replacement, or failover. Only the campaign DM SHALL be able to reset these fields after explicit confirmation. Reset SHALL preserve the campaign's started state, persisted group decisions, player notes, campaign membership, character data, and every map-owned field governed by `campaign-maps`. Campaign deletion SHALL remove all remaining live-play state.

#### Scenario: Member refreshes a live view
- **WHEN** an authorized member refreshes or reconnects while the campaign's authoritative runtime state still exists
- **THEN** the system returns the same turn, HP, maximum HP, activity, and latest-roll values

#### Scenario: Runtime state is lost on service restart
- **WHEN** the application runtime restarts or is replaced without durable live-state storage
- **THEN** the campaign remains started but live-play fields return uninitialized and no prior turn, HP change, activity change, or dice history is invented

#### Scenario: DM confirms live-state reset
- **WHEN** the campaign DM explicitly confirms reset of live-play state
- **THEN** the system clears turn, HP, maximum HP, activity, and latest-roll fields while preserving campaign, decision, note, and map-owned state

#### Scenario: DM cancels reset
- **WHEN** the DM does not confirm live-state reset
- **THEN** the system preserves every live-play field

#### Scenario: Reset is repeated
- **WHEN** the DM repeats a confirmed reset while the live-play fields are already uninitialized
- **THEN** the operation remains idempotent and does not alter other campaign data

#### Scenario: Non-DM requests reset
- **WHEN** an ordinary member, former member, nonmember, or display client attempts live-state reset
- **THEN** the system denies the request and changes no state

#### Scenario: Campaign is deleted
- **WHEN** campaign deletion completes
- **THEN** the system removes the campaign's live-play state and no later read recreates it without an existing campaign

### Requirement: LIVE-008 Current live-play scope boundary
The current live-play capability SHALL provide manual DM control of turn, HP, and active participation plus self-reported dice publication. It SHALL NOT claim initiative calculation, conditions or effects, automated attacks or damage, encounter history, level advancement, death rules, or tactical-map enforcement. Those behaviors require separately accepted future combat, progression, or session-record capabilities.

#### Scenario: Group uses current live controls
- **WHEN** the DM manually selects turns, applies HP changes, changes activity, and members publish dice results
- **THEN** the system supports those actions without applying unstated combat rules

#### Scenario: Caller requests future combat automation
- **WHEN** a caller requests automated initiative, conditions, attacks, advancement, or encounter history through live play
- **THEN** the system does not claim that behavior is supported by the current baseline
