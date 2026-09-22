# Spec Delta

## Purpose

Defines one persisted campaign group-decision workflow for DM-created questions, eligible-player voting, duplicate prevention, deterministic closure, membership changes, visibility, and cleanup.

## ADDED Requirements

### Requirement: GRP-001 Canonical group-decision lifecycle
Dicekeeper SHALL expose one canonical group-decision lifecycle for current campaign voting. Every decision SHALL belong to one started campaign and have status `PENDING`, `RESOLVED`, or `CANCELLED`; a resolved result SHALL be `YES`, `NO`, or `TIE`. Alternate or legacy API paths MUST NOT create a second planning-decision meaning or bypass the same authorization, validation, transition, persistence, and visibility rules.

#### Scenario: Campaign uses group decisions
- **WHEN** the DM creates a decision and eligible players vote through any supported client path
- **THEN** all clients operate on the same persisted decision and lifecycle

#### Scenario: Alternate API attempts an invalid transition
- **WHEN** a legacy or administrative path attempts to assign an unsupported status or bypass a lifecycle rule
- **THEN** the system rejects the change and preserves the canonical decision

#### Scenario: Campaign is not started
- **WHEN** the DM attempts to create a live group decision before campaign start
- **THEN** the system rejects creation and stores no decision

### Requirement: GRP-002 DM-authorized decision creation
Only the authenticated campaign DM SHALL be able to create a decision. Creation SHALL require a trimmed title of 1 to 60 characters, trimmed question or description text of 1 to 200 characters, and at least one eligible voter. The system SHALL ignore or reject caller-supplied identifiers, counts, votes, status, result, timestamps, or electorate values and SHALL atomically store a `PENDING` decision with zero votes and a server-derived electorate.

#### Scenario: DM creates a valid decision
- **WHEN** the DM submits a valid title and question for a started campaign with at least one eligible voter
- **THEN** the system stores one pending decision with zero votes and the current eligible-player snapshot

#### Scenario: Decision text is invalid
- **WHEN** the title or question is blank after trimming or exceeds its accepted limit
- **THEN** the system rejects creation and stores no partial decision

#### Scenario: Campaign has no eligible players
- **WHEN** the DM attempts to create a decision with no current `PLAYER` members
- **THEN** the system rejects creation because no vote can be held

#### Scenario: Ordinary member creates a decision
- **WHEN** a campaign player attempts to create a decision
- **THEN** the system denies the action and stores no decision

#### Scenario: Client supplies lifecycle fields
- **WHEN** a creation request includes an identifier, vote count, voter list, status, result, or timestamp
- **THEN** the system derives those fields itself and does not honor the supplied values

### Requirement: GRP-003 Eligible-voter snapshot and membership changes
The eligible electorate SHALL be the identifiers of current `PLAYER` memberships when the decision is created; the campaign DM SHALL not vote, and live-play active or inactive state SHALL not change eligibility. A player who joins later MUST NOT vote on that decision. If an eligible membership is removed while the decision is pending, the system SHALL remove that identity and any vote it cast from the electorate, recalculate counts and completion atomically, and resolve when every remaining eligible voter has voted. If no eligible voters remain, the decision SHALL become `CANCELLED` with no result.

#### Scenario: Decision captures current players
- **WHEN** a valid decision is created
- **THEN** the electorate contains each current `PLAYER` membership exactly once and excludes the DM

#### Scenario: Player is inactive in turn handling
- **WHEN** an eligible voter is marked inactive through live play
- **THEN** the player remains eligible to vote because activity does not change campaign membership

#### Scenario: Player joins after creation
- **WHEN** a player becomes a campaign member after a decision was created
- **THEN** the player is not eligible for that existing decision and its quorum is unchanged

#### Scenario: Eligible player leaves before voting
- **WHEN** an eligible player leaves or is removed while the decision is pending
- **THEN** the system removes that player from the electorate and recalculates whether all remaining voters have voted

#### Scenario: Eligible player leaves after voting
- **WHEN** an eligible player with a recorded vote leaves or is removed while the decision is pending
- **THEN** the system removes both the voter and that vote before recalculating the result and quorum

#### Scenario: No eligible voters remain
- **WHEN** membership removal leaves a pending decision with an empty electorate
- **THEN** the system changes the decision to `CANCELLED`, records no yes/no/tie result, and accepts no votes

### Requirement: GRP-004 One valid vote per eligible player
Each eligible authenticated player SHALL be able to cast exactly one final vote of `YES` or `NO` while the decision is pending. Voter identity SHALL come from authentication rather than request data. Duplicate, changed, withdrawn, invalid, late, unauthorized, and concurrent repeat votes MUST be rejected without changing counts or completion, and recording the vote and voter identity SHALL be atomic.

#### Scenario: Eligible player votes yes
- **WHEN** an eligible player who has not voted casts `YES` on a pending decision
- **THEN** the system records that player once and increments the yes count once

#### Scenario: Eligible player votes no
- **WHEN** an eligible player who has not voted casts `NO` on a pending decision
- **THEN** the system records that player once and increments the no count once

#### Scenario: Player repeats or changes a vote
- **WHEN** a player who already voted submits another vote or attempts to change or withdraw it
- **THEN** the system rejects the request and preserves the original vote and counts

#### Scenario: Concurrent duplicate votes arrive
- **WHEN** two vote requests for the same eligible player and decision race
- **THEN** the system commits at most one vote and counts that player once

