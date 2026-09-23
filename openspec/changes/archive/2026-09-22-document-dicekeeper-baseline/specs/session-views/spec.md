# Spec Delta

## Purpose

Defines the role-scoped DM, player, and shared table presentations, their visible data and actions, supported device classes, help, readability, and accessibility boundaries.

## ADDED Requirements

### Requirement: VIEW-001 Role- and state-authorized view entry
Dicekeeper SHALL authorize each campaign view from the authenticated identity, current campaign membership, campaign role, and started state rather than from a route, cached player value, or caller-supplied identifier. The owner-DM SHALL use the cockpit to prepare a not-started campaign and the DM live view to run a started campaign. A current `PLAYER` member with an existing complete `APPROVED` character SHALL use the player live view only after start. The shared table view SHALL be opened only by the authenticated campaign DM for a started campaign. Guests, nonmembers, former members, and callers with the wrong role MUST NOT receive member-only view data or actions.

#### Scenario: DM opens the preparation cockpit
- **WHEN** the authenticated owner-DM opens a campaign that has not started
- **THEN** the system provides the DM cockpit and only the preparation data and actions authorized by the owning capability contracts

#### Scenario: DM opens live play
- **WHEN** the authenticated owner-DM opens their started campaign
- **THEN** the system provides the DM live view with the authorized live controls

#### Scenario: Approved player opens live play
- **WHEN** a current `PLAYER` member whose complete owned character is `APPROVED` opens a started campaign
- **THEN** the system provides that member's player live view

#### Scenario: Player is not ready for the live view
- **WHEN** a player opens live play before campaign start or while their review is `NONE`, `PENDING`, or `REJECTED`
- **THEN** the system withholds live-view data and directs the player to the authorized campaign or character-review state without disclosing another member's data

#### Scenario: Caller opens a view for the wrong role
- **WHEN** an ordinary player requests the DM cockpit or DM live view, or attempts to start a table projection
- **THEN** the system denies that view and returns no DM-only data or controls

#### Scenario: Former member reuses a view route
- **WHEN** a guest, nonmember, or former member opens or refreshes a campaign view route
- **THEN** the system denies member-only data and actions even if that browser previously rendered the campaign

#### Scenario: Campaign is missing
- **WHEN** an authenticated caller opens a view for an unknown campaign identifier
- **THEN** the system shows a not-found outcome without creating live state or exposing another campaign

### Requirement: VIEW-002 DM preparation cockpit
The DM cockpit SHALL present the owner-DM with campaign metadata and private story, public member summaries, roles, the review states and references needed for authorized character review, start readiness, and the map editor presentation. It SHALL expose only the edit, review, removal, map, table-launch, and start actions authorized by `campaign-management`, `campaign-membership`, `character-review`, `campaign-maps`, and `media-assets`. It MUST NOT expose another player's account-private fields or player notes, and it MUST NOT enable a start that violates CAM-006.

#### Scenario: DM reviews start readiness
- **WHEN** the owner-DM opens the cockpit before start
- **THEN** the system shows whether at least one player is present and whether every player has an existing complete approved character without exposing account-private data

#### Scenario: DM opens an authorized review
- **WHEN** the DM selects a pending or rejected member review from the cockpit
- **THEN** the system opens only that campaign's review data and read-only referenced character under REV-003 and REV-007

#### Scenario: Campaign is not ready to start
- **WHEN** any player is absent, unapproved, or references a missing or incomplete character
- **THEN** the cockpit identifies the unmet readiness condition and does not offer a successful start outcome

#### Scenario: Cockpit displays private data
- **WHEN** the DM views campaign preparation data
- **THEN** the system may show the DM-only campaign story and authorized review data but shows no member email, account settings, or private player note

