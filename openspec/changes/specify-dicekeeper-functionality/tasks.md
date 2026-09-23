# Tasks

This is the execution checklist for **writing the specification**, not for implementing Dicekeeper features. Each numbered section is a separate conversation-sized work package. Follow the dependencies and handoff protocol in [design.md](design.md); stop at the requested section boundary. Creating this checklist completes none of its items.

Documentation paths are relative to the repository root. Current capability drafts belong to the separate `document-dicekeeper-baseline` change until section 8; future/corrective behavior belongs to its own changes. Read each change's CLI instructions before authoring its artifacts. Application source, runtime configuration, and deployment are outside this checklist's scope.

## 1. Establish the foundation

- [x] 1.1 Create `docs/specification/runbook.md`, `evidence.md`, `decisions.md`, `glossary.md`, `permissions.md`, `coverage.md`, `handoff.md`, and `overview.md` from this design's researched material; verify all eight files exist, distinguish confirmed scope from proposed defaults, and preserve the source-review limitations.
- [x] 1.2 Extract the use-case aliases and actor relationships from both `.puml` files into the coverage matrix, prefixing aliases with CUR/FUT; verify 33 current and 22 future use cases have unique IDs and an owning task, and treat the Markdown/DOT/SVG renderings as duplicate representations.
- [x] 1.3 Reconcile remaining source inventory entries: inspect unreviewed Notion links only for relevant missing requirements, mark inaccessible/unreviewed/excluded material explicitly, and add code/README requirements absent from the diagrams; verify each added candidate has a source reference and a disposition or decision owner.
- [x] 1.4 Finalize the glossary and flat capability boundaries, check the baseline name against existing changes, and scaffold `document-dicekeeper-baseline` through the CLI; write its proposal from returned instructions and verify its capability list matches the task ownership in `coverage.md`.
- [x] 1.5 Record the next task, relevant source paths, known decision gates, and generated baseline change path in `handoff.md`; verify a fresh task can start section 2 using repository artifacts alone.

## 2. Specify accounts, profiles, and permissions

Depends on section 1.

- [x] 2.1 Trace `AuthResource`, `SecurityIdentityService`, `PlayerResource`, and frontend auth handling; write `account-access` requirements for login/logout, identity sync, registration boundary, and expired/failed authentication, verifying each requirement has source evidence and acceptance scenarios.
- [x] 2.2 Resolve public profile fields and account data boundaries; write `player-profiles` requirements for profile/avatar and account deletion, and update the permission matrix, verifying coverage of own-account, unrelated-account, missing-account, external deletion failure, and dependent-data cases.
- [x] 2.3 Validate the authored baseline capability files using the available OpenSpec spec validation path, record any change-level incompleteness from remaining capabilities separately, and update coverage/handoff; verify permission conflicts and deletion dependencies have explicit owners rather than implicit assumptions.

## 3. Specify characters

Depends on section 2.

- [x] 3.1 Trace character CRUD, ability-score operations, reference data, and creation/selection views; record the missing owner model and resolve the intended character access rules, verifying the decision states which behavior is observed and which would require a correction.
- [x] 3.2 Write `character-library` requirements for creation, unfinished drafts, editing, selection, validation, and deletion; verify scenarios cover owner/unrelated-user/DM access, invalid reference values, and characters referenced by campaigns, with future progression separately identified.
- [x] 3.3 Record agreed ownership corrections in a separate planning change or an explicitly unresolved decision entry, validate the accepted baseline draft, and update coverage/handoff; verify the baseline does not claim an unimplemented ownership fix is delivered.

## 4. Specify campaigns and participation

Depends on section 3.

- [x] 4.1 Trace `CampaignResource`, `CampaignDTO`, membership APIs, and campaign views; resolve listing/detail/story visibility, capacity, private admission, and start prerequisites, then write `campaign-management` and `campaign-membership` requirements, verifying create/edit/delete/join/leave/kick/start and denied-access scenarios.
- [x] 4.2 Write `character-review` requirements using a transition table for NONE/PENDING/APPROVED/REJECTED; resolve resubmission authorization and edits/deletion after approval, verifying each allowed transition and each forbidden actor/state combination has a scenario or documented gap.
- [x] 4.3 Write `notifications` requirements for recipients, triggering events, read/unread/delete, references, and navigation; verify submission/rejection/approval scenarios agree with the review transitions and account permissions.
- [x] 4.4 Validate the four capability drafts and reconcile deletion, invitations, and start behavior with earlier decisions; update coverage/handoff and verify every campaign/participation use case has a requirement reference or explicit disposition.

