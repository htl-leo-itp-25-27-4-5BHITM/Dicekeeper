# Proposal

## Why

Dicekeeper identifies Discord as a future way for groups to play online, but the existing sources do not define a safe association, audience, or delivery contract. A bounded first release is needed so a campaign can deliberately publish minimal session status and self-reported rolls to one Discord text channel without turning Discord identities, channel membership, messages, or audio into Dicekeeper authority.

## What Changes

- Add an owner-DM-controlled association between one Dicekeeper campaign and one Discord text channel, with provider-side channel authorization, explicit confirmation, connection state, unlinking, and campaign-cleanup behavior.
- Add explicit outbound sharing of a minimal active/completed session-status projection by the campaign DM and a current member's own latest validated self-reported roll by that member.
- Treat Discord as an external publication audience: preview the exact destination and payload before every send, disclose that Discord controls channel access and retained messages, and exclude private or unrelated Dicekeeper data.
- Add durable delivery identities and observable pending, sent, failed, or delivery-unknown outcomes so duplicate internal requests are idempotent, reconnect does not replay missed messages, and ambiguous external outcomes are not blindly retried.
- Keep Dicekeeper authentication, campaign membership, roles, session state, roll attribution, and source records authoritative. Discord accounts, roles, channel membership, messages, reactions, and commands grant no Dicekeeper access or mutation authority.
- Defer inbound chat or command synchronization, automatic status/roll mirroring, Discord-side Dicekeeper actions, player-account linking, multi-channel or multi-campaign links, prior-message deletion, Discord shared-view rendering, and all Discord audio or voice-channel capture.
- Preserve the accepted inert-transcript and no-voice-command boundaries; this change does not execute text, speech, or Discord content.

## Capabilities

### New Capabilities

- `discord-integration`: Campaign-to-channel association, minimized outbound session-status and roll sharing, audience disclosure, delivery idempotency, reconnect behavior, unlinking, cleanup, and explicit inbound/audio exclusions.

### Modified Capabilities

None. The current authentication, campaign-membership, live-play, live-synchronization, and session-view contracts remain authoritative, and the accepted future session and audio changes keep their existing ownership boundaries.

## Impact

- Future implementation will require a disabled-until-configured Discord application/bot adapter, server-side credentials, provider authorization callbacks, persistent campaign/channel links, outbound delivery records, role-filtered APIs and controls, and provider failure/revocation tests.
- `account-access`, `player-profiles`, `campaign-management`, `campaign-membership`, `live-play`, `session-views`, and `live-synchronization` remain upstream web authority and visibility contracts.
- Future `session-records` supplies the active/completed session lifecycle used by status sharing; `live-play` supplies the validated latest self-reported roll.
- No application source, current main spec, deployment/runtime configuration, Discord dependency, audio source, voice-command artifact, or prior future implementation task is changed by this planning work.
