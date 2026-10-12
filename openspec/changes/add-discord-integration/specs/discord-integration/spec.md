# discord-integration Specification

## Purpose

Defines a bounded outbound Discord text-channel integration for explicit campaign/session status and self-reported roll sharing, including association, audience, delivery recovery, duplicate handling, cleanup, and strict identity, inbound, audio, and voice-command exclusions.

## ADDED Requirements

### Requirement: DSI-001 Disabled-until-configured Discord gateway
Discord integration SHALL remain unavailable until Dicekeeper has one server-side Discord application/bot configuration with protected credentials, approved callback origins, an identifiable application version, and only the provider permissions required to identify a selected server/text channel and send messages there. Credentials MUST NOT enter browser output, outbound message content, ordinary logs, session history, or client-stored link data. Missing, expired, over-broad, or invalid configuration MUST fail closed without changing campaign, session, roll, membership, or Discord-link state.

#### Scenario: Discord configuration is ready
- **WHEN** the required server-side application identity, protected credentials, callback origins, and bounded permissions are configured
- **THEN** an eligible campaign DM may start the channel-link workflow without receiving any credential

#### Scenario: Configuration is missing or invalid
- **WHEN** any required Discord application setting is absent, expired, exposed to the client, or grants unsupported voice or inbound mutation authority
- **THEN** the system keeps Discord integration unavailable and creates no link or message delivery

#### Scenario: Gateway failure occurs
- **WHEN** Discord authentication, authorization, validation, rate limiting, or service availability prevents a gateway operation
- **THEN** Dicekeeper reports an explicit unavailable or failed outcome and changes no owning campaign, session, membership, or roll state

### Requirement: DSI-002 DM-authorized one-to-one campaign and text-channel association
Only the authenticated Dicekeeper owner-DM SHALL be able to link their campaign to Discord. Linking SHALL require a provider-side grant by a Discord account authorized by Discord to select the destination plus a separate Dicekeeper confirmation that shows the campaign, Discord server, text channel, external-audience warning, and granted permission summary. One campaign SHALL have at most one active Discord text-channel link, and one Discord text channel SHALL be linked to at most one Dicekeeper campaign. A voice channel, direct message, thread, forum, missing channel, unsupported channel type, or channel already linked elsewhere MUST be rejected.

The link SHALL associate the Dicekeeper campaign and its owner-DM audit identity with opaque Discord application-installation, server, and channel identifiers. The Discord account that grants provider access MUST NOT become a Dicekeeper account, campaign member, DM, or authenticated session, and this first release SHALL create no persistent player-to-Discord-account mapping.

#### Scenario: Owner-DM links an available text channel
- **WHEN** the authenticated owner-DM completes a valid provider grant, reviews the exact campaign/server/text-channel association and warning, and confirms it
- **THEN** the system creates one active link for that campaign and channel with no player-to-Discord-account mapping

#### Scenario: Ordinary member starts linking
- **WHEN** a current player member, former member, unrelated authenticated user, guest, or display client attempts to link a campaign
- **THEN** the system denies the workflow and creates no link

#### Scenario: Discord grant is not bound to the current DM workflow
- **WHEN** a callback has missing, expired, replayed, wrong-campaign, wrong-user, or otherwise invalid workflow state
- **THEN** the system rejects it and does not associate any campaign or channel

#### Scenario: Provider account lacks channel authority
- **WHEN** Discord does not authorize the granting account or bot application for the selected destination
- **THEN** Dicekeeper reports that the channel cannot be linked and stores no active association

#### Scenario: Unsupported or occupied destination is selected
- **WHEN** the DM selects a voice channel, direct message, thread, forum, missing channel, or text channel already linked to another campaign
- **THEN** the system rejects the selection and preserves every existing link

#### Scenario: Discord identity is presented later
- **WHEN** a Discord username, user identifier, server role, or channel membership is observed after linking
- **THEN** the system grants no Dicekeeper identity, membership, role, read access, or action authority from that value