### Requirement: VIEW-003 DM live-control view
The DM live view SHALL present the owner-DM with the authorized original map editor, active-map selection, markers and fog controls, current player public summaries, read-only campaign-referenced character details, turn, HP, activity, latest dice result, and group-decision management. Its actions SHALL remain the actions defined by `campaign-maps`, `live-play`, and `group-decisions`; rendering a control MUST NOT grant broader authority or create a second lifecycle. The current baseline SHALL NOT represent the local DM chat panel as synchronized chat, AI assistance, a notification channel, or persisted session content.

#### Scenario: DM runs a started campaign
- **WHEN** the owner-DM opens the live view for a started campaign
- **THEN** the system shows the authorized editor and live state and offers only the DM actions defined by the upstream capability contracts

#### Scenario: DM opens a player character during live play
- **WHEN** the DM selects a current player's referenced approved character
- **THEN** the system provides the character read-only in that campaign context without granting library mutation or account-private access

#### Scenario: Live control fails
- **WHEN** a DM action is denied, invalid, or fails to commit
- **THEN** the view reports the unsuccessful outcome, restores or reconciles the authoritative state, and does not continue to present an optimistic mutation as committed

#### Scenario: DM uses the chat panel
- **WHEN** text is entered in the current DM chat panel
- **THEN** the current baseline makes no claim that the text reaches another client, invokes AI, or persists as campaign or session data

### Requirement: VIEW-004 Player live view
The player live view SHALL present the current player with their own complete character details, own current and maximum HP, the active fog-respecting map and permitted markers, current turn and player-activity cues, contextual public summaries and roles for the campaign roster, aggregate group-decision data plus the player's own vote state, the latest authorized dice result, and that player's browser-local campaign note. It SHALL offer only authenticated self-reported dice, eligible voting, local note editing, and local map viewport actions. It MUST NOT expose campaign story, another player's character details or review data, individual vote choices, another player's note, DM controls, or raw map media that bypasses fog.

#### Scenario: Player opens the live view
- **WHEN** an approved current player opens a started campaign
- **THEN** the system shows their own authorized character and HP together with the campaign presentation and actions allowed to that player

#### Scenario: Player views the party
- **WHEN** the player views other campaign participants
- **THEN** the system shows contextual public summaries, roles, turn and activity cues but no other character sheet, account-private field, review note, or private note

#### Scenario: Player uses an authorized action
- **WHEN** the player publishes their own valid dice result, casts an eligible vote, edits their local note, or changes local pan and zoom
- **THEN** the action follows its owning capability without granting any DM mutation authority

#### Scenario: Player requests hidden or private data
- **WHEN** the player attempts to obtain campaign story, unfogged map content, another character sheet, another vote choice, or another note through the live view
- **THEN** the system returns none of that data

### Requirement: VIEW-005 DM-authorized shared table projection
The table screen SHALL be a read-only presentation mode opened by the authenticated campaign DM in a browser session that remains subject to that DM's campaign authorization. It SHALL have no anonymous URL, reusable share token, independent display identity, or broader permission role in the current baseline. The projection MAY be physically visible to people at the table, but the application data request SHALL remain authenticated. It SHALL show only the campaign name, player display names, current and maximum HP, activity and current-turn cues, the latest dice result, and the active fog-respecting map with permitted markers. It MUST NOT expose campaign story, account-private data, review state or notes, character-sheet details, group-decision data, player notes, notification data, DM editor data, or any server mutation action.

#### Scenario: DM opens the table projection
- **WHEN** the authenticated owner-DM opens the table view for a started campaign
- **THEN** the system provides the read-only shared projection under that DM session

#### Scenario: Ordinary member opens the table route
- **WHEN** a player member attempts to open or start the table projection directly
- **THEN** the system denies the projection and returns no table-view data

#### Scenario: Table view renders shared state
- **WHEN** the authorized table projection is current
- **THEN** it shows the active fog-respecting map, permitted markers, display names, HP, activity, turn, and latest dice result without private or DM-only fields

#### Scenario: Table client attempts a mutation
- **WHEN** the table client attempts to change fog, markers, map selection, live state, dice, decisions, membership, or campaign data
- **THEN** the system denies the action and preserves authoritative state

