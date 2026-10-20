# Proposal

## Why

Dicekeeper users who forget their Keycloak password currently have no self-service recovery path because the production realm does not expose the theme's existing reset link. This can permanently lock a player out even though Keycloak already provides a secure, email-token-based reset flow.

## What Changes

- Upgrade the deployed Keycloak server from vulnerable 26.5.0 to an exact `26.8.1` image pin before enabling password recovery; track later 26.8.x patches deliberately rather than using a floating tag.
- Enable Keycloak's built-in forgot-password and update-password flow for the Dicekeeper realm so the login page offers password recovery.
- Complete the Dicekeeper login theme's recovery experience, including clear localized reset instructions, validation feedback, return-to-login navigation, and the new-password form.
- Add branded HTML and plain-text password-reset emails in English and German, with a single-use Keycloak action link, its expiry, a copyable fallback URL, and guidance for unexpected requests.
- Configure and verify realm email delivery through secret-backed SMTP settings without committing credentials or exposing whether an account exists.
- Add automated theme/configuration checks and an operational acceptance procedure covering link visibility, email delivery, token expiry, successful replacement, and rejection of the old password.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `account-access`: Add self-service recovery of a Keycloak-managed password through a time-limited email link while preserving Dicekeeper's external identity boundary and account-enumeration protections.

## Impact

- Keycloak login and email theme files under `keycloak/themes/dicekeeper-email`, including localized message bundles and recovery templates.
- Dicekeeper realm settings for forgot-password, the reset-credentials flow, the Update Password required action, action-token lifetime, and SMTP delivery.
- Secret handling and operational documentation for SMTP configuration; no SMTP credentials or reset tokens are stored in the repository or application logs.
- Keycloak image verification and focused automated/static checks, plus a disposable-account acceptance test against the configured environment.
- CVE-2026-18963 is a critical unauthenticated reset-credentials-flow bypass affecting the current Keycloak 26.5.0 deployment. Forgot password must remain disabled on 26.5.0 and any other affected release; recovery rollout requires the exactly pinned, fixed Keycloak 26.8.1 image.
- No new Dicekeeper password store or application API is introduced, and existing OIDC sign-in, registration, callback, and logout contracts remain compatible.
