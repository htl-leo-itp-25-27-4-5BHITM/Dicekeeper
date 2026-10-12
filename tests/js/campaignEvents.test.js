import { describe, expect, it, vi } from 'vitest';

import { createAuthenticationRecoveryCoordinator } from '../../src/main/resources/META-INF/resources/app/services/auth.js';
import { connectCampaignEvents } from '../../src/main/resources/META-INF/resources/app/services/campaignEvents.js';
import {
  FakeClock,
  createEventSourceFactory,
  createFetchQueue
} from './helpers/recoveryFakes.js';

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createHarness({ responses = [], overrides = {} } = {}) {
  const clock = new FakeClock();
  const eventSources = createEventSourceFactory();
  const fetchQueue = createFetchQueue(responses);
  const states = [];
  const auth = createAuthenticationRecoveryCoordinator({
    storage: { setItem: vi.fn(), removeItem: vi.fn() },
    navigation: vi.fn(),
    clearCachedPlayer: vi.fn(),
    currentPath: () => '/campaign/4/play',
    publish: vi.fn()
  });
  const dispose = connectCampaignEvents(4, overrides.handlers || {}, {
    sourceFactory: eventSources.create,
    fetchImpl: fetchQueue.fetch,
    authCoordinator: auth,
    origin: 'http://dicekeeper.test',
    reconnectDelaysMs: [100, 200],
    heartbeatTimeoutMs: 1_000,
    onStateChange: state => states.push(state),
    ...clock.adapters(),
    ...overrides
  });
  return { auth, clock, dispose, eventSources, fetchQueue, states };
}

