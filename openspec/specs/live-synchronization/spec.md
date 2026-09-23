# live-synchronization Specification

## Purpose

Defines authorized campaign update propagation, liveness, stale-state detection, snapshot reconciliation, access revocation, restart outcomes, and consistency across served clients.

## Requirements

### Requirement: SYNC-001 Authorized campaign event subscription
Live synchronization SHALL require a valid authenticated identity and current membership in the requested campaign. Each subscription and every delivered event projection SHALL follow the same role, field, media, and action boundaries as an authoritative read by that identity. A subscription MUST NOT disclose campaign story, account-private fields, another player's character or review data, individual vote choices, player notes, unfogged map content, or DM controls to a client that could not read them directly. The table projection SHALL synchronize only through the DM authorization defined by `session-views`.

#### Scenario: Current member subscribes
- **WHEN** an authenticated current campaign member opens an authorized live view
- **THEN** the system establishes a campaign-scoped event subscription whose payloads contain only fields authorized for that identity and view

#### Scenario: Nonmember subscribes
- **WHEN** a guest, unrelated authenticated user, or former member requests the campaign event stream
- **THEN** the system denies the subscription and emits no campaign event data

#### Scenario: Event contains role-sensitive data
- **WHEN** one committed domain change has different DM and player representations
- **THEN** each subscriber receives only its authorized projection rather than a shared payload containing hidden fields

#### Scenario: Player note changes
- **WHEN** a player edits a browser-local campaign note
- **THEN** the note and its existence are not published to the campaign event stream

### Requirement: SYNC-002 Committed update propagation and authoritative ordering
After an accepted campaign mutation commits, Dicekeeper SHALL make its observable effect available to every currently authorized affected view without requiring a manual page reload. This applies to campaign start and relevant metadata, roster membership and review consequences, active-map selection, marker/group/fog/undo state, turn, HP, activity, latest dice result, group-decision lifecycle, live reset, and campaign deletion. An event MUST NOT announce a rolled-back mutation. Events within one campaign and authoritative runtime SHALL carry an order or revision that permits a client to recognize duplicates, gaps, and out-of-order delivery; applying a duplicate MUST be idempotent, and a client MUST NOT overwrite newer state with an older event.

#### Scenario: Mutation commits
- **WHEN** an authorized action commits a change visible in an open campaign view
- **THEN** the system publishes or invalidates the affected projection so each authorized connected view can converge without manual reload

#### Scenario: Mutation rolls back
- **WHEN** a campaign mutation fails or its transaction rolls back
- **THEN** the system emits no successful-update event for that attempted state

#### Scenario: Duplicate event arrives
- **WHEN** a client receives the same campaign event more than once
- **THEN** applying it again does not duplicate a marker, vote, notification, or other state transition

#### Scenario: Older event arrives after newer state
- **WHEN** an event order or revision is older than the state already reconciled by the client
- **THEN** the client ignores it or performs authoritative reconciliation and does not regress the presentation

#### Scenario: One view does not display an affected capability
- **WHEN** a committed update concerns data omitted by that view's visibility matrix
- **THEN** the view receives no hidden payload and updates only any safe derived presentation that actually changed

### Requirement: SYNC-003 Connection liveness and observable client status
The event channel SHALL provide liveness signals that do not mutate campaign state. Every synchronized view SHALL distinguish at least `connecting`, `current`, `stale/reconnecting`, `reconciling`, `revoked`, and `unavailable` states in text or an equivalently accessible status. A transport error, missed liveness expectation, detected event gap, or failed reconciliation SHALL move the view out of `current`; the view MUST NOT silently present its cached projection as current while the connection state is unknown. Connection status MUST NOT rely only on color or animation.

#### Scenario: Initial connection is being established
- **WHEN** a synchronized view has not yet completed its subscription and authoritative initial read
- **THEN** it identifies the state as connecting and does not label cached campaign data current

#### Scenario: Heartbeat arrives
- **WHEN** an authorized client receives a valid liveness signal
- **THEN** the client records channel liveness without changing campaign data or displaying the heartbeat as a player action

