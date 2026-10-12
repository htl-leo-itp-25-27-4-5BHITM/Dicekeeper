# Live Session Recovery Test Plan

## Application Overview

Dicekeeper supervises an authenticated campaign event stream, pauses background polling when authentication expires, and accepts a recovered view as current only after every required snapshot resource has loaded successfully.

## Test Scenarios

### 1. Coordinated Reauthentication

**Seed:** `tests/e2e/live-session-recovery.seed.spec.js`

#### 1.1. recover-expired-live-session-once

**File:** `tests/e2e/live-session-reauthentication.spec.js`

**Steps:**
  1. Open the controlled live-session fixture and establish its first event stream.
    - expect: the accessible live status changes from connecting through reconciling to current
    - expect: one complete authoritative projection is applied
  2. Make the protected session probe return 499 and terminate the event stream.
    - expect: the state history records stale and reauthenticating
    - expect: notification polling stops without repeatedly issuing requests
  3. Activate the reauthentication action more than once.
    - expect: exactly one login initiation is recorded
  4. Confirm authentication and establish the fresh event stream.
    - expect: exactly one replacement event source is created
    - expect: a complete snapshot is applied and the accessible status returns to current

### 2. Atomic Reconciliation Failure

**Seed:** `tests/e2e/live-session-recovery.seed.spec.js`

#### 2.1. keep-stale-projection-when-snapshot-read-fails

**File:** `tests/e2e/live-session-partial-snapshot.spec.js`

**Steps:**
  1. Open the controlled fixture and establish a current projection.
    - expect: the initial snapshot is applied once and labeled current
  2. Terminate the event stream with a valid session and fail the required decisions read for the replacement stream.
    - expect: the accessible live status remains stale
    - expect: the previously confirmed map and game projection is unchanged
    - expect: no partial snapshot is counted as applied
