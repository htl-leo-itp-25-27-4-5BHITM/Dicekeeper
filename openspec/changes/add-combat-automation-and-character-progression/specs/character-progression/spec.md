# character-progression Specification

## Purpose

Defines owner-controlled D&D 5e (2024) character level tracking from level one through level twenty, including validation, history, visibility, persistence, and explicit boundaries around unanswered advancement mechanics.

## ADDED Requirements

### Requirement: PRG-001 Supported edition and bounded advancement
Character progression SHALL use the D&D 5e (2024) rules profile selected for Dicekeeper. The supported advancement in this change SHALL be a persistent increase of a complete character's stored level by exactly one, from level one through level twenty. It SHALL NOT select an award method, calculate experience points, decide when a milestone is earned, or imply that changing the tracked level completes every class-specific choice. Another edition, another game system, a level above twenty, and a level below one MUST be rejected.

#### Scenario: Level-one character is eligible to advance
- **WHEN** an authorized owner requests progression for their complete level-one character
- **THEN** the system treats level two as the only valid next tracked level

#### Scenario: Caller skips a level
- **WHEN** a caller submits a target more than one level above the stored level
- **THEN** the system rejects the request and preserves the stored level and progression history

#### Scenario: Caller lowers a level
- **WHEN** a caller submits the current level, a lower level, or a value below one
- **THEN** the system rejects the request and changes no character data

#### Scenario: Level-twenty character advances
- **WHEN** a caller attempts to advance a level-twenty character
- **THEN** the system rejects the request and preserves level twenty

#### Scenario: Another rules profile is requested
- **WHEN** a caller asks progression to apply another edition or game system
- **THEN** the system rejects the profile and does not mix its advancement behavior into the character

### Requirement: PRG-002 Character-owner authority and campaign references
Only the authenticated owner of a complete character SHALL be able to advance it. A campaign DM SHALL retain the read-only character access granted by `character-library` and MUST NOT advance a member's character. An unreferenced character or a character referenced only by `REJECTED` memberships MAY advance. A character in `PENDING` review MUST NOT advance until that review resolves. An `APPROVED` character MAY advance through this capability without granting generic edit authority, changing ownership, or changing the approval state; the new level SHALL become visible through the same authorized campaign reference.

#### Scenario: Owner advances an unreferenced character
- **WHEN** the authenticated owner confirms a valid one-level advancement for their complete unreferenced character
- **THEN** the system applies the progression under that owner's authority

#### Scenario: Owner advances an approved campaign character
- **WHEN** the owner confirms a valid one-level advancement for a complete character referenced by an `APPROVED` campaign membership
- **THEN** the system advances only the tracked level and preserves the membership, character owner, and `APPROVED` state

#### Scenario: Character is pending review
- **WHEN** the owner attempts progression while any campaign membership references the character in `PENDING` review
- **THEN** the system rejects advancement and preserves the level until the pending review resolves

#### Scenario: Campaign DM advances a player's character
- **WHEN** a campaign DM who is not the character owner attempts to advance that referenced character
- **THEN** the system denies the operation and preserves the character and campaign review state

#### Scenario: Unrelated caller requests progression
- **WHEN** a guest or authenticated non-owner requests progression or its private history
- **THEN** the system denies the request and returns no protected character data

### Requirement: PRG-003 Confirmed atomic level transition
A valid advancement SHALL require explicit owner confirmation, the character's current version and current level, and an idempotency identity. The system SHALL atomically update the stored level and append one immutable progression record containing the previous level, new level, authenticated owner, server time, and idempotency identity. A stale version, mismatched current level, duplicate later request, failed write, or missing confirmation MUST NOT produce a partial level or history outcome.

#### Scenario: Owner confirms valid advancement
- **WHEN** the owner supplies the current character version and level, the next level, confirmation, and a new idempotency identity
- **THEN** the system stores the new level and exactly one matching progression record as one outcome

#### Scenario: Owner cancels advancement
- **WHEN** the owner does not provide the required confirmation
- **THEN** the system preserves the character level and appends no progression record

#### Scenario: Character version is stale
- **WHEN** another accepted change has advanced the character version before the progression request commits
- **THEN** the system rejects the stale request and identifies the current level and version for reconciliation

#### Scenario: Progression persistence fails
- **WHEN** either the level update or history append cannot complete
- **THEN** the system rolls back the whole advancement and reports failure without a partial level or history record

#### Scenario: Advancement request is retried
- **WHEN** the same accepted request is delivered again with the same idempotency identity
- **THEN** the system returns the original outcome and does not advance another level or duplicate history

### Requirement: PRG-004 Advancement does not infer unanswered mechanics
An accepted level transition SHALL change only the character's stored level, version, update time, and progression history. It MUST NOT automatically change ability scores, proficiencies, skill values or "skill points," class or subclass features, feats, spells, class, background, race, alignment, current/maximum/temporary HP, conditions/effects, campaign review, combat state, items, loot, equipment, rewards, or another capability's data. Current live-play or combat HP SHALL remain unchanged until an authorized action under its owning capability changes it.

