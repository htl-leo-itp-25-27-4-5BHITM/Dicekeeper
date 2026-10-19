/**
 * Full-stack browser scenarios for the play-test feedback (bugs 1–24 and the observations).
 * Started by src/test/java/e2e/BrowserFeedbackE2ETest.java against a real Quarkus test instance.
 *
 * Users log in through the test-only cookie "dk_test_user" (see TestCookieAuthMechanism).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL || 'http://localhost:8081';
const SHOTS = process.env.SCREENSHOT_DIR || 'target/e2e-screenshots';
const EXECUTABLE = process.env.PW_CHROMIUM || process.env.CHROMIUM_PATH || undefined;
mkdirSync(SHOTS, { recursive: true });

const results = [];
let dm, bob, carol;
const browser = await chromium.launch({ executablePath: EXECUTABLE });

// ---------- helpers ----------
async function login(user, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, locale: 'de-AT' });
  await context.addCookies([{ name: 'dk_test_user', value: user, url: BASE }]);
  const page = await context.newPage();
  page.on('pageerror', err => console.log(`[${user}] pageerror: ${err.message}`));
  page.on('console', msg => { if (msg.type() === 'error') console.log(`[${user}] console: ${msg.text()}`); });
  await page.goto(BASE + '/');
  const me = await page.evaluate(async () => (await fetch('/api/auth/me')).json());
  await page.evaluate(p => sessionStorage.setItem('player', JSON.stringify(p)), me);
  await context.addInitScript(p => sessionStorage.setItem('player', JSON.stringify(p)), me);
  return { context, page, me, user };
}

async function api(page, method, path, body) {
  return page.evaluate(async ({ method, path, body }) => {
    const res = await fetch(path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text };
  }, { method, path, body });
}

async function go(page, hash) {
  await page.goto(BASE + '/#' + hash);
  await page.waitForLoadState('domcontentloaded');
}

async function shot(page, name) {
  await page.screenshot({ path: join(SHOTS, name + '.png'), fullPage: false });
}

async function scenario(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, ms: Date.now() - started, error: String(err?.message || err) });
    const slug = name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
    for (const u of [dm, bob, carol].filter(Boolean)) {
      await u.page.screenshot({ path: join(SHOTS, `FAIL-${slug}-${u.user}.png`) }).catch(() => {});
    }
    console.log(`  ✗ ${name}\n      ${String(err?.stack || err).split('\n').slice(0, 3).join('\n      ')}`);
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function createCharacter(page, name, className = 'Kämpfer') {
  const classes = await api(page, 'GET', '/api/classes');
  const classId = classes.json.find(c => c.name === className)?.id;
  assert(classId, 'class ' + className + ' exists');
  const created = await api(page, 'POST', '/api/character/createInitialCharacter', {});
  assert(created.status === 201, 'character create ' + created.status + ' ' + created.text);
  const patched = await api(page, 'PATCH', '/api/character/' + created.json.id,
    { name, level: 1, race: 'Mensch', classId, backgroundId: 1, info: 'Test' });
  assert(patched.status === 200, 'character patch ' + patched.status + ' ' + patched.text);
  return created.json.id;
}

// ---------- users ----------
dm = await login('alice');
bob = await login('bob');
carol = await login('carol');
console.log(`Users: alice=${dm.me.id} bob=${bob.me.id} carol=${carol.me.id}`);

let campaignId = null;
let bobCharacter = null;

// Fehler 1 – plus centred
await scenario('Fehler 1: Plus-Symbol ist zentriert', async () => {
  await go(dm.page, '/campaigns');
  const btn = dm.page.locator('#newBtn');
  await btn.waitFor();
  const geo = await btn.evaluate(el => {
    const r = el.getBoundingClientRect();
    const before = getComputedStyle(el, '::before');
    const after = getComputedStyle(el, '::after');
    return { w: r.width, h: r.height, beforeContent: before.content, afterTransform: after.transform, fontSize: getComputedStyle(el).fontSize, left: before.left, top: before.top };
  });
  assert(geo.beforeContent === '""', 'plus is drawn with ::before, got ' + geo.beforeContent);
  assert(geo.fontSize === '0px', 'text glyph hidden');
  assert(geo.left === (geo.w / 2) + 'px' && geo.top === (geo.h / 2) + 'px', 'bars anchored in the centre: ' + JSON.stringify(geo));
  await btn.screenshot({ path: join(SHOTS, '01-plus-button.png') });
});

// Fehler 3 – new campaign appears live
await scenario('Fehler 3: Neue Kampagne erscheint ohne Reload', async () => {
  await go(bob.page, '/campaigns');
  await bob.page.locator('#publicGamesList').waitFor();
  await bob.page.waitForTimeout(800); // lobby stream connected
  await go(dm.page, '/campaign/new');
  await dm.page.locator('#ccName').fill('Die Schatten von Grünwald');
  const isPublicText = await dm.page.locator('#ccVisibilityText').textContent().catch(() => '');
  if (!/öffentlich/i.test(isPublicText || '')) await dm.page.locator('#ccVisibilitySwitch').click();
  await dm.page.locator('#ccCreateBtn').click();
  await dm.page.waitForURL(/#\/campaigns$/, { timeout: 10000 });
  const mine = await api(dm.page, 'GET', '/api/campaign/player/' + dm.me.id);
  campaignId = mine.json.find(c => c.name === 'Die Schatten von Grünwald').id;
  await bob.page.locator('#publicGamesList .campaign-title', { hasText: 'Die Schatten von Grünwald' })
    .waitFor({ timeout: 8000 });
  await shot(bob.page, '03-lobby-live');
});

// Fehler 12 – start keeps visibility (checked again after start)
// Character, join, approval
await scenario('Spieler tritt bei, reicht Charakter ein, DM gibt frei (live)', async () => {
  assert(campaignId, 'campaign exists');
  bobCharacter = await createCharacter(bob.page, 'Thorin Eisenfaust', 'Barbar');
  await go(bob.page, '/campaign/' + campaignId);
  await bob.page.locator('#cdJoin').click();
  await bob.page.waitForURL(/select-character/, { timeout: 8000 });
  await bob.page.locator('.character-item', { hasText: 'Thorin Eisenfaust' }).click();
  await bob.page.locator('#csSubmitBtn').click();
  await bob.page.waitForURL(new RegExp('#/campaign/' + campaignId + '$'), { timeout: 8000 });

  // DM sees the new player on the detail page without reloading
  await go(dm.page, '/campaign/' + campaignId);
  await dm.page.locator('#cdPlayersList .player', { hasText: 'bob' }).waitFor({ timeout: 8000 });
  const cps = await api(dm.page, 'GET', '/api/campaign-player/' + campaignId);
  const bobCp = cps.json.find(cp => cp.playerId === bob.me.id);
  await go(dm.page, `/campaign/${campaignId}/review/${bobCp.id}`);
  await dm.page.locator('#crApprove').click();
  await dm.page.waitForTimeout(800);
  const after = await api(dm.page, 'GET', '/api/campaign-player/' + campaignId);
  assert(after.json.find(cp => cp.playerId === bob.me.id).characterStatus === 'APPROVED', 'approved');
});

// Vorlagen (legacy characters without owner) – carol adopts a template and submits her copy
await scenario('Alte Charaktere ohne Besitzer: als Vorlage übernehmen und einreichen', async () => {
  const presets = await api(carol.page, 'GET', '/api/character/presets');
  assert(presets.status === 200 && presets.json.some(p => p.name === 'Elara Mondschein'), 'template listed');
  const foreignEdit = await api(carol.page, 'PATCH', '/api/character/' + presets.json[0].id, { name: 'Gekapert' });
  assert(foreignEdit.status === 403 || foreignEdit.status === 404, 'template is read-only, got ' + foreignEdit.status);
  await go(carol.page, '/campaign/' + campaignId);
  await carol.page.locator('#cdJoin').click();
  await carol.page.waitForURL(/select-character/, { timeout: 8000 });
  const item = carol.page.locator('.character-item[data-preset="1"]', { hasText: 'Elara Mondschein' });
  await item.waitFor({ timeout: 6000 });
  await shot(carol.page, '05-character-select-templates');
  await item.click();
  await carol.page.locator('#csSubmitBtn').click();
  await carol.page.waitForURL(new RegExp('#/campaign/' + campaignId + '$'), { timeout: 8000 });
  const own = await api(carol.page, 'GET', '/api/character/all');
  const copy = own.json.find(c => c.name === 'Elara Mondschein');
  assert(copy && copy.id !== presets.json.find(p => p.name === 'Elara Mondschein').id, 'carol owns a copy');
  const cps = await api(dm.page, 'GET', '/api/campaign-player/' + campaignId);
  const carolCp = cps.json.find(cp => cp.playerId === carol.me.id);
  assert(carolCp.characterId === copy.id, 'the copy was submitted');
  const approve = await api(dm.page, 'POST', `/api/campaign-player/${campaignId}/approve-character/${carolCp.id}`);
  assert(approve.status === 200, 'approve carol ' + approve.status + ' ' + approve.text);
});

// Fehler 5 – class info complete
await scenario('Fehler 5: Klasseninfos vollständig lesbar', async () => {
  await go(carol.page, '/character/create');
  await carol.page.locator('#ccCharName').fill('Mira');
  await carol.page.locator('#ccNext1').click();
  const card = carol.page.locator('#ccClassGrid .selection-card', { hasText: 'Barbar' });
  await card.waitFor();
  await card.click();
  const detail = await carol.page.locator('#ccClassDetails').innerText();
  assert(/Trefferwürfel: W12/.test(detail), 'full description shown: ' + detail.slice(0, 120));
  assert(!/\.\.\.$/.test(detail.trim()), 'not truncated');
  await shot(carol.page, '05-class-details');
});

// Fehler 6 – player view loads automatically after start
await scenario('Fehler 6: Spieleransicht lädt nach Start automatisch', async () => {
  await go(bob.page, '/campaign/' + campaignId);
  await bob.page.locator('#cdLeave').waitFor({ timeout: 8000 });
  await bob.page.waitForTimeout(800);
  await go(dm.page, '/campaign/' + campaignId + '/cockpit');
  await dm.page.locator('#ckStartGame').click();
  await dm.page.waitForURL(/\/gm$/, { timeout: 10000 });
  await bob.page.waitForURL(new RegExp('#/campaign/' + campaignId + '/play$'), { timeout: 10000 });
  await bob.page.locator('#pvRollBtn').waitFor({ timeout: 10000 });
  const camp = await api(dm.page, 'GET', '/api/campaign/' + campaignId);
  assert(camp.json.started === true, 'started');
  assert(camp.json.isPublic === true, 'Fehler 12: Kampagne bleibt öffentlich');
  await shot(bob.page, '06-player-view');
  await shot(dm.page, '06-gm-view');
});

// Fehler 7 – dice results reach everyone
await scenario('Fehler 7: Würfelergebnisse kommen bei allen an (20 Würfe)', async () => {
  const rolls = 20;
  let delivered = 0;
  for (let i = 0; i < rolls; i++) {
    const roller = i % 2 === 0 ? bob : dm;
    const watcher = i % 2 === 0 ? dm : bob;
    const res = await api(roller.page, 'POST', `/api/campaign/${campaignId}/game/dice`, { diceType: 'd20' });
    assert(res.status === 200, 'roll ' + res.status + ' ' + res.text);
    const value = String(res.json.result);
    const target = watcher === dm ? '#gmDiceResult' : '#pvDiceVal';
    try {
      await watcher.page.waitForFunction(({ sel, value }) => document.querySelector(sel)?.textContent?.trim() === value,
        { sel: target, value }, { timeout: 4000 });
      delivered++;
    } catch { /* counted below */ }
    // consecutive equal values are indistinguishable: reset the display
    await watcher.page.evaluate(sel => { const el = document.querySelector(sel); if (el) el.textContent = '—'; }, target);
  }
  assert(delivered === rolls, `${delivered}/${rolls} rolls shown`);
});