### Requirement: DSI-003 Link visibility, lifecycle, unlinking, and cleanup
The owner-DM SHALL be able to read the linked Discord server/channel display identity, link state, last successful verification time, and minimum delivery-status summary for their campaign. Other campaign members SHALL be able to see only that outbound Discord sharing is available or unavailable and the destination display name needed to confirm their own share; they MUST NOT receive provider credentials, installation identifiers, grant-account details, or another sender's delivery audit.

Only the owner-DM SHALL be able to unlink or replace the destination, and unlinking SHALL require confirmation. Unlinking SHALL stop new sends, cancel undispatched deliveries, revoke or invalidate the stored provider authorization where supported, and remove reusable local credentials. It SHALL NOT claim to delete, edit, or retract messages already retained by Discord. Campaign deletion SHALL perform the same local/provider cleanup; an unresolved required revocation SHALL be an incomplete cleanup obligation rather than successful completion.

#### Scenario: DM views link state
- **WHEN** the owner-DM opens Discord settings for the campaign
- **THEN** the system shows the confirmed destination and current connection/verification state without exposing credentials

#### Scenario: Member prepares an own-roll share
- **WHEN** a current member opens the explicit share action
- **THEN** the system shows only the destination display name and availability needed to confirm that member's own payload

#### Scenario: DM confirms unlink
- **WHEN** the owner-DM confirms unlinking the campaign
- **THEN** the system disables new sharing, cancels undispatched deliveries, removes reusable local authorization, and marks the association unlinked

#### Scenario: DM cancels unlink
- **WHEN** the owner-DM does not confirm unlinking
- **THEN** the active link and its delivery eligibility remain unchanged

#### Scenario: Non-DM attempts unlink or replacement
- **WHEN** any non-owner actor attempts to unlink or replace the campaign destination
- **THEN** the system denies the action and preserves the current link

#### Scenario: Past Discord messages exist
- **WHEN** a campaign is unlinked, relinked, or deleted after messages were sent
- **THEN** Dicekeeper discloses that previously delivered external messages may remain under Discord's retention and channel controls and does not report them deleted

#### Scenario: Provider revocation cleanup fails
- **WHEN** required provider-side authorization cleanup cannot be completed
- **THEN** the system blocks further sends, records a retryable cleanup obligation, and does not report complete cleanup

### Requirement: DSI-004 Explicit external audience and minimized payload boundary
Discord SHALL be treated as an external publication audience, not as an authorized Dicekeeper view. Before each outbound share, the authenticated sender SHALL see and explicitly confirm the exact campaign, Discord server/channel, message kind, and complete outbound payload. The payload SHALL contain only the fields allowed by DSI-005 or DSI-006 plus an indication that Dicekeeper supplied the message. It MUST NOT contain account identifiers or email, campaign story, DM notes, character details, HP, turn/activity state, group-decision data, individual votes, player notes, notifications, maps or media, fog, content/history beyond the named session status, AI material, recaps, rule answers, audio, transcripts, credentials, or hidden/internal identifiers.

Dicekeeper SHALL warn that it cannot use Discord channel membership to enforce Dicekeeper membership and that Discord-side viewers may copy or retain a delivered message. Link creation alone MUST NOT authorize or automatically publish any campaign data.

#### Scenario: Sender previews an allowed message
- **WHEN** an eligible DM or member requests a supported share
- **THEN** the system shows the exact destination, minimized payload, and external-audience warning before any provider dispatch

#### Scenario: Sender cancels confirmation
- **WHEN** the sender does not confirm the preview
- **THEN** the system creates no delivery and sends no campaign data to Discord

#### Scenario: Payload contains an excluded field
- **WHEN** a requested status or roll message includes a private, hidden, unrelated, or unsupported field
- **THEN** the system rejects the whole send rather than silently publishing or broadening the payload

#### Scenario: Channel membership changes
- **WHEN** Discord users or roles gain or lose access to the linked channel
- **THEN** Dicekeeper grants no application access, changes no campaign membership, and continues to require explicit preview and confirmation for any later send

#### Scenario: Link is created
- **WHEN** a campaign first becomes linked to a channel
- **THEN** the system sends no status, roll, history, or test content unless the DM separately confirms a supported test or share payload

