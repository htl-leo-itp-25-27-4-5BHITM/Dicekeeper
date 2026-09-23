# notifications Specification

## Purpose

Defines the private notification inbox, character-review event recipients, read state, safe navigation references, deletion, and dependent cleanup.

## Requirements

### Requirement: NOT-001 Recipient-owned notification inbox
Every notification SHALL belong to exactly one player. Only that authenticated recipient SHALL be able to list, count, read, mark, or delete it. The recipient's inbox SHALL be ordered newest first and SHALL expose the notification identifier, supported type, title, message, authorized navigation references, read state, and creation time. Guests and other authenticated players MUST NOT receive the notification or learn its contents through this capability.

#### Scenario: Recipient opens their inbox
- **WHEN** an authenticated player requests their notification inbox
- **THEN** the system returns only notifications addressed to that player in newest-first order

#### Scenario: Recipient requests unread count
- **WHEN** an authenticated player requests their unread notification count
- **THEN** the system counts only unread notifications addressed to that player

#### Scenario: Player requests another inbox
- **WHEN** an authenticated player requests another player's notifications or unread count
- **THEN** the system denies access and returns no notification content or count

#### Scenario: Guest requests notifications
- **WHEN** a guest requests any notification resource
- **THEN** the system returns no notification data and requires authentication

### Requirement: NOT-002 Character-review notification triggers and recipients
Dicekeeper SHALL create exactly one unread notification for each successful character-review transition listed below and SHALL create none for a denied or failed transition. Initial submission and resubmission SHALL notify the campaign DM. Approval and rejection SHALL notify only the affected player. Join, leave, removal, campaign start, and ordinary campaign edits SHALL NOT imply a notification in the current baseline.

| Successful event | Recipient | Notification type |
| --- | --- | --- |
| `NONE` to `PENDING` | Campaign DM | `CHARACTER_SUBMITTED` |
| `REJECTED` to `PENDING` | Campaign DM | `CHARACTER_SUBMITTED` |
| `PENDING` to `APPROVED` | Affected player | `CHARACTER_APPROVED` |
| `PENDING` to `REJECTED` | Affected player | `CHARACTER_REJECTED` |

#### Scenario: Character is submitted or resubmitted
- **WHEN** a valid submission or resubmission changes a review to `PENDING`
- **THEN** the system creates one unread `CHARACTER_SUBMITTED` notification for the campaign DM

#### Scenario: Character is approved
- **WHEN** a valid DM decision changes a review to `APPROVED`
- **THEN** the system creates one unread `CHARACTER_APPROVED` notification for the affected player

#### Scenario: Character is rejected
- **WHEN** a valid DM decision changes a review to `REJECTED`
- **THEN** the system creates one unread `CHARACTER_REJECTED` notification for the affected player

#### Scenario: Review transition fails
- **WHEN** a character-review transition is unauthorized, invalid, or fails before committing
- **THEN** the system creates no notification for that attempted transition

#### Scenario: Membership changes without a review transition
- **WHEN** a player joins, leaves, is removed, or the campaign starts or is edited
- **THEN** the current baseline creates no notification merely because that event occurred

### Requirement: NOT-003 Notification content and privacy
Review notifications SHALL identify the event and campaign sufficiently for the recipient to understand it, using only contextual public player and character names where needed. They MUST NOT disclose account email, account settings, campaign story, another player's rejection notes, or unrelated campaign data. Rejection feedback itself SHALL remain in the recipient-authorized review record rather than being required in the notification message.

#### Scenario: DM receives a submission notification
- **WHEN** a member successfully submits or resubmits a character
- **THEN** the DM notification identifies the member by public summary, the character name, and the campaign without exposing account-private fields

#### Scenario: Player receives a review outcome
- **WHEN** the DM approves or rejects the player's character
- **THEN** the notification identifies the character, campaign, and outcome without exposing the campaign story or another member's data

