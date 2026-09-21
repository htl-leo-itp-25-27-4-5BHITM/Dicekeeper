# Coverage Matrix

## Coverage rules and totals

The two PlantUML files are canonical for diagram coverage. Markdown, DOT, and SVG renderings are duplicate representations (SRC-04) and are not counted separately.

| Source | Expected | Recorded | Unique prefixed IDs | Owning task assigned |
| --- | ---: | ---: | --- | --- |
| SRC-02 current diagram | 33 | 33 | Yes, `CUR-*` | 33/33 |
| SRC-03 future diagram | 22 | 22 | Yes, `FUT-*` | 22/22 |
| Total | 55 | 55 | 55/55 | 55/55 |

“Contract pending” means the use case is inside the confirmed documentation horizon but its exact desired behavior is not yet accepted. Requirement/scenario references remain pending until the owning task writes them.

## Capability ownership

| Capability | Scope | Owning task | Baseline proposal |
| --- | --- | ---: | --- |
| `account-access` | current | 2 | Included |
| `player-profiles` | current | 2 | Included |
| `character-library` | current | 3 | Included |
| `campaign-management` | current | 4 | Included |
| `campaign-membership` | current | 4 | Included |
| `character-review` | current | 4 | Included |
| `notifications` | current | 4 | Included |
| `campaign-maps` | current | 5 | Included |
| `media-assets` | current | 5 | Included |
| `live-play` | current | 6 | Included |
| `group-decisions` | current | 6 | Included |
| `player-notes` | current | 6 | Included |
| `session-views` | current; includes deciding target device/view candidates | 7 | Included |
| `live-synchronization` | current | 7 | Included |
| `campaign-content`, `session-records` | future | 9 | Separate future change after decision |
| `combat-automation`, `character-progression` | future | 10 | Separate future change after decision |
| `ai-campaign-assistance`, `session-recaps` | future | 11 | Separate future change after decision |
| `rule-assistance` | future | 12 | Separate future change after decision |
| `audio-transcription`, conditional `voice-commands` | future | 13 | Separate future change after decision |
| `discord-integration` | future | 14 | Separate future change after decision |

## Current diagram: 33 use cases

Source: [`docs/usecase-aktueller-stand.puml`](../usecase-aktueller-stand.puml) (SRC-02).

