# Design

## Context

See [proposal.md](proposal.md) for motivation. The published baseline has a durable campaign with a one-way `started` flag, persistent memberships and group decisions, ephemeral live-play/map runtime, and browser-local player notes. No persistent session or encounter entity exists in the reviewed application. The future diagram proposes an automatic session log and later AI recap, while historical interviews distinguish a campaign from the multiple play sessions that compose it and identify NPC, place, quest, lore, item, and event-log candidates.

This change plans a new durable domain layer without implementing it. It must preserve the current capability boundaries: campaign authorization remains campaign-specific, character and map references keep their owners, current live state is not made durable by implication, and player-local notes never become recap input.

## Goals / Non-Goals

**Goals:**

- Model campaign-owned NPC, place, quest, and lore records with one authorization and reference-integrity boundary.
- Model multiple durable sessions per campaign and optional encounters per session.
- Preserve an ordered, audience-filtered, amendable event history suitable for deterministic recap inputs.
- Make lifecycle, deletion, restart, and cross-campaign outcomes explicit before implementation.
- Provide later combat, AI/recap, and audio work with stable identifiers and authorized projections.

**Non-Goals:**

- Reconstructing current live state from history or changing the current campaign-start contract.
- Defining combat rules, progression, items/loot, AI generation, audio/transcription, rules assistance, Discord, or generalized shared-view access.
- Importing or backfilling fictional sessions from current ephemeral data or browser caches.
- Implementing application code, persistence migrations, APIs, views, or tests in this planning change.

## Decisions

### 1. Use a strict campaign -> session -> encounter hierarchy

A campaign remains the top-level durable container. A session is one play occurrence within it, and an encounter is an optional segment within one session. Sessions and encounters use `PLANNED`, `ACTIVE`, `COMPLETED`, and `ARCHIVED` lifecycles, with at most one active session per campaign and one active encounter per session.

This keeps the historical “campaign consists of multiple sessions” distinction without turning the existing campaign `started` flag into a session identifier. Allowing encounters without a session was rejected because it would leave history, audience, and recap ownership ambiguous. Requiring every session to contain an encounter was rejected because narrative and exploration sessions remain valid.

### 2. Store content as typed campaign-owned records

Campaign content uses common ownership, audience, archival, version, and timestamp fields plus typed data for NPC, place, quest, and lore. Relationships are explicit typed links, not embedded copies, and every target is checked against the owning campaign. Quest progress is separate from archival state so a completed or failed quest can still be active reference material before archival.

One untyped text blob was rejected because it cannot validate references or provide stable recap context. Independent global libraries were rejected for this change because sharing, ownership, import, and reuse across campaigns have not been decided. Items and loot are deferred rather than forced into content because inventory ownership, equipment, transfer, reward, and character-mutation semantics are unresolved.

### 3. Default new records to DM-only and derive all read projections

New content, sessions, encounters, and manual events default to `DM_ONLY`; the DM may explicitly choose `MEMBERS`. Read models are derived for the authenticated campaign role and never serialize a full record and hide fields only in the client. The existing table/display projection receives no new data in this change.

This least-privilege default aligns with the published campaign-story and view boundaries. Default member visibility was rejected because new NPC, place, quest, lore, and encounter records commonly contain unrevealed preparation material.

### 4. Keep history append-only and represent correction as an amendment

Each active session has a monotonically ordered event stream. Events carry server identity, ordering, time, actor/system attribution, kind, audience, an immutable safe payload, optional encounter, and typed references. Corrections and redactions append amendments instead of editing or deleting the original event. An effective projection folds amendments for readers while the DM retains the audit chain.

Mutable log rows were rejected because silent edits make recaps non-reproducible and weaken accountability. Full event deletion was rejected for ordinary correction; a redacted placeholder preserves ordering while removing later disclosure of protected text.

### 5. Require idempotent, failure-aware integration with recordable actions

Manual narrative entries and session/encounter lifecycle events are written directly through the session-record boundary. Later integration with map, live-play, dice, and group-decision commands uses a stable command/idempotency identifier and appends one history event only for a committed source outcome. The command coordinator must not acknowledge a recordable mutation as fully successful for an active session while its required history append is lost; retries resolve to the existing event.

