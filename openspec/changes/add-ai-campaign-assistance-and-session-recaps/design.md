# Design

## Context

See [proposal.md](proposal.md) for motivation. The published baseline has a manually authored DM-only campaign story, campaign-specific roles, owner-scoped characters, private browser-local player notes, role-shaped views, and no AI integration. The local DM chat handler only appends a local message. The accepted section-9 plan adds durable DM-managed NPC/place/quest/lore records, sessions, encounters, effective event history, and distinct DM/member recap-input projections. The accepted section-10 plan adds a deterministic D&D 5e (2024) encounter tracker and tracked-level progression while explicitly reserving encounter suggestions for section 11.

Repository sources identify OpenAI as the intended external actor and identify wrong AI output plus API cost as risks, but they choose no provider model/version, numeric quota, timeout, retention interval, price threshold, or accounting scope. They also do not authorize player-initiated generation, AI portraits, audio context, rule authority, autonomous campaign mutation, or an AI-managed combat engine. Those absences constrain the design: external transfer is explicit and previewed, generated content is an untrusted DM draft, finite limits are mandatory configuration, and unsupported inputs or mutations remain deferred.

## Goals / Non-Goals

**Goals:**

- Build one auditable external-provider boundary shared by campaign assistance and session recaps.
- Assemble context only from server-derived, authorization-filtered projections with source revisions and a stable manifest fingerprint.
- Preserve current lore, effective historical events, and deterministic combat as separate authorities.
- Give the DM an explicit draft review/edit/reject/accept path before any ordinary-domain commit or member publication.
- Make provider errors, retries, stale inputs, configured-limit exhaustion, and usage accounting observable and idempotent.
- Keep member recap generation incapable of seeing DM-only source data.

**Non-Goals:**

- Selecting a D&D rules corpus or treating generated rule claims as authoritative.
- Audio/transcript input, Discord delivery, AI portraits, voice commands, or player-initiated generation.
- Reusable monster libraries, items/loot/rewards, conditions/effects, full character-sheet progression, tactical-rule enforcement, or automatic boss mechanics.
- Applying encounter advice directly to an active tracker or replaying generated prose into session history.
- Choosing repository-unsupported numeric provider, quota, latency, retention, or price values in planning.
- Implementing application code, migrations, provider configuration, or section-9/10 product tasks in this change.

## Decisions

### 1. Use one provider gateway and fail closed

All external generation goes through one server-side gateway that accepts a normalized request, a context manifest, an idempotency identity, and configured input/output limits. Provider credentials remain server-side and never enter a client, prompt, stored result, or ordinary log. The gateway is disabled until a provider configuration and finite limit policy are valid.

The repository names OpenAI, so the first adapter may target OpenAI, but the capability contract records only the configured provider/model identifiers returned by the gateway. Pinning a specific model or current price in the plan was rejected because neither is selected by product evidence and both can change independently of the functional contract. Direct provider calls from views or owning domain services were rejected because they would duplicate authorization, redaction, retry, and accounting behavior.

### 2. Build immutable context manifests from owning projections

A context assembler resolves an explicit selection into a typed manifest. Each entry records source capability, record identity, authorized audience, revision/version, selected field category, and bounded serialized size. It consumes `campaign-management`, `campaign-content`, `session-records`, character/campaign projections, and `combat-automation` through their own read contracts rather than loading raw persistence entities. The assembled payload and manifest receive a content fingerprint before confirmation.

Implicit relationship traversal was rejected because selecting one NPC could otherwise leak linked lore, characters, media, or another campaign. Client-built prompts containing raw records were rejected because a malicious or stale client could bypass field-level authorization. Automatic context selection was rejected because the user must know which protected data will leave Dicekeeper.

### 3. Preserve distinct current-lore and historical-event authority

Campaign story and current campaign-content records define current campaign truth. Effective amended session events and their authorized snapshots define what the durable record says occurred at that historical moment. The context manifest labels these source classes and never flattens them into one unlabeled prompt. Known disagreement becomes a conflict marker that the DM sees before provider submission and again on the draft.

