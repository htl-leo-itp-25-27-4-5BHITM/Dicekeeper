# Password-Recovery Operations Guide

This runbook controls Dicekeeper's Keycloak-managed email password recovery. It deliberately
keeps recovery outside the application and records only pass/fail evidence.

## Hard safety gate

CVE-2026-18963 is a critical reset-credentials-flow bypass that affects the previously deployed
Keycloak 26.5.0 image. An affected or unverified Keycloak version must never expose Forgot
password. The approved image is pinned exactly to Keycloak 26.8.1 in `keycloak/Dockerfile`.
Floating tags and rollback to 26.5.0 are prohibited.

Forgot password stays disabled until all of these gates pass:

- the running server reports exactly Keycloak 26.8.1;
- both realm themes are `dicekeeper-email`;
- SMTP is configured from approved secret storage and its provider test reaches the controlled
  mailbox;
- the bound Reset Credentials flow requires Choose User, Send Reset Email, and Reset Password;
- Send Reset Email is configured with **Force login after reset** set to `true`;
- the Reset - Conditional OTP sub-flow is disabled, preserving OTP and other non-password
  credentials;
- Update Password is enabled;
- the user-generated action-token lifetime is positive and no more than 900 seconds;
- ordinary authentication and the localized theme smoke test pass.

## Repository and image checks

Run these from the repository root:

```bash
npm run verify:password-recovery-theme
npm run test:password-recovery-theme-validator
npm run smoke:keycloak-theme
npm run smoke:keycloak-theme -- --skip-build --expiry-test
```

The smoke test creates only a disposable local realm, keeps Forgot password disabled, confirms
the running 26.8.1 version, exercises the ordinary theme paths, and removes the container.
The opt-in expiry test temporarily enables recovery only in that disposable realm, checks a
short-lived action link, a nonempty replacement rejected by a temporary length policy, and OTP
preservation, then restores the realm settings before removing the container.

## Realm preparation while recovery is disabled

1. In **Realm settings → Login**, confirm **Forgot password** is off.
2. In **Realm settings → Themes**, select `dicekeeper-email` for both login and email.
3. In **Realm settings → Tokens**, retain or set a user-generated action-token lifetime between
   1 and 900 seconds. Do not silently extend other token lifetimes.
4. In **Authentication → Required actions**, enable **Update Password**.
5. In **Authentication → Flows → Reset Credentials**:
   - require **Choose User**;
   - require **Send Reset Email**;
   - require **Reset Password**;
   - configure **Send Reset Email → Force login after reset** as `true`;
   - disable **Reset - Conditional OTP** so recovery does not replace OTP.
6. Configure SMTP host, port, sender, transport security, and authentication only through the
   approved secret-handling path. Never paste secret values into commands, tickets, screenshots,
   logs, or this repository.
7. Run Keycloak's SMTP connection test and confirm delivery in the controlled mailbox. Retain only
   a pass/fail result and timestamp, not the recipient, credentials, message, headers, or body.

## Non-secret live verification

Obtain an administrator access token through the approved secret process and inject it into the
`KEYCLOAK_ADMIN_TOKEN` environment variable without placing it in shell history. Then run:

```bash
npm run verify:password-recovery-realm -- \
  --base-url https://auth.dicekeeper.net \
  --realm dicekeeper \
  --expect-forgot-password disabled
```

The verifier calls only Keycloak Admin API read endpoints. It reports boolean PASS/FAIL checks and
never prints the token, SMTP values, realm payloads, or authenticator configuration values. A
failure is a release blocker.

## Rollout order

1. Deploy the validated image while Forgot password remains off.
2. Confirm the pod reports 26.8.1 and run the ordinary English/German authentication checks.
3. Complete the SMTP test and the disabled-state realm verifier above.
4. Enable Forgot password only when every hard gate has passed.
5. Immediately rerun the verifier with `--expect-forgot-password enabled`.
6. Run the public acceptance sequence below. If any check fails, turn Forgot password off first.

## Public acceptance

Use one disposable password-authenticated identity and one controlled mailbox. Never save browser
storage, screenshots, traces, credentials, reset URLs, message contents, or recipient identifiers.

Record only pass/fail for these checks:

- English and German PKCE login pages show the reset entry and localized request form.
- Eligible and unknown identifiers produce indistinguishable browser-visible outcomes.
- Only the eligible controlled mailbox receives mail.
- HTML and plain-text alternatives contain the configured expiry and use the canonical public
  host.
- Mismatched and policy-invalid replacements preserve the still-valid link.
- A valid replacement preserves OTP, rejects the old password, and requires a fresh sign-in with
  the new password before Dicekeeper grants a session.
- A completed link cannot be reused.
- In a non-production expiry check, an expired link changes no credential and provides a safe
  restart path; restore the original lifetime and verify it afterward.
- Delete the disposable identity and mailbox data when testing is complete.

## Redacted evidence record

Keep only this structure in the change record:

```text
Image/version gate: PASS|FAIL
Ordinary authentication regression: PASS|FAIL
SMTP provider test: PASS|FAIL
Disabled-state realm verification: PASS|FAIL
Enabled-state realm verification: PASS|FAIL
Non-enumerating outcome: PASS|FAIL
Localized multipart mail: PASS|FAIL
Invalid/valid replacement behavior: PASS|FAIL
OTP preservation and fresh login: PASS|FAIL
Reuse and expiry rejection: PASS|FAIL
Disposable-data cleanup: PASS|FAIL
Rollback status (not invoked, or Forgot password off after failure): PASS|FAIL
```

## Rollback

At the first delivery, flow, security, or acceptance failure, disable Forgot password immediately
and confirm the reset entry disappears. Keep ordinary login available. Do not roll back to an image
affected by CVE-2026-18963; either keep the fixed 26.8.1 image or move to another explicitly
reviewed fixed patch. Repair the failed gate, rerun the disabled-state verifier, and repeat the full
acceptance sequence before re-enabling recovery.
