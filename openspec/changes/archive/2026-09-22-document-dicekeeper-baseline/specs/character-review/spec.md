# Spec Delta

## Purpose

Defines owner-authorized character submission, DM review, rejection feedback, resubmission, reuse across campaigns, and the review-state locks shared with the character library.

## ADDED Requirements

### Requirement: REV-001 Closed character-review state model
Every `PLAYER` membership SHALL have exactly one character-review state: `NONE`, `PENDING`, `APPROVED`, or `REJECTED`. `NONE` SHALL have no character reference or rejection notes; the other states SHALL reference an existing complete character owned by that member. The only allowed stored transitions are shown below. Membership removal deletes the review record rather than creating another state. Every state transition not listed MUST be rejected without changing the membership or character.

| From | To | Authorized actor | Required action |
| --- | --- | --- | --- |
| `NONE` | `PENDING` | The same `PLAYER` member | Submit an owned complete character before campaign start |
| `PENDING` | `APPROVED` | Campaign DM | Approve the pending character |
| `PENDING` | `REJECTED` | Campaign DM | Reject with review notes |
| `REJECTED` | `PENDING` | The same `PLAYER` member | Resubmit the corrected character or an owned replacement before campaign start |

#### Scenario: Player joins a campaign
- **WHEN** a new `PLAYER` membership is created
- **THEN** its review state is `NONE` with no character reference or rejection notes

#### Scenario: Caller attempts an unlisted state change
- **WHEN** a caller attempts any review-state transition not present in the transition table
- **THEN** the system rejects the transition and preserves the current state, reference, notes, and character

#### Scenario: Stored state lacks required data
- **WHEN** a transition encounters a non-`NONE` state with no existing complete referenced character
- **THEN** the system reports an invalid review record and does not advance it

### Requirement: REV-002 Owner-authorized character submission
Before campaign start, the authenticated `PLAYER` member SHALL be able to transition their own `NONE` membership to `PENDING` by submitting an existing complete character they own. Submission SHALL store the character reference, clear stale notes, apply the pending edit and deletion locks defined by `character-library`, and create the DM notification defined by `notifications`. Selecting a character without submitting it MUST NOT change review state.

#### Scenario: Member submits an owned complete character
- **WHEN** a `PLAYER` member in `NONE` state submits a complete character they own before campaign start
- **THEN** the system records that character, changes the membership to `PENDING`, and notifies the campaign DM once

#### Scenario: Member selects without submitting
- **WHEN** a member selects an owned character in the selection view but does not complete submission
- **THEN** the membership remains `NONE` with no character reference

#### Scenario: Player submits another owner's character
- **WHEN** a member submits a character owned by another player
- **THEN** the system denies submission and leaves the membership and character unchanged

#### Scenario: Player submits a missing, draft, or incomplete character
- **WHEN** a member submits an unknown character identifier or a character that is not complete
- **THEN** the system rejects submission and leaves the membership in `NONE`

#### Scenario: DM membership submits a character
- **WHEN** the campaign DM attempts to submit a character through a player-membership review transition
- **THEN** the system rejects the action because the DM membership is not reviewed as a `PLAYER`

#### Scenario: Campaign is already started
- **WHEN** a member attempts an initial character submission after campaign start
- **THEN** the system rejects submission and leaves the review record unchanged

### Requirement: REV-003 DM approval and rejection
Only the authenticated DM of the same campaign SHALL be able to decide a `PENDING` review. Approval SHALL transition it to `APPROVED` and clear rejection notes. Rejection SHALL require trimmed notes of 1 to 2000 characters, transition it to `REJECTED`, and store those notes for the affected player and DM. Each successful decision SHALL create exactly one notification for the affected player. The DM receives contextual read-only access to the referenced character and the member's public player summary, never account-private fields.

#### Scenario: DM approves a pending character
- **WHEN** the campaign DM approves a valid `PENDING` review in their campaign
- **THEN** the system changes it to `APPROVED`, clears rejection notes, preserves the character reference, and notifies the member once

#### Scenario: DM rejects a pending character with notes
- **WHEN** the campaign DM rejects a valid `PENDING` review with nonblank notes within the accepted limit
- **THEN** the system changes it to `REJECTED`, stores the notes, preserves the character reference, and notifies the member once

#### Scenario: Rejection notes are invalid
- **WHEN** the DM attempts rejection with blank notes or notes longer than 2000 characters
- **THEN** the system rejects the decision and leaves the review `PENDING`

#### Scenario: DM targets another campaign's membership
- **WHEN** a DM attempts to decide a review whose membership is not in that DM's campaign
- **THEN** the system denies the action and changes no review state

#### Scenario: Ordinary player attempts a review decision
- **WHEN** a campaign member who is not the DM attempts to approve or reject any review
- **THEN** the system denies the action and changes no review state

#### Scenario: DM decides a non-pending review
- **WHEN** the DM attempts to approve or reject a `NONE`, `REJECTED`, or `APPROVED` review
- **THEN** the system rejects the invalid transition and creates no notification

