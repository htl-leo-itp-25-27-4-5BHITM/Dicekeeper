# Spec Delta

## Purpose

Defines the owned character library, creation drafts, reference data, validated character details, campaign selection boundary, editing, and safe deletion.

## ADDED Requirements

### Requirement: CHAR-001 Character ownership and direct access
Every persisted character SHALL have exactly one player owner. An authenticated player SHALL be able to list and read their own complete characters, while guests and unrelated authenticated users MUST NOT list or directly read those characters. A campaign DM SHALL receive read-only character details only when the character is referenced by a membership in that DM's campaign; the DM role MUST NOT grant edit, selection, or deletion authority over the character.

#### Scenario: Owner lists their character library
- **WHEN** an authenticated player requests their character library
- **THEN** the system returns only complete characters owned by that player

#### Scenario: Owner reads one character
- **WHEN** an authenticated player requests a complete character they own
- **THEN** the system returns that character with its class, background, and ability scores

#### Scenario: Unrelated player requests a character
- **WHEN** an authenticated player requests a character owned by another player outside an authorized campaign context
- **THEN** the system denies access and returns no character details

#### Scenario: Campaign DM reviews a referenced character
- **WHEN** a campaign DM requests the character referenced by a membership in that DM's campaign for an authorized campaign workflow
- **THEN** the system returns the character details read-only for that workflow

#### Scenario: Campaign DM attempts to mutate a member's character
- **WHEN** a campaign DM who is not the character owner attempts to edit, select, or delete the member's character
- **THEN** the system denies the operation and leaves the character unchanged

#### Scenario: Guest requests a character
- **WHEN** a guest requests a character or character library
- **THEN** the system returns no character data and requires authentication

### Requirement: CHAR-002 Character reference data
An authenticated player SHALL be able to retrieve the available character classes, backgrounds, and abilities needed by the character editor. A completed character SHALL reference an available class and background and SHALL contain at most one score for each available ability; an unknown or duplicate reference MUST be rejected without changing the character.

#### Scenario: Player loads character reference data
- **WHEN** an authenticated player opens character creation or editing
- **THEN** the system provides the available classes, backgrounds, and abilities with the identifiers and descriptive fields needed for selection

#### Scenario: Character uses an unknown class or background
- **WHEN** an owner submits a character with a class or background identifier that is not in the available reference data
- **THEN** the system rejects the submission and creates or changes no complete character

#### Scenario: Character uses an unknown or duplicate ability
- **WHEN** an owner submits an ability allocation containing an unknown ability identifier or more than one score for the same ability
- **THEN** the system rejects the allocation and leaves the stored character unchanged

#### Scenario: Reference data is unavailable
- **WHEN** required class, background, or ability reference data cannot be loaded or validated
- **THEN** the system reports that character completion is unavailable and does not persist a complete character with unresolved references

### Requirement: CHAR-003 Complete character creation and validation
An authenticated player SHALL be able to create a level-one character they own by submitting a name of 1 to 100 characters after trimming, one available class, one available background, one score for every available ability, and optional race, alignment, and background-story values. Each submitted ability score MUST be an integer from 8 through 15 and the allocation MUST use no more than 27 points with costs 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, and 15=9. The system SHALL expose the character as complete only after the whole submission succeeds.

#### Scenario: Owner creates a valid character
- **WHEN** an authenticated player submits all required values and a valid ability allocation
- **THEN** the system creates one complete level-one character owned by that player and returns its resolved details

#### Scenario: Character name is invalid
- **WHEN** the submitted character name is blank after trimming or exceeds 100 characters
- **THEN** the system rejects completion and creates no complete character

#### Scenario: Ability score is outside the creation range
- **WHEN** an ability score is not an integer from 8 through 15
- **THEN** the system rejects completion and creates no complete character

#### Scenario: Ability allocation exceeds the point budget
- **WHEN** the submitted ability allocation costs more than 27 points
- **THEN** the system rejects completion and creates no complete character

#### Scenario: Completion fails after submission starts
- **WHEN** any required validation or persistence step fails during character completion
- **THEN** the system reports failure, exposes no partial record as a complete character, and preserves any recoverable browser-session draft

### Requirement: CHAR-004 Recoverable character-creation drafts
Before a character is completed, Dicekeeper SHALL keep the in-progress creation values only for the current authenticated player and browser session. Standalone creation and each campaign-specific creation context SHALL use separate drafts. Returning to the same context in that session SHALL restore the latest valid draft; successful completion or explicit discard SHALL clear it. Draft recovery MUST NOT create a server-side character or disclose one player's draft to a later player using the same browser session.

#### Scenario: Player returns to unfinished creation
- **WHEN** an authenticated player leaves character creation without completing or discarding it and returns to the same creation context in the same browser session
- **THEN** the system restores the latest recoverable step and values for that player

#### Scenario: Player opens a different creation context
- **WHEN** a player has a standalone draft and opens character creation for a particular campaign, or opens creation for a different campaign
- **THEN** the system does not replace either context with the other context's draft

#### Scenario: Character completion succeeds
- **WHEN** a draft is successfully completed as a character
- **THEN** the system clears that draft and does not restore it on the next creation attempt

#### Scenario: Player discards a draft
- **WHEN** the player explicitly discards an unfinished character draft
- **THEN** the system clears that draft and creates no character

