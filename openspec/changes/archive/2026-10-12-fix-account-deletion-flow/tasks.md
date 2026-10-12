# Tasks

## 1. Deletion State Foundation

- [x] 1.1 Add the account-deletion marker entity, state enum, subject-digest utility, timestamps, bounded failure category, original player identifier, and cleanup manifest; verify a Quarkus test persists every state and confirms no email, display name, raw subject, credential, token, or upstream body column exists.
- [x] 1.2 Add transactional marker lookup and transition operations with a unique subject digest and concurrency protection; verify tests reject invalid transitions and make two simultaneous starts converge on one marker.
- [x] 1.3 Add configurable completed-marker retention and expiry behavior no shorter than the accepted OIDC session window; verify tests retain active markers, expire only eligible completed markers, and document the configuration default.
- [x] 1.4 Guard player lookup/creation with deletion state so pending or completed identities cannot recreate a `Player`; verify `SecurityIdentityService` tests cover normal creation, pending deletion, completed deletion, and an unrelated subject.

## 2. Complete Local Cleanup

- [x] 2.1 Refactor local deletion to discover owned campaigns, all affected memberships, notifications, candidate character IDs, and profile/map file paths before deleting any rows; verify fixture-based tests cover an empty account, owned campaigns, joined campaigns, duplicate character references, and multiple map paths.
- [x] 2.2 Make the database cleanup set-based, transactional, and idempotent, deleting dependent campaign data and only characters whose final membership reference is gone; verify integration tests prove unrelated campaigns and still-referenced characters survive while orphan character ability and skill rows are removed.
- [x] 2.3 Replace swallowed filesystem errors with a resumable cleanup-manifest executor that accepts only normalized paths beneath the upload directory; verify tests cover successful deletion, already-missing files, traversal attempts, directories, and an I/O failure that remains retryable.
- [x] 2.4 Verify a database failure rolls back the marker and all local row changes without deleting files, and verify replay after a committed local cleanup treats missing rows as complete.

## 3. Keycloak Administration Boundary

- [x] 3.1 Require the deployed `KEYCLOAK_CLIENT_ID` and `KEYCLOAK_CLIENT_SECRET` when deletion is enabled; verify configuration tests reject blank, placeholder, or missing values while allowing the explicitly disabled development profile.
- [x] 3.2 Add configurable HTTP connection and request deadlines plus typed Keycloak failure categories; verify local HTTP-server tests cover token success, malformed token JSON, invalid client, forbidden user deletion, transport failure, and a request timeout.
- [x] 3.3 Treat Keycloak user-delete responses 204 and 404 as idempotent completion and classify every other status without returning its body; verify tests cover 204, 404, 401, 403, and 5xx responses.
- [x] 3.4 Add account-deletion readiness and structured redacted logging; verify health tests report unready only when deletion is enabled with invalid admin configuration and log-capture tests contain stage/category/correlation data but no secret, token, raw subject, email, or upstream body.

## 4. Coordinator and API Contract

- [x] 4.1 Implement the deletion coordinator state machine for preflight, local transaction, file cleanup, Keycloak deletion, and completion; verify service tests cover the full successful transition sequence and confirm no local mutation occurs when preflight fails.
- [x] 4.2 Make every persisted intermediate state resumable and safe under duplicate requests; verify tests resume after `LOCAL_DELETED` and `FILES_DELETED`, accept already-absent files/users, and prevent repeated deletion of unrelated data.
- [x] 4.3 Add authenticated `DELETE /api/account` as the subject-scoped endpoint and keep `DELETE /api/player/{id}` as an owner-checking compatibility wrapper; verify REST tests cover 204 with `Clear-Site-Data`, 403 for another player, 503 for preflight failure, 409 for persisted pending state, and 500 after a rolled-back local failure.
- [x] 4.4 Return bounded JSON errors with stable codes, safe German messages, and a retryable flag while keeping detailed diagnostics server-side; verify response tests reject exception text, HTML, credentials, tokens, and oversized/provider-controlled fields.
- [x] 4.5 Make `/api/auth/me` report pending/completed deletion without creating a player and permit the matching authenticated subject to call only the resume endpoint; verify REST tests cover a page reload, another still-valid session, a completed marker, and a normal authenticated account.

