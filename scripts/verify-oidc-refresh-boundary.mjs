import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const DEFAULT_BASE_URL = 'http://localhost:8080';
const DEFAULT_CONCURRENCY = 8;
const DEFAULT_LOGIN_TIMEOUT_SECONDS = 300;
const MAX_WAIT_SECONDS = 900;

function readPositiveInteger(name, fallback, { maximum = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name];
  if ((raw === undefined || raw === '') && fallback !== undefined) return fallback;

  const value = Number.parseInt(raw ?? '', 10);
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    throw new Error(`invalid-${name.toLowerCase()}`);
  }
  return value;
}

function readConfiguration() {
  const baseUrl = new URL(process.env.DICEKEEPER_BOUNDARY_BASE_URL || DEFAULT_BASE_URL);
  if (!['http:', 'https:'].includes(baseUrl.protocol)) {
    throw new Error('invalid-base-url');
  }

  const tokenLifetimeSeconds = readPositiveInteger(
    'DICEKEEPER_BOUNDARY_TOKEN_LIFETIME_SECONDS',
    undefined,
    { maximum: MAX_WAIT_SECONDS - 1 }
  );
  const waitSeconds = readPositiveInteger(
    'DICEKEEPER_BOUNDARY_WAIT_SECONDS',
    tokenLifetimeSeconds + 5,
    { maximum: MAX_WAIT_SECONDS }
  );
  if (waitSeconds <= tokenLifetimeSeconds) {
    throw new Error('wait-must-exceed-token-lifetime');
  }

  const protectedPath = process.env.DICEKEEPER_BOUNDARY_PROTECTED_PATH || '/api/auth/me';
  const protectedUrl = new URL(protectedPath, baseUrl);
  if (protectedUrl.origin !== baseUrl.origin || !protectedUrl.pathname.startsWith('/api/')) {
    throw new Error('protected-path-must-be-same-origin-api');
  }

  return {
    baseUrl,
    protectedPath: protectedUrl.pathname + protectedUrl.search,
    tokenLifetimeSeconds,
    waitSeconds,
    concurrency: readPositiveInteger(
      'DICEKEEPER_BOUNDARY_CONCURRENCY',
      DEFAULT_CONCURRENCY,
      { maximum: 32 }
    ),
    loginTimeoutSeconds: readPositiveInteger(
      'DICEKEEPER_BOUNDARY_LOGIN_TIMEOUT_SECONDS',
      DEFAULT_LOGIN_TIMEOUT_SECONDS,
      { maximum: 1800 }
    ),
    approvedAccountsFile: process.env.DICEKEEPER_BOUNDARY_APPROVED_ACCOUNTS_FILE || null,
    headless: process.env.DICEKEEPER_BOUNDARY_HEADLESS === 'true',
    hostResolverRules: process.env.DICEKEEPER_BOUNDARY_HOST_RESOLVER_RULES || null
  };
}

async function readApprovedCredentials(path) {
  if (!path) return null;
  const lines = (await readFile(path, 'utf8')).split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(value => value.trim());
    if (cells.length < 2
        || /^username$/i.test(cells[0])
        || /^-+$/.test(cells[0])
        || !cells[0]
        || !cells[1]) continue;
    return { username: cells[0], password: cells[1] };
  }
  throw new Error('approved-account-file-has-no-usable-entry');
}

async function protectedRequests(page, protectedPath, count) {
  return page.evaluate(async ({ path, requestCount }) => {
    const results = await Promise.all(Array.from({ length: requestCount }, async () => {
      try {
        const response = await fetch(path, {
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'JavaScript' },
          redirect: 'manual'
        });
        return { status: response.status, type: response.type };
      } catch {
        return { status: null, type: 'network-error' };
      }
    }));
    return results;
  }, { path: protectedPath, requestCount: count });
}

function summarize(results) {
  return results.reduce((counts, result) => {
    const key = result.type === 'network-error'
      ? 'network-error'
      : result.type === 'opaqueredirect'
        ? 'authentication-redirect'
        : String(result.status);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function isSuccessful(result) {
  return Number.isInteger(result.status) && result.status >= 200 && result.status < 300;
}

function isAuthenticationFailure(result) {
  return result.status === 401
    || result.status === 499
    || result.type === 'opaqueredirect';
}

function printResult(verdict, config, simultaneous, followUp) {
  const report = {
    verdict,
    configuredTokenLifetimeSeconds: config.tokenLifetimeSeconds,
    waitSeconds: config.waitSeconds,
    simultaneousRequests: config.concurrency,
    simultaneousStatusCounts: summarize(simultaneous),
    followUpStatusCounts: summarize(followUp)
  };
  console.log(`OIDC_BOUNDARY_RESULT ${JSON.stringify(report)}`);
}

async function run() {
  let config;
  try {
    config = readConfiguration();
  } catch (error) {
    console.error(`OIDC_BOUNDARY_ERROR ${error.message}`);
    process.exitCode = 2;
    return;
  }

  let browser;
  try {
    const credentials = await readApprovedCredentials(config.approvedAccountsFile);
    if (config.headless && !credentials) throw new Error('headless-login-requires-approved-account-file');
    browser = await chromium.launch({
      headless: config.headless,
      args: config.hostResolverRules
        ? [`--host-resolver-rules=${config.hostResolverRules}`]
        : []
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    const loginRedirect = '/#/campaigns';
    const loginUrl = new URL('/api/auth/login', config.baseUrl);
    loginUrl.searchParams.set('redirect', loginRedirect);

    console.log(credentials
      ? 'OIDC_BOUNDARY_LOGIN Signing in with an approved development account from the configured local file.'
      : 'OIDC_BOUNDARY_LOGIN Complete sign-in with the approved development account in the opened browser.');
    await page.goto(loginUrl.href, {
      waitUntil: 'domcontentloaded',
      timeout: config.loginTimeoutSeconds * 1000
    });
    if (credentials) {
      await page.locator('#username').fill(credentials.username);
      await page.locator('#password').fill(credentials.password);
      await page.locator('#kc-login').click();
    }
    await page.waitForURL(url => url.origin === config.baseUrl.origin
      && !url.pathname.startsWith('/api/auth/'), {
      timeout: config.loginTimeoutSeconds * 1000
    });

    await page.goto(new URL('/q/health/ready', config.baseUrl).href, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000
    });

    const initial = await protectedRequests(page, config.protectedPath, 1);
    if (!initial.every(isSuccessful)) {
      printResult('login-not-confirmed', config, initial, []);
      process.exitCode = 2;
      return;
    }

    console.log(`OIDC_BOUNDARY_WAIT Waiting ${config.waitSeconds} seconds before the concurrent boundary request.`);
    await page.waitForTimeout(config.waitSeconds * 1000);

    const simultaneous = await protectedRequests(
      page,
      config.protectedPath,
      config.concurrency
    );
    const followUp = await protectedRequests(page, config.protectedPath, 1);

    if (simultaneous.every(isSuccessful) && followUp.every(isSuccessful)) {
      printResult('pass', config, simultaneous, followUp);
      return;
    }

    if (simultaneous.some(isAuthenticationFailure) || followUp.some(isAuthenticationFailure)) {
      printResult('refresh-invalidation-reproduced', config, simultaneous, followUp);
      process.exitCode = 1;
      return;
    }

    printResult('inconclusive', config, simultaneous, followUp);
    process.exitCode = 2;
  } catch {
    console.error('OIDC_BOUNDARY_ERROR browser-or-runtime-failure');
    process.exitCode = 2;
  } finally {
    await browser?.close().catch(() => {});
  }
}

await run();
