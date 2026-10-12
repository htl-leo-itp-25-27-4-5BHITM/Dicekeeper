# campaign-membership Specification

## Purpose

Defines campaign roles, roster visibility, public and private admission boundaries, capacity enforcement, leaving, removal by the DM, and membership cleanup.

## Requirements

### Requirement: MEM-001 Campaign roles and roster visibility
Each campaign SHALL have exactly one owner membership with role `DM`; admitted participants SHALL have role `PLAYER`. Only campaign members SHALL receive the member roster. Ordinary members SHALL receive only each member's public player summary and campaign role plus their own review status. The DM SHALL additionally receive the review state and references needed to manage each player through `character-review`. Public nonmembers SHALL receive only aggregate player count and capacity, and no caller SHALL receive another player's account-private fields through the roster.

#### Scenario: Member views the campaign roster
- **WHEN** an authenticated campaign member requests the roster
- **THEN** the system returns member public summaries and roles while limiting review data to that member's own status

#### Scenario: DM manages the campaign roster
- **WHEN** the authenticated campaign DM requests the roster
- **THEN** the system returns public summaries, roles, and the review state and references needed for DM review actions

#### Scenario: Public nonmember views a campaign preview
- **WHEN** an authenticated nonmember views a public campaign
- **THEN** the system returns the player count and capacity but no raw roster, character identifiers, review states, or rejection notes

#### Scenario: Unrelated player requests a private roster
- **WHEN** an authenticated nonmember requests the roster of a private campaign
- **THEN** the system denies access and returns no membership data

#### Scenario: Roster consumer requests private account data
- **WHEN** any campaign workflow identifies another member
- **THEN** the system uses the contextual public player summary and omits email and account settings

### Requirement: MEM-002 Public campaign admission and capacity
An authenticated player SHALL be able to join a public, not-started campaign when they are not already a member and an available `PLAYER` place remains. A successful join SHALL atomically create one `PLAYER` membership in `NONE` review state with no character reference. The player limit SHALL count `PLAYER` memberships and exclude the DM; an absent limit SHALL mean unlimited admission. Concurrent admissions MUST NOT cause the accepted player count to exceed the configured limit.

#### Scenario: Player joins an available public campaign
- **WHEN** an authenticated nonmember joins a public not-started campaign with available capacity
- **THEN** the system creates one `PLAYER` membership in `NONE` state with no character reference

#### Scenario: Player is already a member
- **WHEN** an authenticated campaign member submits another join request
- **THEN** the system rejects the duplicate and creates no additional membership

#### Scenario: Public campaign is full
- **WHEN** the number of `PLAYER` memberships has reached the configured player limit
- **THEN** the system rejects another join and leaves the roster unchanged

#### Scenario: Concurrent players compete for the last place
- **WHEN** multiple valid join requests race for the final available player place
- **THEN** the system accepts at most one place and never stores more `PLAYER` memberships than the configured limit

#### Scenario: Guest attempts to join
- **WHEN** a guest attempts to join any campaign
- **THEN** the system creates no membership and requires authentication

### Requirement: MEM-003 Private campaign admission boundary
The current baseline SHALL NOT expose self-service joining, invitation codes, or DM-created player admissions for a private campaign. A public join request for a private campaign MUST be denied without revealing its roster or story. Existing private-campaign members SHALL retain their membership. Historical invitation and access-code workflows are explicitly deferred and MUST NOT be represented as implemented or implementation-ready by this baseline.

#### Scenario: Nonmember attempts to join a private campaign
- **WHEN** an authenticated nonmember sends the public join action for a private campaign
- **THEN** the system denies admission and creates no membership

#### Scenario: Player supplies a historical invitation code
- **WHEN** a player attempts to use an invitation or access-code workflow in the current baseline
- **THEN** the system does not claim that private admission is supported and creates no membership

#### Scenario: Public campaign becomes private
- **WHEN** the campaign DM changes visibility from public to private
- **THEN** existing memberships remain valid but no new self-service join is available

### Requirement: MEM-004 Admission after campaign start
Once a campaign is started, Dicekeeper SHALL reject every new admission regardless of public or private visibility or available capacity. Existing memberships SHALL retain their roles until the member leaves, the DM removes the member, the member's account is deleted, or the campaign is deleted.

