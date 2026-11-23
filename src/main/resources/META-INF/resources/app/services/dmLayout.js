// Layout data only. No game state or backend requests belong in this module.
export const LAYOUT_VERSION = 1;
export const PANELS = Object.freeze({
  map: { title: 'Karte', icon: '◈', width: 300, height: 220, selector: '.map-container' },
  decisions: { title: 'Gruppenentscheidungen', icon: '◇', width: 240, height: 170, selector: '.decisions-panel' },
  players: { title: 'Spieler', icon: '♙', width: 240, height: 180, selector: '.player-container' },
  dice: { title: 'Würfel', icon: '⚄', width: 220, height: 210, selector: '.dice-section' },
  chat: { title: 'Dungeon Master Chat', icon: '☏', width: 240, height: 200, selector: '.chat-box' }
});
export const PANEL_IDS = Object.keys(PANELS);
export const cloneLayout = value => JSON.parse(JSON.stringify(value));
const group = (...panels) => ({ type: 'group', id: 'group-' + panels[0], panels, active: panels[0] });
const split = (axis, ratio, first, second) => ({ type: 'split', axis, ratio, first, second });

export function presetLayout(name = 'standard', compact = false) {
  let root;
  if (compact) root = group(...PANEL_IDS);
  else if (name === 'combat') root = split('x', .56,
    split('y', .75, group('map'), group('decisions', 'chat')),
    split('y', .55, group('players'), group('dice')));
  else if (name === 'explore') root = split('x', .74, group('map'),
    split('y', .55, group('decisions', 'chat'), group('players', 'dice')));
  else root = split('x', .50, group('map'), split('x', .54,
    split('y', .48, group('decisions'), group('chat')),
    split('y', .52, group('players'), group('dice'))));
  return { version: LAYOUT_VERSION, preset: name, root, floating: [], hidden: [] };
}

export function groups(layout) {
  const result = [];
  const visit = node => {
    if (!node) return;
    if (node.type === 'group') result.push(node);
    else { visit(node.first); visit(node.second); }
  };
  visit(layout.root);
  layout.floating.forEach(item => result.push(item.group));
  return result;
}

// Strict, bounded validation before touching the live DOM. A panel must occur exactly once.
export function validLayout(value) {
  try {
    if (!value || value.version !== LAYOUT_VERSION ||
      !['standard', 'combat', 'explore', 'custom'].includes(value.preset) ||
      !Array.isArray(value.floating) || value.floating.length > PANEL_IDS.length ||
      !Array.isArray(value.hidden)) return false;
    const seen = new Set(), ids = new Set();
    const panel = id => {
      if (!PANEL_IDS.includes(id) || seen.has(id)) throw new Error('Invalid panel');
      seen.add(id);
    };
    const visit = (node, depth = 0) => {
      if (!node || depth > 8) throw new Error('Invalid tree');
      if (node.type === 'group') {
        if (typeof node.id !== 'string' || !/^[\w-]{1,100}$/.test(node.id) || ids.has(node.id) ||
          !Array.isArray(node.panels) || !node.panels.length || !node.panels.includes(node.active)) throw new Error('Invalid group');
        ids.add(node.id);
        node.panels.forEach(panel);
      } else if (node.type === 'split') {
        if (!['x', 'y'].includes(node.axis) || !Number.isFinite(node.ratio) || node.ratio < .05 || node.ratio > .95) throw new Error('Invalid split');
        visit(node.first, depth + 1); visit(node.second, depth + 1);
      } else throw new Error('Unknown node');
    };
    if (value.root !== null) visit(value.root);
    for (const item of value.floating) {
      if (item.group?.type !== 'group' || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(item[key])) ||
        item.x < 0 || item.y < 0 || item.x > 20000 || item.y > 20000 ||
        item.width < 100 || item.height < 100 || item.width > 20000 || item.height > 20000) return false;
      visit(item.group);
    }
    value.hidden.forEach(panel);
    return seen.size === PANEL_IDS.length;
  } catch { return false; }
}

export function readLayout(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > 20000) return null;
    const value = JSON.parse(raw);
    return validLayout(value) ? value : null;
  } catch { return null; }
}

export function minimumSize(node) {
  if (!node) return { width: 280, height: 180 };
  if (node.type === 'group') return {
    width: Math.max(...node.panels.map(id => PANELS[id].width)),
    height: Math.max(...node.panels.map(id => PANELS[id].height)) + 36
  };
  const a = minimumSize(node.first), b = minimumSize(node.second);
  return node.axis === 'x'
    ? { width: a.width + b.width + 6, height: Math.max(a.height, b.height) }
    : { width: Math.max(a.width, b.width), height: a.height + b.height + 6 };
}

// Remove empty groups and collapse redundant splits after a move or close.
export function removePanel(layout, id) {
  const prune = node => {
    if (!node) return null;
    if (node.type === 'group') {
      node.panels = node.panels.filter(panel => panel !== id);
      if (!node.panels.includes(node.active)) node.active = node.panels[0];
      return node.panels.length ? node : null;
    }
    node.first = prune(node.first); node.second = prune(node.second);
    return node.first && node.second ? node : node.first || node.second;
  };
  layout.root = prune(layout.root);
  layout.floating = layout.floating.filter(item => prune(item.group));
  layout.hidden = layout.hidden.filter(panel => panel !== id);
}

export function dockPanel(layout, id, targetId, direction = 'center') {
  const target = groups(layout).find(item => item.id === targetId);
  if (target?.panels.length === 1 && target.panels[0] === id) return;
  removePanel(layout, id);
  const destination = groups(layout).find(item => item.id === targetId);
  if (destination && direction === 'center') {
    destination.panels.push(id); destination.active = id;
    return;
  }
  const usedIds = groups(layout).map(item => item.id);
  let suffix = 0;
  while (usedIds.includes('group-' + id + '-' + suffix)) suffix++;
  const added = { ...group(id), id: 'group-' + id + '-' + suffix };
  // Edge docking to a floating group joins it as a tab; nested floats are not created.
  if (destination && layout.floating.some(item => item.group === destination)) {
    destination.panels.push(id); destination.active = id; return;
  }
  if (!layout.root) { layout.root = added; return; }
  const before = ['left', 'top'].includes(direction);
  const wrap = node => split(['top', 'bottom'].includes(direction) ? 'y' : 'x', .5,
    before ? added : node, before ? node : added);
  const replace = node => {
    if (node === destination) return wrap(node);
    if (node.type === 'split') { node.first = replace(node.first); node.second = replace(node.second); }
    return node;
  };
  layout.root = destination ? replace(layout.root) : wrap(layout.root);
}
