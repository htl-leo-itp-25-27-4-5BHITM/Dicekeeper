import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  backgroundAuthRequest,
  completeAuthenticationCallback,
  createAuthenticationRecoveryCoordinator,
  installAuthFetchInterceptor
} from '../../src/main/resources/META-INF/resources/app/services/auth.js';
import { createNavigationSpy } from './helpers/recoveryFakes.js';

describe('authentication recovery coordinator', () => {
  beforeEach(() => sessionStorage.clear());

  it('converges concurrent expiry detections on one state and one navigation', async () => {
    sessionStorage.setItem('player', JSON.stringify({ id: 1 }));
    const navigation = createNavigationSpy();
    const clearCachedPlayer = vi.fn(() => sessionStorage.removeItem('player'));
    const coordinator = createAuthenticationRecoveryCoordinator({
      storage: sessionStorage,
      navigation: navigation.assign,
      clearCachedPlayer,
      currentPath: () => '/campaign/7/play',
      publish: vi.fn()
    });
    const target = {
      location: { origin: 'http://dicekeeper.test', hash: '#/campaign/7/play' },
      fetch: vi.fn()
        .mockResolvedValueOnce(new Response('', { status: 499 }))
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          redirected: true,
          url: 'https://identity.example/realms/dicekeeper'
        })
    };
    installAuthFetchInterceptor({ target, coordinator });

    const [first, second] = await Promise.all([
      target.fetch('/api/campaign/7', backgroundAuthRequest()),
      target.fetch('/api/campaign/7/game/state')
    ]);

    expect(first.status).toBe(499);
    expect(second.redirected).toBe(true);
    expect(clearCachedPlayer).toHaveBeenCalledOnce();
    expect(coordinator.getState()).toMatchObject({
      status: 'expired',
      continuationPath: '/campaign/7/play',
      loginStarted: true
    });
    expect(navigation.destinations).toHaveLength(1);
    expect(decodeURIComponent(decodeURIComponent(navigation.destinations[0])))
      .toContain('/campaign/7/play');
  });

  it('reports background expiry without navigation and preserves request headers', async () => {
    const navigation = createNavigationSpy();
    const coordinator = createAuthenticationRecoveryCoordinator({
      storage: sessionStorage,
      navigation: navigation.assign,
      clearCachedPlayer: vi.fn(),
      currentPath: () => '/campaigns',
      publish: vi.fn()
    });
    const response = new Response('', { status: 499 });
    const originalFetch = vi.fn().mockResolvedValue(response);
    const target = {
      location: { origin: 'http://dicekeeper.test', hash: '#/campaigns' },
      fetch: originalFetch
    };
    installAuthFetchInterceptor({ target, coordinator });

    const delivered = await target.fetch('/api/notification/count', backgroundAuthRequest({
      headers: { Accept: 'application/json' }
    }));

    expect(delivered).toBe(response);
    const headers = originalFetch.mock.calls[0][1].headers;
    expect(headers.get('X-Requested-With')).toBe('JavaScript');
    expect(headers.get('Accept')).toBe('application/json');
    expect(coordinator.getState().status).toBe('expired');
    expect(navigation.destinations).toEqual([]);
  });

  it('only restores a sanitized route after identity synchronization succeeds', async () => {
    sessionStorage.setItem('player', JSON.stringify({ id: 99, stale: true }));
    const navigate = vi.fn();
    const player = await completeAuthenticationCallback('https://attacker.example', {
      syncPlayer: vi.fn().mockImplementation(async () => {
        expect(sessionStorage.getItem('player')).toBeNull();
        return { id: 2 };
      }),
      navigate
    });

    expect(player).toEqual({ id: 2 });
    expect(navigate).toHaveBeenCalledWith('/campaigns');

    navigate.mockClear();
    sessionStorage.setItem('player', JSON.stringify({ id: 99, stale: true }));
    await expect(completeAuthenticationCallback('/campaign/2/play', {
      syncPlayer: vi.fn().mockRejectedValue(new Error('identity unavailable')),
      navigate
    })).rejects.toThrow('identity unavailable');
    expect(sessionStorage.getItem('player')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});