## 5. Profile and Login Experience

- [x] 5.1 Add a shared client error parser that consumes only bounded JSON from a JSON content type and maps malformed JSON, plain text, HTML, network failure, and unknown codes to fixed localized messages; verify Vitest cases include the reproduced Cloudflare 502 document shape.
- [x] 5.2 Update the profile deletion action to use `/api/account`, preserve confirmation, show safe retry guidance, restore the button for retryable states, and clear player/site state only on completion; verify jsdom tests cover cancel, 204, structured 409/503, network failure, and HTML responses.
- [x] 5.3 Update login synchronization to recognize `ACCOUNT_DELETION_PENDING` and render a “Löschung fortsetzen” action without exposing raw `/api/auth/me` content; verify tests prove the action resumes deletion and ordinary login behavior is unchanged.
- [x] 5.4 Add Playwright coverage with mocked API routes for successful deletion, pending retry, forbidden deletion, and proxy-generated HTML; verify the browser never renders `<!DOCTYPE`, Cloudflare markup, a stack trace, or an internal exception message.

## 6. Deployment and Operations

- [x] 6.1 Add timeout, enablement, marker-retention, and standard `KEYCLOAK_CLIENT_*` configuration to application properties and Kubernetes deployment wiring while keeping development disabled unless its service account is reviewed; verify both manifests pass client-side dry-run and contain no literal secret values or obsolete admin-client names.
- [x] 6.2 Update the deployment workflow to use production `KEYCLOAK_CLIENT_ID` and `KEYCLOAK_CLIENT_SECRET` without echoing them and support explicit development opt-in; verify a repository validation script passes for the real workflow and fails fixtures with missing client keys or literal secrets.
- [x] 6.3 Add an operations guide for enabling the configured client's service account, assigning only the required user-management role, rotating/revoking the secret, aligning marker retention with session lifetime, enabling/disabling the capability, inspecting pending markers, and rolling back safely; verify every command is non-secret and no step grants broader realm-management roles.
- [x] 6.4 Document how to repair or complete a pending deletion without recreating a player, including cleanup of the exploratory user `codex-delete-empty-20261005-1309` / player `751`; verify the runbook distinguishes application retry, Keycloak repair, local data verification, and emergency capability disablement.

## 7. Integrated Verification and Rollout

- [x] 7.1 Run the complete Java, JavaScript, and Playwright suites plus the production build and configuration validators; verify `./mvnw test`, `npm run test:js`, `npm run test:browser`, and `./mvnw package -DskipTests` all succeed.
- [x] 7.2 Validate the planning artifacts after implementation evidence is recorded; verify `openspec validate fix-account-deletion-flow --type change --strict --no-interactive` succeeds.
- [x] 7.3 Enable the configured production Keycloak client's service account and verify through read-only inspection that the expected user-management role is present, no broader realm-management role is assigned, and its secret remains only in the approved secret stores.
- [x] 7.4 Deploy with deletion initially disabled, verify the marker schema and readiness behavior, then enable the capability only after ordinary login, profile, campaign, upload, and Keycloak health checks pass.
- [x] 7.5 Create disposable empty and populated accounts through the public route, exercise a controlled provider failure and retry, then verify successful deletion removes the Keycloak users, local profiles, memberships, owned campaign data, unreferenced characters, notifications, and files while retaining unrelated data.
- [x] 7.6 Confirm public failure responses never expose raw HTML or internal diagnostics, remove the exploratory account/player and all disposable test data, inspect application/Keycloak/VPS logs for regressions or secret/PII leakage, and record the exact commands and results in the operations evidence.
