# Tasks

All tasks below implement future product behavior and intentionally remain unexecuted after the section-14 planning work that created this change. The section-9 session-record implementation is a prerequisite for session-status and in-session roll sharing. Exact Discord application/bot identity, callbacks, provider permission identifiers, credentials/rotation, rate-limit envelope, and operational test environment must be selected before production enablement; no README stack choice or provider default is implied.

## 1. Gateway configuration and persistence

- [ ] 1.1 Add disabled-by-default server-side Discord application/bot configuration requiring exact application identity/version, approved callback origins, protected credentials, bounded provider permissions, secret rotation, and an operational test mode; verify startup/configuration tests reject missing, client-visible, over-broad, voice-enabled, or inbound-mutation configurations.
- [ ] 1.2 Add persistent campaign/channel link and short-lived authorization-workflow records with campaign, owner-DM audit identity, provider installation/server/text-channel identifiers, display metadata, configuration version, connection state, verification time, expiry, and one-time anti-forgery state; verify schema tests reject missing and cross-campaign associations.
- [ ] 1.3 Add delivery, attempt, outbox, and cleanup-obligation persistence with immutable source/link/payload references and `PENDING`, `SENT`, `FAILED`, `DELIVERY_UNKNOWN`, and `CANCELLED` outcomes; verify lifecycle and terminal-state database tests reject invalid transitions.
- [ ] 1.4 Add uniqueness and idempotency constraints for one active link per campaign, one campaign per text channel, one consumed authorization state, and one delivery per confirmation identity; verify concurrent database tests accept at most one valid association and dispatch owner.
- [ ] 1.5 Add an upgrade migration that creates no inferred Discord account mapping, campaign/channel link, authorization grant, message, delivery, voice/audio source, or command for existing records; verify forward migration and rollback-preservation tests on populated pre-change data.

## 2. Campaign and channel association

- [ ] 2.1 Implement owner-DM-only link initiation with authenticated-session, campaign, expiry, callback, provider-configuration, and anti-forgery binding; verify members, former members, guests, unrelated users, display clients, replayed callbacks, and wrong-campaign states are denied.
- [ ] 2.2 Implement the server-side provider authorization callback and destination inventory limited to authorized Discord servers and ordinary text channels; verify missing/deleted destinations, voice channels, DMs, threads, forums, occupied channels, and insufficient provider authority cannot be selected.
- [ ] 2.3 Implement exact server/channel/permission/external-audience preview plus separate Dicekeeper DM confirmation before persistence; verify a cancelled, stale, changed-destination, or changed-permission confirmation creates no active link or test message.
- [ ] 2.4 Implement DM link-state views and the member-safe destination availability summary; verify members see only the destination display name needed for their own share and never credentials, installation identifiers, grant-account details, cleanup data, or another sender's delivery audit.
- [ ] 2.5 Implement confirmed unlink and destination replacement through unlink/relink, cancelling undispatched outbox entries and removing reusable credentials; verify non-DMs cannot unlink, existing Discord messages are not claimed deleted, and unresolved provider revocation becomes a retryable cleanup obligation.

## 3. Explicit payload preview and source authorization

- [ ] 3.1 Implement one canonical minimized payload builder and short-lived preview record that includes the resolved channel, message kind, exact rendered body, source revision, sender, link version, payload hash, expiry, and external-audience warning; verify excluded fields and payload mutations invalidate the whole preview.
- [ ] 3.2 Implement DM-only `ACTIVE`/`COMPLETED` status sharing from a same-campaign `MEMBERS` section-9 session, limited to campaign name, session title, exact state, authoritative transition time, and Dicekeeper origin; verify planned, archived, DM-only, missing, stale, and cross-campaign sessions are denied.
- [ ] 3.3 Implement current-member own-latest-roll sharing from LIVE-006 while exactly one same-campaign session is active, limited to campaign/session labels, Dicekeeper display name, die, result, manual/generated self-report label, source time, and origin; verify overwritten, invalid, cross-campaign, client-invented, and another member's rolls are denied.
- [ ] 3.4 Recheck sender authentication, owner-DM/current-membership authority, source revision/state, destination, link version, provider configuration, and payload hash at confirmation and dispatch; verify expired browser previews and membership/session/link changes result in no provider traffic.
- [ ] 3.5 Enforce explicit confirmation and no automatic publication on link creation or source events; verify cancellation, campaign/session/live-play changes, and ordinary synchronization traffic create no Discord delivery unless an eligible sender confirms the exact payload.

## 4. Delivery, duplicate handling, and reconnect

