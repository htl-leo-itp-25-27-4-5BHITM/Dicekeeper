# Design

## Context

See [proposal.md](proposal.md) for the motivation and [specs/account-access/spec.md](specs/account-access/spec.md) for the behavior contract. Dicekeeper currently delegates passwords to Keycloak 26.5.0 and must not become a credential store or mail sender. Keycloak 26.5.0 is affected by CVE-2026-18963, a critical reset-credentials-flow state-validation flaw that can let an unauthenticated attacker bypass the required email-link step and set new credentials. Password recovery therefore remains disabled until the deployment is upgraded to the exactly pinned, fixed Keycloak 26.8.1 release and every rollout gate in this design passes.

The custom login theme already contains a `realm.resetPasswordAllowed`-guarded link plus `login-reset-password.ftl` and `login-update-password.ftl`. The deployed login page omits the guarded link, which identifies disabled realm recovery as the immediate blocker rather than a missing application route. The email theme overrides verification and execute-actions messages but currently inherits Keycloak's generic password-reset email. Theme files are baked into the custom Keycloak image; realm and SMTP settings are persistent provider state outside that image.

## Goals / Non-Goals

**Goals:**

- Use Keycloak's supported reset-credentials flow and action tokens end to end.
- Make every recovery screen and message consistent with the existing Dicekeeper theme in English and German.
- Preserve non-enumerating outcomes, bounded token validity, non-password credentials, and a fresh sign-in after replacement.
- Make the required provider configuration and acceptance evidence reproducible without storing secrets or reset links.

**Non-Goals:**

- Adding a Dicekeeper password table, password-reset REST endpoint, or application-side email service.
- Recovering a third-party identity-provider password or resetting OTP/WebAuthn credentials through this email flow.
- Choosing or operating an SMTP vendor, changing the realm password policy, or building a general Keycloak realm-management system.
- Changing existing OIDC callback, registration, session-recovery, or logout behavior.

## Security Prerequisite

The Keycloak image must be pinned to the exact official `26.8.1` patch release; a floating `26.8`, `26.8.x`, `latest`, or other mutable tag is not acceptable. Upgrading the current vulnerable 26.5.0 deployment and verifying the running version are prerequisites for any realm configuration that exposes password recovery. CVE-2026-18963 affects the reset-credentials flow itself, so theme validation, SMTP readiness, or compensating edge controls do not make an affected Keycloak version safe for Forgot password. If the deployed version is affected or cannot be proven to be the approved fixed patch, Forgot password must stay disabled.

## Decisions

### 1. Keep recovery entirely inside Keycloak

The login link will continue using Keycloak's `url.loginResetCredentialsUrl`; the form posts to the provider's current authentication session, and Keycloak generates, validates, expires, and consumes the action token. Dicekeeper receives a user only after the normal OIDC flow and `/api/auth/me` identity synchronization succeed.

This preserves the existing trust boundary and Keycloak's account-enumeration protections. A custom Quarkus endpoint was rejected because it would duplicate token issuance, password policy, email delivery, audit behavior, and credential mutation in the application.

### 2. Extend the existing theme rather than replacing the flow templates

The existing `login.ftl`, `login-reset-password.ftl`, and `login-update-password.ftl` remain the recovery UI foundation. Implementation will refine localized copy and accessibility only where needed and will keep the forgot-password link conditional so a realm with broken mail delivery does not advertise a dead path.

The email theme will add dedicated HTML and plain-text `password-reset.ftl` templates that consume only Keycloak's supported `link`, `linkExpiration`, `realmName`, and `linkExpirationFormatter` values. The HTML version will reuse the existing table-based email layout, while both forms receive equivalent English and German message keys for subject, action, expiry, fallback URL, and unexpected-request guidance. The raw action link is rendered only in the email body as the fallback URL and is never logged.

Overriding only the recovery templates and messages keeps the customization small and makes the Keycloak 26.8.1 template contract easy to compare during upgrades. Reimplementing the complete base email theme was rejected because it would increase version drift.

### 3. Configure the realm for password-only recovery and fresh authentication

After the fixed 26.8.1 image and all operational gates have been verified, the Dicekeeper realm will enable **Forgot password** and keep **Update Password** enabled. The bound Reset Credentials flow will retain Keycloak's anti-enumerating send-reset-email behavior, disable the conditional OTP-reset branch for this password-only capability, and configure the send-reset-email execution to force login after a successful reset. Existing OTP, WebAuthn, recovery codes, and federated credentials therefore remain unchanged.