### Requirement: DSI-005 DM-shared session status
Only the authenticated owner-DM SHALL be able to share a session-status message. The source SHALL be one same-campaign future `session-records` session with audience `MEMBERS` and current status `ACTIVE` or `COMPLETED`. The outbound payload SHALL contain only the campaign name, session title, the exact `ACTIVE` or `COMPLETED` status, the authoritative transition time, and Dicekeeper origin. Planned, archived, DM-only, missing, stale, or different-campaign sessions MUST NOT be shared. Sharing SHALL be an explicit snapshot publication and MUST NOT create or change the session, append a session event, start a continuous mirror, or automatically edit an earlier Discord message.

#### Scenario: DM shares an active member session
- **WHEN** the owner-DM previews and confirms the status of a same-campaign `MEMBERS` session that is `ACTIVE`
- **THEN** the system dispatches one minimized active-session status snapshot to the linked channel

#### Scenario: DM shares a completed member session
- **WHEN** the owner-DM previews and confirms the status of a same-campaign `MEMBERS` session that is `COMPLETED`
- **THEN** the system dispatches one minimized completed-session status snapshot with the authoritative completion time

#### Scenario: Session is private or ineligible
- **WHEN** the source session is `DM_ONLY`, planned, archived, missing, stale, or belongs to another campaign
- **THEN** the system rejects the share and sends no session data

#### Scenario: Ordinary member shares session status
- **WHEN** a player member attempts to publish a session-status message
- **THEN** the system denies the action and creates no delivery

#### Scenario: Session changes after a status post
- **WHEN** the source session later changes from active to completed or is archived
- **THEN** Dicekeeper does not edit or retract the prior Discord message and requires a new DM-confirmed eligible status share

### Requirement: DSI-006 Member-shared own latest roll
An authenticated current campaign member, including the owner-DM, SHALL be able to share only their own current latest validated self-reported roll while exactly one same-campaign session is `ACTIVE`. The source roll SHALL still be the campaign's authoritative latest roll, SHALL be attributed by `live-play` to the authenticated sender, and SHALL use a supported die and in-range integer result. The outbound payload SHALL contain only the campaign name, active session title, sender's Dicekeeper display name, die type, result, whether the source was browser-generated or manually entered, source time, self-reported label, and Dicekeeper origin.

A sender MUST NOT share another member's roll, an overwritten prior roll, a client-invented value, or a roll from another campaign. Discord delivery SHALL NOT create a durable Dicekeeper roll history, change the latest roll, imply server randomness or fairness, or append session history.

#### Scenario: Player shares their own current roll
- **WHEN** a current player confirms a minimized share for the authoritative latest roll attributed to that player during the active session
- **THEN** the system dispatches one self-reported roll message to the linked channel without changing live-play state

#### Scenario: DM shares their own current roll
- **WHEN** the owner-DM confirms a share for the current latest roll attributed to the DM
- **THEN** the system sends the same bounded roll fields and identifies the Dicekeeper display name as the sender

#### Scenario: Sender targets another member's roll
- **WHEN** a member or DM attempts to share a latest roll attributed to a different Dicekeeper identity
- **THEN** the system denies the share and sends no roll data

#### Scenario: Roll is stale or invalid
- **WHEN** the requested roll was overwritten, is no longer the authoritative latest roll, has unsupported die/result data, or belongs to another campaign
- **THEN** the system rejects the share and preserves the current Discord and live-play state

#### Scenario: No active session exists
- **WHEN** a member attempts roll sharing with no same-campaign `ACTIVE` session or with more than one invalidly active session
- **THEN** the system reports the session prerequisite and sends no roll

#### Scenario: Former member retries a roll share
- **WHEN** the sender's campaign membership has been removed before dispatch authorization
- **THEN** the system denies the delivery even if the browser retained an earlier preview

### Requirement: DSI-007 Durable delivery identity and duplicate handling
Each confirmed outbound share SHALL create one durable Dicekeeper delivery record with a unique idempotency identity, immutable payload hash and source snapshot references, sender, campaign, session, link version, attempt state, and provider message identifier when confirmed. Delivery states SHALL distinguish at least `PENDING`, `SENT`, `FAILED`, `DELIVERY_UNKNOWN`, and `CANCELLED`. Repeated or concurrent processing of the same idempotency identity MUST resolve to the same delivery and MUST NOT intentionally create another Discord message. A late or duplicate provider response MUST NOT replace a newer terminal state.

