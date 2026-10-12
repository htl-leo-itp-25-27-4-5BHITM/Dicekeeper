import { describe, expect, it, vi } from 'vitest';

import {
  SnapshotReadError,
  loadGMRecoverySnapshot,
  loadPlayerRecoverySnapshot,
  loadTableRecoverySnapshot
} from '../../src/main/resources/META-INF/resources/app/services/liveSnapshots.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' }
});

describe('staged live snapshots', () => {
  it.each([
    ['GM', loadGMRecoverySnapshot, 4],
    ['player', loadPlayerRecoverySnapshot, 4],
    ['table', loadTableRecoverySnapshot, 3]
  ])('loads the complete %s resource set before returning', async (_name, loader, expectedReads) => {
    const fetchImpl = vi.fn(url => {
      if (url.includes('/state')) return Promise.resolve(json({ currentTurnPlayerId: 3 }));
      if (url.includes('/map-markers')) return Promise.resolve(json([]));
      if (url.includes('/decisions')) return Promise.resolve(json([]));
      return Promise.resolve(json({ id: 8, name: 'Campaign' }));
    });

    const snapshot = await loader(8, 2, { fetchImpl });
    expect(snapshot).toMatchObject({ state: { currentTurnPlayerId: 3 }, markers: [], campaign: { id: 8 } });
    expect(fetchImpl).toHaveBeenCalledTimes(expectedReads);
  });

  it.each([
    ['state', '/state'],
    ['marker', '/map-markers'],
    ['decision', '/decisions'],
    ['campaign', '?playerId=']
  ])('rejects the whole player snapshot when the %s read fails', async (_name, failedPath) => {
    const fetchImpl = vi.fn(url => {
      if (url.includes(failedPath)) return Promise.resolve(json({ error: true }, 503));
      if (url.includes('/state')) return Promise.resolve(json({}));
      if (url.includes('/map-markers') || url.includes('/decisions')) return Promise.resolve(json([]));
      return Promise.resolve(json({ id: 8 }));
    });

    await expect(loadPlayerRecoverySnapshot(8, 2, { fetchImpl })).rejects.toBeInstanceOf(SnapshotReadError);
  });
});