#### Scenario: Draft storage is unavailable or corrupt
- **WHEN** browser-session draft storage is unavailable or contains unreadable data
- **THEN** character creation remains usable without recovery and the system does not create a partial character from that data

#### Scenario: A different player signs in on the same browser
- **WHEN** another player signs in before the prior browser session's draft has been cleared
- **THEN** the system does not restore or disclose the prior player's character draft

### Requirement: CHAR-005 Owner editing and review-state locks
The character owner SHALL be able to edit a complete character's name, class, background, optional race, alignment, background story, and creation-range ability allocation subject to the same ownership, reference, name, and ability validation as creation. An edit MUST be applied atomically. A character referenced by any `PENDING` or `APPROVED` campaign membership MUST be read-only to its owner; a character referenced only by `REJECTED` memberships SHALL remain editable so the owner can address review feedback. The `character-review` contract SHALL define matching submission-state transitions.

#### Scenario: Owner edits an unreferenced character
- **WHEN** the owner submits valid changes for a complete character that is not pending or approved in any campaign
- **THEN** the system stores the whole valid edit and returns the updated resolved character

#### Scenario: Owner edits a rejected character
- **WHEN** the owner submits valid changes for a character referenced only by rejected campaign memberships
- **THEN** the system stores the edit so the character can later be resubmitted through the character-review workflow

#### Scenario: Owner edits a pending or approved character
- **WHEN** the owner attempts to edit a character referenced by any pending or approved campaign membership
- **THEN** the system rejects the edit and leaves the character unchanged

#### Scenario: Unrelated user edits a character
- **WHEN** an authenticated user who is not the owner attempts to edit character fields or ability scores
- **THEN** the system denies the edit and leaves the character unchanged

#### Scenario: Edit contains any invalid field
- **WHEN** an owner submits an edit with an invalid name, reference, ability score, or point allocation
- **THEN** the system rejects the entire edit and preserves all previously stored character values

### Requirement: CHAR-006 Campaign character selection boundary
When an authenticated player selects a character for a campaign workflow, Dicekeeper SHALL offer only complete characters owned by that player. Selecting a character SHALL NOT by itself change the character or its campaign review state; submission authorization, state transitions, resubmission, and reuse across campaigns SHALL follow the `character-review` contract.

#### Scenario: Player opens campaign character selection
- **WHEN** an authenticated campaign member opens character selection
- **THEN** the system lists only that player's complete owned characters

#### Scenario: Unfinished draft is considered for selection
- **WHEN** a player has an unfinished character draft but no corresponding complete character
- **THEN** the draft is not available for campaign selection

#### Scenario: Player selects another owner's character identifier
- **WHEN** a player attempts to select a character owned by another player
- **THEN** the system denies the selection and does not change the membership's character reference or review state

#### Scenario: Player chooses an owned character
- **WHEN** a player chooses a complete character they own in the selection view
- **THEN** the system keeps the choice available for the separate character-submission action without mutating the character

### Requirement: CHAR-007 Reference-safe character deletion
Only the authenticated character owner SHALL be able to delete the character, and Dicekeeper SHALL require explicit destructive-action confirmation. A character referenced by any campaign membership MUST NOT be deleted. After all campaign references have been removed, successful deletion SHALL remove the character and its dependent ability and skill records without deleting other players' data.

#### Scenario: Owner deletes an unreferenced character
- **WHEN** the owner explicitly confirms deletion of a complete character that no campaign membership references
- **THEN** the system deletes the character and its dependent ability and skill records

#### Scenario: Owner cancels character deletion
- **WHEN** the owner does not provide the required deletion confirmation
- **THEN** the system deletes no character data

#### Scenario: Character is referenced by a campaign
- **WHEN** the owner attempts to delete a character referenced by any campaign membership or review state
- **THEN** the system rejects deletion, identifies that the campaign reference must be resolved first, and preserves the character and reference

#### Scenario: Unrelated user or campaign DM deletes a character
- **WHEN** an authenticated user who is not the owner attempts to delete the character, including a DM whose campaign references it
- **THEN** the system denies deletion and leaves all character data and campaign references unchanged

#### Scenario: Character does not exist
- **WHEN** the owner requests deletion of a character identifier that does not exist in their library
- **THEN** the system returns a not-found outcome and deletes no other data

#### Scenario: Account cleanup owns unreferenced characters
- **WHEN** account cleanup has removed the deleting player's campaign memberships and established that remaining characters are owned by that player and are no longer referenced
- **THEN** the system deletes those owned characters through this deletion contract and does not infer ownership from a former membership reference

### Requirement: CHAR-008 Level and progression boundary
The current character library SHALL create characters at level one and SHALL preserve the stored level for display. It MUST NOT provide a generic level-change operation; advancement rules and any resulting character mutations belong to the separately identified future `character-progression` capability.

#### Scenario: New character is completed
- **WHEN** a valid character creation succeeds
- **THEN** the stored character level is one

#### Scenario: Generic edit attempts to change level
- **WHEN** an owner submits a character-library edit containing a different level
- **THEN** the system rejects or ignores the level change and leaves the stored level unchanged

#### Scenario: Existing character has a stored level
- **WHEN** an authorized reader views an existing character
- **THEN** the system returns the stored level without claiming that the character library defines advancement behavior
