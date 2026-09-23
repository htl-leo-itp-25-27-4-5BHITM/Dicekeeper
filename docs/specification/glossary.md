# Glossary

Definitions are organizational unless a published capability spec makes them normative. Section 8 reconciled the confirmed terms with all 14 main specs; `proposed` or `unresolved` meanings still require their owning decision before future behavior is finalized.

## Actors and identities

| Term | Original/source label | Status | Working definition |
| --- | --- | --- | --- |
| Guest | `Gast` | confirmed | A person without an authenticated Dicekeeper session. The current diagram connects the guest to login/registration. |
| Account | `Account`, Keycloak user | confirmed | The external identity used to authenticate and, where enabled, register. It is distinct from the local player record even when synchronized one-to-one; Dicekeeper stores no local password. |
| Player | `Spieler` | confirmed | The local Dicekeeper user/profile synchronized after authentication. A player may be a campaign member and may be DM for a campaign, but those roles do not grant access to account-private fields. |
| Public player summary | — | confirmed | The contextual identity fields another authenticated participant may see in an authorized workflow: player ID, username, display name, and avatar reference. Email and account settings are excluded. |
| Dungeon Master (DM) | `Dungeon Master`, `Spielleiter` | confirmed | The campaign-specific owner role assigned to the authenticated campaign creator. Each current campaign has exactly one DM; do not assume a global identity-provider role or a role-transfer workflow. |
| Campaign member | `Kampagnenspieler` / `Spieler in Kampagne` | confirmed | A player associated with a campaign as its sole `DM` or as a `PLAYER`. Roster, admission, leave/removal, and cleanup follow `campaign-membership`. |
| Character owner | `Charakterbesitzer` | confirmed | The single player who owns and may directly manage a character. Campaign DM status permits only contextual read access to a referenced character and never transfers ownership. The observed model still lacks this field, which is tracked as a correction. |
| Unrelated authenticated user | — | confirmed | An authenticated player who is neither the resource owner nor a member/DM of the relevant campaign. Used for denial scenarios. |
| Table screen / display client | `Tischbildschirm`, `Tischansicht` | confirmed current contract | A read-only shared presentation opened through and continuously bound to the authenticated campaign DM's authorization. It has no anonymous URL, reusable share token, or independent application identity; physical viewers are not application actors. |
| Shared view | `Tischbildschirm / Online-Gruppe`, `Tisch- oder Online-Übersicht` | proposed | Future generalization of the table view to local or online audiences. |
| Keycloak | `Keycloak` | confirmed | External identity provider used by the observed authentication flow. It owns authentication/registration and external-account deletion; Dicekeeper owns its synchronized local profile and dependent data. |
| OpenAI API | `OpenAI API` | future/proposed | External actor shown for AI story, NPC, encounter, rules, and recap candidates; the local chat UI is not evidence of this integration. |
| Speech-to-text service | `Speech-to-Text Service` | future/proposed | External transcription provider; provider, languages, retention, and failure behavior are unresolved. |
| Discord | `Discord Server / Discord Bot` | future/proposed | External platform actor for a future online-play integration. |
| Rules database | `Regelwerk-Datenbank` | future/proposed | Candidate rule corpus/service; source, edition, license/access, and citation behavior are unresolved. |

## Domain terms

