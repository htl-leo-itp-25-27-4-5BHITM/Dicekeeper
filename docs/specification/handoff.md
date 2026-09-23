# Specification Handoff

## Current state

- Coordination change: `specify-dicekeeper-functionality`
- Schema: `spec-driven`
- Last completed work package: section 12, **Specify rule assistance** (items 12.1–12.2)
- Overall coordination progress after this handoff: 40/50 checklist items complete
- Next work package: section 13, **Specify audio and decide voice-command scope**; it has not been started
- Published current functional baseline: 14 capabilities under [`openspec/specs/`](../../openspec/specs/), containing 102 requirements and 447 scenarios; main-spec validation also includes the separate `development-workspace` spec
- Accepted future content/session plan: [`add-campaign-content-and-session-records`](../../openspec/changes/add-campaign-content-and-session-records/) contains 18 requirements and 75 scenarios; all 15 implementation tasks remain open
- Accepted future combat/progression plan: [`add-combat-automation-and-character-progression`](../../openspec/changes/add-combat-automation-and-character-progression/) contains 17 requirements and 88 scenarios; all 20 implementation tasks remain open
- Accepted future AI/recap plan: [`add-ai-campaign-assistance-and-session-recaps`](../../openspec/changes/add-ai-campaign-assistance-and-session-recaps/) contains 18 requirements and 75 scenarios; all 27 implementation tasks remain open
- Accepted future rule-assistance plan: [`add-rule-assistance`](../../openspec/changes/add-rule-assistance/) contains 9 requirements and 47 scenarios; all 23 implementation tasks remain open
- Character correction change: [`correct-character-library-boundaries`](../../openspec/changes/correct-character-library-boundaries/) remains proposal-only and unchanged
- Application code changed: no
- Blocking issue for starting section 13: none. Section 13 must independently resolve audio capture/transcription and whether executable voice commands are accepted or deferred; no recording, consent, provider, retention, command-authentication, or mutation behavior may be inferred from section 12.

## Completed in section 12

- Read the coordination artifacts, all shared specification documents, all 14 published main specs, and the accepted section-10 combat/progression boundary. Reconciled section-11 provider constraints where they affect external explanation, without applying any prior future implementation task.
- Reviewed the official D&D SRD page, official English and German SRD 5.2.1 PDFs, official D&D Creator FAQ, and CC BY 4.0 deed/legal code as primary sources.
- Selected the immutable official English and German SRD 5.2.1 PDFs as the only authoritative `DND_5E_2024` corpus. English controls semantic interpretation; German is the official localized companion.
- Excluded D&D Beyond Basic Rules, non-SRD books, SRD 5.1/2014 rules, user uploads, live web results, and generated prose from rule authority.
- Required claim-level source id, version, language, full heading path, printed-page, and official-link citations plus publisher attribution, CC BY 4.0 link, adaptation indication, and no implied endorsement.
- Defined explicit fail-closed outcomes for ambiguity, missing or uncertain evidence, unresolved conflicts, wrong editions, corpus unavailability, and unverifiable output. English/German mismatches cite both and use English semantics; same-source conflicts select no winner unless the corpus itself supplies cited precedence.
- Kept local retrieval and `SOURCE_EXTRACTS_ONLY` usable without a provider. Optional explanation generation requires separate finite provider/model/limit/accounting/retention configuration plus user-confirmed minimum-source transfer; provider or verification failure falls back safely.
- Kept rule assistance authenticated, campaign-independent, read-only, and history-free. It imports no automatic product context and creates no gameplay mutation, saved ruling, session event, audio/voice action, or Discord message.
- Created the future change proposal, design, one spec delta, and 23-item implementation checklist. No product implementation task was checked or executed, no corpus file was downloaded or vendored, and no main spec was modified.
- Reconciled decisions, evidence, coverage, overview, glossary, permissions, runbook, handoff, and only the section-12 coordination checkboxes. Stopped before section 13.

## Section 12 decision outcome