// Fehler 15 – impossible dice values rejected
await scenario('Fehler 15: Unmögliche Würfelwerte werden abgelehnt', async () => {
  const res = await api(bob.page, 'POST', `/api/campaign/${campaignId}/game/dice`, { diceType: 'd20', result: 999, manual: true });
  assert(res.status === 400, 'status ' + res.status);
});

// Fehler 20 – DM chat reaches players
await scenario('Fehler 20: DM-Chat kommt bei Spielern an', async () => {
  await dm.page.locator('#gmChatInput').fill('Ihr betretet die Höhle & hört ein Knurren …');
  await dm.page.locator('#gmChatSend').click();
  await bob.page.locator('.pv2-message-text:visible', { hasText: 'Ihr betretet die Höhle & hört ein Knurren' }).first()
    .waitFor({ timeout: 6000 });
});

// Fehler 13/21/22 – votes
await scenario('Fehler 13/21/22: Abstimmung – Sonderzeichen, DM stimmt nicht, Stimme bleibt nach Reload', async () => {
  await dm.page.locator('#gmNewDecBtn').click();
  await dm.page.locator('#gmDecTitle').fill('Tür „links“ & <rechts>?');
  await dm.page.locator('#gmDecText').fill('Fass & Bier');
  await dm.page.locator('#gmDecSave').click();
  const voteBtn = bob.page.locator('.pv2-vote-btn.yes[data-did]:visible').first();
  await voteBtn.waitFor({ timeout: 6000 });
  const title = await bob.page.locator('.pv2-decision-title:visible').first().innerText();
  assert(title.includes('Tür „links“ & <rechts>?'), 'no double encoding: ' + title);
  const decisions = await api(dm.page, 'GET', `/api/campaign/${campaignId}/game/decisions`);
  const decisionId = decisions.json[decisions.json.length - 1].id;
  const dmVote = await api(dm.page, 'POST', `/api/campaign/${campaignId}/game/vote`, { decisionId, vote: 'yes' });
  assert(dmVote.status === 403, 'DM vote rejected, got ' + dmVote.status);
  await voteBtn.click();
  await bob.page.waitForTimeout(500);
  await bob.page.reload();
  await bob.page.locator('.pv2-decision:visible').first().waitFor({ timeout: 8000 });
  assert(await bob.page.locator('.pv2-vote-btn.yes[data-did]:visible').count() === 0, 'vote buttons hidden after reload');
  await shot(bob.page, '13-vote-after-reload');
});

