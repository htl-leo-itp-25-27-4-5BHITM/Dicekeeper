import { describe, expect, it } from 'vitest';
import { PANEL_IDS, presetLayout, validLayout, groups, removePanel, dockPanel, readLayout, minimumSize } from '../../src/main/resources/META-INF/resources/app/services/dmLayout.js';

describe('DM workspace layout data', () => {
  it('provides three valid templates and compact tabs with every game panel', () => {
    for (const preset of ['standard', 'combat', 'explore']) {
      for (const compact of [true, false]) {
        const state = presetLayout(preset, compact);
        expect(validLayout(state)).toBe(true);
        expect(groups(state).flatMap(group => group.panels).sort()).toEqual([...PANEL_IDS].sort());
        expect(minimumSize(state.root).width).toBeGreaterThanOrEqual(300);
      }
    }
    expect(presetLayout('explore').root.ratio).toBe(.74);
  });

  it('preserves a valid tree through repeated moves, tabs, closes, and reopens', () => {
    const state = presetLayout();
    const directions = ['center', 'left', 'right', 'top', 'bottom'];
    for (let n = 0; n < 100; n++) {
      const id = PANEL_IDS[n % PANEL_IDS.length];
      const target = groups(state)[n % groups(state).length];
      dockPanel(state, id, target.id, directions[Math.floor(n / 5) % directions.length]);
      expect(validLayout(state), 'move ' + n).toBe(true);
    }
    for (const id of PANEL_IDS) {
      removePanel(state, id); state.hidden.push(id);
      expect(validLayout(state)).toBe(true);
    }
    expect(state.root).toBeNull();
    for (const id of PANEL_IDS) { dockPanel(state, id, groups(state)[0]?.id); expect(validLayout(state)).toBe(true); }
  });

  it('collapses empty floating groups when docking their final tab', () => {
    const state = presetLayout();
    removePanel(state, 'map');
    state.floating.push({ group: { type: 'group', id: 'float-map', panels: ['map'], active: 'map' }, x: 0, y: 0, width: 500, height: 400 });
    expect(validLayout(state)).toBe(true);
    dockPanel(state, 'chat', 'float-map', 'left');
    expect(state.floating[0].group.panels).toEqual(['map', 'chat']);
    dockPanel(state, 'map', 'group-players', 'center');
    dockPanel(state, 'chat', 'group-players', 'center');
    expect(state.floating).toHaveLength(0);
    expect(validLayout(state)).toBe(true);
  });

  it.each([
    state => { state.version = 0; },
    state => { state.root.ratio = NaN; },
    state => { state.root.ratio = .999; },
    state => { state.hidden.push('chat'); },
    state => { groups(state)[0].panels.push('unknown'); },
    state => { groups(state)[0].active = 'chat'; },
    state => { groups(state)[1].id = groups(state)[0].id; },
    state => { state.root.first = state.root; },
    state => { removePanel(state, 'map'); },
    state => { state.floating = [{ group: groups(state)[0], x: -5, y: 0, width: 300, height: 300 }]; }
  ])('rejects corrupt or obsolete layouts', mutate => {
    const state = presetLayout(); mutate(state); expect(validLayout(state)).toBe(false);
  });

  it('handles malformed, inaccessible, and oversized storage', () => {
    expect(readLayout({ getItem: () => '{broken' }, 'layout')).toBeNull();
    expect(readLayout({ getItem: () => { throw Error('blocked'); } }, 'layout')).toBeNull();
    expect(readLayout({ getItem: () => ' '.repeat(20001) }, 'layout')).toBeNull();
    const state = presetLayout('combat');
    expect(readLayout({ getItem: () => JSON.stringify(state) }, 'layout')).toEqual(state);
  });
});