A best-effort subscriber was rejected because missing or duplicated history would make downstream recaps untrustworthy. Replaying the log to rebuild current turn, HP, map, or dice state was also rejected: those values keep the published capability lifetimes and the log records outcomes rather than becoming their new authority.

### 6. Persist references and event snapshots for different purposes

Live relationships keep typed identifiers so current authorized records can be navigated and validated. Events additionally store the minimum audience-safe name/kind/value snapshot needed to understand the recorded moment. Later rename or archival changes current content but not historical meaning. Cross-campaign references are always rejected.

Identifier-only history was rejected because archival or deletion can make old events unintelligible. Full object snapshots were rejected because they unnecessarily duplicate private fields and increase the risk of leaking later-hidden information.

### 7. Prefer archival and restrict independent hard deletion

Archival preserves identity and references while removing records from default active/member projections. Hard deletion is available only for confirmed, never-used records without history or blocking references. Completed/recorded sessions and encounters remain until campaign deletion; content referenced by history remains archived or otherwise retained. Campaign deletion owns terminal cascading cleanup.

Unrestricted hard deletion was rejected because it would break event history and recap reproducibility. Permanent retention independent of campaign deletion was rejected because it would contradict the campaign ownership boundary.

### 8. Build recap inputs as deterministic authorization-filtered projections

The session-record service exposes ordered effective events, encounter summaries, and reference snapshots in a DM projection and a separate member-safe projection. It excludes player-local notes, individual vote choices, account data, notifications, hidden map media, unselected story, and future audio. The projection is read-only and performs no external transmission or generation.

Passing raw database entities to later AI work was rejected because it would bypass established privacy and audience rules. Generating recaps in this change was rejected because provider behavior, acceptance/editing, visibility, limits, and failures belong to section 11.

## Data and transaction shape

Future implementation should introduce persistent records equivalent to:

- campaign content with campaign id, kind, audience, archived flag, type fields, version, and timestamps;
- typed same-campaign content/reference edges;
- sessions with campaign id, lifecycle, audience, metadata, version, and actual lifecycle times;
- encounters with session/campaign ids, lifecycle, audience, metadata, version, and typed references;
- session events with session/campaign ids, monotonic sequence, idempotency identity, actor/system attribution, kind, audience, immutable safe payload, and optional encounter/reference ids;
- event amendments with target event, actor, reason, time, and replacement/redacted projection.

Uniqueness constraints enforce one active session per campaign, one active encounter per session, and one event per idempotency identity. Foreign keys and service-level authorization enforce the same-campaign boundary. Persistent source mutations and history appends use one transaction where they share storage; integration with ephemeral runtime must stage and durably append the event before publishing the acknowledged state so a failed append cannot yield an unrecorded success during an active session.

## Risks / Trade-offs

- **History payloads may expose later-hidden preparation data** -> Construct audience-specific payloads at write time, default to DM-only, and validate every referenced projection.
- **Strict history recording can make an active-session mutation fail when durable storage is unavailable** -> Show an explicit failure/unavailable state and keep source state uncommitted instead of silently losing the record.
- **Append-only history grows for long campaigns** -> Index by campaign/session and sequence, paginate reads, and archive sessions without deleting events; numeric retention or capacity targets require a later operational decision.
- **Archived references complicate current views** -> Resolve current identity separately from stored event snapshots and label archived or unavailable current targets without rewriting history.
- **Concurrent DM edits can overwrite preparation** -> Require record versions and reject stale writes for reconciliation.
- **Later combat/audio/AI changes may need richer event kinds** -> Add typed event kinds through their own capability changes while retaining the core ordering, audience, attribution, and amendment contract.

## Migration Plan

1. Add durable content, session, encounter, relationship, event, and amendment storage with constraints but no inferred rows.
2. Add role-filtered APIs and lifecycle operations; deploy them without changing the current live views.
3. Add campaign-content and session/encounter management views behind an explicit feature rollout boundary.
4. Integrate recordable current-domain commands one capability at a time with idempotent history writes and authorization tests.
5. Add deterministic recap-input projections for later section-11 consumers, without enabling provider transmission.
6. Existing campaigns begin with no content or sessions. The DM creates their first records explicitly; current ephemeral state and browser-local notes are never backfilled.

Rollback disables new entry points and integrations before removing schema. Persisted records remain intact so rollback does not destroy history; cleanup or migration reversal requires a separately reviewed data-retention decision.
