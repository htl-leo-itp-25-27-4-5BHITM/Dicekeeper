# Proposal

## Why

Dicekeeper's future diagram allows DMs and players to ask D&D rules questions, but the repository has no licensed rule corpus or contract for source authority, citations, edition conflicts, or unsupported answers. A bounded rule-assistance capability is needed so explanations remain traceable to the accepted D&D 5e (2024) profile without turning generated prose into a rule source.

## What Changes

- Add authenticated DM/player rule questions for material contained in the version-pinned D&D 5e (2024) SRD 5.2.1 corpus.
- Use only the official English and German SRD 5.2.1 documents distributed by Wizards of the Coast under CC BY 4.0. English is the semantic precedence source and German is the official localized companion; D&D Beyond Basic Rules, non-SRD books, SRD 5.1/2014 rules, user uploads, and live web results are outside the corpus.
- Require immutable source provenance, the publisher-supplied attribution, and claim-level citations containing source version, language, heading path, printed page, and official source link.
- Require fail-closed outcomes for missing, ambiguous, uncertain, conflicting, wrong-edition, unavailable, or unverifiable evidence. A configured explanation provider may draft a concise explanation from retrieved passages, but neither its prose nor a confidence score is rule authority.
- Keep rule assistance read-only. It does not apply a ruling or mutate campaign, session, encounter, combat, condition/effect, character, progression, item/loot, map, audio, voice-command, Discord, or AI-preparation state.
- Preserve the published current baseline until this future change is implemented and reviewed; planning this capability does not make rule assistance current.

## Capabilities

### New Capabilities

- `rule-assistance`: Authenticated D&D 5e (2024) SRD rule questions, licensed corpus provenance, grounded explanations, claim-level citations, uncertainty/conflict handling, provider failures, and read-only boundaries.

### Modified Capabilities

None. Existing main and future capability contracts remain unchanged; this capability may explain cited rules but does not broaden their accepted behavior or mutation authority.

## Impact

- Future implementation will require an immutable SRD 5.2.1 corpus manifest and index, English/German heading and printed-page metadata, attribution display, retrieval and citation verification, an authenticated query API/view, and optional fail-closed explanation-provider integration.
- Exact provider/model, numeric request/context/output/time/usage limits, accounting scope, provider retention terms, and operational enablement remain required configuration choices before an external explanation provider can be enabled; they are not invented by this planning change.
- No application code, dependency, migration, runtime configuration, current main spec, section-9/10/11 implementation task, audio/voice/Discord artifact, or deferred item/condition/full-progression feature is changed by this planning work.
