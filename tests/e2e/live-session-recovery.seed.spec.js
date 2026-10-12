import { test } from '@playwright/test';
import { openLiveSessionFixture } from './liveSessionFixture.js';

test('seed', async ({ page }) => {
  await openLiveSessionFixture(page);
});
