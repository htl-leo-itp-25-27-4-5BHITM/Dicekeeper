import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const baseUrl = new URL(process.env.DICEKEEPER_ACCEPTANCE_BASE_URL || 'http://localhost:8080');
const approvedAccountsFile = process.env.DICEKEEPER_ACCEPTANCE_APPROVED_ACCOUNTS_FILE;
const hostResolverRules = process.env.DICEKEEPER_ACCEPTANCE_HOST_RESOLVER_RULES || null;
const accountIndex = Number.parseInt(process.env.DICEKEEPER_ACCEPTANCE_ACCOUNT_INDEX || '0', 10);
const timeoutSeconds = Number.parseInt(process.env.DICEKEEPER_ACCEPTANCE_TIMEOUT_SECONDS || '60', 10);
const timeoutMs = Number.isSafeInteger(timeoutSeconds) && timeoutSeconds > 0
  ? timeoutSeconds * 1000
  : 60_000;

async function readApprovedCredentials(path) {
  if (!path) throw new Error('approved-account-file-required');
  const lines = (await readFile(path, 'utf8')).split(/\r?\n/);
  const credentials = [];
  for (const line of lines) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(value => value.trim());
    if (cells.length < 2
        || /^username$/i.test(cells[0])
        || /^-+$/.test(cells[0])
        || !cells[0]
        || !cells[1]) continue;
    credentials.push({ username: cells[0], password: cells[1] });
  }
  if (!Number.isSafeInteger(accountIndex) || accountIndex < 0 || accountIndex >= credentials.length) {
    throw new Error('approved-account-index-out-of-range');
  }
  return credentials[accountIndex];
}

async function completeLogin(page, credentials) {
  const username = page.locator('#username');
  const appOrigin = baseUrl.origin;
  const current = new URL(page.url());
  if (current.origin === appOrigin && !current.pathname.startsWith('/api/auth/')) return;
  await username.waitFor({ state: 'visible', timeout: timeoutMs });
  await username.fill(credentials.username);
  await page.locator('#password').fill(credentials.password);
  await page.locator('#kc-login').click();
  await page.waitForURL(url => url.origin === appOrigin && !url.pathname.startsWith('/api/auth/'), {
    timeout: timeoutMs
  });
}

async function selectStartedCampaign(page) {
  return page.evaluate(async () => {
    const readJson = async url => {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) return null;
      return response.json();
    };
    const player = await readJson('/api/auth/me');
    if (!player?.id) return null;
    const hasMap = campaign => Boolean(
      campaign?.mapImagePath
      || campaign?.maps?.some?.(map => map?.path)
      || campaign?.mapImagePaths?.some?.(Boolean)
    );

    const owned = await readJson('/api/campaign/player/' + encodeURIComponent(player.id)) || [];
    const ownedStarted = owned.find(campaign => campaign?.started && hasMap(campaign));
    if (ownedStarted) return { id: ownedStarted.id, route: 'gm' };

    const memberships = await readJson(
      '/api/campaign-player/player/' + encodeURIComponent(player.id)
    ) || [];
    for (const membership of memberships) {
      if (membership?.role !== 'PLAYER' || membership?.characterStatus !== 'APPROVED') continue;
      const campaign = await readJson('/api/campaign/' + encodeURIComponent(membership.campaignId));
      if (campaign?.started && hasMap(campaign)) return { id: campaign.id, route: 'play' };
    }
    return null;
  });
}

function requiredRead(url, candidate) {
  const id = encodeURIComponent(String(candidate.id));
  if (url.pathname === `/api/campaign/${id}/game/state`) return 'state';
  if (url.pathname === `/api/campaign/${id}/game/map-markers`) return 'markers';
  if (url.pathname === `/api/campaign/${id}/game/decisions`) return 'decisions';
  if (url.pathname === `/api/campaign/${id}` && url.searchParams.has('playerId')) return 'campaign';
  return null;
}