// Weitere Beobachtungen: party HP, character name on map, skills
await scenario('Beobachtungen: Mitspieler-Leben, Charaktername, lesbare Fertigkeiten', async () => {
  await bob.page.locator('.pv2-party-hp:visible').first().waitFor({ timeout: 6000 });
  const party = await bob.page.locator('#pvPartyList').innerText();
  assert(party.includes('Thorin Eisenfaust'), 'character name in party: ' + party);
  const skillSize = await bob.page.locator('.pv2-skill-name:visible').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  assert(skillSize >= 14, 'skills font size ' + skillSize);
  const skillRows = bob.page.locator('#pvRail .pv2-skill-row');
  assert(await skillRows.count() === 18, 'all 18 skills rendered');
  await skillRows.last().scrollIntoViewIfNeeded();
  assert(await skillRows.last().isVisible(), 'last skill reachable');
  const contrast = await bob.page.locator('#pvRail .pv2-skill-name').first().evaluate(el => getComputedStyle(el).opacity);
  assert(Number(contrast) >= 0.85, 'skill text not faded: ' + contrast);
  await shot(bob.page, '20-skills');
  await bob.page.evaluate(() => window.scrollTo(0, 0));
  const gmName = await dm.page.locator('.gm-player-name').first().innerText();
  assert(gmName.includes('Thorin Eisenfaust'), 'GM list shows character: ' + gmName);
  // HP comes from the server: barbarian d12 + CON mod (no scores → 10) = 12
  assert(/12\/12|12 \/ 12/.test(party + gmName + await dm.page.locator('#gmPlayerList').innerText()), 'HP 12 from hit die');
  await shot(bob.page, '20-party');
});

