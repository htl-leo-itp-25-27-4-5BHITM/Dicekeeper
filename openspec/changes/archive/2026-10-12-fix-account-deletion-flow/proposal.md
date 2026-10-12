# Proposal

## Why

Production account deletion currently fails before any data is removed because the application reuses the interactive `dicekeeper-web` client for a Keycloak service-account token that the client is not allowed to obtain. The resulting application 502 is replaced by Cloudflare with an HTML error page, which the profile view exposes verbatim instead of giving the user a safe, actionable result.

## What Changes

- Provide a reliable self-service deletion flow that removes the authenticated user's Dicekeeper data and Keycloak identity without allowing one failed subsystem to produce an unrecoverable or ambiguous partial deletion.
- Use explicit, least-privilege Keycloak administrative credentials for account deletion instead of silently falling back to the normal browser-login client, with bounded outbound calls and useful server-side diagnostics.
- Make local cleanup complete and repeatable for profiles, memberships, owned campaigns, notifications, uploaded files, and characters that are no longer referenced.
- Define a stable account-deletion API response contract and ensure the profile UI never displays arbitrary HTML or raw infrastructure responses.
- Add automated backend, frontend, and browser coverage plus deployment and operational verification for successful deletion and dependency-failure cases.

## Capabilities

### New Capabilities

- `account-deletion`: Defines authenticated self-service deletion across Dicekeeper and Keycloak, including complete local cleanup, least-privilege identity administration, failure and retry behavior, user-safe responses, and verification.

### Modified Capabilities

None. This checkout has no existing durable account-lifecycle capability to modify.

## Impact

- Account and identity code in `player`, `security`, and the profile frontend.
- The `DELETE /api/player/{id}` response and failure behavior.
- Production and development Keycloak client/realm configuration and Kubernetes secret/deployment wiring.
- Database cleanup behavior for campaign memberships, owned campaigns, notifications, characters, and uploaded files.
- Java, JavaScript, and Playwright test coverage plus account-deletion operational documentation.