Using the latest current lore to rewrite past event snapshots was rejected because it would contradict append-only history. Treating generated output as a third authority was rejected because README and recorded decisions retain a human DM and explicitly identify AI error risk.

### 4. Separate provider attempts, editable drafts, accepted snapshots, and domain commits

Persist provider attempts independently from suggestion/recap versions. An attempt owns request status, idempotency, manifest fingerprint, provider/config identifiers, timings, safe failure category, and usage/reservation outcome. A successful attempt creates one DM-only editable draft. Acceptance creates an immutable reviewed snapshot; later edits create a new draft/version instead of rewriting the accepted audit record.

For story/NPC/place/quest suggestions, an additional explicit commit command maps an accepted snapshot to the existing owning capability and revalidates current authorization, source version, and target fields. Encounter/boss advice has no automatic import in this change; it remains preparation text and the DM uses ordinary session/combat commands. Combining provider success and authoritative mutation in one action was rejected because the DM could not meaningfully review, correct, or reject the output. Treating “accept” as an automatic active-combat mutation was rejected because no repository evidence defines that mapping and section 10 makes deterministic state authoritative.

### 5. Generate private and member recaps from different inputs

A recap job fixes its audience before assembly. `DM_ONLY` uses SES-009's DM projection. `MEMBERS` uses SES-009's member-safe projection and cannot reuse a broader private draft. The accepted recap stores the chosen audience, input fingerprint and revisions, reviewed text, provenance, and publication state. Member delivery uses a server-derived projection and current membership checks; the display client receives no recap.

Generating one broad recap and removing private text afterward was rejected because generated text can paraphrase or combine hidden facts even when direct fields are stripped. Letting players trigger generation was rejected because the target diagram places session recap generation under the DM session-log workflow and no cost/abuse authority is defined for players.

### 6. Revalidate source revisions before acceptance

Draft acceptance compares the stored manifest with current authorized projections. Any event amendment/redaction, audience reduction, relevant content version change, or authorization loss makes the draft stale. The DM must regenerate from current context. Accepted recaps remain immutable historical outputs with their source revision; a new source revision produces a replacement version rather than silently altering text already reviewed or published.

Allowing stale acceptance was rejected because it could republish redacted text or hidden lore. Automatically regenerating and accepting was rejected because it would bypass provider disclosure and DM review.

### 7. Reserve configured usage once per logical dispatch

A preflight policy checks the provider-enabled flag, maximum serialized context, maximum requested output, and an available configured capacity pool. Dispatch atomically creates an attempt and one capacity reservation under the request idempotency identity. The gateway finalizes provider-reported usage when present. It releases a reservation only when no external dispatch occurred; uncertain provider outcomes remain accounted under a configured fallback rather than being assumed free. A duplicate request returns the existing attempt.

No numeric values or accounting scope are hard-coded in this plan. Production enablement requires explicit finite configuration and names the applied scope in the UI/operations documentation. Unlimited default use was rejected because the README identifies API cost. A zero default was rejected as a hidden product choice; disabled-until-configured is explicit. Automatically retrying after an uncertain provider dispatch was rejected because it can duplicate cost and output.

### 8. Normalize safe provider failures and observability

The gateway maps disabled/misconfigured, authentication, validation/oversize, rate-limit/capacity, timeout, unavailable, malformed-response, and unknown failures to stable product outcomes. Protected prompts and provider responses are not written to ordinary application logs or metrics. Operational records use attempt ids, campaign ids where authorized, provider/config ids, sizes, timing classes, status, and usage totals. The DM may deliberately retry retryable final failures with a new attempt identity after a fresh preflight and revision check.

Returning partial streaming text as a ready draft was rejected because an incomplete response can be mistaken for reviewed output. Blind automatic retries were rejected because the external service may have processed the first request even when Dicekeeper did not receive its response.

### 9. Keep generated next steps descriptive

Recap next steps and encounter suggestions remain plain reviewed prose. They never append session events, create quests or items, change lore, adjust initiative/HP/boss state, advance characters, or answer rules. Story/NPC/place/quest preparation can reach existing ordinary-domain contracts only through the distinct commit command after acceptance. If later product work wants typed encounter import or next-step execution, it needs a separate delta defining mapping, validation, rollback, and authority.

