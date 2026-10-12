# player-profiles Specification

## Purpose

Defines private account data, contextual public player summaries, self-service profile and avatar management, and complete account-deletion outcomes across dependent Dicekeeper data.

## Requirements

### Requirement: PRO-001 Private account profile
An authenticated player SHALL be able to view their own local account profile, including identifier, email, username, display name, and avatar reference. Email and account settings SHALL remain private to that player, and a guest MUST NOT receive any account profile.

#### Scenario: Player views own profile
- **WHEN** an authenticated player requests their own account profile
- **THEN** the system returns that player's identifier, email, username, display name, and avatar reference

#### Scenario: Guest requests a profile
- **WHEN** an unauthenticated guest requests any player profile
- **THEN** the system returns no profile data and requires authentication

#### Scenario: Own local profile is missing
- **WHEN** an authenticated player requests, updates, or deletes a local profile that does not exist
- **THEN** the system returns a not-found outcome and does not read or mutate another player's data

### Requirement: PRO-002 Contextual public player summary
Where an authenticated workflow needs to identify another player, Dicekeeper SHALL expose only a public player summary containing the player identifier, username, display name, and avatar reference. The summary SHALL be available only within a legitimate shared context such as a visible campaign owner, campaign roster, or character review; it MUST exclude email and account settings, and campaign roles MUST NOT grant broader account-profile access.

#### Scenario: Campaign participant is identified
- **WHEN** an authenticated player views another player through an authorized campaign workflow
- **THEN** the system returns only that other player's identifier, username, display name, and avatar reference

#### Scenario: Campaign DM views a member summary
- **WHEN** a campaign DM reviews or manages a campaign member
- **THEN** the system returns the same public player summary and does not disclose the member's email or account settings

#### Scenario: Unrelated player requests an arbitrary profile
- **WHEN** an authenticated user has no authorized shared context with the requested player
- **THEN** the system denies the request and returns no private or public profile fields

#### Scenario: Display client requests account data
- **WHEN** a display-only client attempts to retrieve a player account profile directly
- **THEN** the system returns no account-private data and relies on its separately authorized view data

### Requirement: PRO-003 Self-service profile editing
An authenticated player SHALL be able to change only their own username and display name. Username values MUST contain 1 to 50 characters and display-name values MUST contain 1 to 100 characters after trimming; profile editing MUST NOT change the player identifier, provider-managed email, or avatar reference.

#### Scenario: Player updates valid profile fields
- **WHEN** an authenticated player submits a valid username or display name for their own profile
- **THEN** the system stores the submitted fields and returns the updated private account profile

#### Scenario: Player submits an invalid profile field
- **WHEN** an authenticated player submits a blank or over-limit username or display name
- **THEN** the system rejects the update and leaves the stored profile unchanged

#### Scenario: Player attempts to edit another account
- **WHEN** an authenticated player submits a profile update for another player's identifier
- **THEN** the system denies the update and leaves the other profile unchanged

#### Scenario: Profile update attempts to change account-controlled fields
- **WHEN** a profile update includes an identifier, email, or avatar reference
- **THEN** the system ignores or rejects those account-controlled fields and does not change them through the profile-edit operation

### Requirement: PRO-004 Avatar management boundary
An authenticated player SHALL be able to upload or replace only their own avatar. A successful change SHALL update the avatar reference used by both the private profile and contextual public summary; validation, derived-image delivery, replacement cleanup, and access to the underlying media SHALL follow the `media-assets` contract.

#### Scenario: Player uploads an accepted avatar
- **WHEN** an authenticated player uploads an avatar accepted by the media rules for their own profile
- **THEN** the system stores the new avatar reference and returns the updated profile

#### Scenario: Player attempts to change another avatar
- **WHEN** an authenticated player uploads an avatar for another player's identifier
- **THEN** the system denies the operation and leaves the other player's avatar unchanged

#### Scenario: Avatar processing fails
- **WHEN** an avatar upload or processing operation fails
- **THEN** the system reports failure and does not claim that the profile was updated

### Requirement: PRO-005 Account deletion authorization and confirmation
Only the authenticated player SHALL be able to delete their own account, and Dicekeeper SHALL require an explicit destructive-action confirmation before starting deletion. A request for another player's account MUST be denied, and a request for a missing local account MUST have no external or local deletion side effect.

#### Scenario: Player confirms own-account deletion
- **WHEN** an authenticated player explicitly confirms deletion of their own existing account
- **THEN** the system starts the coordinated external-identity and local-data deletion workflow

#### Scenario: Player cancels confirmation
- **WHEN** the player does not provide the required deletion confirmation
- **THEN** the system performs no external or local deletion

#### Scenario: Player targets another account
- **WHEN** an authenticated player requests deletion of a different player's identifier
- **THEN** the system denies the request and deletes no data

#### Scenario: Local account is missing
- **WHEN** an authenticated player requests deletion for their own identifier but the local profile is missing
- **THEN** the system returns a not-found outcome and does not invoke external identity deletion

### Requirement: PRO-006 Coordinated deletion outcome
Dicekeeper SHALL report account deletion as successful only after the external identity is absent and all locally owned account data has been removed. External deletion failure SHALL leave local account data intact. If external deletion succeeds but local cleanup fails, the system SHALL report an incomplete failure, retain a recoverable cleanup obligation, and MUST NOT claim complete deletion.

#### Scenario: External and local deletion succeed
- **WHEN** the external identity is deleted or already absent and local cleanup completes
- **THEN** the system reports successful deletion, clears authentication and browser account state, and prevents normal access through the deleted identity

#### Scenario: External identity deletion fails
- **WHEN** the external identity provider cannot delete the current identity
- **THEN** the system reports failure, does not start local account cleanup, and leaves the local profile and dependents intact

#### Scenario: Local cleanup fails after external deletion
- **WHEN** the external identity has been removed but any required local cleanup fails
- **THEN** the system reports that deletion is incomplete, records the remaining cleanup for retry or administrative remediation, and does not present a successful-deletion outcome

### Requirement: PRO-007 Local dependent-data cleanup
Successful local account deletion SHALL remove the player's profile and avatar, notifications addressed to the player, campaign memberships, and campaigns owned by the player together with the dependent records and media governed by those campaign capabilities. It SHALL preserve data owned by other players except for references or memberships belonging to the deleted account. Character records MUST NOT be deleted solely because they were selected in a removed membership until the `character-library` contract establishes their ownership and deletion rules.

#### Scenario: Account owns campaigns
- **WHEN** local cleanup deletes an account that owns one or more campaigns
- **THEN** each owned campaign is deleted through the campaign-deletion contract, including its memberships, decisions, notifications, map media, and live state

#### Scenario: Account is a member of another player's campaign
- **WHEN** local cleanup deletes an account that is a non-owner campaign member
- **THEN** the system removes that membership and membership-specific references while preserving the campaign and other players' data

#### Scenario: Account has notifications and an avatar
- **WHEN** local cleanup deletes an account with notifications or an avatar
- **THEN** the system removes notifications addressed to that player and removes the player's avatar through the media cleanup rules

#### Scenario: Membership references a character with unresolved ownership
- **WHEN** local cleanup removes a membership that references a character whose owner cannot be established
- **THEN** the system preserves the character record, removes the membership reference, and leaves final character deletion to the `character-library` ownership rules