#### Scenario: DM session or campaign authorization ends
- **WHEN** the DM signs out, authentication expires, the campaign is deleted, or the authorizing membership is no longer valid
- **THEN** the table projection stops receiving protected state, clears the protected presentation, and requires a newly authorized launch

### Requirement: VIEW-006 Cross-view visibility and action matrix
The DM cockpit, DM live view, player live view, and table projection SHALL follow the matrix below. A blank or denied cell MUST NOT be populated merely because a source endpoint or client cache contains the data. Detailed field, transition, persistence, and deletion rules remain owned by the referenced capabilities.

| Data or action | DM cockpit | DM live | Player live | Table projection |
| --- | --- | --- | --- | --- |
| Campaign metadata | DM-authorized metadata and story | Non-story identity metadata needed for play | Non-story member metadata | Campaign name only |
| Roster identity | Public summaries, roles, review management data | Public summaries and roles | Public summaries and roles | Display names only |
| Character data | Referenced character read-only for review | Referenced character read-only | Own complete character only | Denied |
| Review and notifications | DM-authorized review workflow and own inbox | Own inbox only; no unrelated review data | Own review/inbox outside the shared projection | Denied |
| Map | Original/editor preparation | Original/editor with DM mutations | Active fog-respecting presentation; local viewport only | Active fog-respecting presentation; no mutations |
| Live turn/HP/activity | Readiness only | All eligible player live fields and DM mutations | Own HP plus authorized turn/activity cues; no mutation | All presented player HP/activity/turn cues; no mutation |
| Dice | No required live projection | Publish and see authorized latest result | Publish and see authorized latest result | See authorized latest result only |
| Group decisions | No required live projection | Create/cancel and view authorized aggregate/quorum data | Vote and view authorized aggregate/own-vote state | Denied |
| Player notes | Denied | Denied | Exact current-player/current-campaign local note only | Denied |
| Connection/recovery state | When live data is used | Required | Required | Required |

#### Scenario: View renderer receives extra fields
- **WHEN** a backend response or cached object contains fields outside the matrix for that view
- **THEN** the view omits those fields and offers no action based on them

#### Scenario: Upstream permission changes
- **WHEN** an owning capability removes or narrows the caller's access while a view is open
- **THEN** the view follows the narrower permission and does not preserve a broader cached presentation

### Requirement: VIEW-007 Supported device classes and responsive continuity
The current player live view SHALL support desktop, tablet, and mobile-phone layouts with the same authorized core capabilities, using a compact navigation model when the full multi-column layout does not fit. The DM cockpit and DM live view SHALL support desktop and tablet layouts; phone-sized DM live control is outside the confirmed baseline. The table projection SHALL support a shared desktop or large display and tablet landscape; phone-sized table presentation is outside the confirmed baseline. Crossing between supported layouts or changing orientation SHALL preserve server-authoritative campaign state and the current player's browser-local note while reflowing controls so the supported workflow remains reachable without horizontal-page scrolling. The product MUST NOT advertise an unsupported layout as implementation-ready.

#### Scenario: Player uses a mobile phone
- **WHEN** an approved player opens the live view in the supported mobile layout
- **THEN** map, own character and HP, dice, group decisions, party summaries, and private notes remain reachable through the compact navigation without granting different permissions

#### Scenario: Player uses a tablet or desktop
- **WHEN** the player opens a supported tablet or desktop layout
- **THEN** the same core data and actions remain available in a reflowed or multi-column presentation

#### Scenario: DM uses a supported tablet
- **WHEN** the DM opens the cockpit or live view on a supported tablet layout
- **THEN** every required preparation or live-control action remains reachable without changing authority or hiding its outcome

#### Scenario: View crosses a supported layout boundary
- **WHEN** a supported browser is resized or its orientation changes between supported layouts
- **THEN** the view reflows without inventing, dropping, or broadening campaign state and preserves the exact local note namespace

