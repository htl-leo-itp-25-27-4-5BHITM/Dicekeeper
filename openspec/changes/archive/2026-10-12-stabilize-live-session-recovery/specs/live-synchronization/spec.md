# Spec Delta

## ADDED Requirements

### Requirement: SYNC-003 Connection liveness and observable client status
The event channel SHALL provide liveness signals that do not mutate campaign state. Every synchronized view SHALL distinguish at least `connecting`, `current`, `stale/reconnecting`, `reconciling`, `reauthenticating`, `revoked`, and `unavailable` states in text or an equivalently accessible status. A transport error, missed liveness expectation, detected event gap, authentication expiry, or failed reconciliation SHALL move the view out of `current`; the view MUST NOT silently present its cached projection as current while the connection or authorization state is unknown. Connection status MUST NOT rely only on color or animation.

#### Scenario: Initial connection is being established
- **WHEN** a synchronized view has not yet completed its subscription and authoritative initial read
- **THEN** it identifies the state as connecting and does not label cached campaign data current

#### Scenario: Heartbeat arrives
- **WHEN** an authorized client receives a valid liveness signal
- **THEN** the client records channel liveness without changing campaign data or displaying the heartbeat as a player action

#### Scenario: Connection is lost
- **WHEN** the event transport reports failure or liveness can no longer be established
- **THEN** the view identifies itself as stale or reconnecting and distinguishes cached values from confirmed current state

#### Scenario: Authentication expires while the live view is open
- **WHEN** event recovery determines that the server-authenticated session is no longer valid
- **THEN** the view identifies itself as reauthenticating, stops claiming the protected projection is current, and uses the coordinated recovery defined by `account-access`

#### Scenario: Status is announced accessibly
- **WHEN** the connection changes between current, stale, reconciling, reauthenticating, revoked, or unavailable
- **THEN** the view exposes the new state as text and to assistive technology without requiring color perception

### Requirement: SYNC-004 Gap, malformed-event, and stale-client recovery
A synchronized client SHALL treat its authorized full-state reads as authoritative over incremental events. When it detects an event gap, receives a malformed or unrecognized event needed by its projection, resumes from a suspended or stale browser, or cannot apply an event safely, it SHALL retain the stale indication and fetch the complete authorized campaign snapshot needed by that view. The client SHALL stage a recovery snapshot and replace affected cached projections only after all reads required by that recovery attempt succeed and their payloads are usable; a partial or failed reconciliation MUST NOT partially confirm the projection and MUST remain observable rather than being labeled current.

#### Scenario: Client detects a missing event
- **WHEN** the event order shows a gap or the client resumes without knowing whether events were missed
- **THEN** the client marks its projection stale and obtains authoritative snapshots for the affected campaign state

#### Scenario: Event payload is malformed
- **WHEN** a client cannot validate or safely apply an event payload
- **THEN** it does not apply the payload, records an observable synchronization problem, and reconciles the affected state

#### Scenario: All required snapshot reads succeed
- **WHEN** a stale client obtains every required authorized snapshot and rebuilds its projection
- **THEN** it atomically confirms the recovered projection, changes the connection state to current, and shows the authoritative campaign values

#### Scenario: One required snapshot read fails
- **WHEN** any required state, map, roster, decision, or campaign read fails during reconciliation
- **THEN** the client does not apply the attempt as a successful recovery, remains stale or unavailable, identifies the failed recovery, and does not combine that failure with a claim of current state

### Requirement: SYNC-005 Reconnect without replay assumptions
After an unintentional transport interruption, the client SHALL attempt to restore its authorized subscription. It SHALL distinguish a transport that is still reconnecting from one that has become terminal and MUST NOT rely on browser-managed reconnection after a terminal failure. If the interruption exposes an expired authenticated session, the client SHALL enter `reauthenticating` and suspend event retries until account recovery succeeds; otherwise it SHALL create a replacement subscription. Every successful replacement or reconnection SHALL trigger an authoritative reconciliation before the view returns to `current`, whether or not the transport provides a last-event identifier. Dicekeeper SHALL NOT depend on an unimplemented replay buffer to reconstruct missed events. Repeated reconnect attempts MUST NOT duplicate domain mutations, votes, markers, or locally recorded dice history.

#### Scenario: Transport reconnects after a short interruption
- **WHEN** the same authorized client re-establishes its campaign event connection
- **THEN** the view enters reconciling, fetches the authoritative projection, and returns to current only after recovery succeeds

#### Scenario: Event transport becomes terminal while authentication remains valid
- **WHEN** a failed campaign event connection can no longer reconnect itself and the player's server-authenticated session is still valid
- **THEN** the client creates a replacement campaign subscription and reconciles before marking the view current

#### Scenario: Event endpoint encounters an authentication challenge
- **WHEN** the event connection fails because the server-authenticated session has expired
- **THEN** the client does not treat an authentication response as an event stream, stops automatic event retries, and enters the coordinated reauthentication outcome

#### Scenario: Event recovery resumes after reauthentication
- **WHEN** fresh sign-in succeeds for a protected live view
- **THEN** the client creates a new authorized subscription, obtains the complete authoritative projection, and marks the view current only after reconciliation succeeds

#### Scenario: Last-event identifier is unavailable
- **WHEN** the reconnect has no usable cursor or the server cannot replay from it
- **THEN** the client performs full authorized reconciliation rather than assuming that no event was missed

#### Scenario: Reconnect happens more than once
- **WHEN** the transport repeatedly disconnects and reconnects
- **THEN** each successful reconnect reconciles idempotently and does not create a vote, marker, dice publication, or other mutation

#### Scenario: User refreshes the page
- **WHEN** an authorized user reloads a synchronized view
- **THEN** the view obtains an initial authoritative snapshot before presenting itself as current and then subscribes for later updates