describe('campaign event supervisor', () => {
  it('owns one source, timer, and recovery attempt across terminal replacement', async () => {
    const loadSnapshot = vi.fn().mockResolvedValue({ version: 1 });
    const applySnapshot = vi.fn();
    const harness = createHarness({
      responses: [new Response('{}', { status: 200 })],
      overrides: { loadSnapshot, applySnapshot }
    });

    harness.eventSources.sources[0].emit('connected', { status: 'connected' });
    await flush();
    expect(harness.dispose.getState()).toBe('current');
    harness.eventSources.sources[0].fail({ terminal: true });
    harness.eventSources.sources[0].fail({ terminal: true });
    await flush();

    expect(harness.fetchQueue.calls).toHaveLength(1);
    expect(harness.clock.pendingCount()).toBe(1);
    harness.clock.tick(100);
    expect(harness.eventSources.sources).toHaveLength(2);
    expect(harness.eventSources.sources[0].closeCalls).toBe(1);
    expect(harness.states).toContain('stale');
    expect(harness.states).toContain('reconnecting');
    harness.dispose();
  });

  it.each([
    ['reauthenticating', new Response('', { status: 499 })],
    ['revoked', new Response('', { status: 403 })],
    ['unavailable', new Response('', { status: 503 })]
  ])('suspends retries in the %s outcome', async (expectedState, response) => {
    const harness = createHarness({ responses: [response] });
    harness.eventSources.sources[0].fail({ terminal: true });
    await flush();

    expect(harness.dispose.getState()).toBe(expectedState);
    expect(harness.clock.pendingCount()).toBe(0);
    expect(harness.eventSources.sources).toHaveLength(1);
    harness.dispose();
  });

  it('opens a fresh source for an explicit retry after an unavailable probe', async () => {
    const harness = createHarness({ responses: [new Response('', { status: 503 })] });
    harness.eventSources.sources[0].fail({ terminal: true });
    await flush();
    expect(harness.dispose.getState()).toBe('unavailable');

    expect(harness.dispose.retry()).toBe(true);
    expect(harness.eventSources.sources).toHaveLength(2);
    expect(harness.dispose.getState()).toBe('reconnecting');
    harness.dispose();
  });

  it('opens a fresh source only after authentication is confirmed', async () => {
    const harness = createHarness({ responses: [new Response('', { status: 499 })] });
    harness.eventSources.sources[0].fail({ terminal: true });
    await flush();
    expect(harness.dispose.getState()).toBe('reauthenticating');

    harness.auth.authenticated();
    expect(harness.clock.pendingCount()).toBe(1);
    harness.clock.tick(0);
    expect(harness.eventSources.sources).toHaveLength(2);
    harness.dispose();
  });

  it('uses heartbeat liveness, bounded backoff, and idempotent disposal', async () => {
    const harness = createHarness({ responses: [new Response('{}', { status: 200 })] });
    harness.eventSources.sources[0].emit('connected', { status: 'connected' });
    await flush();
    expect(harness.clock.pendingCount()).toBe(1);

    harness.clock.tick(1_000);
    await flush();
    expect(harness.dispose.getState()).toBe('reconnecting');
    expect(harness.clock.pendingCount()).toBe(1);

    harness.dispose();
    harness.dispose();
    harness.clock.tick(10_000);
    expect(harness.eventSources.sources).toHaveLength(1);
    expect(harness.dispose.getState()).toBe('disposed');
    expect(harness.clock.pendingCount()).toBe(0);
  });

  it('does not reopen after a late recovery completion on a disposed route', async () => {
    const probe = deferred();
    const harness = createHarness({ responses: [() => probe.promise] });
    harness.eventSources.sources[0].fail({ terminal: true });
    harness.dispose();
    probe.resolve(new Response('{}', { status: 200 }));
    await flush();
    harness.clock.tick(10_000);

    expect(harness.eventSources.sources).toHaveLength(1);
    expect(harness.clock.pendingCount()).toBe(0);
  });

  it('ignores duplicates and reconciles malformed, gap, and older events', async () => {
    const appliedEvents = [];
    const loadSnapshot = vi.fn().mockResolvedValue({ ok: true });
    const harness = createHarness({
      overrides: {
        handlers: { hp: data => appliedEvents.push(data.value) },
        loadSnapshot,
        applySnapshot: vi.fn()
      }
    });
    const source = harness.eventSources.sources[0];
    source.emit('connected', { status: 'connected' });
    await flush();

    source.emit('hp', { value: 10 }, { lastEventId: '1' });
    source.emit('hp', { value: 99 }, { lastEventId: '1' });
    source.emit('hp', { value: 11 }, { lastEventId: '2' });
    source.emit('hp', { value: 4 }, { lastEventId: '1' });
    await flush();
    source.emit('hp', '{broken', { lastEventId: '3' });
    await flush();
    source.emit('hp', { value: 20 }, { lastEventId: '7' });
    await flush();

    expect(appliedEvents).toEqual([10, 11]);
    expect(loadSnapshot.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(harness.dispose.getState()).toBe('current');
    harness.dispose();
  });

  it('coalesces events during reconciliation into one authoritative follow-up', async () => {
    const first = deferred();
    const second = deferred();
    const applySnapshot = vi.fn();
    const loadSnapshot = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const harness = createHarness({
      responses: [new Response('', { status: 499 })],
      overrides: {
        handlers: { hp: vi.fn() },
        loadSnapshot,
        applySnapshot
      }
    });
    const source = harness.eventSources.sources[0];
    source.emit('connected', { status: 'connected' });
    source.emit('hp', { value: 8 }, { lastEventId: '1' });
    first.resolve({ version: 1 });
    await flush();
    expect(loadSnapshot).toHaveBeenCalledTimes(2);

    second.resolve({ version: 2 });
    await flush();
    expect(applySnapshot).toHaveBeenCalledTimes(1);
    expect(applySnapshot).toHaveBeenCalledWith({ version: 2 }, expect.any(Object));
    expect(harness.dispose.getState()).toBe('current');
    harness.dispose();
  });

  it('discards an older in-flight snapshot after a later recovery supersedes it', async () => {
    const snapshot = deferred();
    const applySnapshot = vi.fn();
    const harness = createHarness({
      responses: [new Response('', { status: 499 })],
      overrides: {
        loadSnapshot: vi.fn().mockReturnValue(snapshot.promise),
        applySnapshot
      }
    });
    const source = harness.eventSources.sources[0];
    source.emit('connected', { status: 'connected' });
    source.fail({ terminal: true });
    snapshot.resolve({ version: 1 });
    await flush();

    expect(applySnapshot).not.toHaveBeenCalled();
    expect(harness.dispose.getState()).toBe('reauthenticating');
    harness.dispose();
  });
});