#### Scenario: Connection is lost
- **WHEN** the event transport reports failure or liveness can no longer be established
- **THEN** the view identifies itself as stale or reconnecting and distinguishes cached values from confirmed current state

#### Scenario: Status is announced accessibly
- **WHEN** the connection changes between current, stale, reconciling, revoked, or unavailable
- **THEN** the view exposes the new state as text and to assistive technology without requiring color perception

### Requirement: SYNC-004 Gap, malformed-event, and stale-client recovery
A synchronized client SHALL treat its authorized full-state reads as authoritative over incremental events. When it detects an event gap, receives a malformed or unrecognized event needed by its projection, resumes from a suspended or stale browser, or cannot apply an event safely, it SHALL retain the stale indication and fetch the complete authorized campaign snapshot needed by that view. The client SHALL replace affected cached projections only after each required read succeeds; a partial or failed reconciliation MUST remain observable and MUST NOT be labeled current.

#### Scenario: Client detects a missing event
- **WHEN** the event order shows a gap or the client resumes without knowing whether events were missed
- **THEN** the client marks its projection stale and obtains authoritative snapshots for the affected campaign state

#### Scenario: Event payload is malformed
- **WHEN** a client cannot validate or safely apply an event payload
- **THEN** it does not apply the payload, records an observable synchronization problem, and reconciles the affected state

#### Scenario: All required snapshot reads succeed
- **WHEN** a stale client obtains every required authorized snapshot and rebuilds its projection
- **THEN** it changes the connection state to current and shows the authoritative campaign values

#### Scenario: One required snapshot read fails
- **WHEN** any required state, map, roster, decision, or campaign read fails during reconciliation
- **THEN** the client remains stale or unavailable, identifies the failed recovery, and does not combine that failure with a claim of current state

### Requirement: SYNC-005 Reconnect without replay assumptions
After an unintentional transport interruption, the client SHALL attempt to restore its authorized subscription. A successful transport reconnection SHALL always trigger an authoritative reconciliation before the view returns to `current`, whether or not the transport provides a last-event identifier. Dicekeeper SHALL NOT depend on an unimplemented replay buffer to reconstruct missed events. Repeated reconnect attempts MUST NOT duplicate domain mutations, votes, markers, or locally recorded dice history.

#### Scenario: Transport reconnects after a short interruption
- **WHEN** the same authorized client re-establishes its campaign event connection
- **THEN** the view enters reconciling, fetches the authoritative projection, and returns to current only after recovery succeeds

#### Scenario: Last-event identifier is unavailable
- **WHEN** the reconnect has no usable cursor or the server cannot replay from it
- **THEN** the client performs full authorized reconciliation rather than assuming that no event was missed

#### Scenario: Reconnect happens more than once
- **WHEN** the transport repeatedly disconnects and reconnects
- **THEN** each successful reconnect reconciles idempotently and does not create a vote, marker, dice publication, or other mutation

#### Scenario: User refreshes the page
- **WHEN** an authorized user reloads a synchronized view
- **THEN** the view obtains an initial authoritative snapshot before presenting itself as current and then subscribes for later updates

### Requirement: SYNC-006 Membership revocation and campaign deletion
Membership removal SHALL revoke the affected identity's REST and event access as one observable outcome. The system SHALL stop delivering campaign events to an already connected removed member, invalidate that client's protected cached projection, and reject automatic reconnection unless a new membership is later established. Campaign deletion SHALL send only the minimum deletion signal needed to currently authorized clients, terminate all campaign subscriptions, clear protected projections, and prevent later snapshot reads or reconnections from recreating campaign or live state.

#### Scenario: Player leaves while a live view is open
- **WHEN** the player's membership is successfully removed
- **THEN** that client stops receiving campaign events, clears protected campaign data, shows a revoked outcome, and cannot reconnect as a member

#### Scenario: DM removes a connected player
- **WHEN** the DM successfully removes a player whose browser still has an event connection
- **THEN** the system revokes that connection without waiting for a page refresh or transport failure

#### Scenario: Other members observe roster removal
- **WHEN** a membership removal commits
- **THEN** remaining authorized views reconcile the roster, turn/activity eligibility, pending decision electorate, and any other affected authorized projection

