import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_OFFLINE ? 'http://dicekeeper.test' : 'http://127.0.0.1:4173',
    trace: 'retain-on-failure'
  },
  webServer: process.env.PLAYWRIGHT_OFFLINE ? undefined : {
    command: 'node scripts/serve-client.mjs',
    url: 'http://127.0.0.1:4173/src/main/resources/META-INF/resources/index.html',
    reuseExistingServer: false
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) } }]
});