| Term | Status | Working definition and boundary |
| --- | --- | --- |
| Campaign | confirmed | The persisted top-level game container: validated metadata, one owner/DM, player memberships, DM-only story, maps, and a one-way started flag. It is not a durable session history. |
| Campaign creation draft | confirmed current contract | In-progress campaign metadata recoverable only for the same player and browser session. It is not a server-side campaign and is cleared on successful creation or explicit discard. |
| Started campaign | confirmed | A campaign whose DM completed the one-way start transition after at least one player joined and every player character was approved. Started campaigns accept no new members; the flag does not create session history. |
| Game / live play | confirmed current contract | The interaction after the campaign's one-way start. Turn, current/maximum HP, active-player flags, and the latest self-reported dice result are campaign-scoped ephemeral runtime state: they survive client refresh while the authoritative runtime remains but are not durable session/encounter history. Map state and persisted decisions have separate owners and lifetimes. |
| Active player | confirmed current contract | A current `PLAYER` member included in manual turn selection. Only the campaign DM changes the active flag. Inactive means sitting out of turns, not leaving the campaign, losing HP, or becoming ineligible for a group decision. |
| Self-reported dice result | confirmed current contract | A standard-die value generated or manually entered by a current member and attributed by the server to that authenticated identity. Dicekeeper validates the die/range but does not claim server randomness, fairness, or a durable roll log. |
| Session | confirmed future plan | One durable bounded play occurrence within exactly one campaign. A campaign may contain multiple sessions; future sessions use `PLANNED`, `ACTIVE`, `COMPLETED`, and `ARCHIVED` lifecycle states, with at most one active session per campaign. No current implementation entity was found, and the term is never a synonym for authentication session. |
| Encounter | confirmed future record boundary | An optional bounded segment within exactly one session. A session may contain zero or more encounters, with at most one active encounter per session. The record may reference campaign content, maps, members, or characters but does not itself define initiative, conditions, damage, boss, or other combat rules owned by task 10. |
| Authentication session | confirmed | Browser/server state establishing the current external identity. Use the full phrase to avoid confusion with a play session. |
| Character | confirmed | A player-owned RPG record containing name, class, background, optional descriptive fields, level, and ability scores. Only a complete character is part of the owner's selectable library. |
| Character draft | confirmed current contract | In-progress creation input recoverable only for the same player, browser session, and standalone/campaign context. It is not a server-side character and is cleared on completion or explicit discard. |
| Character review state | confirmed | One of `NONE`, `PENDING`, `APPROVED`, or `REJECTED` on a `PLAYER` membership. Only owner submission/resubmission and same-campaign DM decisions may follow the closed transition table in `character-review`. |
| Campaign membership | confirmed | The association of a player with a campaign, including campaign-specific role and, for `PLAYER` memberships, one review state and optional character reference. |
| Public campaign | confirmed | An authenticated-discoverable campaign that accepts self-service join only while not started and below its `PLAYER` capacity. Public visibility never exposes story or raw review data. |
| Private campaign | confirmed | A campaign visible only to existing members. The current baseline has no self-service, invitation-code, or manual-add admission path; historical invitations are deferred. |
| Campaign story | confirmed | Manually authored DM-only story/background text. It is excluded from public/member reads and notifications; AI assistance is future task-11 scope. |
| Campaign content | confirmed future plan | Durable campaign-owned NPC, place, quest, or lore material managed only by the campaign DM. Records default to `DM_ONLY`, may be revealed to current members, use same-campaign references, and remain separate from current campaign story and later AI generation. |
| NPC | confirmed future content kind | A campaign-owned non-player-character description with optional typed relationships to other same-campaign content. Combat statistics and automation are not implied. |
| Place | confirmed future content kind | A campaign-owned location description that may reference a map owned by the same campaign. |
| Quest | confirmed future content kind | A campaign-owned objective or storyline with progress `PLANNED`, `ACTIVE`, `COMPLETED`, or `FAILED`; progress does not create rewards, items, advancement, or encounter outcomes. |
| Lore | confirmed future content kind | DM-authored campaign fact or narrative material with an explicit DM-only or member-visible audience. AI authority and generation remain task-11 decisions. |
| Session event | confirmed future plan | One immutable, ordered, durable record of a session/encounter lifecycle outcome, DM narrative entry, or later-integrated committed play outcome. Corrections append amendments; an event is not replayed as authoritative current live state. |
| Item / loot | deferred | Historical candidates without accepted inventory ownership, transfer, equipment, reward, character-mutation, audience, or deletion rules. Section 9 creates no item capability or implementation task. |
| Map | confirmed current contract | One of at most five optional images owned by a campaign. The DM selects the active map; each map anchors its own markers, fog, and undo history. Positive square, wide, and custom crops are accepted without tactical-grid semantics. |
| Marker / group | confirmed current contract | A DM-managed normalized position on one map. Player markers may be grouped or split without losing or duplicating current campaign players; structure, quest, and checkpoint markers are not player groups. |
| Fog of War | confirmed current contract | DM-controlled per-map hidden/revealed presentation. Non-DM viewers receive only the fog-respecting presentation; setup movement does not reveal areas, and confirmed fog reset is undoable. |
| Map viewport | confirmed | One client's local pan and zoom. Resetting the viewport does not mutate shared markers, fog, active-map selection, or undo state. |
| Group decision | confirmed current contract | One persisted DM-created yes/no question for a snapshot of current `PLAYER` members. Every eligible player votes at most once; full participation resolves to yes, no, or tie. The DM does not vote and may manually close only by cancellation. An overlapping legacy CRUD path has no separate planning meaning. |
| Notification | confirmed | A persisted recipient-owned review event with unread/read state and authorization-checked navigation. Submission/resubmission targets the DM; approval/rejection targets the affected player. |
| Player note | confirmed current contract | Plain private text namespaced by player and campaign in one browser-local profile. It survives refresh, sign-out/sign-in, and browser restart in that profile, but has no server copy, cross-device synchronization, collaborative audience, or recovery after local site-data loss. |
| Live synchronization | confirmed capability boundary | Observable propagation and recovery behavior for campaign updates, including SSE heartbeat/reconnect/revocation concerns. “Real-time” has no unconfirmed latency value. |
| Connection state | confirmed current contract | One of the user-observable synchronization conditions `connecting`, `current`, `stale/reconnecting`, `reconciling`, `revoked`, or `unavailable`. Cached campaign data is never labelled current while liveness or required recovery is unknown. |
| Supported device class | confirmed process term | A device/layout category on which the complete named workflow must remain reachable. Player live supports desktop, tablet, and phone; DM cockpit/live supports desktop and tablet; table projection supports shared desktop/large display and tablet landscape. This term does not imply an unconfirmed viewport number or browser version. |
| Media asset | confirmed current contract | A validated JPEG/PNG original owned by one profile or campaign, together with its authorization-equivalent derived variants, opaque reference, fallback, replacement, and cleanup obligations. |
| Capability | confirmed process term | A stable OpenSpec path owning one coherent set of normative requirements and scenarios. |

## Status terms

| Term | Meaning |
| --- | --- |
| Current | Within the present-application documentation horizon; not proof that every stated contract is implemented or accepted. |
| Future | Separately identified target behavior that must stay outside the current baseline until accepted. |
| Observed | Found in static source. It may be incomplete, defective, or unintended. |
| Accepted / confirmed | Explicitly chosen as controlling behavior or process scope. |
| Proposed | Candidate/default awaiting acceptance where behavior is consequential. |
| Implementation gap / deviation | Observed implementation differs from an accepted target; it belongs in a separate corrective change. |
| Deferred | Accounted for but intentionally not implementation-ready in the current roadmap. |