- [ ] 4.1 Implement atomic confirmation-to-outbox persistence and compare-and-set worker claiming so one confirmation identity has at most one active provider attempt; verify duplicate HTTP submissions, concurrent workers, restart recovery, and late claims do not intentionally send a second message.
- [ ] 4.2 Implement provider dispatch and normalized terminal mapping for accepted message ID, definitive validation/authorization/rate-limit/service rejection, timeout/lost acknowledgement, cancellation, and late/duplicate responses; verify each outcome reaches the required state without mutating source data.
- [ ] 4.3 Implement `DELIVERY_UNKNOWN` without automatic retry and an explicitly confirmed resend flow with a new identity and duplicate warning; verify unknown outcomes are never labelled sent/failed and retries always perform fresh source/link/actor checks.
- [ ] 4.4 Implement observable connected, degraded, disconnected, reauthorization-required, and unlinked conditions from verification, send failures, bot removal, channel deletion, permission loss, token revocation, and configuration changes; verify authoritative link state overrides cached client availability.
- [ ] 4.5 Implement owner-DM reauthorization and same-destination verification without fallback-channel selection, message replay, history traversal, or automatic failed/unknown resend; verify events and rolls produced while disconnected are not backfilled and later sends require new current previews.

## 5. Authority, inbound, audio, and cleanup boundaries

- [ ] 5.1 Enforce at API, callback, event, and UI layers that Discord accounts, server ownership, roles, channel membership, messages, reactions, slash commands, buttons, webhooks, dice bots, and attachments never authenticate a Dicekeeper actor or change Dicekeeper roles, membership, confirmation, queries, or product state; verify adversarial provider payloads remain inert.
- [ ] 5.2 Expose no inbound chat/status/roll ingestion and no interactive outbound component with Dicekeeper command authority; verify Discord-originated rolls, rule questions, votes, notes, maps, AI input, session events, and campaign mutations are ignored or rejected.
- [ ] 5.3 Exclude voice-channel permissions, joins, receive streams, uploads, remote audio, transcripts, and speaker mapping from the gateway; verify Discord audio cannot enter `audio-transcription`, session history, recap context, identity mapping, or any command path.
- [ ] 5.4 Enforce the first-release data boundary against HP, turns, maps/fog/media, character sheets, story/content/history, decisions/votes, notes, notifications, AI/recaps/rules, account data, credentials, and internal identifiers; verify serialized Discord payloads contain only DSI-005/006 fields.
- [ ] 5.5 Extend campaign deletion and owner-account-owned-campaign cleanup to disable links, cancel undispatched deliveries, remove credentials, and attempt provider revocation while retaining minimum non-secret idempotency/audit metadata; verify another campaign/channel remains unchanged and cleanup failure is never reported complete.

## 6. Acceptance and failure testing

- [ ] 6.1 Add end-to-end authorization tests for linking, callback binding, provider grant, confirmation, member-safe link visibility, unlinking, relinking, campaign deletion, and unsupported/occupied destinations; verify every DSI-002/003 actor and channel scenario has a passing automated test or an explicit provider test boundary.
- [ ] 6.2 Add end-to-end status and roll tests covering preview cancellation, allowed fields, external-audience warning, session audience/state, own-roll attribution, stale sources, membership revocation, source mutation between preview/confirmation, and source immutability; verify every DSI-004–006 scenario.
- [ ] 6.3 Add deterministic provider-adapter tests for duplicate submissions/workers, definitive rejection, timeout, lost acknowledgement, late response, deliberate resend, outage, bot/channel/permission revocation, reauthorization, restart, and no-backfill behavior; verify every DSI-007/008 scenario without relying on a live Discord service.
- [ ] 6.4 Add adversarial no-authority/no-inbound/no-audio tests for Discord identities, roles, messages, commands, reactions, webhooks, bot rolls, markup, prompts, attachments, voice sources, transcripts, shared-view fields, and prior-message requests; verify every DSI-009/010 scenario creates no query, mutation, audio record, voice command, or unauthorized disclosure.

## 7. Production configuration and documentation

- [ ] 7.1 Select and record the exact production Discord application/bot identity, callbacks, provider permission identifiers, credential storage/rotation, rate-limit handling, and operational test environment through product/operations review; verify the gateway remains disabled until the selected values pass authorization, revocation, outage, and secret-exposure tests.
- [ ] 7.2 Add safe operational telemetry and alerts for link state, dispatch outcome categories, ambiguous deliveries, revocation, and cleanup obligations without message bodies, credentials, private source fields, or provider payloads; verify log/metric scans contain no prohibited content.
- [ ] 7.3 Reconcile user and operations documentation only after future behavior is delivered, run the project test suite plus `openspec validate add-discord-integration --type change --strict --no-interactive` and main-spec validation, and verify Discord integration is not presented as current, automatic, inbound-capable, audio-capable, or command-capable.
