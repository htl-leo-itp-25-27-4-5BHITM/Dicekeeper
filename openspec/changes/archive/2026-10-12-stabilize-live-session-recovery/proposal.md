# Proposal

## Why

An authenticated live-game view can silently lose its session: background API requests then repeat HTTP 499 responses, the native event stream follows an authentication redirect and closes permanently, and the next protected request starts a full-page sign-in round trip that looks like a random reload. The view can continue presenting stale map data as though it were current, so session recovery and synchronization recovery need one coordinated, observable outcome.

## What Changes

- Coordinate client-side session-expiry handling so concurrent protected requests and background notification polling produce one recovery flow instead of repeated 499 requests or competing redirects.
- Supervise campaign event streams explicitly: distinguish an authentication challenge from a transient transport interruption, recreate a terminal stream when authentication is valid, and never assume the browser will reconnect a closed `EventSource`.
- Expose accessible live-connection states, including reauthentication and failed reconciliation, in every synchronized campaign view.
- Require a complete authoritative snapshot after reconnect or browser resumption before a view may return to `current`; partial snapshots remain stale and are not applied as a successful recovery.
- Add deterministic automated coverage for session expiry, concurrent 499 responses, terminal event-stream failure, reconnect, and failed reconciliation without depending on a long-running manual game.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `account-access`: Define coordinated, user-visible recovery when a protected fetch, background poll, or event subscription discovers an expired authenticated session.
- `live-synchronization`: Define authentication-aware event-stream supervision, explicit reauthentication status, terminal-stream recreation, and atomic authoritative reconciliation before a recovered view is current.

## Impact

- Browser authentication and polling: `auth.js` and `header.js`.
- Live transport and views: `campaignEvents.js`, `GMView.js`, `PlayerView.js`, `TableView.js`, and their shared status presentation.
- OIDC/session configuration in `application.properties` may be adjusted only where boundary tests demonstrate a refresh-concurrency problem; increasing timeouts alone is not a fix.
- Automated test support will cover the browser-visible failure and recovery paths. Existing REST and SSE endpoints remain compatible; no public API removal or breaking change is proposed.