## 5. Specify maps and media

Depends on section 4.

- [x] 5.1 Trace map upload/select/delete, browser cropping, upload serving, and Imagor behavior; write `media-assets` requirements, verifying file validation, access, processing failure, fallback, and cleanup scenarios against observed code and confirmed target decisions.
- [x] 5.2 Resolve map limits, marker/group operations, fog authority, and exploration-versus-tactical scope; write `campaign-maps` requirements, verifying map-switch, reveal/hide, unauthorized-edit, undo/reset, and deletion scenarios.
- [x] 5.3 Validate map/media drafts and review the visibility matrix against all asset delivery paths; update evidence/coverage/handoff and verify historical backlog reports are labeled as verified, contradicted, unresolved, or superseded.

## 6. Specify live play

Depends on section 5.

- [x] 6.1 Trace `GameState`, live action endpoints, and GM/player views; resolve dice trust and state/reset behavior, then write `live-play` requirements for turns, HP, active players, and dice, verifying authority, invalid values, repeated initialization, and reset scenarios.
- [x] 6.2 Reconcile the two decision APIs and resolve vote eligibility, duplicate handling, ties, quorum, late joins/leaves, and manual closure; write `group-decisions` requirements and verify persisted-state and actor/state-transition scenarios.
- [x] 6.3 Write `player-notes` requirements from the localStorage behavior and confirmed persistence intent; verify per-player/campaign isolation and refresh/device expectations, recording any server-persistence requirement as a separate proposed change.
- [x] 6.4 Validate the live-play, decision, and notes drafts; update coverage/handoff and verify each state field has an explicit lifetime and each known implementation deviation has a disposition.

## 7. Specify views and synchronization

Depends on section 6.

- [x] 7.1 Write `session-views` requirements and the DM/player/table visibility matrix, resolving the display client's access model and supported desktop/tablet/mobile behavior; verify displayed data and available actions agree with upstream capability permissions.
- [x] 7.2 Trace SSE subscriptions/events and frontend recovery paths; write `live-synchronization` requirements for update propagation, reconnect, stale clients, revoked membership, and restart, verifying each outcome is observable and distinguishes source evidence from proposed reliability improvements.
- [x] 7.3 Resolve measurable usability/accessibility and performance/recovery criteria without inventing values; validate the two drafts, update coverage/handoff, and verify unresolved criteria prevent the affected change from being labeled implementation-ready.

## 8. Review and publish the current baseline

Depends on sections 2-7.

- [x] 8.1 Review the end-to-end journeys in the design and cross-capability deletion effects; verify every current use case and additional accepted current requirement maps to scenarios, and record any implementation limitation or deviation outside the normative baseline unless explicitly accepted.
- [x] 8.2 Reconcile glossary, permission matrix, state transitions, and the baseline proposal's capability inventory; complete its remaining documentation/design/task artifacts according to CLI instructions and verify each completed baseline checklist item corresponds to delivered documentation, not an assumed product implementation.
- [x] 8.3 Run `openspec validate document-dicekeeper-baseline --type change --strict --no-interactive`, obtain review of the accepted baseline, and archive it through the archive workflow; verify resulting main specs with `openspec validate --specs --strict --no-interactive` and keep corrective changes open.
- [x] 8.4 Update `overview.md`, coverage, and handoff with links to every accepted main capability and every unresolved/corrective item; verify current, missing, and future behavior are distinguishable without reading this conversation.

## 9. Specify future content and session records

Depends on section 8.

- [x] 9.1 Resolve the campaign/session/encounter distinction and the included NPC/place/quest/lore/history objects, including the disposition of historical items/loot candidates; verify decisions define lifecycle, ownership, persistence, and references or explicitly defer the relevant scope.
- [x] 9.2 For accepted scope, create a bounded planning change for `campaign-content` and `session-records` using the proposal workflow; verify its scenarios cover create/update/archive/delete, audience, event history, and downstream recap inputs, and its implementation tasks remain unexecuted.
- [x] 9.3 Validate the future change and update coverage, the dependency index, and handoff; if scope is deferred, verify the decision identifies what is deferred, why, and which dependent tasks are affected before marking the documentation work complete.

## 10. Specify future combat and progression

Depends on section 8 and section 9 where shared entities are required.