The user-generated action-token lifespan remains a bounded realm policy and the email displays Keycloak's effective formatted expiry. This change will verify and document the configured value rather than silently lengthening unrelated action-token lifetimes.

SMTP host, port, sender, transport security, and authentication are configured in the realm from environment-specific secret storage. Checked-in automation and documentation may name required variables and validate non-secret settings, but must never contain, echo, export as evidence, or record SMTP passwords, reset URLs, user email addresses, or access tokens. Realm configuration is considered complete only after Keycloak's SMTP test and a disposable-account recovery both succeed.

### 4. Preserve indistinguishable browser outcomes and diagnose delivery server-side

Theme changes will not branch on account existence, email presence, or credential type. Eligible and ineligible submissions retain the same browser-visible acknowledgement. SMTP failures and provider events remain operator diagnostics and must be recorded only with non-sensitive correlation/timing information; user identifiers, complete provider bodies, credentials, and action links stay out of logs and test artifacts.

Rate limiting and abuse protection remain at the Keycloak/edge boundary. The implementation will verify the existing controls and document any required operational setting instead of adding application-side checks that could reintroduce observable differences.

### 5. Verify structure automatically and behavior with a disposable-account acceptance path

A focused repository validator will assert that the conditional reset link, required login templates, HTML/text reset emails, localized message keys, and Keycloak image copy path are present and contain no literal secret material. It will run without credentials and can be added to the normal validation command or deployment checks.

Provider behavior cannot be proven by static template inspection alone. The operational acceptance procedure will use a disposable password-authenticated account and controlled mailbox to verify the public PKCE login page, generic outcomes for eligible and unknown identifiers, English and German mail rendering, canonical `https://auth.dicekeeper.net` action links, valid reset, invalid password feedback, old-password rejection, new-password sign-in, link reuse rejection, and expiry. Mail contents, credentials, browser storage, screenshots, and traces remain outside version control.

## Risks / Trade-offs

- [SMTP is missing, rejected, or poorly delivered] → Test provider connectivity and a real disposable mailbox before enabling the public link; disable Forgot password again if delivery is not reliable.
- [A custom template breaks after a Keycloak upgrade] → Override only the required files, pin exactly Keycloak 26.8.1, build the image in CI, and compare every overridden template against that release before rollout.
- [CVE-2026-18963 permits account takeover through an affected reset-credentials flow] → Treat the 26.5.0-to-26.8.1 upgrade and running-version verification as hard prerequisites, and prohibit Forgot password on affected or unverified versions.
- [Recovery requests are abused for email flooding] → Preserve indistinguishable responses, use Keycloak/edge protections, monitor aggregate send failures and volume, and avoid account-specific public diagnostics.
- [Proxy configuration generates an internal or LeoCloud action URL] → Assert that delivered links use `https://auth.dicekeeper.net` and exercise the public route before release.
- [Realm configuration drifts from the repository plan] → Provide a secret-safe configuration checklist and non-secret verification, and require the live acceptance path after realm or Keycloak changes.
- [Forcing a fresh login adds one step after reset] → Accept the extra interaction so the replacement password is immediately exercised and no pre-reset authentication state is treated as sufficient.

## Migration Plan

1. Pin and build Keycloak 26.8.1, revalidate every overridden template against its upstream 26.8.1 contract, and upgrade the vulnerable 26.5.0 deployment while Forgot password remains disabled; verify the running version exactly.
2. Configure and test SMTP while Forgot password remains disabled; confirm the active login and email themes and a bounded user-action-token lifetime.
3. Add the localized recovery theme files and validator, rebuild the pinned Keycloak image, and smoke-test ordinary login, registration, verification email, and error pages before rollout.
4. Deploy the image, enable Update Password and the password-only Reset Credentials flow, then enable Forgot password last only after the fixed-version, SMTP, force-login, OTP-preservation, and token-lifetime checks pass.
5. Run the disposable-account acceptance procedure through the public host and record only pass/fail evidence without messages, identifiers, credentials, or links.
6. If recovery or delivery fails, disable Forgot password immediately while leaving ordinary login available, repair the provider configuration, and retest. Theme rollback must never restore an image affected by CVE-2026-18963; already issued action links remain governed by Keycloak's token state and expire naturally.

No application database migration is required.

## Open Questions

None.