#### Scenario: Campaign is deleted
- **WHEN** campaign deletion commits
- **THEN** connected clients receive a safe unavailable outcome, their subscriptions end, and subsequent reads or reconnects return not found without creating new live state

### Requirement: SYNC-007 Restart and state-lifetime recovery
Synchronization SHALL preserve the lifetime of each owning capability rather than treating every event field as equally durable. After service restart or runtime replacement, persisted campaign data and group decisions SHALL be read from their durable source; browser-local player notes SHALL remain only in the same browser profile and SHALL never enter reconciliation; ephemeral turn, HP, activity, latest dice, and map runtime fields SHALL follow LIVE-007 and the accepted map lifetime and MAY return uninitialized. A client SHALL present an explicit recovered, uninitialized, or unavailable outcome and MUST NOT reconstruct lost runtime values from stale browser state.

#### Scenario: Service restarts with persisted decisions
- **WHEN** clients reconnect after a restart and the campaign and decisions still exist
- **THEN** the system restores persisted campaign and decision data from their authoritative source

#### Scenario: Ephemeral live state was lost
- **WHEN** restart or replacement removed the campaign's ephemeral runtime state
- **THEN** clients show those fields as uninitialized and do not reuse a cached turn, HP change, activity value, dice result, marker, or fog value as authoritative

#### Scenario: Browser retains a private player note
- **WHEN** the service restarts while the player's browser-local note remains available
- **THEN** the player view may restore that exact local note without sending it through the synchronization channel or treating it as server recovery

#### Scenario: Persisted snapshot is temporarily unavailable
- **WHEN** a required durable read fails after restart
- **THEN** the client stays unavailable or stale and does not replace the failure with cached data labeled current

### Requirement: SYNC-008 Cross-instance consistency
All authorized clients for one campaign SHALL observe a single committed campaign projection even when requests, mutations, subscriptions, or reconnects are served by different application instances. The deployment SHALL either route all live state and event traffic for that campaign through one authoritative runtime or use shared state and event distribution that preserves the same observable contract. A successfully acknowledged mutation MUST NOT remain visible only to clients connected to one instance. If authoritative consistency cannot be maintained, affected views SHALL become stale or unavailable rather than silently diverge.

#### Scenario: Mutation and subscriber use different instances
- **WHEN** an authorized mutation commits on one application instance while an affected client is subscribed through another
- **THEN** the client receives the update or is forced to reconcile against the same authoritative committed state

#### Scenario: Client reconnects to another instance
- **WHEN** a client reconnects through an instance different from the one that served its prior connection
- **THEN** authoritative reconciliation produces the same persisted and live projection permitted by the owning state lifetimes

#### Scenario: Instance cannot reach authoritative live state
- **WHEN** an instance cannot provide or reconcile the campaign's authoritative live projection
- **THEN** it reports the view stale or unavailable and does not create an independent divergent campaign state

### Requirement: SYNC-009 State-based recovery and performance boundary
The current baseline SHALL measure synchronization correctness by observable state transitions: a committed change becomes visible without manual reload, a disconnected client is visibly stale, a reconnected client matches the authoritative snapshot before becoming current, and a revoked client receives no later protected data. It SHALL expose loading, mutation-pending, error, stale, reconciliation, and unavailable outcomes so these transitions can be tested. The baseline SHALL NOT claim a maximum propagation, heartbeat, reconnect, snapshot, image-load, or page-load duration; no fixed latency, throughput, capacity, browser-version, or deployment-scale target is accepted by this change.

#### Scenario: Synchronization acceptance is evaluated
- **WHEN** a test commits a supported update, interrupts and restores a client, or revokes its membership
- **THEN** the observed view passes only if it reaches the contractually correct state without manual reload and exposes every intermediate stale or recovery outcome

#### Scenario: Operation remains pending
- **WHEN** a synchronized mutation or recovery has not produced an authoritative success or failure
- **THEN** the view identifies it as pending and does not present an arbitrary time estimate or successful final state

#### Scenario: Numeric service target is requested
- **WHEN** an implementation or release plan requires a concrete latency, capacity, browser, viewport, or availability target
- **THEN** that target remains unconfirmed until a separately recorded product decision supplies its value and test environment
