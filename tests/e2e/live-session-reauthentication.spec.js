import { test, expect } from '@playwright/test';
import { openLiveSessionFixture } from './liveSessionFixture.js';

// spec: specs/live-session-recovery.plan.md
// seed: tests/e2e/live-session-recovery.seed.spec.js
test.describe('Coordinated Reauthentication', () => {
  test('recover-expired-live-session-once', async ({ page }) => {
    // 1. Open the controlled live-session fixture and establish its first event stream.
    const server = await openLiveSessionFixture(page);
    await page.evaluate(() => window.liveRecovery.emitConnected(0));
    const liveStatus = page.getByRole('status', { name: 'Live connection status' });
    await expect(liveStatus).toContainText('Live-Ansicht ist aktuell');
    await expect(page.getByText('campaign=1;turn=5;markers=1;decisions=1')).toBeVisible();
    await expect(page.getByText('Snapshot applications').locator('xpath=following-sibling::dd[1]')).toHaveText('1');

    // 2. Make the protected session probe return 499 and terminate the event stream.
    server.probeStatus = 499;
    await page.evaluate(() => window.liveRecovery.fail(0));
    await expect(liveStatus).toContainText('Sitzung abgelaufen');
    await expect(page.getByLabel('Connection state history')).toContainText('stale → reauthenticating');
    const pollsAtExpiry = await page.getByText('Notification polls').locator('xpath=following-sibling::dd[1]').textContent();
    await page.waitForTimeout(180);
    await expect(page.getByText('Notification polls').locator('xpath=following-sibling::dd[1]')).toHaveText(pollsAtExpiry);

    // 3. Activate the reauthentication action more than once.
    await page.getByRole('button', { name: 'Erneut anmelden' }).click();
    await page.getByRole('button', { name: 'Erneut anmelden' }).click();
    await expect(page.getByText('Login initiations').locator('xpath=following-sibling::dd[1]')).toHaveText('1');

    // 4. Confirm authentication and establish the fresh event stream.
    server.probeStatus = 200;
    server.snapshot.campaign = { ...server.snapshot.campaign, version: 2 };
    await page.evaluate(() => window.liveRecovery.authenticate());
    await expect(page.getByText('Event sources').locator('xpath=following-sibling::dd[1]')).toHaveText('2');
    await page.evaluate(() => window.liveRecovery.emitConnected(1));
    await expect(liveStatus).toContainText('Live-Ansicht ist aktuell');
    await expect(page.getByText('campaign=2;turn=5;markers=1;decisions=1')).toBeVisible();
    await expect(page.getByText('Snapshot applications').locator('xpath=following-sibling::dd[1]')).toHaveText('2');
  });
});
