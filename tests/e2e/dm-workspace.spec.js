import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const LAST = 'dicekeeper.dm.workspace.v1.1.desktop.last';
const fixture = '/tests/e2e/fixtures/dm-workspace.html';

// Optional in-process file transport for environments without localhost sockets.
// Requests are fulfilled by Playwright; no test server or network is involved.
test.beforeEach(async ({ page }) => {
  if (!process.env.PLAYWRIGHT_OFFLINE) return;
  const root = resolve('.');
  await page.route('http://dicekeeper.test/**', async route => {
    const file = resolve(root, '.' + decodeURIComponent(new URL(route.request().url()).pathname));
    if (!file.startsWith(root + sep)) return route.fulfill({ status: 403, body: '' });
    try {
      const body = await readFile(file);
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
      return route.fulfill({ contentType: types[extname(file)] || 'application/octet-stream', body });
    } catch { return route.fulfill({ status: 404, body: '' }); }
  });
});

async function openDM(page) {
  const errors = [], writes = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.sources = [];
    window.EventSource = class {
      constructor() { this.handlers = {}; this.readyState = 1; window.sources.push(this); }
      addEventListener(type, handler) { (this.handlers[type] ||= []).push(handler); }
      emit(type, data) { (this.handlers[type] || []).forEach(fn => fn({ data: JSON.stringify(data) })); }
      close() { this.closed = true; }
    };
  });
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') writes.push({ path, data: request.postDataJSON() });
    let data = {};
    if (path === '/api/campaign/4') data = { id: 4, name: 'Workspace', mapImagePath: '/src/main/resources/META-INF/resources/app/images/Background-green.png' };
    if (path.endsWith('/game/state')) data = { currentTurnPlayerId: 5, playerHp: { 5: 8 }, playerMaxHp: { 5: 12 }, playerActive: { 5: true } };
    if (path.endsWith('/game/map-markers')) data = [{ id: 'p5', type: 'player', playerIds: '5', x: .5, y: .5 }];
    if (path.endsWith('/game/decisions')) data = [{ id: 1, title: 'Pfad wählen', text: 'Links oder rechts?', yes: 1, no: 0 }];
    if (path === '/api/campaign-player/4') data = [{ role: 'PLAYER', playerId: 5 }];
    if (path === '/api/player/id/5') data = { id: 5, username: 'Anna' };
    if (path.includes('/unread/count')) data = 0;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto(fixture);
  await page.evaluate(() => window.dmReady);
  return { errors, writes };
}

const groupFor = (page, id) => page.locator('.dm-dock-group').filter({ has: page.locator(`[data-tab="${id}"]`) });
async function menuFor(page, id) {
  const group = groupFor(page, id);
  await group.getByLabel('Panel anordnen', { exact: true }).click();
  return group;
}

test('preserves live game DOM, chat drafts, canvas and listeners across docking and templates', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const { errors, writes } = await openDM(page);
  await expect(page.locator('#gmMapBox canvas')).toBeVisible();
  await page.locator('#gmChatInput').fill('Geheimer Entwurf');
  await page.locator('[data-sides="12"]').click();
  await page.locator('#gmManualInput').fill('7');
  await page.evaluate(() => { window.originalInput = document.getElementById('gmChatInput'); window.originalCanvas = document.querySelector('#gmMapBox canvas'); });
  await page.getByLabel('Layout auswählen').selectOption('combat');
  await page.getByLabel('Layout auswählen').selectOption('explore');
  await groupFor(page, 'chat').locator('[data-tab="chat"]').click();
  await expect(page.locator('#gmChatInput')).toHaveValue('Geheimer Entwurf');
  expect(await page.evaluate(() => originalInput === document.getElementById('gmChatInput') && originalCanvas === document.querySelector('#gmMapBox canvas'))).toBe(true);
  await page.locator('#gmChatSend').click();
  await expect(page.locator('#gmChat')).toContainText('Geheimer Entwurf');
  await groupFor(page, 'dice').locator('[data-tab="dice"]').click();
  await expect(page.locator('#gmManualInput')).toHaveValue('7');
  await page.locator('#gmManualSet').click();
  await expect(page.locator('#gmDiceResult')).toHaveText('7');
  await expect.poll(() => writes.filter(item => item.path.endsWith('/game/dice')).length).toBe(1);
  expect(writes.filter(item => item.path.endsWith('/game/dice'))[0].data).toMatchObject({ diceType: 'd12', result: 7 });
  await page.locator('#gmRollBtn').click();
  await expect.poll(() => writes.filter(item => item.path.endsWith('/game/dice')).length).toBe(2);
  await groupFor(page, 'players').locator('[data-tab="players"]').click();
  await page.locator('.hp-btn-gm[data-d="-1"]').click();
  await expect.poll(() => writes.some(item => item.path.endsWith('/game/hp') && item.data.delta === -1)).toBe(true);
  await page.getByRole('button', { name: 'Panel schließen: Spieler', exact: true }).click();
  await page.evaluate(() => sources[0].emit('hp', { playerId: 5, currentHp: 3, maxHp: 12 }));
  await page.locator('.dm-panel-menu > summary').click();
  await page.getByRole('checkbox', { name: 'Spieler', exact: true }).check();
  await expect(page.locator('#gmPlayerList')).toContainText('3 / 12');
  expect(await page.evaluate(() => sources.length)).toBe(1);
  expect(errors).toEqual([]);
});

