import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GMView from '../../src/main/resources/META-INF/resources/app/views/GMView.js';
import { validLayout } from '../../src/main/resources/META-INF/resources/app/services/dmLayout.js';

const fakes = vi.hoisted(() => ({ maps: [], handlers: null, close: vi.fn(), disconnect: vi.fn() }));
vi.mock('../../src/main/resources/META-INF/resources/app/components/header.js', () => ({ renderHeader: () => '', initHeader: () => {}, destroyHeader: () => {} }));
vi.mock('../../src/main/resources/META-INF/resources/app/services/campaignEvents.js', () => ({ connectCampaignEvents: vi.fn((_id, handlers) => {
  fakes.handlers = handlers; return { close: fakes.close, retry: vi.fn() };
}) }));
vi.mock('../../src/main/resources/META-INF/resources/app/components/mapCanvas.js', () => ({ createMapCanvas: vi.fn(container => {
  const canvas = document.createElement('canvas'); container.append(canvas);
  let zoom = 1;
  const api = { canvas, setZoom: value => { zoom = value; }, getZoom: () => zoom, resetView: () => { zoom = 1; },
    updateMarkers: vi.fn(), updateMapImage: vi.fn(), setPlayers: vi.fn(), destroy: () => canvas.remove() };
  fakes.maps.push(api); return api;
}) }));

const prefix = 'dicekeeper.dm.workspace.v1.';
const saved = () => JSON.parse(localStorage.getItem(prefix + '1.desktop.last'));
const button = title => [...document.querySelectorAll('button')].find(node => node.getAttribute('aria-label') === title);
const tab = id => document.querySelector(`[data-tab="${id}"]`);
const clickTab = id => tab(id).click();
const group = id => tab(id).closest('.dm-dock-group');
function chooseLayout(value) {
  const select = document.querySelector('.dm-layout-select'); select.value = value; select.dispatchEvent(new Event('change'));
}
function togglePanel(id, visible) {
  const check = [...document.querySelectorAll('.dm-panel-options label')].find(node => node.textContent === id).querySelector('input');
  check.checked = visible; check.dispatchEvent(new Event('change'));
}
function pointer(target, type, x, y) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { button: 0, pointerId: 1, clientX: x, clientY: y });
  target.dispatchEvent(event);
}
const rectangle = (x, y, width, height) => ({ x, y, left: x, top: y, right: x + width, bottom: y + height, width, height });

