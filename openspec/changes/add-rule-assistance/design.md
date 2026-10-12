# Design

## Context

See [proposal.md](proposal.md) for motivation. The published baseline has authenticated player identities and campaign-scoped DM roles but no rule-assistance implementation. Section 10 fixes future combat and tracked progression to `DND_5E_2024` while deliberately leaving the rule corpus to this change. Section 11 permits external generation only as non-authoritative, fail-closed assistance and explicitly excludes rule answers from its provider context.

Primary-source review on 2026-09-23 established that Wizards of the Coast publishes English and German SRD 5.2.1 PDFs through the official D&D Beyond SRD page. Each document contains a publisher-supplied CC BY 4.0 attribution. The publisher separately states that D&D Beyond Basic Rules overlap with SRD material but are not released under Creative Commons for content creation. Creative Commons permits sharing and adaptation under CC BY 4.0 when required credit, license link, modification indication, and supplied notices are retained.

The repository does not contain the licensed PDF files or a rules index. The future implementation therefore needs an explicit acquisition and integrity step; this planning change does not download, vendor, transform, or publish the corpus.

## Goals / Non-Goals

**Goals:**

- Make every rule claim traceable to an immutable, licensed D&D 5e (2024) source passage.
- Keep English and German answers reproducible across corpus and provider changes.
- Make missing, ambiguous, conflicting, wrong-edition, and infrastructure outcomes explicit rather than speculative.
- Permit an external provider to improve explanation wording without granting it rule authority or requiring it for source lookup.
- Preserve authentication, data minimization, edition, and read-only boundaries across every answer path.

**Non-Goals:**

- Scraping D&D Beyond Basic Rules, accessing purchased books, accepting user-uploaded rulebooks, or using web search as runtime authority.
- Applying rules to product state, storing campaign rulings, implementing conditions/effects, full progression, items/loot, or tactical automation.
- Audio or voice input, executable voice commands, Discord delivery, campaign-context retrieval, or ingestion of AI preparation/recap output.
- Selecting a permanent external provider/model or inventing numeric usage, cost, timeout, or retention limits in documentation.
- Implementing application code, migrations, corpus files, or provider configuration during this planning change.

## Decisions

### 1. Pin the corpus to official SRD 5.2.1 English and German sources

Use exactly two source identities:

- `SRD-5.2.1-EN`: the official English SRD 5.2.1 PDF, published 2025-05-01;
- `SRD-5.2.1-DE`: the official German SRD 5.2.1 PDF, published 2025-12-08.

Both sources use CC BY 4.0 and the attribution supplied on the first printed page. Store their official URL, retrieval date, byte checksum, license URI, attribution text, language, printed-page mapping, and extracted-content checksum in one reviewed manifest. The English document controls semantics; the German document supplies official localized terminology and German answer evidence. Future SRD versions create new source identities and require a reviewed compatibility/index migration rather than replacing `5.2.1` in place.

Using only English was rejected because the accepted current UI uses German terminology and the publisher provides an official same-version localization. Treating the two languages as independent equal authorities was rejected because a translation mismatch needs deterministic behavior. SRD 5.1, D&D Beyond Basic Rules, other books, user uploads, and live web results were rejected because they are either the wrong edition/profile or outside this licensed corpus decision.

### 2. Build a reproducible local corpus rather than scraping at request time

Acquire the two approved PDFs from their manifest URLs during a reviewed administrative/build step, verify byte checksums, preserve the original immutable files, and extract normalized text into page- and heading-addressed spans. Each span retains source id, language, version, full heading path, printed page, extraction version, and source offsets. Build a replaceable search index only from those verified spans.

Runtime web scraping was rejected because availability, page structure, terms, and source identity can change independently of an answer. Indexing unverified text was rejected because citations would no longer prove which licensed document supplied the claim.

### 3. Use explicit answer states and a fail-closed pipeline

Process each request through authentication, input validation, edition/source classification, deterministic corpus retrieval, evidence sufficiency, conflict detection, optional explanation, claim-to-citation verification, and response assembly. Return one explicit state: `ANSWERED`, `SOURCE_EXTRACTS_ONLY`, `NEEDS_CLARIFICATION`, `NOT_IN_CORPUS`, `WRONG_EDITION`, `CONFLICTING_EVIDENCE`, or `UNAVAILABLE`.

No later stage may upgrade a missing, wrong-edition, or unresolved-conflict result merely because a model can produce plausible prose. A partially covered multi-part question is decomposed so supported parts can be cited and unsupported parts keep their own state.

A single generic error or confidence threshold was rejected because it would conflate source absence, ambiguity, conflict, edition mismatch, and infrastructure failure. Returning a best-effort answer was rejected because it would make model memory or common practice implicit authority.

### 4. Make citations a first-class result, not generated text

Represent each answer as claims linked to verified passage identifiers. Render citations from stored metadata in the form `SRD 5.2.1 (<language>), <heading path>, p./S. <printed page>, <source id>` with the official source link. The response also labels the `DND_5E_2024` profile, corpus version, answer language, and whether content is paraphrase or source excerpt.

The UI provides a persistent legal/attribution view containing the publisher's supplied attribution and CC BY 4.0 link and marks Dicekeeper extraction, indexing, formatting, and paraphrase as adaptations where applicable. Citation display is generated from manifest data, never copied from a model response.

Provider-generated page numbers or URLs were rejected because a fluent but invalid citation is worse than an explicit non-answer. Heading-only citations were rejected because repeated terms can make them ambiguous; page-only citations were rejected because a long page does not identify the relevant rule.

### 5. Resolve conflicts through source-backed precedence only

