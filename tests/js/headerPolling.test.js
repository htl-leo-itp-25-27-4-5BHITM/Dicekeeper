import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('notification polling after authentication expiry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    document.body.innerHTML = '';
    sessionStorage.clear();
    const values = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: key => values.has(key) ? values.get(key) : null,
        removeItem: key => values.delete(key),
        setItem: (key, value) => values.set(key, String(value))
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('makes one 499 request, stops, and resumes only after confirmed authentication', async () => {
    sessionStorage.setItem('player', JSON.stringify({ id: 5, username: 'tester' }));
    const rawFetch = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 499 }))
      .mockResolvedValue(new Response('0', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    window.fetch = rawFetch;

    const auth = await import('../../src/main/resources/META-INF/resources/app/services/auth.js');
    const header = await import('../../src/main/resources/META-INF/resources/app/components/header.js');
    auth.installAuthFetchInterceptor();
    document.body.innerHTML = header.renderHeader();
    header.initHeader();
    await vi.runAllTicks();

    expect(rawFetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(90000);
    expect(rawFetch).toHaveBeenCalledTimes(1);

    auth.getAuthenticationRecoveryCoordinator().authenticated();
    await vi.runAllTicks();
    expect(rawFetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(30000);
    expect(rawFetch).toHaveBeenCalledTimes(3);

    header.destroyHeader();
  });
});
