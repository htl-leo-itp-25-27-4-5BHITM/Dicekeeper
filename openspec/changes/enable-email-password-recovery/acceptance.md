# Password-Recovery Acceptance Record

Date: 2026-10-20 (Europe/Vienna). This record contains outcomes only; it contains no recipient,
credential, token, action URL, mailbox content, or browser storage.

## Live and controlled-environment acceptance

| Gate | Result |
| --- | --- |
| Official 26.8.x patch check (26.8.1) | PASS |
| Fixed-image version and deployed digest verification | PASS |
| Ordinary English/German authentication regression | PASS |
| SMTP provider test while recovery was disabled | PASS |
| Disabled-state realm settings and reset-flow read-back | PASS |
| Enabled-state realm settings and public reset entry | PASS |
| Eligible/unknown identifier non-enumeration | PASS |
| Localized HTML/plain-text mail, real umlauts, expiry, canonical host | PASS |
| Public mismatch and required-value rejection with usable link | PASS |
| Isolated nonempty policy-invalid rejection with usable link | PASS |
| Valid replacement, old-password rejection, fresh Dicekeeper session | PASS |
| Non-password OTP preservation in isolated 26.8.1 realm | PASS |
| Completed-link reuse rejection | PASS |
| Isolated expired-link rejection, unchanged credential, safe restart | PASS |
| Isolated token lifetime and realm settings restored | PASS |
| Disposable app player, Keycloak user, and mailbox data cleanup | PASS |
| Temporary admin client, Job, and credential Secrets removed | PASS |
| Public Keycloak endpoint and single replica healthy after cleanup | PASS |
| Release-commit action-link/credential and browser-artifact audit | PASS |

## Automated final validation

| Check | Result |
| --- | --- |
| Recovery-theme validator | PASS |
| Theme-validator negative fixtures | PASS (6/6) |
| Realm-verifier fixtures | PASS (5/5) |
| JavaScript suite | PASS (46/46) |
| Browser smoke suite | PASS (1/1) |
| Focused Java authentication/account-deletion tests | PASS |
| Isolated Keycloak 26.8.1 theme, expiry, policy, and OTP smoke | PASS |
| Strict OpenSpec change validation | PASS |

Strict validation also reported the pre-existing structural warning in the main
`account-access` spec. It did not invalidate this change; correcting that unrelated main-spec
layout is outside this rollout.

The production realm has no custom password policy. Its public form rejected an empty required
replacement; a disposable non-production realm separately rejected a nonempty value under a
temporary length policy. The disposable production identity had no OTP credential, so OTP
preservation was verified with an imported OTP credential in the isolated realm.

Rollback was not invoked. Forgot password remains enabled only on the verified fixed 26.8.1
image after all hard gates passed. The safe rollback remains disabling Forgot password first;
the former affected image is not an acceptable rollback target.

Five account-scoped reset messages were UID-expunged from the controlled mailbox; a follow-up
scan found zero. The one disposable app player had no dependent rows or profile image and was
removed in a guarded transaction. The matching Keycloak identity was removed. No production
mail, database, or Keycloak credentials were written to the repository.
The release commit contains one explicitly synthetic action-link test fixture, but no live
action link or browser artifact. The temporary browser and mailbox helpers were removed.
An earlier disposable local smoke-test diagnostic emitted one synthetic action link to tool
output. It was not a production link, was not committed or placed in this evidence record,
and the error handling was sanitized before the final passing run.
