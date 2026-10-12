# Design

## Context

See [proposal.md](proposal.md) for motivation. The repository names Discord as a long-term online-play integration, lists Discord.js in a stale stack summary, and shows only three Discord use cases: play a session online, synchronize one channel, and display rolls/status. No Discord application code, dependency, account-link model, channel-audience rule, delivery lifecycle, retention behavior, or audio contract exists.

The published web contracts keep authentication and campaign roles inside Dicekeeper, limit live rolls to validated authenticated self-reports, and require stale/reconnected clients to reconcile with authoritative state. The accepted section-9 plan provides durable `ACTIVE`/`COMPLETED` sessions and the section-13 plan excludes Discord audio, retains one selected DM-browser microphone, and makes transcript text inert. The first Discord change must therefore add an external delivery boundary without weakening any of those owners.

## Goals / Non-Goals

**Goals:**

- Provide a minimal, auditable campaign-to-text-channel link controlled by the Dicekeeper owner-DM.
- Permit deliberate publication of only two snapshot types: DM-confirmed active/completed session status and a current member's own latest validated roll.
- Make the external destination, full payload, external retention risk, connection condition, delivery outcome, duplicate handling, unlinking, and cleanup observable.
- Keep every Dicekeeper authorization and source state authoritative before dispatch and after provider recovery.
- Fail closed for invalid callbacks, unsupported channels, revoked permissions, stale source snapshots, and ambiguous provider acknowledgements.

**Non-Goals:**

- Discord-based Dicekeeper sign-in, account linking, role/membership synchronization, or campaign admission.
- Continuous state mirroring, inbound chat, slash commands, reactions, buttons, dice bots, webhooks, or Discord-originated product data.
- Maps, fog, HP, turn/initiative, character sheets, group decisions, notes, notifications, campaign content/history, AI output, recaps, or rule answers in Discord.
- Voice-channel participation, remote/audio-file capture, Discord transcription, speaker mapping, or executable voice commands.
- Multiple linked channels, shared channels across campaigns, message editing/deletion, backlog replay, or historical Discord import.
- Selecting a current Discord SDK solely because the README names Discord.js; implementation language/library selection remains an implementation-time compatibility choice.

## Decisions

### 1. Use a server-side gateway and keep the feature disabled until configured

One server-side Discord gateway owns provider authorization, token storage, destination verification, message dispatch, normalized errors, and safe telemetry. The browser receives only opaque workflow/link identifiers and display metadata. Configuration must identify the application/bot, callback origins, provider version, protected credentials, and minimum permissions before link creation is available.

Direct browser-to-Discord calls were rejected because they expose reusable credentials and make server-side role checks, callback binding, idempotency, and audit unreliable. Fixing Discord.js now was rejected because the README's adjacent React/MariaDB summary is already stale and the behavior contract does not require one SDK.

### 2. Require two independent authorities for linking

The Dicekeeper owner-DM starts a short-lived link transaction bound to the authenticated session, campaign, random anti-forgery state, expiry, and intended callback. Discord separately verifies that its granting account may install/authorize the configured application and select the text channel. Dicekeeper then displays the resolved server/channel and permission summary and requires a final DM confirmation before persisting an active link.

Provider authority alone cannot identify a Dicekeeper DM, and Dicekeeper DM authority alone cannot grant access to a Discord channel. Conflating the two was rejected because it would let either external server control or a Dicekeeper route substitute for the other security boundary.

### 3. Keep a one-to-one text-channel association and no player account mapping

The first-release link is one campaign to one provider installation/server/text-channel tuple, with uniqueness on both campaign and channel. The persisted record owns its Dicekeeper owner-DM audit identity, provider identifiers, display metadata, authorization version, connection state, verification time, and credential reference. Discord granting-user metadata is limited to provider audit needs and never becomes an authentication map.

One-to-many, threads, direct messages, forums, voice channels, and one channel carrying multiple campaigns were rejected because the singular source use case supplies no routing, recipient, collision, or cleanup semantics. Persistent player-to-Discord account linking was deferred because no evidence defines verification, relinking, multiple accounts, visibility, revocation, deletion, or what product authority such a mapping would carry.

### 4. Treat every outbound message as an explicitly confirmed external disclosure

The link is not a synchronized Dicekeeper view. Before dispatch, the server builds a complete immutable payload preview from an authorized source snapshot and returns the resolved external destination and external-audience warning. A second confirmation binds the sender, source revision, link version, and payload hash. Any change to source, membership, link, or destination between preview and confirmation invalidates the preview.