- `rule-assistance` owns authenticated English/German plain-text rule questions, the versioned SRD corpus and local index, evidence sufficiency, answer states, claim grounding, citations/attribution, language/source precedence, optional provider transfer and verification, and the no-history/no-mutation boundary.
- The accepted source identities are `SRD-5.2.1-EN` and `SRD-5.2.1-DE`. A future revision is a new reviewed corpus identity and migration, never a silent replacement.
- Generated explanation is a labeled paraphrase of verified passages, not a ruling or source. Retrieval rank, confidence, model memory, common practice, or DM role cannot establish precedence.
- Rule assistance may explain cited text about combat, conditions, items, or advancement but does not accept or implement those product mechanics.
- The planning change is valid and bounded, but external explanation remains disabled until the exact provider/model and finite numeric request/context/output/time/usage/cost limits, accounting scope, and provider-retention terms are selected. That gate does not block local lookup, citations, or extract-only responses.

## Corrective and unresolved work

- The published baseline and its 49 indexed `DEV-*` implementation deviations are unchanged. Section 12 did not advance any correction.
- All four accepted future changes remain planning-complete but product-incomplete: content/session is 0/15, combat/progression is 0/20, AI/recaps is 0/27, and rule assistance is 0/23. Do not archive or synchronize them as current behavior before implementation and review.
- Items/loot/rewards, conditions/effects, full advancement, tactical enforcement, saved rulings/history, automatic product context, voice input/execution, Discord delivery, and autonomous state mutation remain excluded or deferred under their owning decisions.
- Exact browser/version, viewport, accessibility-conformance/contrast, latency, throughput/capacity, and availability targets remain unresolved from the baseline review.
- Section 13 owns audio capture/transcription, language/provider/consent/retention/failure behavior, transcript ownership/audience, and the separate disposition of executable voice commands. Section 14 owns Discord workflows and associations.

## Verification performed

| Check / command | Result |
| --- | --- |
| `openspec validate add-rule-assistance --type change --strict --no-interactive` | Passed. |
| `openspec show add-rule-assistance --json --deltas-only` | Parsed 1 capability, 9 requirements, and 47 scenarios. |
| `openspec instructions apply --change add-rule-assistance --json` | Reported `ready`, with 0/23 implementation tasks complete. |
| `openspec validate specify-dicekeeper-functionality --type change --strict --no-interactive` | Passed with the expected `skip_specs` informational result. |
| `openspec validate --specs --strict --no-interactive` | Passed for all 15 unchanged published main specs (14 functional baseline capabilities plus `development-workspace`); informational long-requirement notices only. |
| Coverage/integrity audit | 33/33 current aliases, 22/22 future aliases, and 23/23 additional candidates remain uniquely owned; RUL requirement IDs are contiguous and unique; all 23 future implementation tasks remain unchecked. |
| Markdown/local-link and placeholder audit | Passed for shared documentation, the coordination artifacts, and `add-rule-assistance`. |
| Diff/whitespace and scope audit | Passed. Main specs are unchanged, and no application, corrective, section-9/10/11, audio/voice, Discord, deployment, workflow, script, or runtime-configuration path is included in section 12. |

## Changed paths in section 12

- `openspec/changes/add-rule-assistance/{.openspec.yaml,proposal.md,design.md,tasks.md}`
- `openspec/changes/add-rule-assistance/specs/rule-assistance/spec.md`
- `docs/specification/{runbook.md,evidence.md,decisions.md,coverage.md,glossary.md,permissions.md,handoff.md,overview.md}`
- `openspec/changes/specify-dicekeeper-functionality/tasks.md` (section-12 checkboxes only)

## Exact next instruction

> `$openspec-apply-change specify-dicekeeper-functionality` — Execute only section 13, **Specify audio and decide voice-command scope** (items 13.1–13.3). Read the published main specs, all shared specification documents, this handoff, and the accepted session/recap/provider boundaries from `add-campaign-content-and-session-records` and `add-ai-campaign-assistance-and-session-recaps`; reconcile the historical audio, transcription, voice-input, and interpreted-command candidates; explicitly resolve capture, consent, languages, provider transfer/retention, transcript ownership/audience/correction/deletion, failures, and whether executable voice commands are accepted or deferred before authoring implementation tasks; create only the bounded future audio/transcription and conditionally accepted voice-command planning artifacts authorized by those decisions; strictly validate every new change, the coordination change, and main specs; update shared documentation and only the section-13 coordination checkboxes; then stop before section 14. Do not implement application features, apply section-9/10/11/12 implementation tasks, treat transcripts as authenticated commands or rule authority, infer provider/recording defaults, or begin Discord work.