A confirmed provider rejection SHALL produce `FAILED` and may be deliberately retried only after fresh link, source, sender, and payload checks. A timeout or lost acknowledgement where external acceptance cannot be proven SHALL produce `DELIVERY_UNKNOWN`; Dicekeeper MUST NOT retry it automatically or claim either success or failure. A deliberate new send after `DELIVERY_UNKNOWN` SHALL require a new preview and warning that Discord may already contain the prior message.

#### Scenario: One confirmed share is processed
- **WHEN** Discord accepts the outbound payload and returns a message identity
- **THEN** the system records one `SENT` delivery associated with that provider message

#### Scenario: Duplicate internal request arrives
- **WHEN** the same idempotency identity is submitted or processed more than once
- **THEN** the system returns the existing delivery outcome and performs no additional intentional provider dispatch

#### Scenario: Concurrent duplicate requests race
- **WHEN** two workers or clients process one share identity concurrently
- **THEN** at most one durable delivery owns the dispatch and both callers observe that record

#### Scenario: Provider rejects the message
- **WHEN** Discord returns a definitive rejection before accepting the payload
- **THEN** the system records `FAILED`, reports the reason safely, and changes no source state

#### Scenario: Provider acknowledgement is ambiguous
- **WHEN** a timeout or connection loss prevents Dicekeeper from knowing whether Discord accepted the message
- **THEN** the system records `DELIVERY_UNKNOWN`, performs no blind retry, and does not label the message sent or failed

#### Scenario: Sender deliberately resends an unknown delivery
- **WHEN** the eligible sender chooses to send again after reviewing the unknown outcome and duplicate warning
- **THEN** the system performs fresh authorization and source checks and creates a separately confirmed delivery identity

### Requirement: DSI-008 Disconnect, reauthorization, reconnect, and no backfill
Dicekeeper SHALL make a link's `CONNECTED`, `DEGRADED`, `DISCONNECTED`, `REAUTHORIZATION_REQUIRED`, and `UNLINKED` conditions observable to the owner-DM and shall expose only availability needed by another member's own share action. Bot removal, channel deletion, permission loss, invalid credentials, or provider revocation SHALL stop new sends and move the link out of `CONNECTED`. Transient provider unavailability MAY move the link to `DEGRADED` without changing the association.

Restoring a revoked or disconnected link SHALL require the owner-DM to repeat provider authorization where needed, reselect or verify the same text channel, and confirm the association in Dicekeeper. Reconnect MUST NOT choose a fallback channel, replay missed session transitions or rolls, resend failed/unknown deliveries automatically, or reconstruct messages from session history or cached client data. After reconnect, only a newly confirmed current eligible snapshot SHALL be sent.

#### Scenario: Discord becomes temporarily unavailable
- **WHEN** a linked channel cannot be reached because of a transient provider outage
- **THEN** the system exposes a degraded or failed delivery outcome and leaves Dicekeeper campaign/session/roll behavior usable

#### Scenario: Bot is removed or channel access is revoked
- **WHEN** the bot installation, selected channel, or required send permission no longer exists
- **THEN** the system marks the link disconnected or requiring reauthorization and blocks later dispatches

#### Scenario: DM reconnects the same destination
- **WHEN** the owner-DM completes fresh provider authorization, verifies the destination, and confirms the association
- **THEN** the system returns the link to connected without changing Dicekeeper roles or source state

#### Scenario: Reconnect proposes a different channel
- **WHEN** provider authorization resolves to a different channel than the recorded association
- **THEN** the system requires explicit unlink/relink confirmation and does not silently redirect messages

#### Scenario: Events occurred while disconnected
- **WHEN** sessions changed or members rolled while the link was unavailable
- **THEN** reconnect sends no backlog and requires a new eligible DM/member-confirmed share for any current snapshot

#### Scenario: Client cache claims the link is connected
- **WHEN** an authoritative verification says the link is disconnected or reauthorization is required
- **THEN** the system ignores cached availability and prevents the send

