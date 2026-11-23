import { PANELS, PANEL_IDS, presetLayout, groups, minimumSize, removePanel, dockPanel, readLayout, cloneLayout } from '../services/dmLayout.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};
const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));

/** Owns only layout shells. Original panel DOM stays connected, including when closed. */
export function createDMWorkspace(container, { playerId, storage } = {}) {
  const lifetime = new AbortController();
  // Only long-lived event targets need explicit disposal. Per-shell listeners are
  // collected with their detached DOM, rather than retained by a shared signal.
  const on = (node, event, handler) => node.addEventListener(event, handler,
    node === document || node === window || node === media ? { signal: lifetime.signal } : undefined);
  try { storage ??= window.localStorage; } catch { storage = null; }
  const key = 'dicekeeper.dm.workspace.v1.' + encodeURIComponent(playerId ?? 'local');
  const media = window.matchMedia('(max-width: 700px)');
  let compact = media.matches;
  const storageKey = (custom = false) => key + (compact ? '.compact' : '.desktop') + (custom ? '.custom' : '.last');
  let state = readLayout(storage, storageKey()) || presetLayout('standard', compact);
  let interaction = null, destroyed = false;
  const unsaved = new Map();
  const panels = new Map();
  const toolbar = el('div', 'dm-workspace-toolbar');
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'DM-Arbeitsbereich');
  const stage = el('div', 'dm-workspace-stage');
  const parking = el('div', 'dm-panel-parking');
  parking.hidden = true;
  const preview = el('div', 'dm-dock-preview');
  preview.hidden = true;
  const status = el('span', 'dm-workspace-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const hint = el('p', 'dm-workspace-hint', 'Tabs ziehen: Rand = andocken · Mitte = Tab · Freie Fläche = Fenster. Alternativ: Panel-Menü ⋯');

  for (const id of PANEL_IDS) {
    const node = container.querySelector(PANELS[id].selector);
    if (!node) throw new Error('Missing DM panel: ' + id);
    node.classList.add('dm-panel-content');
    node.dataset.panel = id;
    node.id ||= 'dm-content-' + id;
    node.setAttribute('role', 'tabpanel');
    panels.set(id, node);
    parking.append(node);
  }
  container.replaceChildren(toolbar, hint, stage, parking);
  container.classList.add('dm-workspace');
  container.classList.remove('gm-main');
  // Preserve existing gm-main form/button styling only around game content.
  panels.forEach(node => node.classList.add('gm-main-content'));

  function button(label, action, text = label) {
    const node = el('button', 'dm-workspace-button', text);
    node.type = 'button'; node.title = label; node.setAttribute('aria-label', label);
    on(node, 'click', action);
    return node;
  }
  const layoutLabel = el('label', 'dm-layout-label', 'Layout');
  const layoutSelect = el('select', 'dm-layout-select');
  layoutSelect.setAttribute('aria-label', 'Layout auswählen');
  for (const [value, title] of [['standard', 'Standard'], ['combat', 'Kampf'], ['explore', 'Erkundung'], ['custom', 'Benutzerdefiniert']]) {
    const option = el('option', '', title); option.value = value; layoutSelect.append(option);
  }
  layoutLabel.append(layoutSelect);
  on(layoutSelect, 'change', () => {
    if (layoutSelect.value === 'custom') {
      const saved = readLayout(storage, storageKey(true));
      if (!saved) { announce('Noch kein gültiges benutzerdefiniertes Layout gespeichert.'); layoutSelect.value = state.preset; return; }
      state = saved;
    } else state = presetLayout(layoutSelect.value, compact);
    render(); persist();
  });
  const panelMenu = el('details', 'dm-panel-menu');
  const summary = el('summary', '', '◫ Panels');
  panelMenu.append(summary);
  const panelOptions = el('div', 'dm-panel-options');
  const checks = new Map();
  PANEL_IDS.forEach(id => {
    const label = el('label');
    const check = el('input'); check.type = 'checkbox';
    on(check, 'change', () => check.checked ? showPanel(id) : closePanel(id));
    checks.set(id, check); label.append(check, document.createTextNode(PANELS[id].title)); panelOptions.append(label);
  });
  panelOptions.append(button('Alle Panels einblenden', () => {
    state.hidden.slice().forEach(id => dockPanel(state, id, groups(state)[0]?.id)); changed();
  }));
  panelMenu.append(panelOptions);
  const save = button('Layout speichern', () => {
    state.preset = 'custom';
    const success = write(storageKey(true));
    persist(); updateToolbar();
    announce(success ? 'Persönliches Layout gespeichert.' : 'Speichern im Browser nicht möglich. Das Layout bleibt für diese Ansicht erhalten.');
  });
  const reset = button('Standardlayout wiederherstellen', () => {
    state = presetLayout('standard', compact); render(); persist(); announce('Standardlayout wiederhergestellt.');
  }, 'Zurücksetzen');
  toolbar.append(el('span', 'dm-workspace-title', '◈ DM-Arbeitsbereich'), layoutLabel, panelMenu, save, reset, status);
  on(document, 'click', event => { if (!panelMenu.contains(event.target)) panelMenu.open = false; });
  on(document, 'keydown', event => { if (event.key === 'Escape') panelMenu.open = false; });

  function announce(message) { status.textContent = message; }
  function write(target) {
    try { storage.setItem(target, JSON.stringify(state)); return true; } catch { return false; }
  }
  function persist() {
    unsaved.set(compact, cloneLayout(state));
    if (!write(storageKey())) announce('Automatisches Speichern ist in diesem Browser nicht verfügbar.');
  }
  function updateToolbar() {
    layoutSelect.value = state.preset;
    checks.forEach((check, id) => { check.checked = !state.hidden.includes(id); });
  }
  function changed() { state.preset = 'custom'; render(); persist(); }
  function closePanel(id) {
    removePanel(state, id); state.hidden.push(id); changed();
    announce(PANELS[id].title + ' ausgeblendet. Über Panels wieder öffnen.');
  }
  function showPanel(id) {
    if (state.hidden.includes(id)) { dockPanel(state, id, groups(state)[0]?.id); changed(); }
    else {
      const group = groups(state).find(item => item.panels.includes(id));
      if (group) { group.active = id; render(); persist(); }
    }
  }
  function floatPanel(id, x = 40, y = 40) {
    removePanel(state, id);
    let suffix = 0;
    const ids = groups(state).map(item => item.id);
    while (ids.includes('float-' + id + '-' + suffix)) suffix++;
    state.floating.push({ group: { type: 'group', id: 'float-' + id + '-' + suffix, panels: [id], active: id }, x, y, width: Math.max(360, PANELS[id].width), height: Math.max(360, PANELS[id].height + 36) });
    changed();
  }
  function dockBack(id) {
    const first = groups({ ...state, floating: [] })[0];
    dockPanel(state, id, first?.id, 'right'); changed();
  }

  // All document-level handlers are removed on pointerup/cancel/Escape or route cleanup.
  function trackPointer(event, { move, end, cancel = () => {} }) {
    interaction?.cancel();
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const finish = (cancelled, e) => {
      controller.abort(); interaction = null;
      document.body.classList.remove('dm-dragging'); preview.hidden = true;
      if (cancelled) cancel(); else end(e);
    };
    interaction = { cancel: () => finish(true) };
    document.addEventListener('pointermove', e => { if (e.pointerId === event.pointerId) move(e); }, options);
    document.addEventListener('pointerup', e => { if (e.pointerId === event.pointerId) finish(false, e); }, options);
    document.addEventListener('pointercancel', e => { if (e.pointerId === event.pointerId) finish(true, e); }, options);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); finish(true, e); } }, options);
    window.addEventListener('blur', () => finish(true), options);
  }
  function beginTabDrag(event, id) {
    if (event.button !== 0) return;
    const startX = event.clientX, startY = event.clientY;
    let dragging = false, drop = null;
    trackPointer(event, {
      move: e => {
        if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) < 6) return;
        dragging = true; document.body.classList.add('dm-dragging');
        const stageRect = stage.getBoundingClientRect();
        const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.dm-dock-group');
        if (target && stage.contains(target)) {
          const rect = target.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width, y = (e.clientY - rect.top) / rect.height;
          const floating = target.closest('.dm-floating');
          let direction = 'center';
          if (!floating && e.clientY > rect.top + 36) {
            const nearest = Math.min(x, 1 - x, y, 1 - y);
            if (nearest < .25) direction = nearest === x ? 'left' : nearest === 1 - x ? 'right' : nearest === y ? 'top' : 'bottom';
          }
          drop = { target: target.dataset.group, direction };
          const left = direction === 'right' ? rect.left + rect.width / 2 : rect.left;
          const top = direction === 'bottom' ? rect.top + rect.height / 2 : rect.top;
          Object.assign(preview.style, { left: left - stageRect.left + 'px', top: top - stageRect.top + 'px', width: rect.width / (['left', 'right'].includes(direction) ? 2 : 1) + 'px', height: rect.height / (['top', 'bottom'].includes(direction) ? 2 : 1) + 'px' });
          preview.textContent = direction === 'center' ? 'Als Tab anordnen' : 'Hier andocken';
        } else {
          drop = { x: clamp(e.clientX - stageRect.left - 60, 0, stage.clientWidth - 360), y: clamp(e.clientY - stageRect.top - 18, 0, stage.clientHeight - 360) };
          Object.assign(preview.style, { left: drop.x + 'px', top: drop.y + 'px', width: '360px', height: '360px' });
          preview.textContent = 'Freies Fenster';
        }
        preview.hidden = false;
      },
      end: () => {
        if (!dragging) { showPanel(id); return; }
        if (drop?.target) { dockPanel(state, id, drop.target, drop.direction); changed(); }
        else if (drop) floatPanel(id, drop.x, drop.y);
      }
    });
  }

  function panelActions(group, floating) {
    const menu = el('details', 'dm-group-menu');
    const summary = el('summary', '', '⋯');
    summary.title = 'Panel anordnen'; summary.setAttribute('aria-label', 'Panel anordnen');
    menu.append(summary);
    const options = el('div', 'dm-group-options');
    options.append(button(floating ? 'Wieder andocken' : 'Als Fenster lösen', () => floating ? dockBack(group.active) : floatPanel(group.active)));
    // Keyboard and touch alternative to drag & drop.
    const target = el('select'); target.setAttribute('aria-label', 'Zielbereich');
    groups(state).filter(item => item !== group).forEach(item => {
      const option = el('option', '', PANELS[item.active].title); option.value = item.id; target.append(option);
    });
    const direction = el('select'); direction.setAttribute('aria-label', 'Docking-Position');
    [['center', 'Als Tab'], ['left', 'Links'], ['right', 'Rechts'], ['top', 'Oben'], ['bottom', 'Unten']].forEach(([value, title]) => {
      const option = el('option', '', title); option.value = value; direction.append(option);
    });
    if (target.options.length) {
      options.append(target, direction, button('Panel verschieben', () => { dockPanel(state, group.active, target.value, direction.value); changed(); }));
    }
    menu.append(options);
    return menu;
  }

  function renderGroup(group, floating = false) {
    const node = el('section', 'dm-dock-group'); node.dataset.group = group.id;
    const header = el('div', 'dm-dock-header');
    const tabs = el('div', 'dm-dock-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Panels');
    group.panels.forEach((id, index) => {
      const tab = el('button', 'dm-dock-tab' + (group.active === id ? ' is-active' : ''), PANELS[id].icon + ' ' + PANELS[id].title);
      tab.type = 'button'; tab.id = 'dm-tab-' + id; tab.dataset.tab = id;
      tab.title = PANELS[id].title + ' – ziehen zum Anordnen';
      tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(group.active === id));
      tab.setAttribute('aria-controls', panels.get(id).id); tab.tabIndex = group.active === id ? 0 : -1;
      on(tab, 'pointerdown', e => { if (e.button === 0) { e.preventDefault(); tab.focus(); beginTabDrag(e, id); } });
      // click also supports keyboard activation and assistive technology.
      on(tab, 'click', e => { if (e.detail === 0) showPanel(id); });
      on(tab, 'keydown', e => {
        let next;
        if (e.key === 'ArrowRight') next = (index + 1) % group.panels.length;
        if (e.key === 'ArrowLeft') next = (index - 1 + group.panels.length) % group.panels.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = group.panels.length - 1;
        if (next !== undefined) { e.preventDefault(); showPanel(group.panels[next]); document.getElementById('dm-tab-' + group.panels[next])?.focus(); }
      });
      tabs.append(tab);
    });
    header.append(tabs, panelActions(group, floating), button('Panel schließen: ' + PANELS[group.active].title, () => closePanel(group.active), '×'));
    const body = el('div', 'dm-dock-body');
    group.panels.forEach(id => {
      const panel = panels.get(id);
      panel.hidden = group.active !== id;
      panel.setAttribute('aria-labelledby', 'dm-tab-' + id);
      body.append(panel);
    });
    node.append(header, body);
    return node;
  }

  function renderNode(node) {
    if (node.type === 'group') return renderGroup(node);
    const wrap = el('div', 'dm-dock-split dm-axis-' + node.axis);
    const a = renderNode(node.first), b = renderNode(node.second);
    const handle = el('div', 'dm-dock-separator');
    handle.setAttribute('role', 'separator'); handle.tabIndex = 0;
    handle.setAttribute('aria-label', 'Panelgröße ändern');
    handle.setAttribute('aria-orientation', node.axis === 'x' ? 'vertical' : 'horizontal');
    const dimension = node.axis === 'x' ? 'width' : 'height';
    const apply = () => {
      a.style.flex = node.ratio + ' 1 0px'; b.style.flex = (1 - node.ratio) + ' 1 0px';
      handle.setAttribute('aria-valuenow', String(Math.round(node.ratio * 100)));
      handle.setAttribute('aria-valuemin', '5'); handle.setAttribute('aria-valuemax', '95');
    };
    const setRatio = value => {
      const available = (node.axis === 'x' ? wrap.clientWidth : wrap.clientHeight) - 6;
      if (available <= 0) return;
      const low = Math.max(.05, minimumSize(node.first)[dimension] / available);
      const high = Math.min(.95, 1 - minimumSize(node.second)[dimension] / available);
      if (low <= high) node.ratio = clamp(value, low, high);
      apply();
    };
    const sizeA = minimumSize(node.first), sizeB = minimumSize(node.second);
    Object.assign(a.style, { minWidth: sizeA.width + 'px', minHeight: sizeA.height + 'px' });
    Object.assign(b.style, { minWidth: sizeB.width + 'px', minHeight: sizeB.height + 'px' });
    apply();
    on(handle, 'pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      const original = node.ratio, rect = wrap.getBoundingClientRect();
      document.body.classList.add('dm-dragging');
      trackPointer(event, {
        move: e => setRatio(node.axis === 'x' ? (e.clientX - rect.left) / (rect.width - 6) : (e.clientY - rect.top) / (rect.height - 6)),
        end: () => { state.preset = 'custom'; updateToolbar(); persist(); },
        cancel: () => { node.ratio = original; apply(); }
      });
    });
    on(handle, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault(); setRatio(node.ratio + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -.025 : .025));
      state.preset = 'custom'; updateToolbar(); persist();
    });
    wrap.append(a, handle, b);
    return wrap;
  }

  function floatBounds(item) {
    const min = minimumSize(item.group);
    item.width = clamp(item.width, min.width, stage.clientWidth);
    item.height = clamp(item.height, min.height, stage.clientHeight);
    item.x = clamp(item.x, 0, stage.clientWidth - item.width);
    item.y = clamp(item.y, 0, stage.clientHeight - item.height);
  }
  function positionFloat(node, item) {
    Object.assign(node.style, { left: item.x + 'px', top: item.y + 'px', width: item.width + 'px', height: item.height + 'px' });
  }
  function renderFloat(item) {
    const node = el('div', 'dm-floating');
    node.dataset.floating = item.group.id;
    floatBounds(item); positionFloat(node, item);
    node.append(renderGroup(item.group, true));
    on(node, 'pointerdown', () => {
      // DOM order alone sets stacking; no accumulating z-indices.
      stage.querySelectorAll('.dm-floating').forEach(other => other.classList.remove('is-front'));
      node.classList.add('is-front');
    });
    const header = node.querySelector('.dm-dock-header');
    const grip = el('button', 'dm-float-grip', '⠿');
    grip.type = 'button'; grip.title = 'Fenster verschieben (ziehen oder Pfeiltasten)';
    grip.setAttribute('aria-label', 'Fenster verschieben');
    header.prepend(grip);
    on(grip, 'keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'ArrowLeft') item.x -= 20;
      if (event.key === 'ArrowRight') item.x += 20;
      if (event.key === 'ArrowUp') item.y -= 20;
      if (event.key === 'ArrowDown') item.y += 20;
      floatBounds(item); positionFloat(node, item); persist();
    });
    on(header, 'pointerdown', event => {
      if (event.button !== 0 || (event.target.closest('button, details') && !event.target.closest('.dm-float-grip'))) return;
      event.preventDefault();
      const x = event.clientX, y = event.clientY, original = { ...item };
      trackPointer(event, {
        move: e => { item.x = original.x + e.clientX - x; item.y = original.y + e.clientY - y; floatBounds(item); positionFloat(node, item); },
        end: () => { state.preset = 'custom'; updateToolbar(); persist(); },
        cancel: () => { Object.assign(item, original); positionFloat(node, item); }
      });
    });
    ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'].forEach(edge => {
      const handle = el('div', 'dm-float-resize dm-resize-' + edge);
      handle.setAttribute('aria-hidden', 'true');
      on(handle, 'pointerdown', event => {
        if (event.button !== 0) return;
        event.preventDefault();
        const x = event.clientX, y = event.clientY, original = { ...item }, min = minimumSize(item.group);
        trackPointer(event, {
          move: e => {
            const dx = e.clientX - x, dy = e.clientY - y;
            if (edge.includes('e')) item.width = clamp(original.width + dx, min.width, stage.clientWidth - original.x);
            if (edge.includes('s')) item.height = clamp(original.height + dy, min.height, stage.clientHeight - original.y);
            if (edge.includes('w')) { item.x = clamp(original.x + dx, 0, original.x + original.width - min.width); item.width = original.x + original.width - item.x; }
            if (edge.includes('n')) { item.y = clamp(original.y + dy, 0, original.y + original.height - min.height); item.height = original.y + original.height - item.y; }
            positionFloat(node, item);
          },
          end: () => { state.preset = 'custom'; updateToolbar(); persist(); },
          cancel: () => { Object.assign(item, original); positionFloat(node, item); }
        });
      });
      node.append(handle);
    });
    return node;
  }

  // Render shells only; never clone or recreate game elements or reconnect live services.
  function render() {
    interaction?.cancel();
    const focused = document.activeElement;
    const selection = focused && 'selectionStart' in focused ? [focused.selectionStart, focused.selectionEnd] : null;
    panels.forEach(node => { node.hidden = true; parking.append(node); });
    stage.replaceChildren();
    const min = minimumSize(state.root);
    stage.style.minWidth = min.width + 'px'; stage.style.minHeight = min.height + 'px';
    if (state.root) stage.append(renderNode(state.root));
    else {
      const empty = el('div', 'dm-workspace-empty', 'Dein Arbeitsbereich ist frei.');
      empty.append(button('Panels auswählen', () => { panelMenu.open = true; summary.focus(); })); stage.append(empty);
    }
    state.floating.forEach(item => stage.append(renderFloat(item)));
    stage.append(preview); updateToolbar();
    const nextFocus = focused?.id ? document.getElementById(focused.id) : focused;
    if (nextFocus && container.contains(nextFocus) && !nextFocus.closest('[hidden]')) {
      nextFocus.focus({ preventScroll: true });
      if (selection && selection[0] !== null && nextFocus === focused) nextFocus.setSelectionRange(...selection);
    }
  }
  on(media, 'change', () => {
    interaction?.cancel(); persist(); compact = media.matches;
    state = unsaved.get(compact) || readLayout(storage, storageKey()) || presetLayout('standard', compact);
    render();
  });
  const observer = new ResizeObserver(() => {
    if (destroyed) return;
    state.floating.forEach(item => {
      floatBounds(item);
      const node = [...stage.querySelectorAll('.dm-floating')].find(node => node.dataset.floating === item.group.id);
      if (node) positionFloat(node, item);
    });
  });
  observer.observe(stage);
  on(window, 'pagehide', persist);
  render();

  return {
    destroy() {
      destroyed = true; interaction?.cancel(); persist();
      observer.disconnect(); lifetime.abort();
    }
  };
}
