# Tasks

All tasks below implement future product behavior and intentionally remain unexecuted after the section-11 planning work that created this change. Finite numeric provider/usage values and an accounting scope must be selected before production enablement; this checklist does not treat historical text as those values.

## 1. Provider configuration and persistent model

- [ ] 1.1 Add a disabled-by-default server-side AI-provider configuration and finite-policy validation for provider/model identity, maximum context, maximum output, timeout, accounting scope, usage/cost allowance, and fallback accounting; verify startup/configuration tests reject credentials in client output and reject enablement with missing or unlimited required values.
- [ ] 1.2 Add versioned AI attempt, immutable context-manifest entry, suggestion draft/version, recap draft/version, capacity reservation, usage ledger, and ordinary-domain commit-audit persistence with campaign/session/DM ownership and timestamps; verify schema tests enforce required relations and cross-campaign rejection.
- [ ] 1.3 Add uniqueness and idempotency constraints for one provider dispatch and capacity reservation per logical attempt, one ready result per successful attempt, and one accepted version per acceptance identity; verify concurrent persistence tests accept at most one outcome.
- [ ] 1.4 Add an upgrade migration that creates no inferred request, draft, recap, provider credential, usage value, campaign content, session event, or combat mutation for existing data; verify forward migration and rollback-preservation tests on a populated pre-change database.

## 2. Authorization-filtered context and disclosure

- [ ] 2.1 Implement typed context assemblers over the exact DM-authorized campaign story/metadata, selected campaign-content, selected session-record/effective-history, authorized character, and bounded combat projections; verify unit tests retain source identity/revision/audience and never read a raw cross-campaign entity.
- [ ] 2.2 Enforce explicit field selection and exclusions for account-private data, notifications, individual votes, player notes, hidden/raw map media, unselected story/content, audio/transcripts, Discord data, credentials, and unrelated records; verify privacy tests cover each excluded category and prevent implicit relationship traversal.
- [ ] 2.3 Implement context-manifest fingerprinting, serialized-size accounting, known lore/history conflict markers, and stale/unavailable-source outcomes; verify changed revisions, redactions, audience reductions, missing future dependencies, and contradictory sources remain distinguishable.
- [ ] 2.4 Add the DM pre-submission preview and confirmation flow showing selected sources, audiences, revisions, external disclosure, limits, and conflicts; verify cancel/navigation performs no provider call or dispatched-request reservation.

## 3. Provider gateway, usage, and failure handling

- [ ] 3.1 Implement the server-side provider gateway with pinned configured identifiers, bounded normalized requests/responses, credential isolation, and safe logging/metrics; verify tests and log inspection contain no prompt, protected context, response text, secret, or credential in ordinary telemetry.
- [ ] 3.2 Implement atomic preflight and one reservation per idempotent logical dispatch, finalize provider-reported usage when available, and apply the configured fallback for uncertain/missing usage; verify duplicate, concurrent, undispatched, completed, and uncertain-attempt accounting tests.
- [ ] 3.3 Normalize disabled/misconfigured, authentication, validation/oversize, timeout, rate-limit/capacity, unavailable, malformed-response, and unknown failures; verify no failure creates a ready draft or mutates campaign/session/combat/character state.
- [ ] 3.4 Implement deliberate retry with a new attempt identity plus fresh authorization, revision, limit, and capacity checks while duplicate delivery of one identity returns the original state; verify retry tests do not duplicate provider dispatch, usage reservation, draft, or accepted result.

## 4. AI campaign-assistance workflow

- [ ] 4.1 Add DM-only story/quest/twist, NPC/place, and encounter/boss preparation request entry points and views; verify every non-DM/former-member/unrelated-campaign case is denied and current local chat text never triggers a provider call.
- [ ] 4.2 Implement pending/ready/failed/rejected/accepted suggestion lifecycle, editable plain-text versions, provenance, conflict/limitation labeling, and immutable accepted snapshots; verify actor, state-transition, idempotency, restart, and hidden-field tests cover AIA-001–AIA-007.
- [ ] 4.3 Implement a separate confirmed commit for accepted story/NPC/place/quest snapshots through `campaign-management` or `campaign-content`, including current-version and target validation plus audit linkage; verify rejected, stale, invalid, failed, and rolled-back commits leave authoritative records unchanged.
- [ ] 4.4 Enforce the non-applying encounter/boss boundary and all deferred scopes at request, response, commit, and view surfaces; verify AI output cannot add combatants, set initiative/HP/boss state, change characters/progression, create items/conditions/rewards, answer rules, ingest audio, publish to Discord, or create portraits/libraries.

## 5. Session-recap workflow

- [ ] 5.1 Implement DM-only eligibility checks for exactly one completed/archived session and separate DM-only versus member-safe recap-input assembly; verify planned/active/missing/wrong-campaign/empty-context requests perform no provider call and a DM draft cannot be relabeled for members.
- [ ] 5.2 Implement recap pending/ready/failed/rejected/accepted lifecycles, editable summary/next-step text, immutable reviewed versions, provenance, selected audience, and AI labeling; verify generated claims never append/amend session history or mutate lore, content, combat, progression, item, or rule state.
- [ ] 5.3 Implement explicit member publication from accepted `MEMBERS` versions using current membership and a server-derived safe projection; verify current/former/unrelated player, DM-only/unpublished version, provider-diagnostic, rejected-text, display-client, and membership-revocation cases.
- [ ] 5.4 Revalidate the source-manifest fingerprint before recap acceptance, mark changed/redacted/narrowed inputs stale, and implement immutable replacement versions; verify post-acceptance amendments preserve the earlier reviewed version while only the newest accepted version becomes current for publication.

## 6. Persistence, cleanup, synchronization, and operations

- [ ] 6.1 Restore attempts, drafts, accepted suggestions, recaps, publication state, provenance, and usage records across restart without re-dispatching provider calls; verify pending/final/retry state recovery and no generated-state replay into authoritative domains.
- [ ] 6.2 Implement confirmed unaccepted-draft deletion, accepted-version retirement/replacement, and campaign-deletion cascades with incomplete-cleanup reporting; verify session history and another campaign remain unchanged and required audit/accounting metadata follows the selected retention configuration.
- [ ] 6.3 Add role-filtered update/invalidation events for DM job state and member recap publication, using authoritative snapshot reconciliation and membership revocation; verify no common event payload contains DM instructions, private context, provider text, or diagnostics for unauthorized clients.
- [ ] 6.4 Add operational status for provider availability, finite-policy validity, capacity, failures, and usage without exposing protected content; verify disabled/exhausted/misconfigured states are observable and no dashboard or health endpoint grants a user broader campaign access.

## 7. Acceptance and documentation

- [ ] 7.1 Add end-to-end authorization, context-minimization, conflict, accepted/rejected suggestion, ordinary-domain commit, private/member recap, stale-source, provider-failure, retry, usage/capacity, restart, revocation, and cleanup tests; verify every AIA and REC scenario has a passing automated test or an explicitly documented external-provider test boundary.
- [ ] 7.2 Select finite production provider/model, numeric request/output/time/cost limits, accounting scope, fallback accounting, and draft-retention configuration through an explicit product/operations decision; verify production AI remains disabled until the selected values and test environment are recorded.
- [ ] 7.3 Reconcile the user guide and operations documentation only after future behavior is delivered, run the project test suite plus `openspec validate add-ai-campaign-assistance-and-session-recaps --type change --strict --no-interactive` and main-spec validation, and verify no AI, recap, rule, audio, Discord, portrait, loot, condition/effect, or combat mutation is presented as implemented before delivery.