#### Scenario: Character advances while live state exists
- **WHEN** an owner advances a character that currently has live-play or encounter-combat HP
- **THEN** the system stores the new character level and leaves every current, maximum, and temporary HP value unchanged

#### Scenario: Caller supplies skill-point choices
- **WHEN** a progression request includes skill points, proficiency changes, or skill-value allocation
- **THEN** the system rejects or ignores those unsupported mutations and does not present them as validated D&D advancement

#### Scenario: Caller supplies class choices
- **WHEN** a progression request includes a subclass, feat, spell, class feature, multiclass, or ability-score choice
- **THEN** the system stores none of those unsupported choices and does not claim complete rules automation

#### Scenario: Caller supplies a reward or item
- **WHEN** progression is submitted with an item, loot, equipment, currency, or reward mutation
- **THEN** the system rejects that mutation because those domains remain deferred

#### Scenario: Approved review is present
- **WHEN** a valid level-only progression completes for an approved campaign character
- **THEN** the approval remains unchanged and no DM edit or new review decision is inferred

### Requirement: PRG-005 Role-filtered level and history visibility
The character owner SHALL receive the current level and complete progression history for their character. A DM SHALL receive the current level and progression history read-only only through an authorized character reference in that DM's campaign. A current campaign player MAY receive only their own level and history plus the current level of other combat participants in the shared campaign projection; they MUST NOT receive another character's progression history or sheet. The DM-authorized table projection MAY show each presented player combatant's display name and current level and MUST remain read-only. Former members, unrelated users, guests, and unrelated DMs MUST NOT receive level history or character-private data.

#### Scenario: Owner opens progression history
- **WHEN** the authenticated owner requests their character's progression record
- **THEN** the system returns the current level and ordered immutable history for that character

#### Scenario: Campaign DM inspects a referenced character
- **WHEN** the campaign DM reads a member's referenced character through an authorized campaign workflow
- **THEN** the system returns the current level and read-only progression history without granting mutation authority

#### Scenario: Player views another participant
- **WHEN** a current player reads the shared campaign or combat projection
- **THEN** the system may show the other participant's display name and current level but returns no progression history or character-sheet details

#### Scenario: Table projection shows levels
- **WHEN** the authenticated campaign DM opens the shared table projection
- **THEN** the table may show presented player display names and current levels and offers no progression action

#### Scenario: Former member reuses a reference
- **WHEN** a removed member or unrelated caller requests the character's level history through a former campaign reference
- **THEN** the system denies access and returns no history or character-private fields

### Requirement: PRG-006 Persistence, deletion, and historical integrity
Character level, version, and progression history SHALL persist across browser, device, service restart, and deployment replacement until the character is deleted through `character-library` or its owner's account cleanup. Progression history SHALL be append-only and MUST NOT be rewritten by a later advancement. Campaign leave, removal, or campaign deletion SHALL remove the campaign reference but SHALL preserve the player-owned character and its progression history. Character deletion SHALL remove its dependent progression history only after every blocking campaign reference has been resolved under the existing deletion contract.

#### Scenario: Application restarts
- **WHEN** the application restarts after one or more accepted advancements
- **THEN** the system restores the current level, version, and ordered progression history from durable storage

#### Scenario: Character advances again
- **WHEN** the owner later completes another valid one-level advancement
- **THEN** the system appends a new record and preserves every earlier level transition unchanged

#### Scenario: Player leaves a campaign
- **WHEN** campaign membership removal clears the reference to an advanced character
- **THEN** the system preserves the character and its progression history for the owner

#### Scenario: Owner deletes an unreferenced character
- **WHEN** character deletion is authorized after all blocking references are removed
- **THEN** the system removes the character and its dependent progression history without changing another character

### Requirement: PRG-007 Explicitly deferred advancement candidates
This capability SHALL NOT claim complete D&D character-sheet advancement. Experience-point accumulation, milestone award authority, level-down or advancement correction, skill points, proficiency selection, ability-score increases, feats, subclasses, class features, spells, multiclassing, HP increase method, equipment, inventory, rewards, and automated effect changes SHALL remain deferred because the repository sources do not define their product workflow. A later change that admits any of those behaviors MUST define authority, allowed choices, validation data, interaction with campaign review and combat state, visibility, correction, and deletion before adding implementation tasks.

#### Scenario: User requests a complete automated level-up
- **WHEN** a user asks Dicekeeper to choose or apply class-specific advancement mechanics
- **THEN** the system reports that only tracked one-level advancement is supported and applies no unanswered choice

#### Scenario: User requests XP or milestone handling
- **WHEN** a caller attempts to award, accumulate, or spend experience or mark a milestone through this capability
- **THEN** the system stores no award state and does not infer permission from the DM or character owner

#### Scenario: Owner requests level-down correction
- **WHEN** an owner asks to reverse or rewrite an accepted advancement
- **THEN** the system makes no silent history edit and requires a separately accepted correction workflow

#### Scenario: Later implementation task requests deferred mechanics
- **WHEN** implementation would require one of the deferred choices without a new accepted contract
- **THEN** the task remains blocked rather than selecting a rule, owner, or default inside implementation