| Stable ID | Original alias and label | Actor / relationship | Capability | Owner | Scope / decision / evidence / disposition |
| --- | --- | --- | --- | ---: | --- |
| CUR-UCLogin | `UCLogin` — Einloggen / registrieren | Guest and external Keycloak direct | `account-access` | 2 | current / confirmed / ACC-E01–03 source-observed partial / [`ACC-001`–`ACC-005`](../../openspec/changes/document-dicekeeper-baseline/specs/account-access/spec.md), including “Guest starts sign-in”, “First successful sign-in”, “Session expires during use”, and “Successful logout” |
| CUR-UCProfile | `UCProfile` — Profil und Avatar verwalten | Player direct | `player-profiles` | 2 | current / confirmed / PRO-E01–04 source-observed with deviations / [`PRO-001`–`PRO-007`](../../openspec/changes/document-dicekeeper-baseline/specs/player-profiles/spec.md), including own profile, contextual summary, edit/avatar denial, missing account, and deletion scenarios |
| CUR-UCNotifications | `UCNotifications` — Benachrichtigungen lesen | Player direct | `notifications` | 4 | current / confirmed / NOT-E01 source-observed with navigation/cleanup gaps / [`NOT-001`–`NOT-006`](../../openspec/changes/document-dicekeeper-baseline/specs/notifications/spec.md), including recipient-only inbox/count, read-all, denied cross-user access, event recipients, safe navigation, deletion, and dependent cleanup |
| CUR-UCCharacter | `UCCharacter` — Charakter erstellen oder bearbeiten | Player direct; includes CUR-UCCharacterDetails | `character-library` | 3 | current / confirmed / CHAR-E01–07 source-observed with deviations / [`CHAR-001`, `CHAR-003`–`CHAR-008`](../../openspec/changes/document-dicekeeper-baseline/specs/character-library/spec.md), including owned access, draft recovery, validated creation/editing, selection, reference locks, deletion, and progression boundary |
| CUR-UCCharacterDetails | `UCCharacterDetails` — Ability Scores, Klasse und Background festlegen | Included by CUR-UCCharacter | `character-library` | 3 | current / confirmed / CHAR-E02–04 source-observed with validation gaps / [`CHAR-002`, `CHAR-003`, `CHAR-005`](../../openspec/changes/document-dicekeeper-baseline/specs/character-library/spec.md), including reference availability, invalid references, point allocation, and atomic edit scenarios |
| CUR-UCBrowseCampaigns | `UCBrowseCampaigns` — Kampagnen ansehen | Player direct | `campaign-management` | 4 | current / confirmed / CAM-E01 source-observed with raw-list deviations / [`CAM-003` and `CAM-004`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-management/spec.md), including authenticated public previews, private-member detail, missing/private denial, and DM-only story |
| CUR-UCJoinCampaign | `UCJoinCampaign` — Kampagne beitreten | Player direct | `campaign-membership` | 4 | current / confirmed public pre-start admission; private invitations deferred / MEM-E02 source-observed partial / [`MEM-002`–`MEM-004`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-membership/spec.md), including duplicate/full/private/guest/started denial and concurrent final-place behavior |
| CUR-UCSubmitCharacter | `UCSubmitCharacter` — Charakter für Kampagne einreichen | Player direct | `character-review` | 4 | current / confirmed / REV-E01/02 source-observed with authorization gaps / [`REV-001`, `REV-002`, `REV-004`–`REV-007`](../../openspec/changes/document-dicekeeper-baseline/specs/character-review/spec.md), including owned complete submission, resubmission/replacement, reuse, locks, and denied actors/states |
| CUR-UCLeaveCampaign | `UCLeaveCampaign` — Kampagne verlassen | Player direct | `campaign-membership` | 4 | current / confirmed / MEM-E03 source-observed with confirmation/cleanup gaps / [`MEM-005` and `MEM-007`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-membership/spec.md), including self/other/DM boundaries, cancellation, access revocation, and character-reference cleanup |
| CUR-UCPlayerView | `UCPlayerView` — Spieleransicht verwenden | Player direct; includes map, character, dice, vote, notes, and real-time cases | `session-views` | 7 | current / view contract pending / diagram plus source-observed / specify in task 7 |
| CUR-UCViewMap | `UCViewMap` — Karte ansehen | Included by CUR-UCPlayerView | `campaign-maps` | 5 | current / visibility pending / diagram plus source-observed / specify in task 5 |
| CUR-UCViewCharacter | `UCViewCharacter` — Charakterwerte und HP anzeigen | Included by CUR-UCPlayerView | `session-views` | 7 | current / field visibility pending / diagram plus source-observed / specify in task 7 |
| CUR-UCRollDice | `UCRollDice` — Würfeln | Included by CUR-UCPlayerView | `live-play` | 6 | current / trust and publication pending / diagram plus client-supplied result / specify in task 6 |
| CUR-UCVote | `UCVote` — Bei Gruppenentscheidungen abstimmen | Included by CUR-UCPlayerView | `group-decisions` | 6 | current / eligibility/quorum pending / diagram plus source-observed / specify in task 6 |
| CUR-UCNotes | `UCNotes` — Notizen pflegen | Included by CUR-UCPlayerView | `player-notes` | 6 | current / persistence promise pending / diagram plus browser-local evidence / specify in task 6 |
| CUR-UCCreateCampaign | `UCCreateCampaign` — Kampagne erstellen | DM direct | `campaign-management` | 4 | current / confirmed / CAM-E02/03 source-observed with validation/draft gaps / [`CAM-001` and `CAM-002`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-management/spec.md), including creator-as-DM, privileged-field denial, invalid inputs, atomic creation, and isolated draft recovery/discard |
| CUR-UCEditCampaign | `UCEditCampaign` — Kampagne bearbeiten oder löschen | DM direct; includes campaign data and map upload | `campaign-management` | 4 | current / confirmed / CAM-E02/05 source-observed partial / [`CAM-005` and `CAM-007`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-management/spec.md), including owner-only atomic edit, capacity floor, confirmation, denied deletion, and dependent cleanup; map details remain task 5 |
| CUR-UCManageCampaignData | `UCManageCampaignData` — Story, Sichtbarkeit und Spielerlimit pflegen | Included by CUR-UCEditCampaign | `campaign-management` | 4 | current / confirmed / CAM-E01–03 source-observed with deviations / [`CAM-003`–`CAM-005`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-management/spec.md), including sanitized visibility, DM-only manual story, valid capacity, and member edit denial |
| CUR-UCUploadMap | `UCUploadMap` — Karte hochladen und zuschneiden | Included by CUR-UCEditCampaign | `media-assets` | 5 | current / validation/access/cleanup pending / diagram plus source-observed / specify in task 5 |
| CUR-UCManagePlayers | `UCManagePlayers` — Spieler verwalten | DM direct | `campaign-membership` | 4 | current / confirmed / MEM-E01/03 source-observed with visibility/cleanup gaps / [`MEM-001`, `MEM-006`, and `MEM-007`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-membership/spec.md), including scoped roster, DM-only confirmed kick, protected DM role, missing target, revocation, and reference cleanup |
| CUR-UCReviewCharacters | `UCReviewCharacters` — Charaktere prüfen, genehmigen oder ablehnen | DM direct; included by CUR-UCCockpit | `character-review` | 4 | current / confirmed / REV-E01/02 source-observed with deviations / [`REV-001`–`REV-007`](../../openspec/changes/document-dicekeeper-baseline/specs/character-review/spec.md), including the closed transition table, same-campaign DM authority, notes validation, independent reuse, terminal approval, and review-data visibility |
| CUR-UCStartCampaign | `UCStartCampaign` — Kampagne starten | DM direct | `campaign-management` | 4 | current / confirmed / CAM-E04 source-observed UI-only prerequisites / [`CAM-006`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-management/spec.md) and [`MEM-004`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-membership/spec.md), including at least one player, all-complete-approved characters, denied/repeated/reset cases, and closed admission |
| CUR-UCCockpit | `UCCockpit` — DM-Cockpit nutzen | DM direct; includes review and marker cases | `session-views` | 7 | current / view/permission contract pending / diagram plus source-observed / specify in task 7 |
| CUR-UCGMView | `UCGMView` — Spielsitzung leiten | DM direct; includes turn, HP, markers, fog, decisions, dice, and real-time cases | `session-views` | 7 | current / view/permission contract pending / diagram plus source-observed / specify in task 7 |
| CUR-UCTurn | `UCTurn` — Spielzug / Initiative setzen | Included by CUR-UCGMView | `live-play` | 6 | current / authority and transitions pending / diagram plus in-memory source / specify in task 6 |
| CUR-UCHP | `UCHP` — HP verwalten | Included by CUR-UCGMView | `live-play` | 6 | current / validation/authority pending / diagram plus source and unexecuted tests / specify in task 6 |
| CUR-UCMarkers | `UCMarkers` — Kartenmarker und Gruppen verwalten | Included by cockpit and GM view | `campaign-maps` | 5 | current / authority/lifetime pending / diagram plus in-memory source / specify in task 5 |
| CUR-UCFog | `UCFog` — Fog of War verwalten | Included by GM and table views | `campaign-maps` | 5 | current / member-write discrepancy pending / diagram plus source-observed / specify in task 5 |
| CUR-UCDecisions | `UCDecisions` — Gruppenentscheidungen erstellen und abschließen | Included by CUR-UCGMView | `group-decisions` | 6 | current / API meaning and closure pending / diagram plus overlapping source / specify in task 6 |
| CUR-UCDMDice | `UCDMDice` — Würfelergebnis anzeigen oder setzen | Included by CUR-UCGMView | `live-play` | 6 | current / trust and audience pending / diagram plus source-observed / specify in task 6 |
| CUR-UCOpenTable | `UCOpenTable` — Tischansicht öffnen | DM direct; includes CUR-UCTableView | `session-views` | 7 | current / access-token model pending / diagram plus source-observed / specify in task 7 |
| CUR-UCTableView | `UCTableView` — Tischansicht anzeigen | TableScreen direct; included by CUR-UCOpenTable; includes real-time and fog | `session-views` | 7 | current / audience/action boundary pending / diagram plus source-observed / specify in task 7 |
| CUR-UCRealtime | `UCRealtime` — Spielstand in Echtzeit synchronisieren | Included by player, GM, and table views | `live-synchronization` | 7 | current / recovery and measurable behavior pending / diagram plus SSE source / specify in task 7 |