test('supports drag previews, edge docking, tab docking and keyboard resizing', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const { errors } = await openDM(page);
  const chat = await page.locator('[data-tab="chat"]').boundingBox();
  const decisions = await groupFor(page, 'decisions').boundingBox();
  await page.mouse.move(chat.x + 30, chat.y + 15); await page.mouse.down();
  await page.mouse.move(decisions.x + decisions.width / 2, decisions.y + decisions.height / 2, { steps: 12 });
  await expect(page.locator('.dm-dock-preview')).toBeVisible();
  await expect(page.locator('.dm-dock-preview')).toHaveText('Als Tab anordnen');
  await page.mouse.up();
  await expect(groupFor(page, 'chat').locator('[data-tab="decisions"]')).toHaveCount(1);
  const menu = await menuFor(page, 'dice');
  await menu.getByLabel('Zielbereich').selectOption({ label: 'Spieler' });
  await menu.getByLabel('Docking-Position').selectOption('right');
  await menu.getByRole('button', { name: 'Panel verschieben' }).click();
  const playersBox = await groupFor(page, 'players').boundingBox();
  const diceBox = await groupFor(page, 'dice').boundingBox();
  expect(diceBox.x).toBeGreaterThan(playersBox.x);
  const handle = page.getByRole('separator').first();
  await handle.focus();
  const before = await handle.getAttribute('aria-valuenow');
  await page.keyboard.press('ArrowRight');
  expect(await handle.getAttribute('aria-valuenow')).not.toBe(before);
  expect(errors).toEqual([]);
});

test('floats, moves, resizes, restores, saves and resets without losing controls', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const { errors } = await openDM(page);
  await (await menuFor(page, 'dice')).getByRole('button', { name: 'Als Fenster lösen' }).click();
  const floating = page.locator('.dm-floating');
  await expect(floating).toBeVisible();
  let rect = await floating.boundingBox();
  // Drag the visible move grip, then resize its lower-right corner.
  const grip = await floating.getByLabel('Fenster verschieben', { exact: true }).boundingBox();
  await page.mouse.move(grip.x + 8, grip.y + 8); await page.mouse.down();
  await page.mouse.move(grip.x + 108, grip.y + 88, { steps: 8 }); await page.mouse.up();
  const moved = await floating.boundingBox(); expect(moved.x).toBeGreaterThan(rect.x + 50);
  const corner = await floating.locator('.dm-resize-se').boundingBox();
  await page.mouse.move(corner.x + 5, corner.y + 5); await page.mouse.down();
  await page.mouse.move(corner.x + 85, corner.y + 65, { steps: 8 }); await page.mouse.up();
  rect = await floating.boundingBox(); expect(rect.width).toBeGreaterThan(moved.width + 50);
  await page.getByRole('button', { name: 'Layout speichern', exact: true }).click();
  const saved = await page.evaluate(key => localStorage.getItem(key), LAST);
  await page.reload(); await page.evaluate(() => window.dmReady);
  await expect(floating).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), LAST)).toBe(saved);
  await (await menuFor(page, 'dice')).getByRole('button', { name: 'Wieder andocken' }).click();
  await expect(floating).toHaveCount(0);
  await page.getByLabel('Layout auswählen').selectOption('custom');
  await expect(floating).toBeVisible();
  await page.getByRole('button', { name: 'Standardlayout wiederherstellen' }).click();
  await expect(page.locator('.dm-dock-group')).toHaveCount(5);
  await expect(floating).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('falls back from corrupt storage, isolates mobile layout and cleans up on exit', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 950 });
  const { errors } = await openDM(page);
  await page.evaluate(key => localStorage.setItem(key, '{broken'), LAST);
  await page.reload(); await page.evaluate(() => window.dmReady);
  await expect(page.locator('.dm-dock-group')).toHaveCount(5);
  await page.getByLabel('Layout auswählen').selectOption('explore');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.dm-dock-group')).toHaveCount(1);
  await page.locator('[data-tab="chat"]').click();
  await expect(page.locator('#gmChatInput')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1400, height: 950 });
  await expect(page.getByLabel('Layout auswählen')).toHaveValue('explore');
  await page.evaluate(() => cleanupDM());
  expect(await page.evaluate(() => sources[0].closed)).toBe(true);
  expect(errors).toEqual([]);
});