async function run() {
  let browser;
  let page;
  let stage = 'configuration';
  try {
    const credentials = await readApprovedCredentials(approvedAccountsFile);
    stage = 'browser-launch';
    browser = await chromium.launch({
      headless: true,
      args: hostResolverRules ? [`--host-resolver-rules=${hostResolverRules}`] : []
    });
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const NativeEventSource = window.EventSource;
      window.__dicekeeperAcceptanceSources = [];
      window.EventSource = class TrackedEventSource extends NativeEventSource {
        constructor(...args) {
          super(...args);
          window.__dicekeeperAcceptanceSources.push(this);
        }
      };
    });
    page = await context.newPage();

    const loginUrl = new URL('/api/auth/login', baseUrl);
    loginUrl.searchParams.set('redirect', '/#/login?kc=1&next=%2Fcampaigns');
    stage = 'initial-login';
    await page.goto(loginUrl.href, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await completeLogin(page, credentials);
    await page.waitForURL(url => url.hash.startsWith('#/campaigns'), { timeout: timeoutMs });

    stage = 'campaign-discovery';
    const candidate = await selectStartedCampaign(page);
    if (!candidate) throw new Error('approved-account-has-no-started-campaign');

    const viewUrl = new URL(`/#/campaign/${encodeURIComponent(candidate.id)}/${candidate.route}`, baseUrl);
    stage = 'live-view-initialization';
    await page.goto(viewUrl.href, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    const status = page.locator(candidate.route === 'gm' ? '#gmLiveStatus' : '#pvLiveStatus');
    await status.filter({ hasText: 'Live-Ansicht ist aktuell' }).waitFor({ timeout: timeoutMs });

    let recoveryActive = false;
    let loginRouteRequests = 0;
    let providerAuthorizationRequests = 0;
    const loginTargets = [];
    let api499Responses = 0;
    let notification499Responses = 0;
    const completedReads = new Set();
    page.on('request', request => {
      if (!recoveryActive) return;
      const url = new URL(request.url());
      if (url.origin === baseUrl.origin && url.pathname === '/api/auth/login') {
        loginRouteRequests += 1;
        loginTargets.push(url.searchParams.get('redirect') || '(none)');
      }
      if (url.pathname.endsWith('/protocol/openid-connect/auth')) {
        providerAuthorizationRequests += 1;
      }
    });
    page.on('response', response => {
      if (!recoveryActive) return;
      const url = new URL(response.url());
      if (url.origin !== baseUrl.origin) return;
      if (response.status() === 499 && url.pathname.startsWith('/api/')) {
        api499Responses += 1;
        if (url.pathname.includes('/notification/')) notification499Responses += 1;
      }
      if (response.status() === 200) {
        const read = requiredRead(url, candidate);
        if (read) completedReads.add(read);
      }
    });

    const appCookies = await context.cookies(baseUrl.href);
    const sessionCookies = appCookies.filter(cookie => cookie.name.startsWith('q_session'));
    if (sessionCookies.length === 0) throw new Error('application-session-cookie-not-found');
    for (const cookie of sessionCookies) {
      await context.clearCookies({ name: cookie.name, domain: cookie.domain, path: cookie.path });
    }

    recoveryActive = true;
    stage = 'forced-session-loss';
    await page.evaluate(() => {
      const source = window.__dicekeeperAcceptanceSources?.at(-1);
      if (!source || typeof source.onerror !== 'function') {
        throw new Error('tracked-event-source-not-found');
      }
      source.onerror(new Event('error'));
    });

    await status.filter({ hasText: 'Sitzung abgelaufen' }).waitFor({ timeout: timeoutMs });
    if (loginRouteRequests !== 0 || providerAuthorizationRequests !== 0) {
      throw new Error('background-recovery-started-login');
    }
    stage = 'reauthentication';
    await page.getByRole('button', { name: 'Erneut anmelden' }).click();
    await page.waitForTimeout(500);
    if (await page.locator('#username').isVisible().catch(() => false)) {
      await page.locator('#username').fill(credentials.username);
      await page.locator('#password').fill(credentials.password);
      await page.locator('#kc-login').click();
    }
    await page.waitForURL(url => url.hash === viewUrl.hash, { timeout: timeoutMs });
    stage = 'authoritative-reconciliation';
    await page.locator(candidate.route === 'gm' ? '#gmLiveStatus' : '#pvLiveStatus')
      .filter({ hasText: 'Live-Ansicht ist aktuell' })
      .waitFor({ timeout: timeoutMs });

    const requiredReads = candidate.route === 'gm'
      ? ['campaign', 'decisions', 'markers', 'state']
      : ['campaign', 'decisions', 'markers', 'state'];
    if (!requiredReads.every(read => completedReads.has(read))) {
      throw new Error('authoritative-recovery-reads-incomplete');
    }
    if (loginRouteRequests < 1 || providerAuthorizationRequests !== 1) {
      throw new Error(
        `login-initiation-count-mismatch-routes-${loginRouteRequests}`
        + `-provider-${providerAuthorizationRequests}-${loginTargets.join(',')}`
      );
    }
    if (await page.locator('.map-interactive-canvas').count() === 0) {
      throw new Error('map-canvas-not-restored');
    }

    const notificationFailuresBeforeWait = notification499Responses;
    stage = 'notification-loop-observation';
    await page.waitForTimeout(31_000);
    if (notification499Responses !== notificationFailuresBeforeWait) {
      throw new Error('notification-poll-499-loop-detected');
    }

    console.log(`LIVE_SESSION_RECOVERY_RESULT ${JSON.stringify({
      verdict: 'pass',
      campaignRoute: candidate.route,
      loginInitiations: providerAuthorizationRequests,
      loginRouteRequests,
      api499Responses,
      notification499Responses,
      authoritativeReads: [...completedReads].sort(),
      finalStatus: 'current',
      mapCanvasRestored: true
    })}`);
  } catch (error) {
    let location = 'unavailable';
    let providerError = '';
    try {
      const current = new URL(page?.url() || baseUrl.href);
      location = current.origin + current.pathname + current.hash;
      providerError = (await page?.locator('#input-error, .alert-error').allTextContents() || [])
        .map(value => value.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' | ')
        .slice(0, 240);
    } catch {
      // Keep the aggregate diagnostic free of browser state details.
    }
    console.error(
      `LIVE_SESSION_RECOVERY_ERROR stage=${stage} location=${location}`
      + ` reason=${error.message}${providerError ? ` provider=${providerError}` : ''}`
    );
    process.exitCode = 2;
  } finally {
    await browser?.close().catch(() => {});
  }
}

await run();