## Future diagram: 22 use cases

Source: [`docs/usecase-sollzustand-5-klasse.puml`](../usecase-sollzustand-5-klasse.puml) (SRC-03).

| Stable ID | Original alias and label | Actor / relationship | Capability | Owner | Scope / decision / evidence / disposition |
| --- | --- | --- | --- | ---: | --- |
| FUT-UCPrepare | `UCPrepare` — Kampagne planen und vorbereiten | DM direct; includes story, NPC, and encounter AI | `campaign-content` | 9 | future / proposed / diagram and historical context / decide and plan in task 9 |
| FUT-UCStoryAI | `UCStoryAI` — Story, Questideen und Twists generieren | Included by FUT-UCPrepare; external OpenAI | `ai-campaign-assistance` | 11 | future / proposed / diagram plus README/history / decide and plan in task 11 |
| FUT-UCNpcAI | `UCNpcAI` — NPCs und Orte KI-gestützt erstellen | Included by FUT-UCPrepare; external OpenAI | `ai-campaign-assistance` | 11 | future / proposed / diagram plus README/history / decide and plan in task 11 |
| FUT-UCBalanceAI | `UCBalanceAI` — Begegnungen und Bosskämpfe balancen | Included by FUT-UCPrepare; external OpenAI | `ai-campaign-assistance` | 11 | future / proposed; depends on combat rules / diagram / decide and plan in task 11 |
| FUT-UCCombat | `UCCombat` — Kampfszene verwalten | DM direct; includes automation and shared view; may be extended by interpreted commands | `combat-automation` | 10 | future / proposed / diagram plus README ambition / decide and plan in task 10 |
| FUT-UCCombatAutomation | `UCCombatAutomation` — Initiative, HP, Zustände und Effekte automatisieren | Included by FUT-UCCombat | `combat-automation` | 10 | future / proposed / diagram/history / decide and plan in task 10 |
| FUT-UCRuleQuestion | `UCRuleQuestion` — Regelfrage stellen | DM and Player direct; includes answer; may be extended by interpreted commands | `rule-assistance` | 12 | future / proposed / diagram plus README/history / decide and plan in task 12 |
| FUT-UCRuleAnswer | `UCRuleAnswer` — Regelstelle suchen und Antwort erklären | Included by question; external OpenAI and Rules database | `rule-assistance` | 12 | future / proposed / corpus and authority unresolved / decide and plan in task 12 |
| FUT-UCVoiceCommand | `UCVoiceCommand` — Sprachbefehle geben | DM direct; includes transcription and command interpretation | `voice-commands` | 13 | future / unresolved due SRC-09 conflict / decide separately in task 13 |
| FUT-UCTranscribe | `UCTranscribe` — Audio in Text umwandeln | Included by voice command, player voice, and session log; external speech service | `audio-transcription` | 13 | future / proposed / diagram and transcription-only history / decide and plan in task 13 |
| FUT-UCInterpretCommand | `UCInterpretCommand` — Befehl interpretieren und Aktion ausführen | Included by voice-command cases; extends combat and rule question | `voice-commands` | 13 | future / unresolved / diagram conflicts with transcription-only answer / decide in task 13 |
| FUT-UCDiscordSession | `UCDiscordSession` — Session online über Discord spielen | DM direct; includes sync and status | `discord-integration` | 14 | future / proposed / diagram plus README/history / decide and plan in task 14 |
| FUT-UCSyncDiscord | `UCSyncDiscord` — Discord-Kanal mit Dicekeeper synchronisieren | Included by Discord session; external Discord | `discord-integration` | 14 | future / proposed / association and permission model unresolved / task 14 |
| FUT-UCDiscordStatus | `UCDiscordStatus` — Würfe und Spielstatus in Discord anzeigen | Included by Discord session; external Discord | `discord-integration` | 14 | future / proposed / audience and event semantics unresolved / task 14 |
| FUT-UCMobilePlayer | `UCMobilePlayer` — Spieleransicht mobil oder am Tablet nutzen | Player direct; includes FUT-UCPlayerRealtime | `session-views` | 7 | future target inside view decision / proposed / diagram plus README/history / resolve in task 7 |
| FUT-UCPlayerVoice | `UCPlayerVoice` — Per Sprache würfeln oder Aktion ansagen | Player direct; includes transcription and interpretation | `voice-commands` | 13 | future / unresolved / diagram versus transcription-only history / task 13 |
| FUT-UCPlayerDecision | `UCPlayerDecision` — Gruppenentscheidungen treffen | Player direct | `group-decisions` | 6 | current-capability continuation shown in future diagram / proposed details / reconcile in task 6 |
| FUT-UCPlayerRealtime | `UCPlayerRealtime` — Charakterbogen und Karte in Echtzeit nutzen | Included by FUT-UCMobilePlayer | `session-views` | 7 | future device/view target / proposed / diagram plus current partial implementation / task 7 |
| FUT-UCSharedView | `UCSharedView` — Tisch- oder Online-Übersicht anzeigen | SharedView actor direct; included by combat; includes shared state | `session-views` | 7 | future generalization / proposed / diagram plus current table view / task 7 |
| FUT-UCSharedState | `UCSharedState` — Karte, Fog of War, Initiative und HP anzeigen | Included by FUT-UCSharedView | `session-views` | 7 | future view target / proposed / upstream permission dependencies / task 7 |
| FUT-UCSessionLog | `UCSessionLog` — Sitzung automatisch protokollieren | DM direct; includes transcription and AI summary | `session-records` | 9 | future / proposed / no current persistent session entity / decide in task 9 |
| FUT-UCSummaryAI | `UCSummaryAI` — Zusammenfassung und nächste Schritte generieren | Included by session log; external OpenAI | `session-recaps` | 11 | future / proposed / diagram/README history / decide and plan in task 11 |