describe('existing GM game integration with docking shells', () => {
  let cleanup, media;
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear(); fakes.maps = []; fakes.handlers = null;
    sessionStorage.setItem('player', JSON.stringify({ id: 1, username: 'DM' }));
    document.body.innerHTML = '<div id="app"></div>';
    media = new EventTarget(); media.matches = false;
    vi.stubGlobal('matchMedia', () => media);
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() { fakes.disconnect(); } });
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      let data = {};
      if (String(url).startsWith('/api/campaign/4?')) data = { id: 4, mapImagePath: '/map.png' };
      if (String(url).endsWith('/game/state')) data = { currentTurnPlayerId: 5, playerHp: { 5: 8 }, playerMaxHp: { 5: 12 }, playerActive: { 5: true } };
      if (String(url).endsWith('/game/map-markers')) data = [{ id: 'p5', type: 'player', playerIds: '5', x: .5, y: .5 }];
      if (String(url).endsWith('/game/decisions')) data = [{ id: 1, title: 'Pfad wählen', text: 'Links oder rechts?' }];
      if (String(url) === '/api/campaign-player/4') data = [{ role: 'PLAYER', playerId: 5 }];
      if (String(url) === '/api/player/id/5') data = { id: 5, username: 'Anna' };
      return { ok: true, json: async () => data };
    }));
  });
  afterEach(() => { cleanup?.(); cleanup = null; vi.unstubAllGlobals(); });

  it('retains canvas identity, zoom, chat content, draft, dice selection and backend event bindings', async () => {
    cleanup = await GMView({ id: 4 });
    const input = document.getElementById('gmChatInput'), canvas = document.querySelector('#gmMapBox canvas');
    input.value = 'Entwurf'; input.focus(); input.setSelectionRange(2, 4);
    document.getElementById('gmMapZoomIn').click();
    document.querySelector('[data-sides="12"]').click();
    document.getElementById('gmManualInput').value = '7';
    chooseLayout('combat'); chooseLayout('explore'); clickTab('chat');
    expect(document.getElementById('gmChatInput')).toBe(input);
    expect(input.value).toBe('Entwurf');
    expect(document.querySelector('#gmMapBox canvas')).toBe(canvas);
    expect(fakes.maps).toHaveLength(1); expect(fakes.maps[0].getZoom()).toBe(1.3);
    document.getElementById('gmChatSend').click();
    expect(document.getElementById('gmChat').textContent).toContain('Entwurf');
    clickTab('dice'); document.getElementById('gmManualSet').click();
    expect(document.getElementById('gmDiceResult').textContent).toBe('7');
    expect(fetch).toHaveBeenCalledWith('/api/campaign/4/game/dice', expect.objectContaining({ body: expect.stringContaining('"diceType":"d12"') }));
    expect(validLayout(saved())).toBe(true);
    fakes.handlers.dice({ diceType: 'd20', result: 18, playerId: 5 });
    expect(document.getElementById('gmChat').textContent).toContain('18');
  });

  it('continues live updates to closed panels and retains HP, decisions, chat and actions on reopen', async () => {
    cleanup = await GMView({ id: 4 });
    const players = document.getElementById('gmPlayerList');
    button('Panel schließen: Spieler').click();
    expect(players.closest('.dm-panel-parking')).not.toBeNull();
    fakes.handlers.hp({ playerId: 5, currentHp: 3, maxHp: 12 });
    fakes.handlers.decision({ id: 2, title: 'Neue Entscheidung', text: 'Live!' });
    togglePanel('Spieler', true);
    expect(document.getElementById('gmPlayerList')).toBe(players);
    expect(players.textContent).toContain('3 / 12');
    expect(document.getElementById('gmDecisionList').textContent).toContain('Neue Entscheidung');
    players.querySelector('[data-d="-1"]').click();
    expect(players.textContent).toContain('2 / 12');
    expect(fetch).toHaveBeenCalledWith('/api/campaign/4/game/hp', expect.objectContaining({ method: 'PATCH' }));
  });

  it('floats and docks the original panel and restores a personal layout after reset', async () => {
    cleanup = await GMView({ id: 4 });
    const dice = document.querySelector('[data-panel="dice"]');
    group('dice').querySelector('[aria-label="Als Fenster lösen"]').click();
    expect(dice.closest('.dm-floating')).not.toBeNull();
    button('Layout speichern').click();
    expect(saved().floating).toHaveLength(1); expect(validLayout(saved())).toBe(true);
    group('dice').querySelector('[aria-label="Wieder andocken"]').click();
    expect(dice.closest('.dm-floating')).toBeNull();
    button('Standardlayout wiederherstellen').click();
    expect(document.querySelectorAll('.dm-dock-group')).toHaveLength(5);
    chooseLayout('custom');
    expect(document.querySelector('[data-panel="dice"]')).toBe(dice);
    expect(dice.closest('.dm-floating')).not.toBeNull();
  });

  it('recovers invalid storage, keeps desktop layout across mobile transitions and isolates users', async () => {
    localStorage.setItem(prefix + '1.desktop.last', '{broken');
    cleanup = await GMView({ id: 4 });
    expect(document.querySelectorAll('.dm-dock-group')).toHaveLength(5);
    chooseLayout('explore');
    media.matches = true; media.dispatchEvent(new Event('change'));
    expect(document.querySelectorAll('.dm-dock-group')).toHaveLength(1);
    clickTab('chat');
    media.matches = false; media.dispatchEvent(new Event('change'));
    expect(document.querySelector('.dm-layout-select').value).toBe('explore');
    cleanup(); cleanup = null;
    expect(fakes.close).toHaveBeenCalled(); expect(fakes.disconnect).toHaveBeenCalled();
    sessionStorage.setItem('player', JSON.stringify({ id: 2, username: 'Other DM' }));
    cleanup = await GMView({ id: 4 });
    expect(document.querySelectorAll('.dm-dock-group')).toHaveLength(5);
    expect(document.querySelector('.dm-layout-select').value).toBe('standard');
  });

  it('keeps all closed panels connected and can restore every panel without reinitializing them', async () => {
    cleanup = await GMView({ id: 4 });
    for (const title of ['Karte', 'Gruppenentscheidungen', 'Spieler', 'Würfel', 'Dungeon Master Chat']) togglePanel(title, false);
    expect(document.querySelectorAll('.dm-panel-parking > .dm-panel-content')).toHaveLength(5);
    expect(document.querySelectorAll('.dm-dock-group')).toHaveLength(0);
    expect(validLayout(saved())).toBe(true);
    button('Alle Panels einblenden').click();
    expect(document.querySelectorAll('.dm-panel-parking > .dm-panel-content')).toHaveLength(0);
    expect(document.querySelectorAll('[role=tab]')).toHaveLength(5);
    expect(fakes.maps).toHaveLength(1); expect(validLayout(saved())).toBe(true);
  });

  it('keeps game controls usable when storage is unavailable', async () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw Error('Storage disabled'); };
    try {
      cleanup = await GMView({ id: 4 });
      chooseLayout('combat'); button('Layout speichern').click();
      expect(document.querySelector('.dm-workspace-status').textContent).toContain('nicht möglich');
      document.getElementById('gmChatInput').value = 'Hallo'; document.getElementById('gmChatSend').click();
      expect(document.getElementById('gmChat').textContent).toContain('Hallo');
    } finally { Storage.prototype.setItem = original; }
  });

  it('previews a tab drop, cancels with Escape, and docks on pointer release', async () => {
    cleanup = await GMView({ id: 4 });
    const source = tab('chat'), destination = group('decisions');
    vi.spyOn(destination, 'getBoundingClientRect').mockReturnValue(rectangle(400, 0, 300, 300));
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => destination });
    pointer(source, 'pointerdown', 100, 500);
    pointer(document, 'pointermove', 550, 150);
    expect(document.querySelector('.dm-dock-preview').hidden).toBe(false);
    expect(document.querySelector('.dm-dock-preview').textContent).toBe('Als Tab anordnen');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('.dm-dock-preview').hidden).toBe(true);
    expect(group('chat')).not.toBe(group('decisions'));
    pointer(source, 'pointerdown', 100, 500);
    pointer(document, 'pointermove', 550, 150);
    pointer(document, 'pointerup', 550, 150);
    expect(group('chat')).toBe(group('decisions'));
    expect(validLayout(saved())).toBe(true);
  });

  it('resizes split boundaries and floating windows within their minimum sizes', async () => {
    cleanup = await GMView({ id: 4 });
    const split = document.querySelector('.dm-workspace-stage > .dm-dock-split');
    Object.defineProperty(split, 'clientWidth', { configurable: true, value: 1600 });
    vi.spyOn(split, 'getBoundingClientRect').mockReturnValue(rectangle(0, 0, 1600, 800));
    const separator = split.querySelector(':scope > .dm-dock-separator');
    pointer(separator, 'pointerdown', 800, 200);
    pointer(document, 'pointermove', 1000, 200);
    pointer(document, 'pointerup', 1000, 200);
    expect(saved().root.ratio).toBeGreaterThan(.6);
    const stage = document.querySelector('.dm-workspace-stage');
    Object.defineProperty(stage, 'clientWidth', { configurable: true, value: 1600 });
    Object.defineProperty(stage, 'clientHeight', { configurable: true, value: 800 });
    group('dice').querySelector('[aria-label="Als Fenster lösen"]').click();
    const floating = document.querySelector('.dm-floating');
    pointer(floating.querySelector('.dm-float-grip'), 'pointerdown', 40, 40);
    pointer(document, 'pointermove', 140, 120);
    pointer(document, 'pointerup', 140, 120);
    expect(saved().floating[0].x).toBe(140);
    const corner = floating.querySelector('.dm-resize-se');
    pointer(corner, 'pointerdown', 500, 500);
    pointer(document, 'pointermove', 600, 550);
    pointer(document, 'pointerup', 600, 550);
    expect(saved().floating[0].width).toBe(460);
    expect(saved().floating[0].height).toBe(410);
    pointer(corner, 'pointerdown', 600, 550);
    pointer(document, 'pointermove', -200, -200);
    pointer(document, 'pointerup', -200, -200);
    expect(saved().floating[0].width).toBe(220);
    expect(saved().floating[0].height).toBe(246);
    expect(validLayout(saved())).toBe(true);
  });
});
