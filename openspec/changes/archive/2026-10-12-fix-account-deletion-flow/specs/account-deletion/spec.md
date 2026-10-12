# Spec Delta

## Purpose

Defines secure, complete, and user-safe deletion of a Dicekeeper account and its associated Keycloak identity across normal, retry, and dependency-failure paths.

## ADDED Requirements

### Requirement: Authenticated self-service deletion
The system SHALL allow an authenticated user to delete only the Dicekeeper account represented by their current identity. A successful deletion MUST make both the application account and the corresponding Keycloak identity unavailable and MUST terminate the browser's local authenticated state.

#### Scenario: User deletes own account
- **WHEN** an authenticated user confirms deletion of their own account
- **THEN** the system deletes the account across Dicekeeper and Keycloak, clears browser cookies and storage for the site, and returns a successful result

#### Scenario: User targets another player
- **WHEN** an authenticated user submits an account-deletion request for a different player identifier
- **THEN** the system rejects the request without changing either player's Dicekeeper data or Keycloak identity

### Requirement: Complete local account cleanup
Successful deletion SHALL remove the user's profile, notifications, campaign memberships, owned campaigns and their dependent content, and uploaded profile or campaign files. The system MUST remove characters left without any membership reference by the affected cleanup and MUST retain characters that remain referenced outside the deleted data.

#### Scenario: Empty account is deleted
- **WHEN** a user with no campaigns, memberships, characters, notifications, or uploaded files deletes their account
- **THEN** the profile is removed without requiring any related records to exist

#### Scenario: Account owns and joins campaigns
- **WHEN** a user who owns campaigns and also belongs to other campaigns deletes their account
- **THEN** owned campaigns and their dependent records are removed, memberships in other campaigns are removed, and unrelated campaigns remain available

#### Scenario: Character becomes unreferenced
- **WHEN** account cleanup removes the last campaign membership that references a character
- **THEN** the character and its dependent ability and skill records are removed

#### Scenario: Character remains referenced
- **WHEN** a character affected by cleanup still has a surviving campaign membership reference
- **THEN** the character and its dependent records are retained

### Requirement: Least-privilege identity administration
Account deletion SHALL use the explicitly configured confidential Keycloak client exposed as `KEYCLOAK_CLIENT_ID` and `KEYCLOAK_CLIENT_SECRET`. Its service account SHALL be limited to the permission required to remove users. The system MUST NOT invent alternate credential names or expose credentials in source, responses, or logs.

#### Scenario: Configured client service account is enabled
- **WHEN** the application requests deletion of a Keycloak identity
- **THEN** it authenticates with the configured client's service account and uses only the administrative permission required for user deletion

#### Scenario: Administrative credentials are missing
- **WHEN** account deletion is enabled but `KEYCLOAK_CLIENT_ID` or `KEYCLOAK_CLIENT_SECRET` is unavailable
- **THEN** the system refuses to start or marks itself unready for account deletion

#### Scenario: Keycloak rejects the service client
- **WHEN** Keycloak denies the configured client's credentials or service-account permission
- **THEN** the system records a diagnostic failure without exposing the credential, token, or upstream response body to the user

### Requirement: Failure-safe and repeatable deletion
The account-deletion operation SHALL be safe to retry and SHALL maintain an unambiguous recoverable state when Dicekeeper and Keycloak cannot both complete in one request. A partial attempt MUST NOT allow previously deleted local data to be recreated by an existing session, and an already absent local account or Keycloak identity MUST be treated as an idempotent deletion condition.

#### Scenario: Keycloak is unavailable before irreversible cleanup
- **WHEN** Keycloak cannot be reached or authenticated before local cleanup begins
- **THEN** the request fails with the existing account still usable and a later retry can attempt the complete deletion again

#### Scenario: Keycloak fails after local cleanup
- **WHEN** local data has been deleted but Keycloak deletion cannot complete
- **THEN** the system preserves a non-personal pending-deletion marker, prevents the identity from recreating local account data, and permits the deletion to be retried to completion

#### Scenario: Retry encounters already deleted data
- **WHEN** a retry finds that the local account, the Keycloak identity, or both are already absent
- **THEN** the operation treats each absent component as complete and finishes any remaining cleanup without returning a not-found failure

### Requirement: Bounded identity-provider interaction
Every outbound token or user-deletion request made for account deletion MUST have finite connection and response deadlines. Dependency failures SHALL be logged with enough server-side context to distinguish configuration, authorization, timeout, transport, and upstream-status failures without recording secrets, access tokens, raw personal data, or complete upstream bodies.

#### Scenario: Keycloak does not respond
- **WHEN** a Keycloak token or deletion request exceeds its configured deadline
- **THEN** the application stops waiting, records a timeout-class diagnostic, and returns or preserves a retryable deletion state

#### Scenario: Administrative failure is inspected
- **WHEN** an operator investigates a failed deletion
- **THEN** application logs identify the failed stage and failure class without containing the client secret, access token, or the user's profile data

### Requirement: Stable and safe user feedback
Application-generated deletion failures SHALL use a bounded structured response with a stable machine-readable error code. The profile interface MUST present concise localized guidance based on status and content type, MUST restore the delete control when retry is possible, and MUST NOT display raw HTML, proxy error pages, stack traces, credentials, access tokens, or internal exception text.

#### Scenario: Application returns a structured deletion error
- **WHEN** account deletion fails inside the application
- **THEN** the API returns a non-success status with a stable error code and a user-safe message, while detailed diagnostics remain server-side

#### Scenario: Proxy returns an HTML error page
- **WHEN** an intermediary returns an HTML or otherwise unrecognized error body for the deletion request
- **THEN** the profile interface ignores the body and displays a short generic service-unavailable message with the option to retry

#### Scenario: Deletion succeeds
- **WHEN** the deletion endpoint reports completion
- **THEN** the client clears cached player state and site authentication data and navigates to the public entry page without rendering an error