## Additional repository and historical candidates absent from the diagrams

Each candidate has a source, capability, owner, and explicit disposition. “Current candidate” means it may belong in the baseline after the owning task accepts the contract; it is not automatically normative.

| ID | Candidate | Source | Capability / owner | Scope / decision / evidence | Disposition |
| --- | --- | --- | --- | --- | --- |
| ADD-001 | Logout, session restoration, and expired/failed authentication outcomes | SRC-05 auth service/views; SRC-01 | `account-access` / 2 | current / confirmed / ACC-E01–03 source-observed partial | [`ACC-003`–`ACC-005`](../../openspec/changes/document-dicekeeper-baseline/specs/account-access/spec.md): cached-player denial, expiry recovery, provider/sync failure, logout, and post-logout denial. |
| ADD-002 | External identity deletion plus local account/dependent-data cascades and partial failure | SRC-05 player/deletion services | `player-profiles` / 2 | current / confirmed / PRO-E03/04 source-observed with gaps | [`PRO-005`–`PRO-007`](../../openspec/changes/document-dicekeeper-baseline/specs/player-profiles/spec.md): own/missing account, external failure, incomplete local cleanup, and dependent-data cases. DEV-ACC-004 is task 8; character ownership is task 3/DEV-ACC-005. |
| ADD-003 | Public profile fields and unrelated-account visibility | SRC-05 player resource; DEC-012 | `player-profiles` / 2 | current / confirmed least-data boundary / observed implementation conflicts | [`PRO-001` and `PRO-002`](../../openspec/changes/document-dicekeeper-baseline/specs/player-profiles/spec.md): own private profile, contextual public summary, unrelated-user denial, DM boundary, and display-client denial. DEV-ACC-002 is owned by task 8 and consumers by tasks 4/7. |
| ADD-004 | Browser-session recovery of unfinished character creation | SRC-05 `CharacterCreateView.js`, `sessionDraft.js` | `character-library` / 3 | current / confirmed / CHAR-E04 source-observed with player-isolation gap | [`CHAR-004`](../../openspec/changes/document-dicekeeper-baseline/specs/character-library/spec.md): same-session/context restore, separation, completion/discard clearing, unavailable/corrupt storage, and cross-player denial. DEV-CHAR-004 is tracked in `correct-character-library-boundaries`. |
| ADD-005 | Character deletion and behavior when referenced by campaign membership/review | SRC-05 character/deletion/membership services | `character-library` / 3 | current / confirmed / CHAR-E06/07 source-observed with deviations | [`CHAR-007`](../../openspec/changes/document-dicekeeper-baseline/specs/character-library/spec.md): owner confirmation, unrelated-user/DM denial, reference conflict, dependent cleanup, missing character, and owner-based account cleanup. DEV-ACC-005/DEV-CHAR-006 are tracked in `correct-character-library-boundaries`. |
| ADD-006 | Private campaign invitation/admission and admission after start | SRC-09, SRC-16, SRC-24 versus SRC-05 rejection | `campaign-membership` / 4 | current private self-service absent and historical invitations deferred / MEM-E02 source-observed / confirmed boundary | [`MEM-003` and `MEM-004`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-membership/spec.md): private join/invitation unavailable and all post-start admission denied. DEC-020 records the explicit invitation deferral. |
| ADD-007 | Campaign-creation draft recovery and clearing | SRC-05 `CampaignCreateView.js`, `sessionDraft.js` | `campaign-management` / 4 | current / confirmed / CAM-E02 source-observed with isolation/discard gaps | [`CAM-002`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-management/spec.md): same-player/session restore, success/discard clearing, corrupt storage, and cross-player denial. DEV-CAM-003 is task 8. |
| ADD-008 | Notification triggering recipients, references/navigation, mark-read, unread, and delete behavior | SRC-05 notification resource/header/guide | `notifications` / 4 | current / confirmed / NOT-E01 source-observed with navigation/cleanup gaps | [`NOT-001`–`NOT-006`](../../openspec/changes/document-dicekeeper-baseline/specs/notifications/spec.md): private inbox, explicit review-event recipients, content privacy, read state, safe navigation, and deletion cleanup. DEV-NOT-001 is task 8. |
| ADD-009 | Story presets and DM story-assistance boundary in current campaign creation | SRC-05 manual story field; SRC-17/SRC-18 historical candidates | `campaign-management` / 4 | current manual story confirmed; presets not current; AI remains future / partial | [`CAM-004`](../../openspec/changes/document-dicekeeper-baseline/specs/campaign-management/spec.md) keeps manual story DM-only and denies claims of current preset/generation support. AI generation remains task 11 under DEC-019. |
| ADD-010 | Multiple map selection/switching, replacement, deletion, and automatic cleanup | SRC-05 views/resources; SRC-18/SRC-24 | `campaign-maps`, `media-assets` / 5 | current candidate / pending / source-observed partial | Specify lifecycle and failure cases in task 5. |
| ADD-011 | Media file validation, original/derived access, Imagor failure/fallback, and public listing exposure | SRC-05 upload/Imagor resources; SRC-23 | `media-assets` / 5 | current candidate / pending / source-observed partial | Resolve access and processing separately in task 5. |
| ADD-012 | Per-map fog, undo/reset, map-size/shape limits, and switching anchors | SRC-05 game state/map UI; SRC-17/SRC-18/SRC-24 | `campaign-maps` / 5 | unresolved / historical plus source-observed partial | Decide exact supported behavior in task 5. |
| ADD-013 | Live state initialization/reset and lifetime across refresh, restart, and multiple instances | SRC-05 `GameState.java` | `live-play` / 6 | current candidate / pending / in-memory source-observed | Specify lifetime and recovery in task 6, reconcile task 7. |
| ADD-014 | Overlapping decision APIs, persisted votes, duplicate handling, tie outcome, quorum, and membership changes | SRC-05 decision/action resources | `group-decisions` / 6 | current candidate / pending / source-observed | Resolve one product contract in task 6. |
| ADD-015 | Player-note isolation and persistence across refresh/device | SRC-05 `PlayerView.js` localStorage | `player-notes` / 6 | current candidate / pending / source-observed | Specify browser-local behavior or propose separate server persistence in task 6. |
| ADD-016 | User guide/onboarding and role-specific workflow help | SRC-05 guide files; SRC-24 | `session-views` / 7 | current candidate / pending / source-observed | Decide whether it is a normative supported view in task 7. |
| ADD-017 | Persisted accessible color theme, readable/responsive screens, and language consistency | SRC-05 theme/views; SRC-17/SRC-18/SRC-21 | `session-views` / 7 | current/future candidate / pending / source-observed partial | Define measurable accepted criteria in task 7; do not invent thresholds. |
| ADD-018 | SSE heartbeat, reconnect/stale-client recovery, revoked membership, and restart outcome | SRC-05 SSE/client service; SRC-12/SRC-24 | `live-synchronization` / 7 | current candidate / pending / source-observed partial | Specify observable outcomes and distinguish reliability improvements in task 7. |
| ADD-019 | Physical-camera dice, shake-to-roll, and evolving AI character portraits | SRC-24 | unassigned product idea; decision owner 10/11 if adopted | future idea / not accepted / historical only | Explicitly proposed; exclude from planning unless a later decision admits it. |

## Audit notes

- The baseline proposal lists exactly the 14 current capability paths in the ownership table.
- Every diagram alias has exactly one stable prefixed ID and one primary owning task. Cross-capability dependencies are noted in relationships or dispositions rather than by duplicating ownership.
- Additional candidates remain linked to evidence and a decision/task owner. No historical candidate is treated as accepted merely to close coverage.
- Task 2 through task 4 requirement/scenario references are populated. Tasks 5–7 must replace their remaining pending dispositions with exact links as contracts are authored, and task 15 must audit them all.
