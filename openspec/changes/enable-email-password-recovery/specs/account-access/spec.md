# Spec Delta

## ADDED Requirements

### Requirement: ACC-006 Password-recovery entry and disclosure safety
The configured external identity provider SHALL offer a localized password-recovery action from the Dicekeeper password-login page whenever self-service recovery is operational. The recovery request SHALL accept the realm's supported username or email identifier and MUST present an outcome that does not reveal whether the identifier exists, has a password credential, or is eligible for recovery.

#### Scenario: Guest opens password recovery
- **WHEN** a guest selects the forgot-password action from the Dicekeeper login page
- **THEN** the identity provider shows the themed recovery form with localized instructions, an identifier field, and a return-to-login action

#### Scenario: Guest submits an eligible account identifier
- **WHEN** a guest submits the username or email address of an eligible password-authenticated account
- **THEN** the identity provider presents the generic recovery outcome and initiates delivery to that account's configured email address without exposing account details in the browser

#### Scenario: Guest submits an unknown or ineligible identifier
- **WHEN** a guest submits an identifier that is unknown, lacks a deliverable email address, or is not eligible for password recovery
- **THEN** the identity provider presents the same browser-visible outcome used for an eligible request and does not disclose which condition applied

### Requirement: ACC-007 Time-limited password-reset email
For an eligible password-recovery request, the identity provider SHALL send a localized Dicekeeper-branded HTML email and a functionally equivalent plain-text alternative containing one provider-generated password-reset link and the link's expiry. The link MUST be time-limited, MUST NOT be reusable after a completed reset, and neither the link nor the mail-server credentials may be exposed in Dicekeeper application responses, repository content, or routine logs.

#### Scenario: Recovery email is delivered
- **WHEN** an eligible account submits a recovery request and configured email delivery succeeds
- **THEN** the account receives a localized message with a reset action, an explicit expiry, a copyable fallback URL, and guidance for ignoring an unexpected request

#### Scenario: Email delivery fails
- **WHEN** the identity provider cannot deliver an eligible recovery email
- **THEN** no credential is changed, the browser response remains non-enumerating, and operators can diagnose the delivery failure without logging the reset link or mail credentials

#### Scenario: Reset link expires before use
- **WHEN** a user opens a reset link after its configured validity period
- **THEN** the identity provider refuses the reset, leaves the credential unchanged, and offers a safe path to request a new link or return to login

### Requirement: ACC-008 Password replacement through the recovery link
A valid unused recovery link SHALL allow its account owner to choose and confirm a new password that satisfies the realm password policy. A successful recovery MUST replace the previous password, consume the recovery link, preserve non-password credentials, and require a fresh sign-in before Dicekeeper grants authenticated access.

#### Scenario: User successfully replaces the password
- **WHEN** the user follows a valid unused link and submits matching policy-compliant password values
- **THEN** the identity provider replaces the password, consumes the link, preserves other credentials, and requires authentication with the new password

#### Scenario: Replacement password is invalid
- **WHEN** the user submits mismatched values or a password that violates the realm policy
- **THEN** the identity provider leaves the existing credential unchanged and displays localized validation feedback without consuming a still-valid link

#### Scenario: Used link is opened again
- **WHEN** any browser opens a recovery link after it completed a password replacement
- **THEN** the identity provider refuses another reset and leaves the new credential unchanged

#### Scenario: Old password is attempted after recovery
- **WHEN** the account attempts to sign in with the previous password after a successful reset
- **THEN** authentication is denied while the replacement password can establish a fresh Dicekeeper session
