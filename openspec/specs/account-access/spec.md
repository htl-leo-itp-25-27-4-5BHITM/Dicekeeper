# account-access Specification

## Purpose

Defines how Dicekeeper delegates sign-in and registration, synchronizes an authenticated identity to a local player, protects authenticated access, and handles expiry, failure, and logout.

## Requirements

### Requirement: ACC-001 External identity and registration boundary
Dicekeeper SHALL delegate authentication and account registration to its configured external identity provider. Dicekeeper MUST NOT accept or store a local password, and it SHALL use only a validated in-application return path after the provider flow completes.

#### Scenario: Guest starts sign-in
- **WHEN** a guest chooses to sign in from Dicekeeper
- **THEN** the system redirects the guest to the configured external identity provider and does not collect Dicekeeper credentials

#### Scenario: Registration is offered by the identity provider
- **WHEN** a guest chooses registration during the external identity flow and registration is enabled by that provider
- **THEN** the provider owns account creation and Dicekeeper creates no local player record until authentication succeeds

#### Scenario: Return path is unsafe
- **WHEN** a sign-in request supplies an absolute, protocol-relative, or otherwise non-local return path
- **THEN** the system uses its safe default authenticated destination instead of redirecting to that path

### Requirement: ACC-002 Local player synchronization
After successful external authentication, Dicekeeper SHALL resolve one local player for the authenticated external identity. On first sign-in it SHALL create the local player from available identity claims and stable fallbacks; on later sign-ins it SHALL update provider-authoritative identity data and generated placeholders without replacing user-managed profile fields with new provider values.

#### Scenario: First successful sign-in
- **WHEN** an authenticated external identity has no corresponding local player
- **THEN** the system creates one local player, seeds its email, username, and display name from available claims or stable fallbacks, and returns that player as the current identity

#### Scenario: Existing identity signs in again
- **WHEN** an authenticated external identity already corresponds to a local player
- **THEN** the system reuses that player, refreshes provider-authoritative identity data, and preserves non-placeholder username and display-name values managed in Dicekeeper

#### Scenario: Real email replaces a fallback
- **WHEN** an existing identity previously used a generated email fallback and the provider later supplies a valid email
- **THEN** the system associates the real email with the same local player unless that email already belongs to a different player

#### Scenario: Stable identity cannot be resolved
- **WHEN** neither the provider claims nor the authenticated principal supply a stable identity key
- **THEN** the system does not create a local player and reports that profile synchronization failed

### Requirement: ACC-003 Authenticated session enforcement and recovery
The server-authenticated session SHALL be authoritative for protected Dicekeeper data and actions; a browser-cached player value alone MUST NOT grant access. When authentication is missing or expires, the client SHALL discard its cached player, preserve only a safe in-application continuation path, and require a fresh external sign-in.

#### Scenario: Cached player without an authenticated session
- **WHEN** the browser has cached player data but a protected API request has no valid authenticated session
- **THEN** the system denies the protected request, clears the cached player, and starts or offers a fresh sign-in

#### Scenario: Session expires during use
- **WHEN** an authenticated session expires while the player is using a protected view
- **THEN** the system prevents further protected operations, identifies the expiry to the player, and permits reauthentication before returning to a safe continuation path

#### Scenario: Guest requests protected data
- **WHEN** a guest requests profile or other protected application data
- **THEN** the system returns no protected data and requires authentication

### Requirement: ACC-004 Authentication and synchronization failures
Dicekeeper SHALL present external authentication and local synchronization failures as unsuccessful sign-in outcomes. It MUST NOT establish client-side authenticated state or disclose protected application data after such a failure, and it SHALL permit the guest to retry.

#### Scenario: Identity provider rejects or cancels authentication
- **WHEN** the external provider returns an authentication error or cancellation
- **THEN** Dicekeeper shows a failure outcome, keeps the guest unauthenticated, and offers another sign-in attempt

#### Scenario: Local synchronization fails after provider authentication
- **WHEN** the provider authenticates the user but Dicekeeper cannot resolve or synchronize the local player
- **THEN** Dicekeeper does not enter a protected view, reports the synchronization failure, and permits a retry

### Requirement: ACC-005 Logout
An authenticated player SHALL be able to log out. Logout SHALL clear the browser-cached player, terminate the Dicekeeper authentication session through the external provider flow, and return the user to an unauthenticated view without deleting either account.

#### Scenario: Successful logout
- **WHEN** an authenticated player chooses logout
- **THEN** the system clears cached player state, ends the authenticated session, and shows an unauthenticated logged-out state

#### Scenario: Protected action after logout
- **WHEN** the logged-out browser attempts a protected action
- **THEN** the system denies the action and requires a new sign-in
