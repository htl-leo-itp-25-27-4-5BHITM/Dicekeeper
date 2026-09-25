# Specification Handoff

## Current state

- Coordination change: `specify-dicekeeper-functionality`
- Schema: `spec-driven`
- Last completed work package: section 13, **Specify audio and decide voice-command scope** (items 13.1–13.3)
- Overall coordination progress after this handoff: 43/50 checklist items complete
- Next work package: section 14, **Specify Discord integration**; it has not been started
- Published current functional baseline: 14 capabilities under [`openspec/specs/`](../../openspec/specs/), containing 102 requirements and 447 scenarios; main-spec validation also includes the separate `development-workspace` spec
- Accepted future content/session plan: [`add-campaign-content-and-session-records`](../../openspec/changes/add-campaign-content-and-session-records/) contains 18 requirements and 75 scenarios; all 15 implementation tasks remain open
- Accepted future combat/progression plan: [`add-combat-automation-and-character-progression`](../../openspec/changes/add-combat-automation-and-character-progression/) contains 17 requirements and 88 scenarios; all 20 implementation tasks remain open
- Accepted future AI/recap plan: [`add-ai-campaign-assistance-and-session-recaps`](../../openspec/changes/add-ai-campaign-assistance-and-session-recaps/) contains 18 requirements and 75 scenarios; all 27 implementation tasks remain open
- Accepted future rule-assistance plan: [`add-rule-assistance`](../../openspec/changes/add-rule-assistance/) contains 9 requirements and 47 scenarios; all 23 implementation tasks remain open
- Accepted future audio-transcription plan: [`add-audio-transcription`](../../openspec/changes/add-audio-transcription/) contains 10 requirements and 56 scenarios; all 32 implementation tasks remain open; no `voice-commands` artifact exists
- Character correction change: [`correct-character-library-boundaries`](../../openspec/changes/correct-character-library-boundaries/) remains proposal-only and unchanged
- Application code changed: no
- Blocking issue for starting section 14: none. Section 14 must independently resolve Discord workflows, association, audience, status/roll delivery, disconnect/reconnect, duplicates, and optional audio. Discord identity/channel membership cannot replace Dicekeeper authentication/membership, and Discord audio cannot bypass section-13 consent/provider/source boundaries.

## Completed in section 13

- Read the coordination artifacts, all shared specification documents, all 15 published main specs, and the full accepted section-9 content/session and section-11 AI/recap changes, including every requirement scenario and task boundary. No prior future implementation task was applied.
- Reconciled the target diagram's transcription plus interpreted/executed command proposal with SRC-09's explicit transcription-without-commands answer. Because DEC-003 supplies no automatic source precedence and no independent source defines safe execution semantics, accepted transcription and deferred executable voice commands.
- Bound capture to the owner-DM's explicitly selected browser microphone and one active section-9 session. Required authenticated, versioned base consent from every selected current participant, a DM no-unlisted-person attestation, and separate member-publication and recap-provider consent scopes.
- Defined explicit start, pause, resume, stop, discard, and automatic-stop behavior. Excluded file uploads, system audio, remote devices, background listening, player-owned capture, and Discord audio.
- Limited segments to an explicitly selected German (`de-DE`) or English (`en`) language. Disabled transfer until an exact provider/service, finite size/duration/timeout/concurrency/usage/cost policy, region, retention, prohibited training/secondary-use terms, deletion route, and test environment are configured and disclosed. Raw audio is transient and never a durable campaign record.
- Treated diarization labels as provisional non-identity metadata with `UNKNOWN` fallback. Defined campaign/session transcript ownership, DM-only default visibility, consent-bounded member publication, immutable revisions, participant correction/redaction requests, deletion/tombstone behavior, access revocation, provider cleanup, and campaign cleanup.
- Reused section-9 append-only history as the only downstream bridge: the DM may commit a bounded excerpt from the latest reviewed same-session revision as an idempotent audience-safe `TRANSCRIPT_EXCERPT` event. Section-11 recap use additionally requires participant recap-provider consent, explicit manifest selection, and ordinary provider confirmation.
- Made command-like text, rule questions, spoken dice/actions, speaker mappings, markup, prompts, and tool instructions inert. Nothing in a transcript authenticates or executes an actor or mutates campaign, session, encounter, combat, character, map, decision, AI, recap, Discord, or other product state.
- Created the future proposal, design, one spec delta, and 32-item implementation checklist. No product implementation task was checked or executed, no provider/default was selected, and no current main spec or application path was modified.
- Reconciled decisions, evidence, coverage, overview, glossary, permissions, runbook, handoff, and only the section-13 coordination checkboxes. Stopped before section 14.

## Section 13 decision outcome