// Fehler 23 – only approved players take turns
await scenario('Fehler 23: Nur freigegebene Spieler im Zugsystem', async () => {
  // dave joins the running game and waits for approval
  const dave = await login('dave');
  const joined = await api(dave.page, 'POST', `/api/campaign-player/${campaignId}/join`, { playerId: dave.me.id });
  assert(joined.status === 201 || joined.status === 200, 'dave joins ' + joined.status + ' ' + joined.text);
  const daveChar = await createCharacter(dave.page, 'Dave der Neue', 'Schurke');
  const submitted = await api(dave.page, 'POST', `/api/campaign-player/${campaignId}/${dave.me.id}/submit-character`, { characterId: daveChar });
  assert(submitted.status === 200, 'dave submits ' + submitted.status + ' ' + submitted.text);
  await dm.page.waitForTimeout(1500); // roster_updated reaches the GM view
  const list = await dm.page.locator('#gmPlayerList').innerText();
  assert(list.includes('Thorin Eisenfaust') && list.includes('Elara Mondschein'), 'approved players listed: ' + list);
  assert(!list.includes('dave') && !list.includes('Dave der Neue'), 'dave (pending) is not in the turn list');
  await dave.context.close();
});

// Fehler 14 – game state survives (persisted)
await scenario('Fehler 14: Spielstand ist gespeichert', async () => {
  const hp = await api(dm.page, 'PATCH', `/api/campaign/${campaignId}/game/hp`, { playerId: bob.me.id, delta: -3 });
  assert(hp.status === 200, 'hp ' + hp.status);
  await bob.page.locator('.pv2-party-hp-text:visible', { hasText: '9/12' }).first().waitFor({ timeout: 6000 });
  const state = await api(dm.page, 'GET', `/api/campaign/${campaignId}/game/state`);
  assert(state.json.playerHp[String(bob.me.id)] === 9, 'state hp 9');
});