#### Scenario: Vote value is invalid
- **WHEN** a vote is missing or is not exactly `YES` or `NO`
- **THEN** the system rejects it and does not mark the player as having voted

#### Scenario: Ineligible identity votes
- **WHEN** the DM, a late joiner, former member, nonmember, guest, or player outside the electorate attempts to vote
- **THEN** the system denies the vote and leaves counts and status unchanged

#### Scenario: Player votes after closure
- **WHEN** an eligible player submits a vote after the decision is resolved or cancelled
- **THEN** the system rejects it and preserves the closed outcome

### Requirement: GRP-005 Full-participation quorum and deterministic result
A pending decision SHALL resolve automatically only after every current eligible voter has cast one valid vote; the current baseline SHALL have no lower quorum, timeout, or early-majority closure. More `YES` than `NO` votes SHALL produce result `YES`, more `NO` than `YES` SHALL produce `NO`, and equal counts SHALL produce `TIE` rather than favoring either choice. Resolution SHALL store its time and make the outcome immutable.

#### Scenario: Some eligible players have not voted
- **WHEN** one or more eligible voters remain without a vote
- **THEN** the decision remains pending even if one option already has a numerical lead

#### Scenario: Yes has a strict majority after all votes
- **WHEN** every eligible voter has voted and yes votes exceed no votes
- **THEN** the system resolves the decision with result `YES`

#### Scenario: No has a strict majority after all votes
- **WHEN** every eligible voter has voted and no votes exceed yes votes
- **THEN** the system resolves the decision with result `NO`

#### Scenario: All votes produce a tie
- **WHEN** every eligible voter has voted and yes and no counts are equal
- **THEN** the system resolves the decision with result `TIE` and does not report yes or no as chosen

#### Scenario: Resolution is repeated
- **WHEN** another request or membership event reaches an already resolved decision
- **THEN** the system preserves its original result, counts, and resolution time

### Requirement: GRP-006 Manual closure is cancellation only
Only the campaign DM SHALL be able to manually close a pending decision, and manual closure SHALL cancel it without declaring `YES`, `NO`, or `TIE`. Cancellation SHALL require explicit confirmation, preserve the votes already counted for historical display, set status `CANCELLED`, and accept no later votes. The DM MUST NOT edit vote counts, voter identities, or manufacture a majority result.

#### Scenario: DM confirms cancellation
- **WHEN** the campaign DM explicitly confirms manual closure of a pending decision
- **THEN** the system marks it cancelled, records the closure time, preserves existing counts, and records no result

#### Scenario: DM cancels the closure prompt
- **WHEN** the DM does not confirm manual closure
- **THEN** the decision remains pending with its electorate and votes unchanged

#### Scenario: Ordinary player closes a decision
- **WHEN** an ordinary campaign member attempts manual closure
- **THEN** the system denies the request and preserves the decision

#### Scenario: DM supplies a manual result or vote count
- **WHEN** a manual-closure request attempts to declare a result or replace counts
- **THEN** the system ignores or rejects those fields and closes only as `CANCELLED` if the cancellation itself is valid

#### Scenario: DM closes an already closed decision
- **WHEN** the DM attempts to cancel a resolved or cancelled decision
- **THEN** the system rejects the transition and preserves the original closure

### Requirement: GRP-007 Decision visibility and vote privacy
Current campaign members SHALL be able to read the decision title, question, status, aggregate yes/no counts, electorate size, result when present, and creation or closure times. An eligible player SHALL additionally learn whether they have voted. The DM MAY receive the identities of eligible players who have not yet voted so the quorum can be managed, but no campaign view SHALL disclose how an individual voted. Nonmembers, former members, guests, and display clients without separate `session-views` authorization MUST NOT receive decision data or actions.

#### Scenario: Eligible player opens decisions
- **WHEN** an eligible current member requests campaign decisions
- **THEN** the system returns aggregate decision data and that player's own voted or not-voted state without individual vote choices

#### Scenario: DM checks outstanding voters
- **WHEN** the campaign DM requests a pending decision
- **THEN** the system may identify eligible players who have not voted while keeping every cast vote secret

#### Scenario: Member requests another player's vote
- **WHEN** a campaign member attempts to learn whether another named player voted yes or no
- **THEN** the system returns no individual vote choice

#### Scenario: Former member requests decisions
- **WHEN** a former member, unrelated authenticated user, or guest requests campaign decisions
- **THEN** the system denies access and returns no decision data

### Requirement: GRP-008 Persistence and deletion
Group decisions, electorates, votes, status, result, and timestamps SHALL persist across view refresh, browser or device changes, and application restart until their campaign is deleted. Refreshing or reconnecting MUST NOT permit another vote from an identity already recorded. Campaign deletion SHALL remove all of its decisions atomically with other required campaign records; live-state reset MUST NOT remove or reopen them.

#### Scenario: Voter refreshes or changes device
- **WHEN** an eligible player who already voted reopens the campaign in another view, browser, or device
- **THEN** the system reports that player's vote as already cast and rejects another vote

#### Scenario: Application restarts
- **WHEN** the application restarts while a campaign has pending, resolved, or cancelled decisions
- **THEN** the system restores their persisted electorate, votes, status, results, and timestamps

#### Scenario: Live state is reset
- **WHEN** the DM resets ephemeral live-play state
- **THEN** the system preserves every group decision and does not reopen a closed one

#### Scenario: Campaign is deleted
- **WHEN** campaign deletion completes
- **THEN** the system deletes that campaign's decisions and returns no decision data afterward