- `audio-transcription` owns active-session microphone capture, consent, controls, language/provider transfer, raw-audio lifetime, segment/failure outcomes, provisional speaker presentation, transcript review/audience/revision/deletion, and the explicitly reviewed history/recap bridge.
- `voice-commands` is deferred. No nominal change was created because the accepted evidence does not define allowed actions, authenticated identity, permissions, ambiguity handling, confirmation, rollback, or audit semantics.
- Optional member publication and recap-provider use are distinct from base capture/transcription consent. Membership, silence, older consent, or the DM's consent for another person is never sufficient.
- Session history receives only an explicitly reviewed excerpt event. Raw audio and whole/direct transcript records never enter recap context automatically; a later correction, deletion, or consent withdrawal amends/redacts history, stales affected drafts, and retires affected member publication until replacement.
- The planning change is valid and bounded, but production transcription remains disabled until product/operations selects and tests the exact provider/privacy/finite-limit configuration. That gate does not convert voice execution into accepted scope.

## Corrective and unresolved work

- The published baseline and its 49 indexed `DEV-*` implementation deviations are unchanged. Section 13 did not advance any correction.
- All five accepted future changes remain planning-complete but product-incomplete: content/session is 0/15, combat/progression is 0/20, AI/recaps is 0/27, rule assistance is 0/23, and audio transcription is 0/32. Do not archive or synchronize them as current behavior before implementation and review.
- Exact browser/version, viewport, accessibility-conformance/contrast, latency, throughput/capacity, and availability targets remain unresolved from the baseline review.
- AI and rule-explanation provider gates remain separate. Audio additionally requires exact speech provider/service/version, region, finite size/duration/timeout/concurrency/usage/cost settings and accounting scope, retention duration, deletion procedure, prohibited training/secondary-use terms, and an operational test environment before enablement.
- Executable voice commands, player-triggered spoken actions/dice/rule queries, durable raw audio, voiceprints, automatic language detection/translation, file/system/remote/background/Discord capture, and automatic transcript-to-history/recap ingestion remain excluded or deferred.
- Section 14 owns first-release Discord workflows, Dicekeeper-account/campaign/channel association, audience, status/roll sharing, disconnect/reconnect, duplicate delivery, and optional-audio disposition. Section 15 owns the final all-scope audit.

## Verification performed

| Check / command | Result |
| --- | --- |
| `openspec validate add-audio-transcription --type change --strict --no-interactive` | Passed. |
| `openspec show add-audio-transcription --json --deltas-only` | Parsed 1 capability, 10 requirements, and 56 scenarios. |
| `openspec instructions apply --change add-audio-transcription --json` | Reported `ready`, with 0/32 implementation tasks complete. |
| `openspec validate specify-dicekeeper-functionality --type change --strict --no-interactive` | Passed with the expected `skip_specs` informational result. |
| `openspec validate --specs --strict --no-interactive` | Passed for all 15 unchanged published main specs (14 functional baseline capabilities plus `development-workspace`); informational long-requirement notices only. |
| Coverage/integrity audit | 33/33 current aliases, 22/22 future aliases, and 24/24 additional candidates remain uniquely owned; ATX requirement IDs are contiguous and unique; all 32 future implementation tasks remain unchecked; no voice-command artifact exists. |
| Markdown/local-link and placeholder audit | Passed for shared documentation, the coordination artifacts, and `add-audio-transcription`. |
| Diff/whitespace and scope audit | Passed. Main specs are unchanged, and no application, corrective, section-9/10/11/12 implementation, voice-command, Discord, deployment, workflow, script, or runtime-configuration path is included in section 13. |

## Changed paths in section 13

- `openspec/changes/add-audio-transcription/{.openspec.yaml,proposal.md,design.md,tasks.md}`
- `openspec/changes/add-audio-transcription/specs/audio-transcription/spec.md`
- `docs/specification/{runbook.md,evidence.md,decisions.md,coverage.md,glossary.md,permissions.md,handoff.md,overview.md}`
- `openspec/changes/specify-dicekeeper-functionality/tasks.md` (section-13 checkboxes only)

## Exact next instruction

> `$openspec-apply-change specify-dicekeeper-functionality` — Execute only section 14, **Specify Discord integration** (items 14.1–14.2). Read the published main specs, all shared specification documents, this handoff, and the accepted web-role, session, live-synchronization, audio-transcription, and no-voice-command boundaries; resolve first-release Discord workflows, Dicekeeper-account/campaign/channel association, audience, status/roll sharing, disconnect/reconnect, duplicate delivery, and whether any Discord audio is accepted before authoring implementation tasks; create only the bounded `discord-integration` planning artifacts authorized by those decisions; strictly validate every new change, the coordination change, and main specs; update shared documentation and only the section-14 coordination checkboxes; then stop before section 15. Do not implement application features, apply existing future implementation tasks, treat Discord identity or channel membership as Dicekeeper authentication/membership, import Discord audio without the section-13 consent/provider/source boundary, revive executable voice commands, or begin the final audit.