- [x] 10.1 Resolve rules edition, supported advancement and conditions/effects, initiative ties/groups, boss mechanics, and expected encounter scale; verify every historical combat/progression candidate has an accepted, excluded, or deferred disposition.
- [x] 10.2 Create bounded future planning artifacts for accepted `combat-automation` and `character-progression` scope; verify scenarios describe deterministic outcomes, manual overrides, validation, and view visibility, with AI encounter suggestions owned by section 11.
- [x] 10.3 Validate the relevant change(s), update coverage/dependencies/handoff, and verify neither undocumented rules nor unresolved behavior is hidden inside implementation tasks; record explicit deferrals where applicable.

## 11. Specify AI preparation and recaps

Depends on section 9 and on section 10 for encounter recommendations.

- [x] 11.1 Resolve accepted story/quest/NPC/encounter-assistance and recap workflows, context sources, lore authority, DM acceptance/editing, audience, and usage limits; verify the decision log identifies every external input and who may see the resulting content.
- [x] 11.2 Create future planning artifacts for `ai-campaign-assistance` and `session-recaps`; verify scenarios include accepted/rejected suggestions, missing context, contradictory lore, provider failure, and unavailable capacity, without assuming existing local chat is an AI integration.
- [x] 11.3 Validate the future change(s), update coverage/dependencies/handoff, and verify proposed AI behavior stays separate from current main specs and any deferred features have explicit dispositions.

## 12. Specify rule assistance

Depends on section 8 and the rules-edition decision from section 10.

- [x] 12.1 Resolve the D&D 5e (2024) rule source corpus, license/access, citation format, and handling of uncertain/conflicting answers; verify these choices are recorded before any dependent implementation tasks are authored.
- [x] 12.2 Create the accepted `rule-assistance` planning change; verify scenarios cover supported queries, source references, missing evidence, wrong-edition material, and failures, then run strict change validation and update coverage/handoff or record explicit deferral.

## 13. Specify audio and decide voice-command scope

Depends on section 9 and section 11 if transcripts supply AI context.

- [ ] 13.1 Reconcile the target diagram's voice commands with Notion's transcription-only answer; verify the user decision explicitly accepts, excludes, or defers action execution separately from transcription.
- [ ] 13.2 Resolve audio source, capture controls, speaker attribution, languages, retention/access, correction, and downstream use; create `audio-transcription` planning artifacts and verify scenarios include poor/absent input, transcription failure, correction, stop/delete, and audience boundaries.
- [ ] 13.3 If commands are accepted, create `voice-commands` planning artifacts with the allowed actions, identity/permissions, ambiguity handling, and execution/confirmation rules; otherwise verify every command use case has an explicit excluded/deferred disposition, then validate accepted artifacts and update coverage/handoff.

## 14. Specify Discord integration

Depends on section 8 and the relevant web contracts; section 13 is required only for accepted Discord audio scope.

- [ ] 14.1 Resolve first-release Discord workflows, account/campaign/channel association, audience, status/roll sharing, and optional audio; verify the decisions identify dependencies and map Discord participants onto the existing permission model.
- [ ] 14.2 Create the accepted `discord-integration` planning change; verify scenarios include linking/unlinking, unauthorized channels/users, disconnect/reconnect, duplicate events, and any accepted audio behavior, then validate and update coverage/handoff or record explicit deferral.

## 15. Audit the complete specification and hand off implementation

Depends on section 8 and completed or explicitly deferred sections 9-14.

- [ ] 15.1 Audit `coverage.md` against both diagrams, README, relevant historical sources, and code-only capabilities; verify all 55 diagram use cases and every additional accepted requirement have a disposition, and each normative requirement links to at least one testable scenario.
- [ ] 15.2 Review all accepted artifacts for consistent terms, roles, state transitions, visibility, persistence, and deletion; verify behavior-changing open decisions prevent affected product changes from being classified as implementation-ready.
- [ ] 15.3 Run strict validation for the main specs and each produced active planning change, and review internal links and capability paths; record commands/results and verify no placeholder purpose, stale reference, or unexplained validation failure remains.
- [ ] 15.4 Complete `overview.md` and the ordered implementation roadmap, linking the current baseline, corrective changes, accepted future proposals, and explicit deferrals; verify dependencies are visible and no future implementation task is marked completed by this documentation effort.
- [ ] 15.5 Update the final handoff and this coordination checklist only after documentation review; verify another task can select a ready product change and begin its apply workflow without reconstructing the specification from chat history.