### Requirement: DSI-009 Discord identities and inbound content grant no Dicekeeper authority
Dicekeeper authentication and the owning campaign/session/live-play permissions SHALL remain authoritative for every link and share action. Discord accounts, server ownership, roles, channel membership, messages, reactions, mentions, slash commands, buttons, webhooks, dice bots, and attachments MUST NOT authenticate a Dicekeeper actor, create or remove campaign membership, grant DM authority, satisfy confirmation, or invoke a Dicekeeper query or mutation. This first release SHALL NOT ingest or mirror Discord chat and SHALL NOT accept Discord-originated rolls, status, commands, rule questions, votes, notes, maps, AI inputs, session events, or other product data.

#### Scenario: Discord channel member is not a Dicekeeper member
- **WHEN** a person can read or write the linked Discord channel but has no current Dicekeeper campaign membership
- **THEN** the person receives no Dicekeeper API or view access and cannot perform a link or share action

#### Scenario: Discord administrator is not the campaign DM
- **WHEN** a Discord server administrator or app installer lacks the Dicekeeper owner-DM role
- **THEN** provider authority alone cannot link, unlink, configure, or publish campaign status

#### Scenario: Discord message resembles a command
- **WHEN** a message, slash command, reaction, button, webhook, attachment, or bot output asks Dicekeeper to roll, change status, mutate state, or answer a rule question
- **THEN** Dicekeeper performs no query or mutation and creates no authenticated actor from that content

#### Scenario: Discord posts a dice result
- **WHEN** a channel user or external dice bot posts a roll
- **THEN** the system does not import it into `live-play`, session history, or another Dicekeeper capability

#### Scenario: Dicekeeper membership changes
- **WHEN** a player joins, leaves, is removed, or loses Dicekeeper access
- **THEN** no Discord role or channel membership is created or removed automatically, and later share authorization follows the current Dicekeeper membership only

### Requirement: DSI-010 Text-only first-release and deferred Discord scope
The first Discord release SHALL be limited to the confirmed text-channel association and explicit outbound messages defined above. It MUST NOT join, receive, record, stream, or transcribe a Discord voice channel; accept uploaded Discord audio; route remote Discord audio into `audio-transcription`; or treat Discord participants as the section-13 selected microphone/consent population. The accepted `audio-transcription` source SHALL remain the owner-DM's explicitly selected browser microphone under its active-session and consent contract.

Discord text, audio, speaker names, and provider identities SHALL remain inert and MUST NOT revive executable voice commands. Automatic status/roll mirroring, inbound chat/command synchronization, Discord account linking, multiple channels per campaign, one channel shared by multiple campaigns, shared-view/map/HP delivery, transcript or recap delivery, Discord message editing/deletion, and historical message backfill are explicitly deferred because the reviewed sources do not define their authority, audience, consent, retention, or correction behavior.

#### Scenario: DM selects a Discord voice channel
- **WHEN** the DM attempts to link, join, capture, or transcribe a Discord voice channel
- **THEN** the system rejects the workflow and leaves the section-13 microphone source and consent boundary unchanged

#### Scenario: Discord supplies audio or a transcript
- **WHEN** Discord provides live audio, an audio attachment, a generated transcript, or speaker metadata
- **THEN** Dicekeeper imports none of it and creates no audio-transcription record, session event, recap input, identity, or command

#### Scenario: Discord content contains a voice command
- **WHEN** text or audio from Discord asks Dicekeeper to execute an action
- **THEN** the content remains outside Dicekeeper and no voice-command behavior is created

#### Scenario: Caller requests a full online shared view
- **WHEN** a caller asks Discord integration to publish maps, fog, initiative, HP, character sheets, votes, recaps, or continuous live state
- **THEN** the system reports that the first release supports only the explicit minimized status and own-roll messages and sends none of the requested fields

#### Scenario: Caller requests an automatic mirror or prior-message cleanup
- **WHEN** a caller asks Dicekeeper to mirror every event, replay missed messages, edit or delete prior Discord posts, or synchronize historical content
- **THEN** the system reports that the behavior is deferred and leaves existing Dicekeeper and Discord state unchanged