// Fehler 18 – iPad portrait
await scenario('Fehler 18: Spieleransicht auf iPad (Hochformat) nicht leer', async () => {
  const ipad = await login('bob', { width: 810, height: 1080 });
  await go(ipad.page, '/campaign/' + campaignId + '/play');
  await ipad.page.waitForTimeout(2500);
  const visible = await ipad.page.evaluate(() => {
    const els = [document.getElementById('pvMobile'), document.getElementById('pvDesktop')];
    return els.some(el => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 200);
  });
  await shot(ipad.page, '18-ipad-portrait');
  await ipad.context.close();
  assert(visible, 'a player layout is visible');
});

// Fehler 8 – end game
await scenario('Fehler 8: DM beendet das Spiel, Spieler werden zurückgeleitet', async () => {
  await dm.page.locator('#gmEndGame').click();
  await dm.page.locator('#gmEndModal').waitFor({ state: 'visible' });
  await shot(dm.page, '08-end-game-dialog');
  await dm.page.locator('#gmEndConfirm').click();
  await dm.page.waitForURL(new RegExp('#/campaign/' + campaignId + '$'), { timeout: 8000 });
  await bob.page.waitForURL(new RegExp('#/campaign/' + campaignId + '$'), { timeout: 8000 });
  const camp = await api(dm.page, 'GET', '/api/campaign/' + campaignId);
  assert(camp.json.started === false, 'campaign not running anymore');
  const state = await api(dm.page, 'GET', `/api/campaign/${campaignId}/game/state`);
  assert(Object.keys(state.json.playerHp || {}).length === 0, 'session reset');
  await shot(bob.page, '08-player-after-end');
});

// Fehler 3 (part 2) – lobby sees started/ended/deleted
await scenario('Fehler 3: Gelöschte Kampagne verschwindet live aus der Liste', async () => {
  const temp = await api(dm.page, 'POST', '/api/campaign', { name: 'Kurzlebig', isPublic: true });
  assert(temp.status === 201, 'create');
  await go(carol.page, '/campaigns');
  await carol.page.locator('.campaign-title', { hasText: 'Kurzlebig' }).waitFor({ timeout: 8000 });
  await api(dm.page, 'DELETE', '/api/campaign/' + temp.json.id);
  await carol.page.locator('.campaign-title', { hasText: 'Kurzlebig' }).waitFor({ state: 'detached', timeout: 8000 });
});

// Fehler 2 – profile picture feedback
await scenario('Fehler 2: Profilbild – Vorschau, Speichern, Bestätigung', async () => {
  await go(bob.page, '/profile');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await bob.page.locator('#pvFileInput').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png });
  await bob.page.locator('#pvAvatarHint.pending').waitFor({ timeout: 4000 });
  await bob.page.locator('#pvSave').click();
  await bob.page.locator('#pvAvatarHint.success').waitFor({ timeout: 6000 });
  const toast = await bob.page.locator('.toast, [class*="toast"]').first().innerText().catch(() => '');
  assert(/gespeichert/i.test(toast), 'toast confirms: ' + toast);
  const me = await api(bob.page, 'GET', '/api/auth/me');
  assert(/\.png$/.test(me.json.profilePicture || ''), 'picture stored');
  await shot(bob.page, '02-profile-saved');
  // unsupported format gives a clear message instead of failing silently
  await bob.page.locator('#pvFileInput').setInputFiles({ name: 'broken.heic', mimeType: 'image/heic', buffer: Buffer.from('nope') });
  await bob.page.locator('#pvAvatarHint.error').waitFor({ timeout: 4000 });
});

// Fehler 10/16/19 – security spot checks through the browser
await scenario('Fehler 10/16/19: Story, E-Mail und Uploads geschützt', async () => {
  const list = await api(bob.page, 'GET', '/api/campaign');
  assert(list.json.every(c => !c.story), 'no story in lists');
  const alice = await api(bob.page, 'GET', '/api/player/id/' + dm.me.id);
  assert(!alice.json.email, 'no foreign e-mail');
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  const res = await anonPage.request.get(BASE + (await api(bob.page, 'GET', '/api/auth/me')).json.profilePicture, { maxRedirects: 0 });
  assert(res.status() !== 200, 'upload not public: ' + res.status());
  await anon.close();
});

// Klassen außerhalb einer Kampagne
await scenario('Beobachtung: Klassen außerhalb einer Kampagne einsehbar', async () => {
  await go(carol.page, '/campaigns');
  await carol.page.locator('#classesBtn').click();
  await carol.page.locator('.guide-class-item', { hasText: 'Barbar' }).waitFor({ timeout: 6000 });
  await shot(carol.page, '30-classes-guide');
});

await browser.close();

const failed = results.filter(r => !r.ok);
writeFileSync(join(SHOTS, 'results.json'), JSON.stringify(results, null, 2));
console.log(`\nBrowser scenarios: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
