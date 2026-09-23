# campaign-management Specification

## Purpose

Defines campaign creation, discovery, private story visibility, editable metadata and capacity, the one-way start transition, and campaign deletion.

## Requirements

### Requirement: CAM-001 Campaign creation and ownership
An authenticated player SHALL be able to create a campaign with a trimmed name of 1 to 255 characters, an optional description of at most 1000 characters, optional DM-only story text of at most 1000 characters, a public or private visibility value, and either no player limit or a positive integer player limit. A newly created campaign SHALL be not started, SHALL assign the authenticated creator as its owner and sole campaign DM, and MUST ignore or reject client-supplied ownership, role, identifier, or started-state values. Campaign creation and creation of the owner's DM membership SHALL succeed or fail as one operation.

#### Scenario: Player creates a valid campaign
- **WHEN** an authenticated player submits valid campaign metadata
- **THEN** the system creates one not-started campaign owned by that player and creates exactly one DM membership for the owner

#### Scenario: Campaign name is invalid
- **WHEN** a player submits a blank campaign name after trimming or a name longer than 255 characters
- **THEN** the system rejects creation and creates neither a campaign nor a DM membership

#### Scenario: Campaign text is too long
- **WHEN** a player submits a description or story longer than its accepted limit
- **THEN** the system rejects creation and stores no truncated or partial campaign

#### Scenario: Player limit is invalid
- **WHEN** a player submits a player limit that is zero, negative, or not an integer
- **THEN** the system rejects creation and creates no campaign

#### Scenario: Client attempts to assign ownership or start state
- **WHEN** a creation request supplies another owner, a campaign role, an identifier, or a started state
- **THEN** the system derives ownership and the DM role from the authenticated player, creates the campaign as not started, and does not honor the supplied privileged values

### Requirement: CAM-002 Recoverable campaign-creation draft
Before creation succeeds, Dicekeeper SHALL keep in-progress campaign metadata only for the current authenticated player and browser session. Returning to campaign creation in that session SHALL restore the latest readable draft. Successful creation or explicit discard SHALL clear the draft, while ordinary navigation away MAY retain it. Draft recovery MUST NOT create a server-side campaign or disclose one player's draft to a later player using the same browser.

#### Scenario: Player returns to unfinished campaign creation
- **WHEN** an authenticated player leaves campaign creation without saving or discarding it and returns in the same browser session
- **THEN** the system restores that player's latest readable campaign draft

#### Scenario: Campaign creation succeeds
- **WHEN** a campaign is created successfully from a draft
- **THEN** the system clears the draft and does not restore it on the next creation attempt

#### Scenario: Player discards a campaign draft
- **WHEN** the player explicitly discards an unfinished campaign draft
- **THEN** the system clears the draft and creates no campaign

#### Scenario: Draft storage is unavailable or corrupt
- **WHEN** browser-session draft storage is unavailable or contains unreadable data
- **THEN** campaign creation remains usable without recovery and no campaign is created from that data

#### Scenario: A different player signs in on the same browser
- **WHEN** another player signs in before the prior player's campaign draft has been cleared
- **THEN** the system does not restore or disclose the prior player's draft

### Requirement: CAM-003 Campaign discovery and metadata visibility
Campaign discovery and detail access SHALL require authentication. An authenticated player SHALL be able to discover public campaigns and view a public campaign preview whether or not they are a member. A private campaign SHALL be visible only to its members. Public previews and non-DM details SHALL include only campaign metadata needed to identify the campaign and admission state, such as name, description, owner public summary, visibility, player count and limit, and started state. They MUST exclude the campaign story, raw membership records, character or review identifiers, review notes, account-private data, and any media not separately authorized by the `media-assets` contract.

#### Scenario: Authenticated player browses public campaigns
- **WHEN** an authenticated player requests the campaign catalog
- **THEN** the system returns sanitized previews for public campaigns without story or raw membership and review data

#### Scenario: Nonmember views a public campaign
- **WHEN** an authenticated nonmember opens a public campaign
- **THEN** the system returns the sanitized public metadata and admission state but no private story or member-only data

#### Scenario: Member views their private campaign
- **WHEN** an authenticated member opens a private campaign
- **THEN** the system returns the non-story campaign metadata plus the membership data authorized by `campaign-membership`

#### Scenario: Nonmember requests a private campaign
- **WHEN** an authenticated player who is not a member requests a private campaign or attempts to discover it
- **THEN** the system denies access and returns no private campaign metadata

#### Scenario: Guest requests campaign data
- **WHEN** a guest requests a campaign list or campaign detail
- **THEN** the system returns no campaign data and requires authentication

#### Scenario: Campaign does not exist
- **WHEN** an authenticated player requests an unknown campaign identifier
- **THEN** the system returns a not-found outcome without disclosing data from another campaign

### Requirement: CAM-004 DM-only campaign story
The campaign story SHALL be private to the campaign DM. Only the authenticated campaign owner acting as DM SHALL be able to read or replace it, and story text MUST NOT appear in public lists, public previews, non-DM details, membership rosters, notifications, or display-client data. The current baseline supports manually authored story text; historical story presets and AI-generated story assistance are not part of this capability.

#### Scenario: DM reads the campaign story
- **WHEN** the authenticated campaign DM requests their campaign story
- **THEN** the system returns the stored story text

