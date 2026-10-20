# Tasks

## 1. Recovery Theme

- [x] 1.1 Refine the login, reset-request, and update-password templates with accessible Dicekeeper recovery copy and stable selectors while retaining the `realm.resetPasswordAllowed` guard; verify English and German forms expose the identifier, validation, submit, and return-to-login states without revealing account eligibility.
- [x] 1.2 Revalidate the branded HTML `password-reset.ftl` against the Keycloak 26.8.1 email layout and supported template inputs; verify a rendered fixture contains one reset action, formatted expiry, copyable fallback URL, unexpected-request guidance, and no unsupported context variables.
- [x] 1.3 Add the functionally equivalent plain-text `password-reset.ftl`; verify a rendered fixture contains the same action URL, expiry, and safety guidance without HTML markup.
- [x] 1.4 Add complete default, English, and German password-reset subjects and message keys and update the theme inventory documentation; verify every reset template key exists in all three bundles and existing verification/execute-actions keys remain intact.

## 2. Automated Theme and Image Verification

- [x] 2.1 Update the credential-free password-recovery theme validator for the exact Keycloak 26.8.1 pin, covering the guarded login link, reset/update forms, HTML and text mail templates, locale key parity, supported 26.8.1 inputs, and the Docker image copy path; verify the validator passes the repository theme and fails controlled wrong-version, missing-key, and missing-template fixtures.
- [x] 2.2 Expose the validator through the project scripts and run it in the Keycloak build/deploy path before publishing an image; verify a clean package install runs the command successfully and a failing validation prevents the image step.
- [x] 2.3 Replace vulnerable Keycloak 26.5.0 with an exact `26.8.1` Dockerfile pin, rebuild the image, and start an isolated smoke instance or equivalent template check; verify the running version is exactly 26.8.1, Keycloak loads `dicekeeper-email` without FreeMarker or missing-message errors, and ordinary login, registration, verification-email, info, and error templates still render. Forgot password MUST remain disabled on 26.5.0 or any other version affected by CVE-2026-18963.

## 3. Realm and SMTP Operations

- [x] 3.1 Add a secret-safe password-recovery operations guide that identifies the exact Keycloak 26.8.1 prerequisite, CVE-2026-18963 prohibition for affected versions, required realm, theme, SMTP, action-token, Reset Credentials, Update Password, force-login, OTP-preservation, verification, and safe rollback settings; verify the documented commands and screenshots/output guidance contain no literal credentials, email addresses, action links, or tokens.
- [x] 3.2 Add a non-secret realm verification procedure or script that reports only whether the running Keycloak version is exactly 26.8.1 and whether Forgot password, login/email themes, bounded user-action-token lifetime, Update Password, password-only reset flow, force-login behavior, OTP preservation, and SMTP presence meet the plan; verify it returns nonzero for a deliberately incomplete or wrong-version test realm without printing SMTP values.
- [x] 3.3 Configure the target realm's SMTP connection from approved secret storage while Forgot password remains disabled; verify Keycloak's SMTP test reaches a controlled mailbox and neither deployment output nor retained evidence contains the password or message contents.
- [x] 3.4 Configure the target Reset Credentials flow to preserve non-password credentials and force fresh login, keep Update Password enabled, and confirm the bounded token lifetime; verify a read-back inspection matches the planned settings before the public recovery link is enabled.

## 4. Rollout and Public Acceptance

- [x] 4.1 Deploy the validated Keycloak theme image and verify the public English and German login, registration, verification-email, and ordinary authentication paths still work before changing the Forgot password toggle.
- [x] 4.2 Enable Forgot password only after the running 26.8.1 image, SMTP, reset-flow, force-login, OTP-preservation, and token-lifetime checks pass; verify a fresh PKCE login request through `https://auth.dicekeeper.net` renders the themed reset link and opens the localized reset-request form.
- [x] 4.3 Submit one eligible disposable account and one unknown identifier and verify both browser-visible outcomes are indistinguishable while only the eligible controlled mailbox receives a reset message.
- [x] 4.4 Verify English and German HTML/plain-text reset messages show the configured expiry and a canonical `https://auth.dicekeeper.net` action URL, then confirm no raw link, recipient address, or message body was retained in logs or evidence.
- [x] 4.5 Exercise mismatched and policy-invalid replacement values before completing a valid reset; verify validation preserves the usable link, successful replacement preserves non-password credentials, the old password is rejected, and the new password establishes a fresh Dicekeeper session.
- [x] 4.6 Verify the completed link cannot be reused and, in a controlled non-production run with a temporarily short user-action lifetime, an expired link changes no credential and offers a safe restart; restore and confirm the original lifetime afterward.
- [x] 4.7 Remove all disposable identities and mailbox data, record only redacted pass/fail acceptance evidence and rollback status, and verify no credentials, storage state, screenshots, traces, email contents, or action links were committed.

## 5. Final Validation

- [x] 5.1 Run the theme validator, existing JavaScript/Java/browser tests relevant to authentication, the Keycloak image smoke check, and `openspec validate enable-email-password-recovery --type change --strict --no-interactive`; verify every command passes and document any environment-only acceptance step separately from automated results.
