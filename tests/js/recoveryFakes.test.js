import { describe, expect, it, vi } from 'vitest';

import {
  FakeClock,
  createEventSourceFactory,
  createFetchQueue,
  createNavigationSpy,
  jsonResponse
} from './helpers/recoveryFakes.js';

describe('recovery test adapters', () => {
  it('drives timers and navigation deterministically', () => {
    const clock = new FakeClock(100);
    const navigation = createNavigationSpy();
    const callback = vi.fn();

    clock.setTimeout(callback, 25);
    navigation.assign('/api/auth/login');
    clock.tick(24);
    expect(callback).not.toHaveBeenCalled();
    clock.tick(1);

    expect(callback).toHaveBeenCalledOnce();
    expect(navigation.destinations).toEqual(['/api/auth/login']);
  });

  it.each([
    ['connected', () => jsonResponse(200, { id: 7 })],
    ['499', () => jsonResponse(499, { error: 'expired' })],
    ['403', () => jsonResponse(403, { error: 'revoked' })],
    ['failed snapshot', () => new Error('snapshot failed')]
  ])('queues the %s fetch outcome', async (_name, createOutcome) => {
    const outcome = createOutcome();
    const queue = createFetchQueue([outcome]);
    if (outcome instanceof Error) {
      await expect(queue.fetch('/api/test')).rejects.toThrow('snapshot failed');
    } else {
      await expect(queue.fetch('/api/test')).resolves.toBe(outcome);
    }
    expect(queue.calls).toHaveLength(1);
  });

  it('drives connected, transient-error, and terminal-error source states', () => {
    const factory = createEventSourceFactory();
    const source = factory.create('/api/campaign/1/sse');
    const connected = vi.fn();
    const errors = vi.fn();
    source.addEventListener('connected', connected);
    source.onerror = errors;

    source.emit('connected', { status: 'connected' });
    expect(source.readyState).toBe(1);
    source.fail();
    expect(source.readyState).toBe(0);
    source.fail({ terminal: true });

    expect(source.readyState).toBe(2);
    expect(connected).toHaveBeenCalledOnce();
    expect(errors).toHaveBeenCalledTimes(2);
  });
});