#### Scenario: Unsupported phone control layout is requested
- **WHEN** the DM live view or table projection is opened on a phone-sized layout
- **THEN** the system does not claim full support and identifies the supported device class rather than presenting inaccessible controls as usable

### Requirement: VIEW-008 Keyboard, focus, labeling, and non-color communication
Every interactive control required by a supported view workflow SHALL be reachable and operable by keyboard, have an accessible name and current state, and show a visible focus indicator. Modals, drawers, tabs, and map-adjacent toolbars SHALL expose their open, selected, expanded, disabled, and error states without relying only on color, icon shape, hover, animation, or pointer gestures. Dynamic outcomes for connection, turn, HP, dice, vote, save, and destructive actions SHALL be available as text and to assistive technology. Disabling motion MUST NOT remove required information or prevent an action.

#### Scenario: Keyboard-only player uses the compact view
- **WHEN** a player navigates tabs, decisions, dice, and notes without a pointer
- **THEN** focus follows a logical order, every action is operable, and the selected or expanded state is programmatically identifiable

#### Scenario: Keyboard-only DM opens and closes a modal
- **WHEN** the DM opens a supported confirmation or editor modal from the keyboard
- **THEN** focus moves into the modal, remains within its actionable content, and returns to the invoking control after close

#### Scenario: Status is represented by color or animation
- **WHEN** the view distinguishes turn, HP severity, review, connection, vote, or error state
- **THEN** it also supplies text or another non-color, non-motion indicator conveying the same meaning

#### Scenario: Reduced motion is requested
- **WHEN** the user's browser requests reduced motion
- **THEN** nonessential motion is suppressed and every value, status, and action outcome remains readable

### Requirement: VIEW-009 Accessible theme and consistent view language
Dicekeeper SHALL offer the existing default and accessible color themes across every supported view and SHALL persist the selected theme for the same browser profile across navigation and reload. Theme choice MUST NOT alter permissions, content, or action semantics. User-facing navigation, labels, validation, connection state, and recovery messages within one view SHALL use consistent German terminology for the current baseline; stored player-authored content and recognized game terms SHALL remain unchanged. This requirement does not claim conformance to an unselected external accessibility standard or an unconfirmed contrast ratio.

#### Scenario: Player changes the color theme
- **WHEN** the player selects the accessible theme and navigates among supported views or reloads the page in the same browser profile
- **THEN** the selected theme remains applied without changing available data or actions

#### Scenario: Theme storage is unavailable
- **WHEN** browser theme storage cannot be read or written
- **THEN** the view remains usable with a safe default theme and reports no false persistence claim

#### Scenario: View reports an error or recovery state
- **WHEN** a supported view presents validation, connection, stale-state, or recovery feedback
- **THEN** it uses consistent user-facing terminology rather than mixing an internal English error with German control labels

### Requirement: VIEW-010 Source-aligned user guide
Dicekeeper SHALL provide a readable user guide to guests and authenticated players. The guide SHALL separate new-user, player, and DM workflows; describe only accepted current capabilities; identify role and started-state preconditions; and link or direct the reader to the relevant view without disclosing protected campaign data. It MUST NOT describe a local-only panel as synchronized, claim an unresolved reliability or accessibility target, or present future functionality as delivered.

#### Scenario: Guest opens the guide
- **WHEN** an unauthenticated visitor opens the guide
- **THEN** the system shows public product and sign-in guidance without campaign, profile, or membership data

#### Scenario: Authenticated player opens the guide
- **WHEN** an authenticated player opens the guide
- **THEN** the system presents role-labelled workflows and a safe path back to authenticated navigation

#### Scenario: Product contract changes
- **WHEN** an accepted capability changes a role, precondition, action, or persistence boundary described by the guide
- **THEN** the guide is treated as stale until it is reconciled and MUST NOT override the normative capability contract
