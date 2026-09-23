# Tasks

All tasks below implement future product behavior and intentionally remain unexecuted after the section-12 planning work that created this change. Exact external provider/model, numeric limits, accounting, and retention settings are enablement configuration choices; audio, voice commands, Discord, saved rulings, conditions/effects, items/loot, full progression, and gameplay mutation are not implementation tasks in this change.

## 1. Licensed corpus and provenance

- [ ] 1.1 Add a reviewed corpus manifest for `SRD-5.2.1-EN` and `SRD-5.2.1-DE` containing profile, version, language, official URLs, publication/retrieval dates, byte and extracted-content checksums, CC BY 4.0 URI, publisher attribution, and extraction version; verify schema tests reject a missing field, duplicate source identity, another edition, or an unapproved URL.
- [ ] 1.2 Implement the administrative/build acquisition step that downloads only the two manifest sources, verifies exact checksums, preserves immutable originals, and fails closed on missing or changed content; verify integration fixtures never activate a partial, tampered, newer, Basic Rules, SRD 5.1, non-SRD, user-uploaded, or web-search corpus.
- [ ] 1.3 Extract page- and heading-addressed English/German spans and build a replaceable search index tied to one manifest version; verify representative fixtures preserve full heading paths, printed pages, source offsets, language, source id, and content checksum and exclude any span whose provenance cannot be reconstructed.
- [ ] 1.4 Add the reviewed corpus-update workflow for a future SRD version without replacing 5.2.1 in place; verify an unreviewed version or index cannot become active and prior version identities and attribution remain auditable.

## 2. Authenticated queries and evidence retrieval

- [ ] 2.1 Implement an authenticated English/German plain-text query boundary with normalized language, explicit `DND_5E_2024` profile, idempotency identity, length/blank validation, and no campaign prerequisite; verify guests are denied and caller-supplied DM/player roles do not change corpus or authority.
- [ ] 2.2 Implement edition and source classification for supported 2024 questions, wrong-edition/SRD 5.1 requests, non-SRD books/content, homebrew, and user-supplied text; verify unsupported material is never inserted into retrieval context or silently translated into a 2024 rule.
- [ ] 2.3 Implement deterministic retrieval and evidence-sufficiency evaluation against verified span ids, including decomposition of multi-part questions and focused clarification for ambiguous input; verify related-but-insufficient matches, absent rules, unsupported subquestions, and DM-judgment questions produce the RUL-005 outcomes without model inference.

## 3. Answer states, citations, and conflicts

- [ ] 3.1 Implement the explicit `ANSWERED`, `SOURCE_EXTRACTS_ONLY`, `NEEDS_CLARIFICATION`, `NOT_IN_CORPUS`, `WRONG_EDITION`, `CONFLICTING_EVIDENCE`, and `UNAVAILABLE` response states; verify every validation, corpus, retrieval, conflict, and infrastructure path returns one state and never a plausible uncited fallback.
- [ ] 3.2 Implement a structured claim-to-passage response model and render citations from manifest/span metadata as source id, SRD 5.2.1 version, language, full heading path, printed page, and official link; verify each substantive claim has all supporting citations and a missing or inconsistent citation prevents `ANSWERED`.
- [ ] 3.3 Implement English semantic precedence, German localized-answer support, explicit-corpus precedence rules, and unresolved-conflict handling; verify aligned translations, material English/German mismatches, supported general/specific resolution, unresolved same-source conflicts, and provider-selected winners match RUL-006.
- [ ] 3.4 Add the accessible legal/attribution presentation containing the exact publisher-supplied SRD 5.2.1 attribution, official source and CC BY 4.0 links, no-endorsement boundary, and Dicekeeper adaptation indication; verify English/German UI and automated content checks retain the required notice without extra Wizards attribution.

## 4. Extract-only and optional explanation paths

- [ ] 4.1 Implement the local `SOURCE_EXTRACTS_ONLY` response from verified passages and citations without any external provider; verify supported questions remain usable when provider generation is disabled, declined, exhausted, or unavailable.
- [ ] 4.2 Add a disabled-by-default provider gateway requiring an explicit provider/model plus finite request, context, output, timeout, usage/cost, accounting, and retention configuration and user-visible transfer disclosure/confirmation; verify no question or passage leaves Dicekeeper when any configuration is absent or the user declines.
- [ ] 4.3 Limit each provider payload to the normalized question, minimum verified passages and citation metadata, requested language, and non-secret constraints; verify campaign, character, profile, notification, vote, note, media, session, combat, AI, audio, Discord, credential, and unrelated data never enters the payload.
- [ ] 4.4 Add atomic capacity reservation, one dispatch per idempotency identity, provider outcome accounting, and safe retry; verify duplicate, concurrent, oversized, exhausted, timeout, authentication, rate-limit, unavailable, and malformed-response cases consume/dispatch at most once and create no partial explanation.
- [ ] 4.5 Parse provider output as claim-to-passage references and verify every substantive claim before rendering; verify invented rules, wrong-edition text, unsupported examples/exceptions, invalid citations, conflict winners, and model confidence cause complete explanation rejection and extract-only or explicit non-answer fallback.

## 5. User experience, privacy, and read-only boundaries

- [ ] 5.1 Add an accessible authenticated English/German rule-question interface showing rules profile, corpus version, answer state, paraphrase/excerpt label, claim citations, provider disclosure, and focused clarification; verify keyboard/focus/status behavior and that non-answer states do not appear as successful rules.
- [ ] 5.2 Keep rule requests and responses transient and limit operational telemetry to request identity, outcome, source ids, sizes, timing, provider accounting, and error category; verify no raw question, passage, explanation, saved ruling, campaign attachment, product-facing history, or session event persists.
- [ ] 5.3 Enforce the read-only integration boundary at API, UI, and event layers; verify questions about combat, conditions/effects, items/loot, advancement, maps, audio, voice commands, or Discord can return cited text where supported but never create or mutate any owning-domain record, command, event, or message.

## 6. Acceptance and documentation

- [ ] 6.1 Add corpus/license acceptance fixtures for both original PDFs, checksums, heading/page extraction, language pairing, required attribution, source links, future-version isolation, and Basic Rules/non-SRD exclusion; verify the suite fails if provenance or legal metadata drifts.
- [ ] 6.2 Add grounding and adversarial tests covering direct and multi-passage answers, missing/partial evidence, ambiguous input, explicit DM judgment, English/German mismatch, same-source conflict, wrong edition, non-SRD names, pasted homebrew, prompt injection, unsupported provider claims, and generated citation fabrication.
- [ ] 6.3 Add authorization, privacy, provider-disclosure, capacity, failure, idempotency, no-history, and no-mutation integration tests; verify guests receive no service result and no accepted or failed request changes campaign, session, encounter, combat, condition/effect, character, progression, item, map, AI, audio, voice, or Discord state.
- [ ] 6.4 Reconcile the user guide and implementation documentation only after delivery, run the full project test suite plus `openspec validate add-rule-assistance --type change --strict --no-interactive` and main-spec validation, and verify no non-SRD source, unresolved provider default, saved ruling, wrong-edition behavior, or deferred integration is presented as implemented.