Automatic publishing on link creation or every upstream event was rejected because Discord channel access is not Dicekeeper membership and the sources define no participant consent or safe broad payload. Explicit per-message confirmation provides a clear authorization point without inventing a channel-recipient registry.

### 5. Bound status sharing to a member-visible active/completed session snapshot

Only the owner-DM may share status, and only from one same-campaign `session-records` record with audience `MEMBERS` and state `ACTIVE` or `COMPLETED`. The gateway payload contains the campaign name, session title, exact state, authoritative transition time, and origin label. It does not append history or mutate the session. A later state uses a new share rather than editing the old Discord message.

Using current campaign `started` as the online-session model was rejected because the accepted section-9 contract deliberately distinguishes a campaign from multiple play sessions. Planned/archived and DM-only sessions were rejected because they do not represent the bounded member-visible live/completed announcement selected for this release.

### 6. Let a member share only their own current latest roll

The roll path reauthorizes the Dicekeeper session and current campaign membership, requires exactly one active future session, and rereads the live-play latest roll. It accepts only a roll still attributed by the server to the sender and still valid under LIVE-006. The payload carries the campaign/session labels, sender's Dicekeeper display name, die, result, manual/generated self-report label, source time, and origin.

DM redistribution of another player's roll, historical roll lookup, automatic forwarding, and Discord-originated rolls were rejected. The current live-play contract stores only the latest roll and makes no fairness or durable-history claim; Discord integration must not manufacture either.

### 7. Use a transactional outbox with explicit ambiguous-delivery state

Confirmation writes one immutable delivery record and outbox entry in the same local transaction. Unique constraints cover the idempotency key and the source/link/payload confirmation identity. A worker claims the entry, performs at most one active dispatch attempt for that attempt identity, and finalizes it with compare-and-set semantics. Confirmed provider acceptance stores its message identifier; a definitive rejection becomes `FAILED`; a lost acknowledgement becomes `DELIVERY_UNKNOWN`.

Blind retries after an ambiguous network result were rejected because Discord may have accepted the message before the acknowledgement was lost. Claiming exactly-once delivery across an external service was also rejected. The contract instead prevents duplicate local dispatch for the same identity, makes uncertainty visible, and requires a separately confirmed new delivery if the sender chooses to risk an external duplicate.

### 8. Reconnect revalidates the same destination and never replays

The link tracks connected, degraded, disconnected, reauthorization-required, and unlinked conditions. Provider outage may degrade availability; bot removal, channel deletion, permission loss, token revocation, or configuration invalidation blocks dispatch. Reauthorization reuses the original Dicekeeper DM workflow and requires explicit confirmation of the same destination; a different destination is an unlink/relink operation.

Event replay, source-history traversal, cached-message restoration, automatic retry of failed/unknown sends, and fallback-channel selection were rejected. Status and roll messages are explicit snapshots, so reconnect starts with no backlog and later sharing rereads the current authoritative source.

### 9. Separate delivery cleanup from external message retention

Unlink and campaign deletion disable dispatch, cancel unclaimed outbox entries, remove usable local credentials, and revoke provider authorization where supported. Final local delivery metadata retains only the identifiers, status, timestamps, actor/source references, payload hash, and provider message identity required for idempotency/audit; the full preview body need not be retained after the delivery reaches its terminal state because the authoritative source owns the content.

Editing/deleting previously delivered Discord messages was deferred. Provider-side viewers may have copied them, and the repository supplies no retention, correction, legal-deletion, or message-ownership contract. The product therefore discloses this limitation before sending rather than presenting unlink as retroactive erasure.

### 10. Preserve Discord as a one-way text sink

No inbound Discord content enters an application command bus or query path. Discord user IDs, roles, channel membership, messages, reactions, commands, attachments, bot output, and webhooks are ignored for Dicekeeper identity and state. Outbound content contains no interactive component that claims Dicekeeper authority.

Inbound synchronization was rejected because the sources do not define authenticated actor mapping, permissions, validation, confirmation, conflict resolution, rollback, or audit. This is the same reason section 13 defers executable voice commands.

### 11. Defer all Discord audio and keep section 13 unchanged

