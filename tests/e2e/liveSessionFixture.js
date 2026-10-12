import { expect } from '@playwright/test';

export async function openLiveSessionFixture(page) {
  const server = {
    failedResource: null,
    probeStatus: 200,
    snapshot: {
      state: {
        currentTurnPlayerId: 5,
        playerHp: { 5: 12 },
        playerMaxHp: { 5: 12 },
        playerActive: { 5: true }
      },
      markers: [{ id: 1, x: 0.25, y: 0.5 }],
      decisions: [{ id: 1, title: 'Path' }],
      campaign: { id: 4, version: 1, name: 'Fixture campaign' }
    }
  };

  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const json = body => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body)
    });

    if (pathname.includes('/notification/')) return json(0);
    if (pathname.endsWith('/game/state')) {
      if (server.probeStatus !== 200) return route.fulfill({ status: server.probeStatus, body: '' });
      if (server.failedResource === 'state') return route.fulfill({ status: 503, body: '' });
      return json(server.snapshot.state);
    }
    if (pathname.endsWith('/game/map-markers')) {
      if (server.failedResource === 'markers') return route.fulfill({ status: 503, body: '' });
      return json(server.snapshot.markers);
    }
    if (pathname.endsWith('/game/decisions')) {
      if (server.failedResource === 'decisions') return route.fulfill({ status: 503, body: '' });
      return json(server.snapshot.decisions);
    }
    if (pathname === '/api/campaign/4') {
      if (server.failedResource === 'campaign') return route.fulfill({ status: 503, body: '' });
      return json(server.snapshot.campaign);
    }
    return route.fulfill({ status: 404, body: '' });
  });

  await page.goto('/tests/e2e/fixtures/live-session-recovery.html');
  await expect(page.getByRole('heading', { name: 'Live Session Recovery' })).toBeVisible();
  return server;
}
