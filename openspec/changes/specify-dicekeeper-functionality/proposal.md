# Proposal

## Why

Dicekeeper has working application code, current and future use-case diagrams, and historical requirements in Notion, but no OpenSpec specifications. A complete functional specification needs a repeatable sequence of bounded tasks so coding agents can distinguish accepted behavior, implementation gaps, and future scope without depending on a single conversation.

## What Changes

- Establish a 15-task runbook for producing the specification across separate tasks, with dependencies, outputs, review criteria, and a reusable handoff instruction.
- Cover the current application and a separately identified future scope, as confirmed by the user on 2026-09-21.
- Preserve the completed README, diagram, Notion, and GPT-5.5 source-code research as starting evidence; resolve identified conflicts at the capability that owns each decision.
- Produce a shared source register, glossary, decision log, coverage matrix, permission matrix, functional overview, and handoff record during execution.
- Author the accepted current behavior through a separate baseline OpenSpec change. Track implementation deviations and proposed corrections explicitly.
- Define future content/session records, combat automation, AI assistance, rule assistance, audio, and Discord through bounded follow-on planning changes. Record deferred or excluded features with reasons.
- Require traceable requirements, acceptance scenarios, cross-capability consistency checks, and strict OpenSpec validation before declaring the specification ready for agentic programming.

This change plans documentation work. Application implementation and deployment are outside its scope. Creating these planning artifacts does not mean that the runbook tasks have been executed.

## Capabilities

### New Capabilities

None in this coordination change. It introduces no product behavior and declares `skip_specs: true` in `.openspec.yaml`.

The candidate capability inventory and owning tasks are defined in [design.md](design.md). During execution, a separate baseline change will add the first product specifications, and follow-on changes will hold proposed corrections and future behavior.

### Modified Capabilities

None. The project had no existing main specifications at discovery time.

## Impact

- **Current planning artifacts:** this proposal, the runbook and evidence in [design.md](design.md), and the executable documentation checklist in [tasks.md](tasks.md).
- **Expected execution outputs:** supporting documentation under `docs/specification/`, an independently reviewable baseline change, accepted main specifications under `openspec/specs/`, and separate corrective/future planning changes under `openspec/changes/`.
- **Inputs:** `README.md`, both use-case diagrams in `docs/`, the linked historical Notion workspace, application source, and existing tests.
- **Review required during execution:** product decisions concerning ownership and visibility, session persistence, rules and progression, AI context, audio commands, and integration scope.
- **Runtime impact:** none from this documentation change. No new dependency, database migration, service, or application feature is proposed for implementation here.
