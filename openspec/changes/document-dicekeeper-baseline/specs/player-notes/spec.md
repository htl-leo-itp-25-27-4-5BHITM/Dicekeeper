# Spec Delta

## Purpose

Defines private player-authored campaign notes stored only in one browser profile, including player/campaign isolation, autosave, refresh and device expectations, failures, clearing, and scope limits.

## ADDED Requirements

### Requirement: NOTE-001 Player and campaign isolation
Player notes SHALL be private to one authenticated player and one campaign in the Dicekeeper user interface. The note store SHALL use both identities as its namespace, and the application SHALL load or change only the exact current-player/current-campaign note. The campaign DM, other members, display clients, unrelated authenticated users, guests, and other campaigns MUST NOT receive that note through Dicekeeper APIs or views.

#### Scenario: Player opens their campaign note
- **WHEN** an authenticated campaign member opens notes for their current campaign
- **THEN** the application loads only the note stored for that player and campaign in the current browser profile

#### Scenario: Same player opens another campaign
- **WHEN** the player has notes in two campaigns and switches between them
- **THEN** each campaign displays its own note without replacing or combining the other

#### Scenario: Another player uses the same browser
- **WHEN** a different authenticated player opens the same campaign in that browser profile
- **THEN** Dicekeeper does not load or overwrite the first player's namespaced note

#### Scenario: DM or member requests another player's note
- **WHEN** the DM or another campaign member attempts to retrieve a player's note through Dicekeeper
- **THEN** the system exposes no note content or note-existence signal

#### Scenario: Guest or display client requests notes
- **WHEN** a guest or display-only client requests player-note data
- **THEN** the system returns no note data

### Requirement: NOTE-002 Browser-local persistence lifetime
The current baseline SHALL store player notes only in the current origin's browser-local profile. A saved note SHALL survive Dicekeeper view navigation, page refresh, sign-out and later sign-in, and browser restart on that same browser profile until the player clears it or the browser's site data is removed. It SHALL NOT synchronize to the server, another browser profile, another device, or another origin, and Dicekeeper SHALL make this local-only boundary clear wherever it claims the note is saved.

#### Scenario: Player refreshes the page
- **WHEN** a saved note exists and the player refreshes or returns to the same campaign in the same browser profile
- **THEN** the application restores the saved note

#### Scenario: Player signs out and returns
- **WHEN** the same player signs out and later signs in on the same browser profile without clearing site data
- **THEN** the application restores that player's campaign note

#### Scenario: Player uses another device or browser profile
- **WHEN** the player opens the campaign on a device or browser profile that has no local copy
- **THEN** the application shows an empty note and does not claim the prior note was synchronized or lost by the server

#### Scenario: Browser site data is cleared
- **WHEN** the local site data containing a note is removed
- **THEN** Dicekeeper cannot restore the note and offers no server-side recovery claim

#### Scenario: Application server restarts
- **WHEN** Dicekeeper's server restarts while a browser retains its saved note
- **THEN** the same browser profile can still restore the note because the server stores no copy

### Requirement: NOTE-003 Autosave and storage failures
The player SHALL be able to edit plain-text notes, and the application SHALL save the latest text to the exact player/campaign namespace after a short inactivity delay. Emptying the note SHALL clear its content for that namespace. If browser storage is unavailable, blocked, full, or fails, editing SHALL remain possible for the current view, the application SHALL identify that the note is not durably saved, and it MUST NOT display a successful-save claim.

#### Scenario: Player edits a note
- **WHEN** the player changes note text and pauses input long enough for autosave
- **THEN** the application stores the latest complete text under that player and campaign only

#### Scenario: Player continues typing before autosave
- **WHEN** the player changes the note again before the inactivity delay ends
- **THEN** the application saves the newest text rather than an earlier intermediate value

#### Scenario: Player clears a note
- **WHEN** the player removes all note text and autosave completes
- **THEN** the stored content for that player and campaign becomes empty without affecting another note

#### Scenario: Browser storage read fails
- **WHEN** the local note store is unavailable or contains unreadable data
- **THEN** the note editor remains usable with an empty or recoverable in-memory value and does not expose another namespace

#### Scenario: Browser storage write fails
- **WHEN** a note cannot be written because storage is unavailable, blocked, or full
- **THEN** the application keeps the current editor text for that view, reports that it is not saved, and does not claim persistence after navigation

### Requirement: NOTE-004 Plain-text and no-transmission boundary
Player notes SHALL be treated as plain text. Displaying a saved note MUST NOT execute markup, script, links, or commands from its content. The current `player-notes` capability SHALL NOT transmit note content to the campaign DM, other players, live synchronization, notifications, AI assistance, recaps, or any server endpoint.

#### Scenario: Note contains markup or script text
- **WHEN** a player saves text containing HTML, script, or command-like content
- **THEN** the application preserves it as text and executes none of it

#### Scenario: Campaign clients synchronize live state
- **WHEN** turns, HP, dice, decisions, maps, or other campaign events are propagated
- **THEN** no player-note content is included in those events or shared campaign state

#### Scenario: Another feature requests note content
- **WHEN** a notification, DM view, display view, chat, AI, recap, or campaign workflow requests a player's local note
- **THEN** the current capability provides no note content to that feature

### Requirement: NOTE-005 Local-only scope and deletion limits
Browser-local notes SHALL remain outside server-side campaign and account records. Leaving a campaign, campaign deletion, account deletion, or server cleanup SHALL revoke application access as required by their owning capabilities but cannot guarantee deletion from another browser profile or device because no server copy or device registry exists. The current baseline SHALL NOT claim backup, export, merge, synchronization, collaborative editing, cross-device deletion, or recovery after local data loss. Any accepted server-persistence or cross-device note behavior MUST be proposed as a separate product change.

#### Scenario: Player loses campaign access
- **WHEN** the player leaves, is removed, or the campaign is deleted
- **THEN** Dicekeeper no longer presents the campaign note through an authorized view even though an unreachable local browser value may remain until site data is cleared

#### Scenario: Account is deleted
- **WHEN** account deletion completes in Dicekeeper
- **THEN** server cleanup contains no player-note record and makes no claim to erase browser-local copies on other devices or profiles

#### Scenario: Player expects cross-device notes
- **WHEN** the player asks for a note on a device without the same local browser data
- **THEN** the current capability reports no synchronized note rather than creating or inferring one

#### Scenario: Server persistence is proposed later
- **WHEN** product scope accepts synchronized or server-backed notes
- **THEN** that behavior is planned in a separate change with its own access, migration, deletion, conflict, and recovery rules