For English/German mismatches, surface both passages and use English only for the supported semantic conclusion. For multiple English passages, apply a general/specific or other precedence rule only when a retrieved SRD passage itself establishes that precedence. Otherwise return `CONFLICTING_EVIDENCE` and no winner. Record the passages and result for diagnostics without treating retrieval ranking as precedence.

Automatic newest-page, longest-passage, highest-search-score, or model-selected precedence was rejected because none establishes rule authority. Silently merging translations was rejected because it hides a source defect from the user.

### 6. Keep the explanation provider optional and non-authoritative

The corpus retrieval and extract-only response path operates without an external model. When enabled, a provider receives only the normalized user question, minimum verified passages and citation metadata, requested language, and response constraints after the user is shown and confirms the transfer. It never receives automatic campaign, character, note, session, combat, AI, audio, or Discord context.

Before enablement, server configuration must select a provider/model and finite request, context, output, timeout, usage/cost, accounting, and provider-retention limits. Reserve usage and dispatch once per idempotency identity. Treat output as a structured draft whose claims reference passage ids; reject the entire explanation when any substantive claim is unsupported and fall back to `SOURCE_EXTRACTS_ONLY`.

Making a provider mandatory was rejected because availability or capacity would unnecessarily block access to licensed source evidence. Letting the model retrieve or cite from memory was rejected because it defeats corpus and edition controls. Exact provider and numeric limits remain deployment choices because repository evidence supplies no defensible values; the extract-only path keeps that deferral from changing the spec or task structure.

### 7. Store no product-facing rule-question history

The accepted domain model contains no saved question, answer, ruling, campaign attachment, or shared rule note. Process a request and return its result without creating a product record or session event. Operational telemetry uses source ids, outcome, timing, sizes, provider accounting, and error categories but excludes raw question text, retrieved passages, and generated answers unless a separately reviewed privacy/diagnostic policy later authorizes them.

Persisting a rule library was rejected because ownership, audience, editing, campaign association, retention, deletion, and stale-corpus migration are unanswered. Adding results to session history was rejected because an explanation is not an authoritative gameplay outcome.

### 8. Keep rule answers separate from state mutation

Rule assistance may explain corpus text about combat, conditions, items, or advancement, but that explanation does not accept those domains as Dicekeeper automation. API and UI boundaries expose no mutation command or deep link that implies an action was applied. Any future apply-a-ruling workflow requires its owning capability to define authority, validation, audit, correction, and conflicts first.

Combining answer generation with combat, progression, or voice execution was rejected because sections 10 and 13 explicitly keep those decisions separate and because cited text alone does not define Dicekeeper's mutation workflow.

## Data and processing shape

Future implementation should introduce records or immutable artifacts equivalent to:

- corpus manifest: source id, profile, version, language, official URL, publication/retrieval dates, byte and extracted-content checksums, license URI, attribution text, and extraction version;
- corpus span: source id, full heading path, printed page, normalized text, source offsets, and content checksum;
- search index: replaceable derived data keyed only to verified span ids and one manifest version;
- request envelope: authenticated player id, normalized question, requested language, declared edition hints, idempotency identity, and provider-transfer confirmation;
- transient evidence bundle: ranked verified span ids, sufficiency/conflict state, and exact citation metadata;
- response: explicit outcome, supported claims or source excerpts, citations, profile/version/language labels, and provider disclosure when used;
- usage/audit metadata: request identity, outcome, source ids, sizes, timing, provider accounting, and failure category without raw content.

Corpus records and provider configuration are operational/reference data, not campaign-owned content. No foreign key or event path should attach a response to a campaign, session, encounter, character, or combat tracker.

## Risks / Trade-offs

- **SRD coverage is intentionally incomplete** -> Return `NOT_IN_CORPUS` and identify the licensed boundary instead of filling gaps from books, Basic Rules, or model memory.
- **PDF extraction can lose headings or page identity** -> Verify fixtures against both original documents and exclude spans whose provenance cannot be reconstructed.
- **English/German localization can diverge** -> Surface both citations and use English semantic precedence; never silently merge.
- **Claim verification cannot prove every nuance automatically** -> Use structured claim/passage links, adversarial fixtures, and fail to extracts-only whenever support is not demonstrable.
- **Provider disclosure and limits reduce convenience** -> Preserve a fully functional local retrieval/extract path and keep provider use optional.
- **Version pinning can become stale** -> Make the active version visible and define a reviewed update workflow; never silently reinterpret prior answers.
- **No saved history limits collaboration** -> Keep history/ruling-library scope deferred until ownership, audience, correction, retention, and deletion are accepted.

## Migration Plan

1. Add the corpus manifest and attribution configuration without enabling rule queries.
2. Acquire and checksum the official English/German SRD 5.2.1 files through the reviewed source step; retain immutable originals and build page/heading spans plus the search index.
3. Run corpus integrity, attribution, heading/page, language-pair, wrong-edition, omission, and conflict fixtures before enabling authenticated extract-only queries.
4. Add explicit answer states, citations, and the English/German rule-question UI with no product history or state-mutation path.
5. Optionally configure and enable an explanation provider only after finite limits, retention terms, transfer disclosure, idempotency, and claim-verification acceptance pass.
6. Run authorization, privacy, failure, adversarial grounding, license-display, and read-only integration tests before general availability.

Rollback disables provider generation first and leaves extract-only lookup available when corpus integrity remains valid. A full rollback disables the query entry point while retaining the immutable corpus manifest and licensed attribution records for audit; it does not delete or rewrite any campaign, character, combat, progression, or session state because this capability creates none.