The bot requests no voice receive/capture scope and never joins voice channels. Discord streams and attachments are unsupported sources. If Discord audio is accepted later, it needs a separate change defining the Discord participant-to-Dicekeeper mapping, channel source, selected audible population, versioned consent, active-session ownership, provider/privacy terms, transient buffering, stop/delete behavior, and how that source coexists with the DM-browser microphone.

Adapting the existing audio plan by substituting a Discord stream was rejected because ATX-001 explicitly accepts only one selected DM-browser microphone and ATX-002's selected-participant consent cannot be inferred from server/channel presence. Text or speech from Discord also cannot revive the deferred command interpreter.

## Data and transaction shape

Future implementation should use stable link, authorization-workflow, delivery, delivery-attempt, outbox, and cleanup-obligation identities.

- A link references one campaign, owner-DM audit identity, provider application/config version, installation/server/channel identifiers, display labels, encrypted credential reference, version, state, verification timestamps, and unlink/cleanup status.
- A short-lived authorization workflow binds provider state to the Dicekeeper session, player, campaign, expiry, callback, and intended permissions; completion consumes it once.
- A preview contains a short-lived opaque identity, source kind/id/revision, sender, link version, exact rendered payload, payload hash, and expiry. It creates no provider traffic.
- A confirmed delivery freezes the preview metadata and creates one outbox entry. The provider request occurs outside the source transaction; compare-and-set finalization prevents late responses from replacing terminal state.
- A terminal delivery keeps minimum audit/idempotency metadata. A pending cleanup obligation contains no reusable client-visible secret.

Source reads and authorization checks occur again at confirmation. The delivery snapshot deliberately does not lock or mutate the session or latest roll. A share failure therefore cannot roll back or alter ordinary Dicekeeper play.

## Risks / Trade-offs

- **A linked channel may have viewers outside the campaign** -> Treat Discord as an explicit external audience, preview every payload, minimize fields, and never infer Dicekeeper access from channel membership.
- **A sender may disclose a campaign/session label they later regret** -> Require exact preview/confirmation and disclose that external copies may survive unlink; do not promise retroactive deletion.
- **A timeout may create an undetectable external duplicate risk** -> Use `DELIVERY_UNKNOWN`, disable blind retries, and warn before a separately confirmed resend.
- **Provider permissions or channel routing may change silently** -> Verify link version/destination at preview and dispatch, expose connection state, and fail closed on mismatch.
- **A stale browser may confirm an outdated source or membership** -> Expire previews and recheck sender, membership/DM role, session/roll revision, link, and destination at confirmation.
- **The external provider can be unavailable during play** -> Keep all campaign, session, roll, view, and synchronization workflows independent; sharing failure never blocks play.
- **One-channel/manual snapshots provide less automation than the aspirational diagram** -> Record richer mirroring, shared views, multi-channel routing, inbound commands, and account mapping as explicit deferrals rather than hidden incomplete behavior.
- **No Discord audio limits online transcription** -> Preserve the accepted consent/source contract; a later audio-source change must resolve the missing participant and privacy model first.

## Migration Plan

1. Add disabled gateway configuration plus link, authorization-workflow, delivery, attempt, outbox, and cleanup persistence; infer no link or Discord identity for existing campaigns/accounts.
2. Add DM-only provider authorization, callback validation, exact destination confirmation, link views, unlinking, and cleanup while message dispatch stays disabled.
3. Add minimized preview rendering and current-source revalidation for member-visible session status and own latest rolls.
4. Enable outbound dispatch, delivery-state/idempotency handling, ambiguous outcome behavior, and connection verification behind an explicit rollout flag.
5. Add reconnect/reauthorization, campaign deletion, secret rotation, provider revocation, and adversarial no-inbound/no-audio tests before production enablement.
6. Select and record the exact Discord application identity, callbacks, provider permissions, secret storage/rotation, and operational test environment before enabling the gateway; no values are inferred from the README.

Rollback first disables new authorization, previews, confirmation, and dispatch. Claimed attempts reach a terminal or unknown outcome without automatic retry. Reusable local credentials are revoked/removed while minimum delivery audit records remain. Rollback does not edit external messages, import Discord data, or alter campaign/session/live-play state.

## Deferred configuration decisions

The exact Discord application/bot identity, callback URLs per environment, provider permission identifiers, credential-store/rotation parameters, rate-limit envelope, and operational test environment have no repository-supported values. They are mandatory finite operational configuration, not permission to broaden the capability: the gateway remains disabled until they are selected and tested, and none may enable inbound mutation or voice capture.