#### Scenario: Rejection notes exist
- **WHEN** a rejection notification is displayed
- **THEN** the system may direct the player to their authorized review feedback but does not expose those notes to other recipients

### Requirement: NOT-004 Read and unread state
A newly created notification SHALL be unread. Its recipient SHALL be able to mark one notification or all of their notifications read. Marking read SHALL be idempotent, SHALL update the unread count, and MUST NOT change or delete the referenced campaign, membership, character, or review state.

#### Scenario: New notification is created
- **WHEN** a successful review transition creates a notification
- **THEN** the notification is unread and contributes one to the recipient's unread count

#### Scenario: Recipient marks one notification read
- **WHEN** the recipient marks an unread notification read
- **THEN** the system stores it as read and reduces that recipient's unread count accordingly

#### Scenario: Recipient marks an already-read notification read
- **WHEN** the recipient repeats the mark-read action for a read notification
- **THEN** the notification remains read and no domain state changes

#### Scenario: Recipient marks all notifications read
- **WHEN** the recipient chooses mark all as read
- **THEN** the system marks every notification in that recipient's inbox read and leaves other players' inboxes unchanged

#### Scenario: Another player attempts to change read state
- **WHEN** an authenticated player attempts to mark another player's notification read
- **THEN** the system denies the action and preserves the notification and unread counts

### Requirement: NOT-005 Safe notification navigation
Each review notification SHALL carry only the references needed for its authorized destination. A submission notification SHALL lead its DM recipient to the referenced campaign membership review; an approval notification SHALL lead its player recipient to the campaign; a rejection notification SHALL lead its player recipient to the rejected character and campaign review context. Navigation SHALL recheck current authentication, recipient ownership, campaign role or membership, and reference existence. A stale or no-longer-authorized destination SHALL produce an unavailable outcome without disclosing replacement records.

#### Scenario: DM opens a submission notification
- **WHEN** the recipient DM activates a valid `CHARACTER_SUBMITTED` notification
- **THEN** the system marks it read and opens the referenced membership review only if the DM still controls that campaign

#### Scenario: Player opens an approval notification
- **WHEN** the affected player activates a valid `CHARACTER_APPROVED` notification
- **THEN** the system marks it read and opens the referenced campaign only if the player still has authorized access

#### Scenario: Player opens a rejection notification
- **WHEN** the affected player activates a valid `CHARACTER_REJECTED` notification
- **THEN** the system marks it read and opens that player's rejected character and campaign feedback context

#### Scenario: Notification reference is stale
- **WHEN** the referenced campaign, membership, or character no longer exists or the recipient no longer has access
- **THEN** the system marks the notification read only if requested, reports the destination unavailable, and discloses no other record

### Requirement: NOT-006 Notification deletion and dependent cleanup
The recipient SHALL be able to delete one notification or all notifications in their inbox. Notification deletion MUST NOT reverse or alter the event that created it. Campaign deletion, membership removal, and account deletion SHALL remove notifications whose recipient or navigation references depend on the deleted data so no stale notification can reveal or target that data.

#### Scenario: Recipient deletes one notification
- **WHEN** the recipient deletes one of their notifications
- **THEN** the system removes that notification and leaves campaign and character-review state unchanged

#### Scenario: Recipient deletes all notifications
- **WHEN** the recipient requests deletion of their notification inbox
- **THEN** the system removes only notifications addressed to that recipient

#### Scenario: Another player attempts notification deletion
- **WHEN** an authenticated player attempts to delete another player's notification
- **THEN** the system denies the action and preserves the notification

#### Scenario: Campaign is deleted
- **WHEN** campaign deletion completes
- **THEN** the system removes notifications whose navigation references that campaign or its review memberships

#### Scenario: Membership is removed
- **WHEN** a player leaves or is removed from a campaign
- **THEN** the system removes or invalidates submission and review notifications whose destination depends on that membership

#### Scenario: Recipient account is deleted
- **WHEN** local account cleanup removes a player
- **THEN** the system removes every notification addressed to that player