### Requirement: REV-004 Authorized resubmission and replacement
Before campaign start, only the affected `PLAYER` member SHALL be able to transition their own `REJECTED` review back to `PENDING`. The member MAY resubmit the same complete owned character after correcting it or replace it with another complete owned character. The latest rejection notes SHALL remain visible as prior feedback until the next DM decision; replacing the character SHALL remove this membership's old reference before applying the pending lock to the replacement. A successful resubmission SHALL notify the campaign DM once.

#### Scenario: Member resubmits the corrected character
- **WHEN** the affected member resubmits the same complete owned character from `REJECTED` before campaign start
- **THEN** the system changes the review to `PENDING`, preserves the latest feedback for review context, and notifies the DM once

#### Scenario: Member submits an owned replacement
- **WHEN** the affected member chooses another complete character they own while the review is `REJECTED`
- **THEN** the system replaces this membership's reference, changes the review to `PENDING`, and recalculates locks on both characters

#### Scenario: Another player attempts resubmission
- **WHEN** an authenticated player who is not the affected member attempts to resubmit that review
- **THEN** the system denies the action and preserves the rejected review and character reference

#### Scenario: DM attempts resubmission for a player
- **WHEN** the campaign DM attempts to resubmit or replace the member's character
- **THEN** the system denies the action because DM review access is read-only

#### Scenario: Member resubmits from the wrong state
- **WHEN** a member attempts resubmission from `NONE`, `PENDING`, or `APPROVED`
- **THEN** the system rejects the transition and creates no notification

#### Scenario: Member resubmits after campaign start
- **WHEN** a rejected member attempts to resubmit after campaign start
- **THEN** the system rejects the transition and leaves the review unchanged

### Requirement: REV-005 Character reuse across campaigns
A character owner SHALL be able to reference the same complete character from memberships in more than one campaign. Each campaign SHALL keep an independent review state and DM decision. A submission, approval, rejection, membership removal, or notification in one campaign MUST NOT directly change another campaign's review record.

#### Scenario: Owner submits one character to two campaigns
- **WHEN** a player has eligible `NONE` memberships in two not-started campaigns and submits the same owned complete character to both
- **THEN** the system stores two independent `PENDING` reviews referencing that character

#### Scenario: One campaign approves and another rejects
- **WHEN** the two campaign DMs make different valid decisions about the same character
- **THEN** each membership retains its own result and notifications go only to the affected campaign participants

#### Scenario: One membership is removed
- **WHEN** one campaign reference to a reused character is removed
- **THEN** the system preserves the other campaign's review state and reference

### Requirement: REV-006 Review locks and reference removal
A character referenced by any `PENDING` or `APPROVED` review SHALL remain read-only to its owner, and any membership reference in `PENDING`, `APPROVED`, or `REJECTED` SHALL block character deletion. A `REJECTED` reference alone SHALL permit owner editing for correction. An `APPROVED` review is terminal while its membership remains: it MUST NOT be edited, replaced, resubmitted, or reopened. Leaving, DM removal, account cleanup, or campaign deletion SHALL remove the membership reference through `campaign-membership`; only then SHALL edit and deletion eligibility be recalculated across remaining references.

#### Scenario: Owner edits a rejected-only character
- **WHEN** a character is referenced only by `REJECTED` memberships and its owner submits a valid edit
- **THEN** the character library permits the edit while preserving each rejected review until resubmission or membership removal

#### Scenario: Owner edits a pending or approved character
- **WHEN** any membership references the character in `PENDING` or `APPROVED` state
- **THEN** the character library rejects the edit and leaves the character and reviews unchanged

#### Scenario: Owner deletes a rejected character
- **WHEN** the owner attempts to delete a character still referenced by a `REJECTED` membership
- **THEN** the character library rejects deletion until the membership reference is removed

#### Scenario: Owner attempts to replace an approved character
- **WHEN** a member attempts to replace or resubmit a character from `APPROVED`
- **THEN** the system rejects the transition and preserves the approved reference

#### Scenario: Membership removal clears the final reference
- **WHEN** leave, DM removal, account cleanup, or campaign deletion removes the character's final campaign reference
- **THEN** the character library recalculates the character as editable and eligible for owner-confirmed deletion

### Requirement: REV-007 Review-data visibility
Only the affected member and the campaign DM SHALL receive that membership's character-review state and rejection notes. The campaign DM SHALL receive the referenced character read-only for review, and the affected member SHALL receive their own feedback. Other campaign members, public nonmembers, unrelated authenticated users, guests, and display clients MUST NOT receive the character identifier, review state, rejection notes, or review actions through this capability.

#### Scenario: Member views their own rejected review
- **WHEN** the affected member opens their rejected campaign participation
- **THEN** the system returns their own review state and DM notes together with an authorized path to edit or replace the character

#### Scenario: DM opens a referenced review
- **WHEN** the campaign DM opens a member's pending or rejected review
- **THEN** the system returns the member's public summary, review data, and read-only referenced character without email or account settings

#### Scenario: Another member requests review data
- **WHEN** a campaign member requests another player's character identifier, review state, or rejection notes
- **THEN** the system denies access and returns none of that review data

#### Scenario: Nonmember or display client requests review data
- **WHEN** a nonmember, guest, or display-only client requests a campaign review record
- **THEN** the system returns no review data or character details