An all-purpose “apply AI output” action was rejected because it would hide multiple owning capabilities, deferred features, and transactional failure modes behind unstructured provider text.

## Data and transaction shape

Future implementation should introduce persistent records equivalent to:

- provider configuration reference and enabled/finite-limit policy, with credentials stored outside application records;
- AI attempt with campaign/DM identity, purpose, audience when applicable, manifest fingerprint, idempotency identity, status, provider/config identifiers, safe failure category, timestamps, and usage/reservation outcome;
- immutable context-manifest entries with source type/id/revision/audience/field category and serialized-size accounting, but no duplication of excluded raw entities;
- suggestion draft/version with attempt, edited text, status, reviewer, review time, accepted snapshot, and optional ordinary-domain commit audit reference;
- recap draft/version with session, audience, input revisions, reviewed text, acceptance/publication status, replacement relation, and provenance;
- capacity reservation/usage ledger keyed by logical attempt and the configured accounting scope.

Unique constraints enforce one dispatch and reservation per request idempotency identity, one ready result per successful attempt, and one accepted version per acceptance identity. Draft acceptance and accepted-version creation share a transaction. Story/content commit uses the owning capability transaction and stores only an audit link to the accepted suggestion. Provider calls never run inside a database transaction: the attempt/reservation is committed first, the call is made, and a compare-and-set finalization records one terminal result.

## Risks / Trade-offs

- **Prompt or result data could leak protected campaign material** -> Use explicit manifests, server-derived projections, DM confirmation, purpose-bound fields, safe logs, and per-audience tests.
- **Member recaps could paraphrase DM-only facts** -> Generate them only from the member-safe projection; never downgrade or sanitize a DM-generated recap for members.
- **Provider output can be wrong, contradictory, or unsafe to apply** -> Label it untrusted, preserve provenance/conflict markers, require DM editing/acceptance, and revalidate every ordinary-domain commit.
- **Provider timeouts can leave cost outcome uncertain** -> Avoid blind retry, preserve the attempt and reservation, and require a new deliberate retry after final classification.
- **Long sessions can exceed configured context** -> Reject oversize input visibly; future summarization/chunking requires a separately accepted deterministic selection strategy rather than silent truncation.
- **Accepted recap can become stale after an amendment** -> Preserve its source revision, show that newer history exists, and let the DM create a reviewed replacement.
- **AI availability can become a hard dependency** -> Keep manual campaign-content, session-record, and combat workflows fully functional when AI is disabled or unavailable.

## Migration Plan

1. Add disabled provider configuration, finite-policy validation, attempt/context/draft/recap/usage persistence, constraints, and cleanup behavior without configuring credentials or backfilling records.
2. Add server-side context assemblers and manifest previews over implemented upstream projections; keep all provider dispatch disabled.
3. Add the provider gateway, safe failure mapping, idempotent reservations, and DM-only suggestion/recap draft workflows behind an explicit rollout boundary.
4. Enable story/content commit only after campaign-content exists and authorization/stale-version tests pass. Keep encounter advice as non-applying text.
5. Enable recap generation only after session-record recap projections exist; enable member publication only after member-safe isolation and revocation tests pass.
6. Select finite numeric limits, accounting scope, provider/model configuration, timeouts, and operational fallback accounting before production enablement; document the selected values without turning them into historical defaults.
7. Run privacy, cross-campaign, stale-source, conflict, provider-failure, retry, capacity, publication, restart, and deletion tests before exposing the workflow.

Rollback first disables new dispatch and publication entry points, then lets in-flight attempts reach a recorded terminal state. Accepted recaps and audit records remain intact until a separately reviewed data-retention migration removes them; rollback never writes generated content into campaign, session, combat, or character state.

## Deferred configuration decisions

- Exact provider/model version, request timeout, retry window, maximum context, maximum output, usage/cost allowance, accounting scope, price threshold, and draft-retention interval have no repository-supported values. They MUST be selected as finite deployment/product configuration before production enablement.
- Silent truncation, automatic chunking, and model-generated intermediate summaries are not approved fallbacks for oversized context. A later change may add one after defining deterministic selection, provenance, cost, and failure behavior.
