# Design

## Context

See [proposal.md](proposal.md) for the motivation. Dicekeeper's live transport is Server-Sent Events (SSE), not a WebSocket. The current browser wrapper creates one native `EventSource` and logs that the browser will reconnect on every error, even when `readyState` is terminal. The production reproduction showed that the heartbeat traverses Cloudflare and the ingress successfully and that the application pods remain stable, so proxy idle timeout and pod restart are not the primary failure in this case.

When the application session cookie is no longer valid, ordinary API fetches receive the deliberate JavaScript authentication-challenge status 499. A native `EventSource` cannot send the fetch interceptor's `X-Requested-With` header, follows the OIDC redirect instead, receives HTML rather than `text/event-stream`, and becomes terminal. Separately, the notification-count poll suppresses navigation and retries every 30 seconds, while other 499 responses can each initiate top-level login. This accounts for both the repeated console errors and the page transition that appears to be a random reload.

The three synchronized views currently fetch recovery resources with `Promise.allSettled` and apply each successful response immediately. They have no shared visible connection state, so one failed read can leave a mixed projection that still looks current.

## Goals / Non-Goals

**Goals:**

- Make session loss a single, explicit client state with exactly one pending recovery action per browser document.
- Own the complete SSE lifecycle, including terminal failure, authentication checks, replacement, disposal, and liveness state.
- Make reconciliation transactional from the view's perspective: validate a complete snapshot before applying it.
- Make the failure paths deterministic under unit and browser automation, including concurrent expiry signals.
- Retain enough cause-oriented diagnostics to distinguish explicit disposal, transient transport loss, session expiry, authorization loss, and reconciliation failure without logging credentials or protected payloads.

**Non-Goals:**

- Replacing SSE with WebSockets, adding an event replay store, or changing the existing REST/SSE endpoint shapes.
- Hiding the external identity-provider flow in an iframe or weakening OIDC protections to avoid top-level navigation.
- Treating a longer proxy timeout, a longer login session, or a periodic page reload as synchronization recovery.
- Solving the already-specified cross-instance event-distribution and event-gap work beyond what this recovery path needs.

## Decisions

### 1. Use one document-scoped authentication recovery coordinator

`auth.js` will own an explicit recovery state and an idempotent entry point for authentication failures. The fetch interceptor will continue adding `X-Requested-With` to same-origin API requests, but all recognized session-expiry results will be reported to this coordinator. The first report clears cached player identity, captures the sanitized current route, publishes an `auth-expired` state, and creates one recovery action. Later reports reuse that state instead of starting another navigation.

Background callers such as unread-count polling will identify themselves as non-interactive. On expiry they stop their interval and publish the common state, but do not unexpectedly navigate the page. The live status presents a clear reauthentication action; a foreground protected action may invoke that same action directly. Once invoked, a navigation guard permits one OIDC round trip. The callback must confirm `/api/auth/me` before returning to the sanitized continuation.

This keeps the existing top-level OIDC flow, which is compatible with provider cookie and frame restrictions, while removing surprise navigation initiated by a background poll. Alternatives considered were allowing every failed request to redirect (the current race) and attempting hidden-iframe renewal (fragile with modern cookie and frame policies).

### 2. Replace the thin `EventSource` wrapper with a supervised state machine

`campaignEvents.js` will own at most one source, one reconnect timer, one liveness timer, and one asynchronous recovery attempt per view. Its states map directly to the live-synchronization contract: `connecting`, `current`, `stale`, `reconnecting`, `reconciling`, `reauthenticating`, `revoked`, `unavailable`, and `disposed`.

On an error, the supervisor marks the view stale and inspects whether the source is terminal. It closes the failed source before performing a same-origin protected session probe through the authentication coordinator. A valid session permits a replacement `EventSource` after bounded backoff; an expired session suspends transport retries and enters `reauthenticating`. Authorization or resource loss discovered by the required campaign reads becomes `revoked` or `unavailable`, not a reconnect loop. A successful reauthentication starts a fresh source rather than attempting to revive the closed one.

Heartbeat events update liveness only. A watchdog derived from the server heartbeat cadence plus an implementation grace window moves the state to stale if liveness is missed; that internal interval is not a public latency guarantee. The returned cleanup handle is idempotent, invalidates in-flight generations, closes the source, and clears both timers so a route change cannot reconnect an abandoned view.

