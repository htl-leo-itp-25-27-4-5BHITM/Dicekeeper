# Tasks

## 1. Complete the baseline artifacts

- [x] 1.1 Reconcile the proposal's capability inventory with the 14 delta-spec directories and verify both contain the same paths with no duplicate or missing capability.
- [x] 1.2 Review every delta specification in full and verify OpenSpec parses 102 requirements and 447 scenarios, with at least one scenario for every requirement.
- [x] 1.3 Complete `design.md` with the publication approach, cross-capability permissions, lifecycle, deletion, persistence, and separation-of-corrections decisions, and verify `openspec status --change document-dicekeeper-baseline --json` reports the design artifact done.

## 2. Review the accepted current contract

- [x] 2.1 Review the sign-in-to-live-play, map/live-control, reconnect/revocation, and destructive-action journeys; verify all 33 current use cases and every accepted current additional candidate in `docs/specification/coverage.md` link to baseline requirements and scenarios.
- [x] 2.2 Reconcile the glossary, permission/view matrices, campaign start, character-review, membership, and group-decision transitions; verify the shared terms and actor boundaries agree with the owning capability requirements.
- [x] 2.3 Reconcile membership, character, campaign, account, media, notification, decision, live-state, subscription, and browser-local-note deletion effects; verify each removed resource and preserved boundary has an owning requirement or explicit limitation.
- [x] 2.4 Keep all 49 recorded implementation deviations outside the normative baseline, leave `correct-character-library-boundaries` proposal-only and unchanged, and verify no application source, test, runtime configuration, or deployment file changed during this review.

## 3. Prepare verified publication

- [x] 3.1 Update the shared overview, coverage, evidence, and handoff for the accepted main-spec paths, archive destination, unresolved decision gates, and corrective records; verify current, missing, and future behavior are distinguishable without conversation history.
- [x] 3.2 Run strict change validation and review the parsed delta set, then verify all 14 capabilities, 102 requirements, and 447 scenarios remain present with no unexplained validation failure.
- [x] 3.3 Verify every baseline artifact is complete, every checklist item represents delivered documentation rather than application implementation, repository links and whitespace checks pass, and publication can proceed through the OpenSpec archive workflow.