#### Scenario: DM updates the campaign story
- **WHEN** the campaign DM submits story text within the accepted limit
- **THEN** the system replaces the stored story and returns it only in a DM-authorized representation

#### Scenario: Member requests the campaign story
- **WHEN** a campaign member who is not the DM requests the story directly or through campaign detail
- **THEN** the system denies the story request and omits the story from returned campaign data

#### Scenario: Public list is requested
- **WHEN** any authenticated player requests public campaign previews
- **THEN** the system omits story text from every preview

#### Scenario: Story preset or generation is requested
- **WHEN** a player requests a historical story preset or AI-generated story through the current campaign-management capability
- **THEN** the system does not claim that workflow is supported and leaves AI assistance to the separately identified future capability

### Requirement: CAM-005 DM campaign editing and capacity configuration
Only the authenticated campaign owner acting as DM SHALL be able to change campaign name, description, story, visibility, or player limit. Updated values SHALL satisfy the creation validation rules, and the player limit MUST NOT be reduced below the number of current `PLAYER` memberships. Visibility changes SHALL affect discovery and future admission but MUST NOT remove existing memberships. Started state MUST NOT be changed through general campaign editing.

#### Scenario: DM updates valid campaign metadata
- **WHEN** the campaign DM submits valid changed metadata for their campaign
- **THEN** the system applies the complete update and returns a DM-authorized campaign representation

#### Scenario: DM makes a campaign private
- **WHEN** the campaign DM changes a public campaign to private
- **THEN** the system removes it from public discovery while preserving its existing members

#### Scenario: DM lowers capacity below current membership
- **WHEN** the campaign has more `PLAYER` members than a proposed new player limit
- **THEN** the system rejects the update and preserves the prior limit and other campaign values

#### Scenario: Member attempts to edit campaign data
- **WHEN** a campaign member who is not the DM attempts to change campaign metadata, story, visibility, capacity, or started state
- **THEN** the system denies the operation and leaves the campaign unchanged

#### Scenario: Edit contains an invalid field
- **WHEN** a DM submits an edit with any invalid campaign field
- **THEN** the system rejects the entire edit and preserves all previously stored campaign values

### Requirement: CAM-006 Campaign start transition
Only the authenticated campaign DM SHALL be able to start a not-started campaign. Start SHALL require at least one `PLAYER` membership and every `PLAYER` membership to reference an existing complete character in `APPROVED` review state. A map and story are optional start inputs. Starting SHALL be a one-way campaign-state transition, SHALL close admission as defined by `campaign-membership`, and MUST NOT claim to create a persistent play-session or encounter history.

#### Scenario: DM starts a ready campaign
- **WHEN** a not-started campaign has at least one player and every player has an existing complete approved character and the DM requests start
- **THEN** the system marks the campaign started once and makes the started state observable to authorized campaign clients

#### Scenario: Campaign has no players
- **WHEN** the DM attempts to start a campaign with no `PLAYER` memberships
- **THEN** the system rejects the start and leaves the campaign not started

#### Scenario: Player character is not approved
- **WHEN** any `PLAYER` membership has no character or has a `NONE`, `PENDING`, or `REJECTED` review state
- **THEN** the system rejects the start and identifies that all player characters must be approved

#### Scenario: Approved character is missing or incomplete
- **WHEN** a membership says `APPROVED` but its referenced character is missing or incomplete
- **THEN** the system rejects the start and leaves the campaign not started

#### Scenario: Non-DM attempts to start a campaign
- **WHEN** a campaign member or unrelated authenticated player attempts the start transition
- **THEN** the system denies the operation and leaves the campaign state unchanged

#### Scenario: Started campaign is started again or reset through editing
- **WHEN** a caller attempts to repeat the start transition or set a started campaign back to not started through campaign editing
- **THEN** the system rejects the state change and preserves the started campaign state

### Requirement: CAM-007 Campaign deletion
Only the authenticated campaign owner acting as DM SHALL be able to delete a campaign, and Dicekeeper SHALL require explicit destructive-action confirmation. Successful deletion SHALL remove the campaign, its memberships and character-review references, campaign-scoped notifications and decisions, and campaign live state through their owning contracts. It SHALL preserve member-owned characters and unrelated player data. Media cleanup and failures SHALL follow the `media-assets` contract, and deletion MUST NOT be reported as complete while required persistent cleanup has failed.

#### Scenario: DM confirms campaign deletion
- **WHEN** the campaign DM explicitly confirms deletion of their campaign and required persistent cleanup succeeds
- **THEN** the system deletes the campaign and its dependent campaign records while preserving member-owned characters

#### Scenario: DM cancels campaign deletion
- **WHEN** the campaign DM does not provide the required deletion confirmation
- **THEN** the system deletes no campaign data

#### Scenario: Non-owner attempts campaign deletion
- **WHEN** a campaign member or unrelated authenticated player attempts to delete the campaign
- **THEN** the system denies the operation and preserves the campaign and all dependents

#### Scenario: Campaign deletion target is missing
- **WHEN** the owner requests deletion of an unknown campaign identifier
- **THEN** the system returns a not-found outcome and deletes no other campaign

#### Scenario: Required cleanup fails
- **WHEN** any required persistent dependent-data cleanup fails during campaign deletion
- **THEN** the system reports an incomplete failure and does not claim complete campaign deletion
