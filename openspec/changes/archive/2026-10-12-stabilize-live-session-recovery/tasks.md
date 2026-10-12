# Tasks

## 1. Deterministic Test Foundation

- [x] 1.1 Add a project-local JavaScript test command and browser-test configuration for the static ES modules, and verify a clean dependency install plus the empty/smoke suites succeed without using credentials.
- [x] 1.2 Add reusable fake clock, navigation, fetch, and `EventSource` adapters for recovery tests, and verify the fixtures can drive connected, transient-error, terminal-error, 499, 403, and failed-snapshot outcomes deterministically.

## 2. Coordinated Authentication Recovery

- [x] 2.1 Implement the document-scoped authentication recovery coordinator in `auth.js`, including sanitized continuation capture, cached-player clearing, expiry publication, and a single guarded login action; verify unit tests prove concurrent 499 and redirected-response detections create one recovery state and at most one navigation.
- [x] 2.2 Separate interactive and background expiry handling in the fetch interceptor while preserving `X-Requested-With` and response delivery to callers; verify foreground requests can invoke recovery while background requests report expiry without surprise navigation.
- [x] 2.3 Update unread-notification polling to stop after session expiry and resume only after confirmed authentication or header reinitialization; verify a fake-timer test produces one 499 request rather than repeated 30-second failures.
- [x] 2.4 Confirm the login callback validates `/api/auth/me` before restoring the saved route and does not reuse pre-expiry identity state; verify callback tests cover successful recovery, failed identity synchronization, and an unsafe continuation path.

## 3. Supervised Campaign Event Transport

- [x] 3.1 Refactor `campaignEvents.js` into a single-owner connection state machine with injected source, fetch, timer, and clock adapters; verify tests cover the required state transitions and prove there is never more than one active source, reconnect timer, or recovery attempt.
- [x] 3.2 Classify an event error with a protected session probe, recreate a terminal source only for a valid session, and suspend retries for authentication, revocation, or unavailable outcomes; verify tests cover valid-session replacement, 499 reauthentication, 403 revocation, and terminal-source recovery.
- [x] 3.3 Add heartbeat liveness tracking, bounded reconnect backoff, generation guards, and idempotent disposal; verify fake-clock tests cover missed liveness, backoff de-duplication, route cleanup, and late asynchronous completion without reopening a disposed connection.
- [x] 3.4 Route invalid, malformed, duplicate, gap, and out-of-order event outcomes through stale/reconciliation handling without applying unsafe data; verify focused tests demonstrate idempotent duplicates and no regression from an older event.

## 4. Atomic Snapshot Reconciliation and Status

- [x] 4.1 Add a reusable accessible live-status component for connecting, current, stale/reconnecting, reconciling, reauthenticating, revoked, and unavailable states; verify DOM/accessibility tests assert visible text, live-region announcements, and keyboard-operable recovery actions without relying on color.
- [x] 4.2 Convert `GMView.js` recovery to load and validate game state, markers, decisions, and campaign/map data into a staged snapshot before one apply; verify one failed resource leaves the previous projection visibly stale and applies none of the staged attempt.
- [x] 4.3 Convert `PlayerView.js` recovery to the staged snapshot contract and shared status surface; verify success applies all required state together while a failed decision, marker, state, or campaign read never labels the player view current.
- [x] 4.4 Convert `TableView.js` recovery to the staged snapshot contract and shared status surface; verify a reconnect refreshes the active map, markers, and game state before current and a failed map/campaign read cannot leave a mixed projection marked current.
- [x] 4.5 Coalesce events received during a snapshot attempt into a dirty follow-up reconciliation and discard superseded generations; verify tests demonstrate that an older in-flight snapshot cannot overwrite a newer event or a later recovery attempt.

## 5. OIDC Boundary Verification

- [x] 5.1 Add a controlled devbox verification for short session/token lifetime with simultaneous protected requests, record whether Quarkus refresh concurrency invalidates the session, and verify the scenario is repeatable without exposing credentials or token values in artifacts.
- [x] 5.2 If the boundary test reproduces refresh invalidation, configure an environment-backed short-lived Quarkus refresh-result cache and rerun the concurrency test until one refreshed session serves all requests; otherwise record the passing evidence and leave OIDC timing unchanged.

## 6. Browser Acceptance and Release Checks

- [x] 6.1 Add a Playwright scenario with controlled same-origin responses that verifies current → stale → reauthenticating, stopped notification polling, exactly one login initiation, fresh event subscription, complete reconciliation, and return to current.
- [x] 6.2 Add a Playwright scenario that fails one required snapshot read during reconnect and verify the accessible status remains stale or unavailable while the map and game projection are not partially confirmed.
- [x] 6.3 Run a headless local/dev acceptance with an approved development account by forcing session-cookie loss, and verify the browser shows one recovery outcome, creates no repeated 499 poll loop, and refreshes the map only after authoritative reads; keep credentials, storage state, screenshots, and traces out of version control.
- [x] 6.4 Run the Java, JavaScript, and Playwright suites plus a production build, update the documented synchronization-deviation evidence, and verify `openspec validate stabilize-live-session-recovery --type change --strict --no-interactive` succeeds.
