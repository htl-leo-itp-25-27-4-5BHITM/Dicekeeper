# Proposal

## Why

The accepted `character-library` baseline requires player-owned characters, contextual read-only DM access, validated character data, and reference-safe deletion, while the current source has no character owner and exposes authenticated CRUD globally. A separate corrective change is needed so these source gaps are not mistaken for delivered baseline behavior.

## What Changes

- Add an explicit owner to each character and define a reviewed migration or backfill for existing records before enforcing the new boundary.
- Scope character listing, direct reads, edits, ability-score updates, selection, and deletion to the authenticated owner.
- Permit a campaign DM to read, but not mutate, only a character referenced by a membership in that DM's campaign.
- Validate complete character creation and edits, including reference values and the current ability-score allocation, without leaving a partial persistent character after failure.
- Isolate recoverable creation drafts by authenticated player and creation context.
- Reject deletion while a campaign membership references the character, and make account cleanup delete only characters whose ownership is established.
- Prevent the generic character editor from acting as an unreviewed level-progression path.

This change aligns application behavior with the accepted baseline contract. It does not add or modify product requirements, so `.openspec.yaml` declares `skip_specs: true`; the normative contract remains in the active baseline's `character-library` delta until task 8 publishes it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is an implementation-correction change against the accepted `character-library` baseline contract, not a behavior change.

## Impact

- Character persistence and migration/backfill for existing records.
- Character CRUD, ability-score, reference-data, campaign-selection, review-read, and account-deletion authorization paths.
- Character creation/editing frontend flows and browser-session draft isolation.
- Targeted authorization, validation, migration, and deletion-reference tests.
- No correction is implemented by this proposal; design and implementation tasks remain to be authored after baseline review.
