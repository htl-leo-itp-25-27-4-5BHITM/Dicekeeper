# Design

## Context

See [proposal.md](proposal.md) for the motivation and scope. This change publishes a documentation-only baseline for the 14 current Dicekeeper capabilities. The capability deltas contain 102 requirements and 447 scenarios derived from confirmed decisions, the two canonical use-case diagrams, static source review, and the limited test evidence recorded in [`docs/specification/evidence.md`](../../../../docs/specification/evidence.md).

The reviewed source does not implement every accepted contract. Those differences are implementation deviations, not alternative baseline behavior. They remain outside the normative specifications in the evidence register and in open corrective planning, including the proposal-only `correct-character-library-boundaries` change. Main OpenSpec specifications are empty before this change is published.

## Goals / Non-Goals

**Goals:**

- Publish one coherent, traceable current-behavior contract across all 14 capability paths.
- Keep normative requirements separate from source observations, known deviations, and future proposals.
- Reconcile cross-capability permissions, lifecycle transitions, deletion effects, state lifetimes, and view projections before publication.
- Make the published baseline navigable from the shared documentation and verifiable through strict OpenSpec validation.

**Non-Goals:**

- Implementing, repairing, testing, deploying, or migrating the Dicekeeper application.
- Advancing or completing any corrective change, including `correct-character-library-boundaries`.
- Publishing future campaign-content, combat, AI, rule-assistance, audio, voice-command, or Discord behavior.
- Inventing quantitative performance, viewport, browser, availability, contrast, or accessibility-conformance targets.

## Decisions

### Publish the accepted contract rather than the observed implementation

The 14 delta specifications are the source for the main capability specs. Static code and the two executed unit-test commands establish implementation evidence only. A source deviation remains linked from the shared evidence and coverage records and does not weaken or silently alter a confirmed requirement.

The alternative of publishing only source-observed behavior was rejected because it would enshrine known authorization, validation, cleanup, and synchronization defects as product intent. The alternative of editing application code during publication was rejected because this change is documentation-only and the corrective work has separate ownership.

### Keep flat capability ownership with explicit cross-references

Each behavior has one primary capability owner. Cross-cutting views, synchronization, and deletion scenarios refer to the owning campaign, membership, character, media, live-play, decision, notification, or note contract rather than redefining it. The proposal's 14 capability paths therefore remain unchanged during publication.

The alternative of creating screen-specific duplicates was rejected because DM, player, and table screens would otherwise drift from the same permission and lifecycle rules.

### Use least-privilege projections across every delivery path

Account-private data, contextual player summaries, campaign story, review data, character details, media originals, fog-respecting maps, decisions, notifications, notes, and live events follow the same actor and view boundaries whether delivered by a REST read, media URL, event stream, or cached view. A route or client-rendered control never grants authority.

The alternative of trusting clients to discard over-broad payloads was rejected because direct endpoints, transformed media, and shared event payloads can bypass presentation-only filtering.

### Reconcile state transitions before publishing

The baseline uses closed transitions for campaign start, character review, membership removal, and group decisions. Character locks and deletion eligibility are recalculated from remaining membership references. Group-decision membership changes update the electorate only while a decision is pending. Campaign start is one-way and creates no durable session history.

The alternative of leaving transition details to implementation was rejected because those details determine authorization, notifications, cleanup, and what every live view may present.

### Reconcile deletion by resource ownership

Deletion follows the resource owner rather than UI reachability:

| Trigger | Removed | Preserved or separately bounded |
| --- | --- | --- |
| Membership leave/removal | Membership role, review state/reference/notes, dependent navigation notifications, live/event access | Player-owned character; other memberships and campaign data |
| Campaign deletion | Campaign, memberships/reviews, campaign notifications and decisions, campaign media, map/live runtime, subscriptions | Member-owned characters and unrelated player data |
| Character deletion | Owner's unreferenced character plus its dependent ability/skill data | Any referenced character until its membership references are removed |
| Account deletion | External identity, local profile/avatar, addressed notifications, memberships, owned campaigns, and established owned unreferenced characters | Other players' resources; browser-local notes on unmanaged browser profiles cannot be guaranteed erased |

Persistent cleanup must complete or leave an explicit recoverable obligation before a destructive operation is reported complete. Browser-local notes retain their explicitly limited deletion semantics.

The alternative of inferring ownership from a campaign reference was rejected because the reviewed character model lacks a reliable owner field and such inference can delete another resource accidentally.

### Preserve distinct storage lifetimes

The baseline keeps five lifetime classes distinct: external identity-provider state, persisted application records, ephemeral campaign runtime, browser-session drafts, and browser-profile local notes/theme. Snapshot reconciliation may restore only data from its authoritative lifetime. It never turns cached runtime into durable session history or sends private local notes through live synchronization.

The alternative of describing all visible state as one recoverable session was rejected because it contradicts the reviewed persistence boundaries and would invent future session-record behavior.

### Publish through verified OpenSpec synchronization and archive

After semantic review, every baseline checklist item must correspond to delivered documentation. The change must pass strict change validation, the delta specs must be synchronized to all 14 main capability paths, the synchronized main specs must match the deltas, and strict main-spec validation must pass before the change is moved to the dated archive. Shared overview, coverage, evidence, and handoff records are updated to point at the published main specs and open correction records.

The alternative of copying files manually or archiving without synchronization was rejected because it would leave the main specification empty or make the archive state difficult to verify.

## Risks / Trade-offs

- **Accepted requirements differ from the current application** → Keep every known deviation in the evidence/coverage index and open corrective planning; never label the baseline as implemented or runtime-verified.
- **Cross-capability references can drift after publication** → Link to canonical capability requirements, retain the shared permission/deletion/lifetime review, and require later changes to update affected specs and shared documentation.
- **Strict validation can pass a semantically incomplete baseline** → Pair CLI validation with the end-to-end journey, use-case, permissions, transition, deletion, and state-lifetime review recorded by section 8.
- **Published specifications may later prove incorrect** → Correct them through a scoped reviewed OpenSpec change and preserve the decision/evidence history rather than rewriting the archived baseline.
- **Quantitative quality targets remain unresolved** → Keep the state-based current contract publishable while preventing affected corrective implementation or release work from being called ready until values and a test environment are selected.

## Migration Plan

1. Complete the semantic review and shared traceability records without changing application code.
2. Strictly validate `document-dicekeeper-baseline` and review its complete parsed requirement/scenario set.
3. Synchronize the 14 ADDED capability deltas into `openspec/specs/` and verify each resulting main spec against its delta.
4. Strictly validate all main specs.
5. Move the completed change to the dated archive and update the shared overview, coverage, evidence, and handoff links.

Rollback is documentation-only: use version control to revert an erroneous publication before dependent work begins, or preferably author a focused corrective specification change once the published contract has downstream references. No runtime or data rollback is part of this change.

## Open Questions

- Exact browser/version, viewport, accessibility-conformance/contrast, latency, capacity, and availability targets remain intentionally unselected. They do not change this state-based baseline, but they must be decided before affected corrective implementation or release work is considered ready.
