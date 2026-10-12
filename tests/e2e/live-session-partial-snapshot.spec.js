import { test, expect } from '@playwright/test';
import { openLiveSessionFixture } from './liveSessionFixture.js';

// spec: specs/live-session-recovery.plan.md
// seed: tests/e2e/live-session-recovery.seed.spec.js
test.describe('Atomic Reconciliation Failure', () => {
  test('keep-stale-projection-when-snapshot-read-fails', async ({ page }) => {
    // 1. Open the controlled fixture and establish a current projection.
    const server = await openLiveSessionFixture(page);
    await page.evaluate(() => window.liveRecovery.emitConnected(0));
    const liveStatus = page.getByRole('status', { name: 'Live connection status' });
    await expect(liveStatus).toContainText('Live-Ansicht ist aktuell');
    const projection = page.getByLabel('Live projection').locator('output');
    await expect(projection).toHaveText('campaign=1;turn=5;markers=1;decisions=1');
    await expect(page.getByText('Snapshot applications').locator('xpath=following-sibling::dd[1]')).toHaveText('1');

    // 2. Terminate the event stream with a valid session and fail the required decisions read.
    server.failedResource = 'decisions';
    await page.evaluate(() => window.liveRecovery.fail(0));
    await expect(page.getByText('Event sources').locator('xpath=following-sibling::dd[1]')).toHaveText('2');
    await page.evaluate(() => window.liveRecovery.emitConnected(1));
    await expect(liveStatus).toContainText('Ansicht ist veraltet');
    await expect(projection).toHaveText('campaign=1;turn=5;markers=1;decisions=1');
    await expect(page.getByText('Snapshot applications').locator('xpath=following-sibling::dd[1]')).toHaveText('1');
  });
});