Retaining native SSE is simpler and preserves the deployed endpoint. Switching the stream to `fetch` would make status codes easier to inspect but would require a streaming parser, cancellation, reconnection semantics, and broader browser testing without solving snapshot correctness.

### 3. Reconcile through immutable staged snapshots

Each synchronized view will expose two responsibilities to the supervisor: load its required authorized snapshot and apply a validated snapshot. Loading uses fail-fast response checks and parses every required payload into local staged values without mutating the displayed model. Only after the entire set succeeds does the view apply the staged values and render once. A failure keeps the previous projection visibly stale and returns a typed cause to the supervisor.

Events received while reconciliation is in progress mark the attempt dirty instead of mutating over the staged snapshot. The supervisor performs another authoritative read before entering `current`, preventing an older in-flight snapshot from overwriting a newer event. A generation token discards responses belonging to a disposed view or superseded recovery attempt.

The required resource set remains view-specific: GM and player views include game state, markers, decisions, and campaign/map data; the table view includes game state, markers, and campaign/map data. Existing initial loaders may be factored to reuse these snapshot builders so initial connection and reconnect enforce the same rules.

### 4. Render one reusable, accessible live-status surface

A small shared component will subscribe to transport and authentication states and render concise text in GM, player, and table views. It uses a live region for transitions, retains a visible stale/recovery indication, and offers the reauthentication or retry action when applicable. Color and animation remain supplemental. Cached map and game values may remain visible for continuity, but the status must distinguish them from confirmed current data.

### 5. Verify OIDC refresh concurrency separately from client recovery

The reproduced failure proves behavior after session loss but does not prove why the real session became invalid. Automated verification will exercise the configured session/refresh boundary with simultaneous protected requests. If the test reproduces concurrent refresh invalidation, the implementation will enable Quarkus's short-lived refresh result cache through an environment-backed property and cover it with the same test. Token, cookie, and provider lifetimes will not be lengthened merely to conceal the client defect; the coordinated recovery remains required even when refresh succeeds normally.

### 6. Test the state machines deterministically and keep one browser acceptance path

The transport and authentication coordinators will accept injected source, fetch, clock, timer, and navigation adapters. Fast JavaScript tests can then cover terminal sources, retry de-duplication, timer disposal, concurrent 499 responses, dirty reconciliation, and partial snapshot rejection without waiting for real expiry.

A checked-in Playwright acceptance scenario will use controlled network responses to verify the user-visible sequence: current → stale → reauthenticating, no repeated unread-count requests, one login initiation, a fresh event source after authentication, reconciliation, and current. A second scenario will keep one snapshot request failed and assert that stale data is never labeled current. Secrets and authenticated storage state remain outside version control; traces are retained only as local failure artifacts.

## Risks / Trade-offs

- [The native event error does not expose its HTTP status] → Use a same-origin protected probe and authoritative snapshot reads to classify authentication, revocation, and availability without parsing redirected HTML.
- [Backoff or watchdog timers can outlive a routed view] → Centralize every source and timer in one idempotent disposal handle and guard asynchronous completion with a generation token.
- [A busy campaign can dirty repeated snapshot attempts] → Coalesce events into a single dirty flag and retry reconciliation rather than queueing unbounded event payloads.
- [Deferring background-triggered login requires player action] → Keep the reauthentication status persistent, accessible, and actionable; foreground actions use the same single recovery flow.
- [Refreshing OIDC tokens concurrently may fail independently of browser logic] → Test the boundary under controlled short lifetimes and enable refresh-result caching only when the test demonstrates the need.
- [Browser tests that use real accounts can leak credentials or become flaky] → Use controlled routing/fixtures for regression coverage and reserve approved development accounts for a separate manual production smoke test.

## Migration Plan

1. Add deterministic coordinator and reconciliation tests before switching the live views.
2. Introduce the auth coordinator and notification-poll stop behavior while retaining the existing login callback contract.
3. Add the SSE supervisor and shared status surface, then migrate GM, player, and table views one at a time to staged snapshots.
4. Run browser acceptance against local/dev, including forced cookie/session loss and a failed snapshot, then run a read-only production smoke test with an approved development account.
5. Deploy without endpoint or data migration. If rollback is needed, revert the static client and optional OIDC configuration together; no persisted data transformation is involved.

## Open Questions

None.