#### Scenario: Player attempts to join a started public campaign
- **WHEN** an authenticated nonmember attempts to join a public campaign whose started state is true
- **THEN** the system rejects admission and leaves the roster unchanged

#### Scenario: Started campaign has unused capacity
- **WHEN** a started campaign has fewer players than its configured limit
- **THEN** the unused places do not permit new admission

#### Scenario: Existing member opens a started campaign
- **WHEN** an existing member requests their started campaign
- **THEN** the system preserves the membership and applies the separate view and live-play access rules for that role

### Requirement: MEM-005 Player leaves a campaign
An authenticated `PLAYER` member SHALL be able to leave their own campaign before or after start after explicit confirmation. The operation MUST NOT permit that player to remove another member or permit the campaign DM to leave the campaign they own. Successful leave SHALL remove the membership through the cleanup rules in MEM-007 and revoke campaign access.

#### Scenario: Player confirms leaving
- **WHEN** an authenticated `PLAYER` member explicitly confirms leaving their campaign
- **THEN** the system removes that player's membership and revokes their campaign access

#### Scenario: Player cancels leaving
- **WHEN** the player does not provide the required leave confirmation
- **THEN** the system preserves the membership and all campaign references

#### Scenario: Player targets another member
- **WHEN** a non-DM player attempts to use the leave action for another player's membership
- **THEN** the system denies the operation and preserves both memberships

#### Scenario: Campaign DM attempts to leave
- **WHEN** the campaign owner acting as DM attempts to leave their campaign
- **THEN** the system rejects the action and directs campaign removal to the campaign-deletion contract

#### Scenario: Former member requests campaign access
- **WHEN** a player whose membership was removed requests member-only campaign data or actions
- **THEN** the system denies access unless a separate public-preview rule applies

### Requirement: MEM-006 DM removes a player
Only the authenticated campaign DM SHALL be able to remove another membership, and the target MUST have role `PLAYER`. The DM SHALL explicitly confirm removal. Successful removal SHALL apply before or after campaign start, SHALL use the cleanup rules in MEM-007, and SHALL immediately revoke the removed player's campaign access. A DM membership MUST NOT be removable through this operation.

#### Scenario: DM confirms player removal
- **WHEN** the campaign DM explicitly confirms removal of a `PLAYER` member
- **THEN** the system removes that membership and revokes the player's campaign access

#### Scenario: DM cancels player removal
- **WHEN** the campaign DM does not provide the required removal confirmation
- **THEN** the system preserves the membership and its review reference

#### Scenario: Ordinary member attempts removal
- **WHEN** a campaign member who is not the DM attempts to remove another member
- **THEN** the system denies the operation and leaves the roster unchanged

#### Scenario: Caller attempts to remove the DM
- **WHEN** any caller targets the campaign's DM membership for removal
- **THEN** the system denies the operation and preserves campaign ownership

#### Scenario: Removal target does not exist
- **WHEN** the DM requests removal of a player who is not a campaign member
- **THEN** the system returns a not-found outcome and changes no membership

### Requirement: MEM-007 Membership removal cleanup
Whenever a membership is removed by leave, DM removal, account cleanup, or campaign deletion, Dicekeeper SHALL remove that membership's role, character reference, review state, and rejection notes together with notifications whose navigation depends on that membership. It SHALL preserve the referenced character and other players' memberships. Character edit and deletion eligibility SHALL then be recalculated across every remaining campaign reference according to `character-library` and `character-review`.

#### Scenario: Removed membership references a character
- **WHEN** a player leaves or is removed with a referenced character
- **THEN** the system deletes the membership reference but preserves the player-owned character

#### Scenario: Character remains referenced elsewhere
- **WHEN** removal clears one membership but another campaign still references the same character
- **THEN** the system preserves the remaining reference and applies its review-state edit and deletion locks

#### Scenario: Last locking reference is removed
- **WHEN** membership removal clears the character's final pending or approved reference
- **THEN** the system removes that review lock while any remaining reference still continues to block character deletion

#### Scenario: Campaign is deleted
- **WHEN** campaign deletion removes every membership in that campaign
- **THEN** the system removes all of those campaign references and preserves the members' characters

#### Scenario: Membership-linked notification exists
- **WHEN** a removed membership has a submission or review notification whose destination depends on it
- **THEN** the system removes or invalidates that notification so it cannot navigate to another player's or stale review record
