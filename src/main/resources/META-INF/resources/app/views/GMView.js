/**
 * GM Game View – Dungeon Master UI (SPA version)
 */
import { requirePlayer } from '../services/auth.js';
import { esc, calcMod, fmtMod, resolveMapUrl } from '../services/utils.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { createMapCanvas } from '../components/mapCanvas.js';

export default async function GMView({ id }) {
  const player = requirePlayer();
  if (!player) return;
  const campaignId = id;

  const app = document.getElementById('app');
  document.body.classList.add('has-header');

  app.innerHTML = renderHeader() + `
    <div class="gm-page">
      <div class="gm-main">
        <div class="glass map-container">
          <div class="map-toolbar">
            <button class="map-tb-btn" id="gmMapZoomIn" title="Zoom in">🔍+</button>
            <button class="map-tb-btn" id="gmMapZoomOut" title="Zoom out">🔍−</button>
            <button class="map-tb-btn" id="gmMapReset" title="Ansicht zurücksetzen">↺</button>
            <button class="map-tb-btn" id="gmUndoMini" title="Rückgängig">↩</button>
            <button class="map-tb-btn" id="gmTableView" title="Tischansicht öffnen" style="color:var(--accent-green) !important;border-color:rgba(var(--accent-green-rgb),0.3) !important;">📺 Tischansicht</button>
            <button class="map-tb-btn map-tb-popout" id="gmMapPopout" title="Karte maximieren">⛶</button>
          </div>
          <div class="map-box" id="gmMapBox"></div>
        </div>
        <div class="center-column">
          <div class="glass equal-box decisions-panel">
            <div class="decisions-header"><h3>⚖️ Gruppenentscheidungen</h3><button class="new-decision-btn" id="gmNewDecBtn" title="Neue Entscheidung">+</button></div>
            <div id="gmDecisionList"></div>
          </div>
          <div class="glass equal-box chat-box">
            <h3>Dungeon Master Chat</h3>
            <div class="chat-messages" id="gmChat"></div>
            <input type="text" id="gmChatInput" placeholder="Nachricht eingeben">
            <button id="gmChatSend">Senden</button>
          </div>
        </div>
        <div class="right-column">
          <div class="glass player-container"><h3>Spieler</h3><div id="gmPlayerList"></div></div>
          <div class="glass dice-section">
            <h3>🎲 Würfel</h3>
            <div class="dice-display"><div class="dice-type-label" id="gmDiceLabel">D20</div><div class="dice-result-value" id="gmDiceResult">—</div><div class="dice-feedback-text" id="gmDiceFb"></div></div>
            <div class="dice-chip-row" id="gmDiceChips">
              <button class="dice-chip" data-sides="4">d4</button><button class="dice-chip" data-sides="6">d6</button>
              <button class="dice-chip" data-sides="8">d8</button><button class="dice-chip" data-sides="10">d10</button>
              <button class="dice-chip" data-sides="12">d12</button><button class="dice-chip selected" data-sides="20">d20</button>
              <button class="dice-chip" data-sides="100">d100</button>
            </div>
            <button class="roll-btn" id="gmRollBtn">🎲 Würfeln</button>
            <div class="or-divider"><span>oder</span></div>
            <div class="manual-row"><input type="number" id="gmManualInput" min="1" step="1" placeholder="Manuell…"><button class="manual-set-btn" id="gmManualSet">Setzen</button></div>
          </div>
        </div>
      </div>
    </div>
    <div id="gmMapOverlay" class="map-fullscreen-overlay">
      <div class="map-fullscreen-header">
        <h3>🗺️ Karte</h3>
        <div class="map-fullscreen-toolbar">
          <button class="map-tb-btn" id="gmMaxZoomIn" title="Zoom in">🔍+</button>
          <button class="map-tb-btn" id="gmMaxZoomOut" title="Zoom out">🔍−</button>
          <button class="map-tb-btn" id="gmMaxReset" title="Ansicht zurücksetzen">↺</button>
          <div class="map-tb-separator"></div>
          <button class="map-tb-btn map-tb-add" id="gmAddStructure" title="Gebäude hinzufügen">🏛️+</button>
          <button class="map-tb-btn map-tb-add" id="gmAddQuest" title="Quest hinzufügen">⭐+</button>
          <button class="map-tb-btn map-tb-add" id="gmAddCheckpoint" title="Checkpoint hinzufügen">🚩+</button>
          <div class="map-tb-separator"></div>
          <button class="map-tb-btn map-tb-group" id="gmGroupMarkers" title="Ausgewählte gruppieren">👥 Gruppieren</button>
          <button class="map-tb-btn map-tb-split" id="gmSplitGroup" title="Gruppe aufteilen">✂️ Aufteilen</button>
          <button class="map-tb-btn map-tb-delete" id="gmDeleteMarker" title="Marker löschen">🗑️</button>
          <div class="map-tb-separator"></div>
          <button class="map-tb-btn map-tb-undo" id="gmUndoMax" title="Letzte Änderung rückgängig">↩ Rückgängig</button>
        </div>
        <button class="map-tb-btn map-close-btn" id="gmMapClose">✕</button>
      </div>
      <div class="map-fullscreen-body">
        <div class="map-fullscreen-canvas" id="gmMaxMapBox"></div>
        <div class="map-fullscreen-sidebar" id="gmMaxSidebar">
          <h4>Marker auf der Karte</h4>
          <div id="gmMaxMarkerList" class="map-marker-list"></div>
          <h4 style="margin-top:14px;">Spieler-Gruppen</h4>
          <div id="gmMaxGroupPanel" class="map-group-panel"></div>
        </div>
      </div>
    </div>
    <div id="gmAddMarkerModal" class="dk-modal"><div class="dk-modal-card">
      <button class="dk-modal-close" data-dismiss="modal">✕</button>
      <div class="dk-modal-icon-row"><span class="dk-modal-icon" id="gmAddMarkerIcon">🏛️</span></div>
      <h3 class="dk-modal-title" id="gmAddMarkerTitle">Neuen Marker hinzufügen</h3>
      <div class="dk-modal-field"><label class="dk-modal-label">Name</label><input class="dk-modal-input" type="text" id="gmMarkerName" placeholder="z.B. Alte Ruine" maxlength="40"></div>
      <div class="dk-modal-field"><label class="dk-modal-label">Icon</label><div class="marker-icon-grid" id="gmMarkerIconGrid"></div></div>
      <div class="dk-modal-actions"><button class="dk-btn-ghost" id="gmMarkerCancel">Abbrechen</button><button class="dk-btn-primary" id="gmMarkerSave">✓ Platzieren</button></div>
    </div></div>
    <div id="gmSplitModal" class="dk-modal"><div class="dk-modal-card">
      <button class="dk-modal-close" data-dismiss="modal">✕</button>
      <div class="dk-modal-icon-row"><span class="dk-modal-icon">✂️</span></div>
      <h3 class="dk-modal-title">Gruppe aufteilen</h3>
      <p class="dk-modal-desc">Wähle die Spieler aus, die abgespalten werden sollen:</p>
      <div id="gmSplitPlayerList" class="split-player-list"></div>
      <div class="dk-modal-actions"><button class="dk-btn-ghost" id="gmSplitCancel">Abbrechen</button><button class="dk-btn-primary" id="gmSplitConfirm">✂️ Abspalten</button></div>
    </div></div>
    <div id="gmDecModal" class="dk-modal"><div class="dk-modal-card">
      <button class="dk-modal-close" data-dismiss="modal">✕</button>
      <div class="dk-modal-icon-row"><span class="dk-modal-icon">⚖️</span></div>
      <h3 class="dk-modal-title">Neue Gruppenentscheidung</h3>
      <p class="dk-modal-desc">Stelle deinen Spielern eine wichtige Entscheidung.</p>
      <div class="dk-modal-field">
        <label class="dk-modal-label">Titel <span id="gmTitleCnt" class="dk-char-counter">0 / 60</span></label>
        <input class="dk-modal-input" type="text" id="gmDecTitle" placeholder="z.B. Welchen Pfad wählt die Gruppe?" maxlength="60">
      </div>
      <div class="dk-modal-field">
        <label class="dk-modal-label">Beschreibung <span id="gmTextCnt" class="dk-char-counter">0 / 200</span></label>
        <textarea class="dk-modal-textarea" id="gmDecText" rows="4" placeholder="Beschreibe die Situation und die Optionen..." maxlength="200"></textarea>
      </div>
      <div class="dk-modal-actions"><button class="dk-btn-ghost" id="gmDecCancel">Abbrechen</button><button class="dk-btn-primary" id="gmDecSave">⚖️ Erstellen</button></div>
    </div></div>
    <div id="gmCharOverlay" class="char-modal-overlay"><div class="char-modal" id="gmCharContent"></div></div>
  `;
  initHeader();

  // Wire up dk-modal close buttons
  document.querySelectorAll('.dk-modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.dk-modal');
      if (modal) modal.style.display = 'none';
    });
  });

  // ===== MAP SETUP =====
  let mapCanvas = null;
  let mapCanvasMax = null;
  let mapImageUrl = '';
  let mapMarkers = [];
  let isMaximized = false;
  let pendingMarkerType = null;
  let pendingMarkerIcon = '📌';

  // Load campaign & map
  let campaign = null;
  try {
    const cr = await fetch('/api/campaign/' + campaignId + '?playerId=' + player.id, { cache: 'no-store' });
    if (cr.ok) {
      campaign = await cr.json();
      if (campaign.mapImagePath) {
        mapImageUrl = resolveMapUrl(campaign.mapImagePath);
      }
    }
  } catch (e) {}

  let players = [], currentIndex = 0, decisions = [], eventSource = null, selectedDiceSides = 20;

  // Load markers from state
  async function loadMapMarkers() {
    try {
      const r = await fetch('/api/campaign/' + campaignId + '/game/map-markers', { cache: 'no-store' });
      if (r.ok) mapMarkers = await r.json();
    } catch (e) {}
    syncMapCanvases();
  }

  function syncMapCanvases() {
    if (mapCanvas) mapCanvas.updateMarkers(mapMarkers);
    if (mapCanvasMax) mapCanvasMax.updateMarkers(mapMarkers);
    renderMaxSidebar();
  }

  function initMiniMap() {
    const box = document.getElementById('gmMapBox');
    if (!mapImageUrl) {
      box.innerHTML = '<div style="color:var(--accent-green);text-align:center;">Keine Karte hochgeladen</div>';
      return;
    }
    mapCanvas = createMapCanvas(box, {
      mapImageUrl,
      markers: mapMarkers,
      readOnly: false,
      isMaximized: false,
      players: players.map(p => ({ id: p.id, name: p.name })),
      onMarkerMove: (m) => {
        fetch('/api/campaign/' + campaignId + '/game/map-marker', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: m.id, x: m.x, y: m.y })
        });
      }
    });
  }

  function initMaxMap() {
    const box = document.getElementById('gmMaxMapBox');
    mapCanvasMax = createMapCanvas(box, {
      mapImageUrl,
      markers: mapMarkers,
      readOnly: false,
      isMaximized: true,
      players: players.map(p => ({ id: p.id, name: p.name })),
      onMarkerMove: (m) => {
        fetch('/api/campaign/' + campaignId + '/game/map-marker', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: m.id, x: m.x, y: m.y })
        });
        syncMapCanvases();
      }
    });
  }

  function openMaximized() {
    isMaximized = true;
    document.getElementById('gmMapOverlay').classList.add('visible');
    document.body.style.overflow = 'hidden';
    initMaxMap();
    renderMaxSidebar();
  }

  function closeMaximized() {
    isMaximized = false;
    document.getElementById('gmMapOverlay').classList.remove('visible');
    document.body.style.overflow = '';
    if (mapCanvasMax) { mapCanvasMax.destroy(); mapCanvasMax = null; }
    // Refresh mini map
    if (mapCanvas) mapCanvas.updateMarkers(mapMarkers);
  }

  // Map toolbar events
  document.getElementById('gmMapPopout').addEventListener('click', openMaximized);
  document.getElementById('gmMapClose').addEventListener('click', closeMaximized);
  document.getElementById('gmTableView').addEventListener('click', () => {
    window.open('#/campaign/' + campaignId + '/table', '_blank');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isMaximized) closeMaximized(); });

  document.getElementById('gmMapZoomIn').addEventListener('click', () => { if (mapCanvas) mapCanvas.setZoom(Math.min(5, mapCanvas.getZoom() + 0.3)); });
  document.getElementById('gmMapZoomOut').addEventListener('click', () => { if (mapCanvas) mapCanvas.setZoom(Math.max(0.5, mapCanvas.getZoom() - 0.3)); });
  document.getElementById('gmMapReset').addEventListener('click', () => { if (mapCanvas) mapCanvas.resetView(); });

  // Undo function shared by mini + maximized toolbar
  async function doUndo() {
    console.log('[Undo] triggered');
    try {
      const res = await fetch('/api/campaign/' + campaignId + '/game/undo', { method: 'POST' });
      console.log('[Undo] status:', res.status);
      if (!res.ok) { alert('Nichts zum Rückgängig machen.'); return; }
      const d = await res.json();
      console.log('[Undo] markers:', d.allMarkers?.length);
      if (d.allMarkers) { mapMarkers = d.allMarkers; syncMapCanvases(); }
    } catch (e) { console.error('[Undo] error:', e); }
  }
  document.getElementById('gmUndoMini').addEventListener('click', doUndo);

  document.getElementById('gmMaxZoomIn').addEventListener('click', () => { if (mapCanvasMax) mapCanvasMax.setZoom(Math.min(5, mapCanvasMax.getZoom() + 0.3)); });
  document.getElementById('gmMaxZoomOut').addEventListener('click', () => { if (mapCanvasMax) mapCanvasMax.setZoom(Math.max(0.5, mapCanvasMax.getZoom() - 0.3)); });
  document.getElementById('gmMaxReset').addEventListener('click', () => { if (mapCanvasMax) mapCanvasMax.resetView(); });

  // Add marker buttons (maximized view only)
  const structureIcons = ['🏛️', '🏰', '🏚️', '⛪', '🏠', '🗿', '⚔️', '🛡️', '💀', '🔥', '🌲', '⛰️'];
  const questIcons = ['⭐', '📜', '💎', '🗝️', '🧪', '📦', '🎯', '🏴'];
  const checkpointIcons = ['🚩', '🏁', '📍', '🔔', '⚡', '🌀', '🔮', '💡'];

  function showAddMarkerModal(type, defaultIcon, defaultIcons) {
    pendingMarkerType = type;
    pendingMarkerIcon = defaultIcon;
    document.getElementById('gmAddMarkerIcon').textContent = defaultIcon;
    document.getElementById('gmAddMarkerTitle').textContent =
      type === 'structure' ? 'Gebäude / Struktur platzieren' :
      type === 'quest' ? 'Quest-Marker platzieren' : 'Checkpoint platzieren';
    document.getElementById('gmMarkerName').value = '';
    // Build icon grid
    const grid = document.getElementById('gmMarkerIconGrid');
    grid.innerHTML = defaultIcons.map(ic => `<button class="marker-icon-btn${ic === defaultIcon ? ' selected' : ''}" data-icon="${ic}">${ic}</button>`).join('');
    grid.querySelectorAll('.marker-icon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.marker-icon-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        pendingMarkerIcon = btn.dataset.icon;
        document.getElementById('gmAddMarkerIcon').textContent = btn.dataset.icon;
      });
    });
    document.getElementById('gmAddMarkerModal').style.display = 'flex';
  }

  document.getElementById('gmAddStructure').addEventListener('click', () => showAddMarkerModal('structure', '🏛️', structureIcons));
  document.getElementById('gmAddQuest').addEventListener('click', () => showAddMarkerModal('quest', '⭐', questIcons));
  document.getElementById('gmAddCheckpoint').addEventListener('click', () => showAddMarkerModal('checkpoint', '🚩', checkpointIcons));

  document.getElementById('gmMarkerCancel').addEventListener('click', () => {
    document.getElementById('gmAddMarkerModal').style.display = 'none';
  });
  document.getElementById('gmAddMarkerModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });

  document.getElementById('gmMarkerSave').addEventListener('click', async () => {
    const name = document.getElementById('gmMarkerName').value.trim() || pendingMarkerType;
    document.getElementById('gmAddMarkerModal').style.display = 'none';
    // Place at center – SSE marker_add event will add it to mapMarkers
    await fetch('/api/campaign/' + campaignId + '/game/map-marker', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: pendingMarkerType, label: name, x: 0.5, y: 0.5, icon: pendingMarkerIcon })
    });
  });

  // Delete marker
  document.getElementById('gmDeleteMarker').addEventListener('click', async () => {
    if (!mapCanvasMax) return;
    const selected = mapCanvasMax.getSelectedIds();
    if (selected.length === 0) { alert('Bitte zuerst einen Marker auswählen (klicken).'); return; }
    for (const mid of selected) {
      await fetch('/api/campaign/' + campaignId + '/game/map-marker/' + mid, { method: 'DELETE' });
      mapMarkers = mapMarkers.filter(m => m.id !== mid);
    }
    mapCanvasMax.clearSelection();
    syncMapCanvases();
  });

  // Group markers — only player/player-group types allowed
  document.getElementById('gmGroupMarkers').addEventListener('click', async () => {
    if (!mapCanvasMax) return;
    const selected = mapCanvasMax.getSelectedIds();
    if (selected.length < 2) { alert('Mindestens 2 Marker auswählen zum Gruppieren.'); return; }
    const selectedMarkers = selected.map(id => mapMarkers.find(m => m.id === id)).filter(Boolean);
    const allPlayers = selectedMarkers.every(m => m.type === 'player' || m.type === 'player-group');
    if (!allPlayers) { alert('Nur Spieler-Marker können gruppiert werden.'); return; }
    const res = await fetch('/api/campaign/' + campaignId + '/game/map-group', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'group', markerIds: selected })
    });
    if (res.ok) {
      const data = await res.json();
      // Reload all markers
      await loadMapMarkers();
      mapCanvasMax.clearSelection();
    }
  });

  // Split group
  document.getElementById('gmSplitGroup').addEventListener('click', () => {
    if (!mapCanvasMax) return;
    const selected = mapCanvasMax.getSelectedIds();
    if (selected.length !== 1) { alert('Bitte genau eine Gruppe auswählen.'); return; }
    const marker = mapMarkers.find(m => m.id === selected[0]);
    if (!marker || marker.type !== 'player-group') { alert('Nur Spieler-Gruppen können aufgeteilt werden.'); return; }
    showSplitModal(marker);
  });

  function showSplitModal(groupMarker) {
    const pids = groupMarker.playerIds ? groupMarker.playerIds.split(',').map(s => s.trim()) : [];
    const list = document.getElementById('gmSplitPlayerList');
    list.innerHTML = pids.map(pid => {
      const p = players.find(pp => String(pp.id) === pid);
      const name = p ? p.name : 'Spieler ' + pid;
      return `<label class="split-player-item"><input type="checkbox" value="${pid}"> <span>${esc(name)}</span></label>`;
    }).join('');
    document.getElementById('gmSplitModal').style.display = 'flex';

    document.getElementById('gmSplitCancel').onclick = () => {
      document.getElementById('gmSplitModal').style.display = 'none';
    };
    document.getElementById('gmSplitModal').onclick = (e) => {
      if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    };
    document.getElementById('gmSplitConfirm').onclick = async () => {
      const checked = [...list.querySelectorAll('input:checked')].map(cb => cb.value);
      if (checked.length === 0) { alert('Wähle mindestens einen Spieler zum Abspalten.'); return; }
      document.getElementById('gmSplitModal').style.display = 'none';
      await fetch('/api/campaign/' + campaignId + '/game/map-group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'split', markerIds: [groupMarker.id], splitPlayerIds: checked })
      });
      await loadMapMarkers();
      if (mapCanvasMax) mapCanvasMax.clearSelection();
    };
  }

  // Undo (maximized toolbar)
  document.getElementById('gmUndoMax').addEventListener('click', doUndo);

  function renderMaxSidebar() {
    const markerList = document.getElementById('gmMaxMarkerList');
    const groupPanel = document.getElementById('gmMaxGroupPanel');
    if (!markerList || !groupPanel) return;

    // Marker list
    if (mapMarkers.length === 0) {
      markerList.innerHTML = '<div style="opacity:0.5;font-size:12px;padding:8px;">Keine Marker platziert.</div>';
    } else {
      markerList.innerHTML = mapMarkers.map(m => {
        const icon = m.icon || '📌';
        let label = m.label || m.type;
        if (m.type === 'player-group' && m.playerIds) {
          const pids = m.playerIds.split(',');
          const names = pids.map(pid => {
            const p = players.find(pp => String(pp.id) === pid.trim());
            return p ? p.name : pid;
          });
          label = 'Gruppe: ' + names.join(', ');
        } else if (m.type === 'player' && m.playerIds) {
          const p = players.find(pp => String(pp.id) === m.playerIds.trim());
          if (p) label = p.name;
        }
        return `<div class="map-marker-item" data-mid="${m.id}">
          <span class="map-marker-icon">${icon}</span>
          <span class="map-marker-label">${esc(label)}</span>
          <span class="map-marker-type">${m.type}</span>
        </div>`;
      }).join('');
      // Click to select on canvas
      markerList.querySelectorAll('.map-marker-item').forEach(item => {
        item.addEventListener('click', () => {
          if (mapCanvasMax) mapCanvasMax.selectMarker(item.dataset.mid);
          item.classList.toggle('selected');
        });
      });
    }

    // Group panel: list player-group markers
    const groups = mapMarkers.filter(m => m.type === 'player-group');
    if (groups.length === 0) {
      groupPanel.innerHTML = '<div style="opacity:0.5;font-size:12px;padding:8px;">Keine Gruppen.</div>';
    } else {
      groupPanel.innerHTML = groups.map(g => {
        const pids = g.playerIds ? g.playerIds.split(',') : [];
        const names = pids.map(pid => {
          const p = players.find(pp => String(pp.id) === pid.trim());
          return p ? p.name : 'Spieler ' + pid;
        });
        return `<div class="map-group-item">
          <div class="map-group-title">👥 Gruppe (${pids.length} Spieler)</div>
          <div class="map-group-members">${names.map(n => '<span class="map-group-member">' + esc(n) + '</span>').join('')}</div>
        </div>`;
      }).join('');
    }
  }

  // ===== SSE =====
  function connectSSE() {
    eventSource = new EventSource('/api/campaign/' + campaignId + '/sse');
    eventSource.addEventListener('turn', e => {
      const d = JSON.parse(e.data); const idx = players.findIndex(p => p.id === d.playerId);
      if (idx >= 0) { currentIndex = idx; renderPlayers(); }
    });
    eventSource.addEventListener('dice', e => {
      const d = JSON.parse(e.data);
      if (d.playerName !== 'Dungeon Master') {
        const chat = document.getElementById('gmChat');
        const div = document.createElement('div');
        div.innerHTML = '🎲 <strong>' + esc(d.playerName) + '</strong> würfelt ' + esc(d.diceType) + ': <strong>' + d.result + '</strong>';
        div.style.color = 'var(--accent-purple)';
        chat.appendChild(div); chat.scrollTop = chat.scrollHeight;
      }
    });
    eventSource.addEventListener('hp', e => {
      const d = JSON.parse(e.data); const p = players.find(x => x.id === d.playerId);
      if (p) { p.hp = d.currentHp; p.maxHp = d.maxHp; renderPlayers(); }
    });
    eventSource.addEventListener('decision', e => {
      const d = JSON.parse(e.data);
      if (!decisions.find(x => x.id === d.id)) { decisions.push(d); renderDecisions(); }
    });
    eventSource.addEventListener('vote', e => {
      const d = JSON.parse(e.data); const dec = decisions.find(x => x.id === d.decisionId);
      if (dec) { dec.yes = d.yes; dec.no = d.no; renderDecisions(); }
    });
    eventSource.addEventListener('decision_resolved', e => {
      const d = JSON.parse(e.data); const dec = decisions.find(x => x.id === d.decisionId);
      if (dec) { dec.status = 'RESOLVED'; dec.yes = d.yes; dec.no = d.no; dec.decisionMade = d.decisionMade; renderDecisions(); }
    });
    // Map marker SSE events
    eventSource.addEventListener('marker_add', e => {
      const m = JSON.parse(e.data);
      if (!mapMarkers.find(x => x.id === m.id)) { mapMarkers.push(m); syncMapCanvases(); }
    });
    eventSource.addEventListener('marker_move', e => {
      const d = JSON.parse(e.data);
      const m = mapMarkers.find(x => x.id === d.id);
      if (m) { m.x = d.x; m.y = d.y; syncMapCanvases(); }
    });
    eventSource.addEventListener('marker_remove', e => {
      const d = JSON.parse(e.data);
      mapMarkers = mapMarkers.filter(m => m.id !== d.id);
      syncMapCanvases();
    });
    eventSource.addEventListener('marker_group', e => {
      const d = JSON.parse(e.data);
      if (d.allMarkers) { mapMarkers = d.allMarkers; syncMapCanvases(); }
    });
    eventSource.addEventListener('player_active', e => {
      const d = JSON.parse(e.data);
      const p = players.find(x => x.id === d.playerId);
      if (p) { p.active = d.active; renderPlayers(); }
    });
    eventSource.addEventListener('undo', e => {
      const d = JSON.parse(e.data);
      if (d.allMarkers) { mapMarkers = d.allMarkers; syncMapCanvases(); }
    });
    eventSource.onerror = () => console.warn('SSE lost, reconnecting...');
  }

  // ===== LOAD PLAYERS =====
  async function loadPlayers() {
    try {
      // First fetch existing game state to restore HP, turn, and active status
      let gameStateData = null;
      try {
        const stateRes = await fetch('/api/campaign/' + campaignId + '/game/state', { cache: 'no-store' });
        if (stateRes.ok) gameStateData = await stateRes.json();
      } catch (e) {}

      const existingHp = gameStateData?.playerHp || {};
      const existingMaxHp = gameStateData?.playerMaxHp || {};
      const existingActive = gameStateData?.playerActive || {};
      const existingTurn = gameStateData?.currentTurnPlayerId;

      const cpRes = await fetch('/api/campaign-player/' + campaignId); const cps = await cpRes.json();
      const loaded = [];
      for (const cp of cps.filter(c => c.role === 'PLAYER')) {
        try {
          const pRes = await fetch('/api/player/id/' + cp.playerId);
          if (!pRes.ok) continue;
          const pd = await pRes.json();
          let hp = 10, maxHp = 10;
          if (cp.characterId) {
            try {
              const cRes = await fetch('/api/character/' + cp.characterId);
              if (cRes.ok) {
                const ch = await cRes.json();
                const conScore = ch.abilityScores?.find(a => a.abilityName?.toLowerCase() === 'constitution');
                const conMod = conScore ? Math.floor((conScore.score - 10) / 2) : 0;
                const lvl = ch.level || 1;
                maxHp = 10 + conMod + (lvl - 1) * (6 + conMod); if (maxHp < 1) maxHp = 1; hp = maxHp;
              }
            } catch (e) {}
          }

          // Restore from game state if available, otherwise use calculated defaults
          const pid = pd.id;
          const hasExisting = existingHp[String(pid)] !== undefined;
          const restoredHp = hasExisting ? existingHp[String(pid)] : hp;
          const restoredMaxHp = hasExisting ? existingMaxHp[String(pid)] : maxHp;
          const restoredActive = existingActive[String(pid)] !== undefined ? existingActive[String(pid)] : true;

          loaded.push({ id: pid, name: pd.username || pd.name || 'Unknown', characterId: cp.characterId, hp: restoredHp, maxHp: restoredMaxHp, active: restoredActive });
        } catch (e) {}
      }
      players = loaded;

      // Only init HP for players that don't have existing state
      for (const p of players) {
        if (existingHp[String(p.id)] === undefined) {
          await fetch('/api/campaign/' + campaignId + '/game/init-hp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: p.id, hp: p.hp, maxHp: p.maxHp }) });
        }
      }

      // Restore turn index from game state, or set first player
      if (existingTurn && existingTurn !== -1) {
        const idx = players.findIndex(p => p.id === existingTurn);
        if (idx >= 0) currentIndex = idx;
      } else if (players.length > 0) {
        await fetch('/api/campaign/' + campaignId + '/game/turn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: players[0].id, playerName: players[0].name }) });
      }
      renderPlayers();

      // Update player info in map canvases
      const playerList = players.map(p => ({ id: p.id, name: p.name }));
      if (mapCanvas) mapCanvas.setPlayers(playerList);
      if (mapCanvasMax) mapCanvasMax.setPlayers(playerList);

      // If no player markers exist yet, create a default group marker with all players
      if (players.length > 0 && mapMarkers.filter(m => m.type === 'player' || m.type === 'player-group').length === 0 && mapImageUrl) {
        const allPids = players.map(p => String(p.id)).join(',');
        // SSE marker_add event will add it to mapMarkers
        await fetch('/api/campaign/' + campaignId + '/game/map-marker', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'player-group', label: 'Gruppe', x: 0.5, y: 0.5, playerIds: allPids, icon: '👥' })
        });
      }
    } catch (e) { document.getElementById('gmPlayerList').innerHTML = '<div style="opacity:0.6">Failed to load players.</div>'; }
  }

  function renderPlayers() {
    const list = document.getElementById('gmPlayerList'); list.innerHTML = '';
    if (players.length === 0) { list.innerHTML = '<div style="opacity:0.6;padding:10px;">No players joined yet.</div>'; return; }
    players.forEach((p, i) => {
      const div = document.createElement('div');
      div.className = 'player' + (i === currentIndex ? ' active' : '');
      const pct = p.maxHp > 0 ? Math.round((p.hp / p.maxHp) * 100) : 0;
      let hpColor = 'var(--accent-green)'; if (pct <= 50) hpColor = 'var(--gold)'; if (pct <= 25) hpColor = 'var(--danger)';
      div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;">
        <span>${esc(p.name)}</span>
        <button class="purple-btn" style="padding:6px 10px;font-size:12px;">${p.active ? 'Aussetzen' : 'Aktivieren'}</button>
      </div>
      <div style="margin-top:8px;font-size:13px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span>❤️</span><span style="color:${hpColor};font-weight:700;">${p.hp} / ${p.maxHp}</span>
        <div style="display:flex;gap:4px;margin-left:auto;">
          <button class="hp-btn-gm damage" data-i="${i}" data-d="-1">−</button>
          <button class="hp-btn-gm damage" data-i="${i}" data-d="-5">-5</button>
          <button class="hp-btn-gm heal" data-i="${i}" data-d="5">+5</button>
          <button class="hp-btn-gm heal" data-i="${i}" data-d="1">+</button>
        </div>
      </div></div>
      ${i === currentIndex ? '<div style="margin-top:6px;"><button class="purple-btn next-turn-btn" style="width:100%;">Zug beenden</button></div>' : ''}`;

      div.querySelectorAll('.hp-btn-gm').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.i); const delta = parseInt(btn.dataset.d);
          players[idx].hp = Math.max(0, Math.min(players[idx].maxHp, players[idx].hp + delta));
          renderPlayers();
          await fetch('/api/campaign/' + campaignId + '/game/hp', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: players[idx].id, delta }) });
        });
      });

      const toggleBtn = div.querySelector('.purple-btn:not(.next-turn-btn)');
      toggleBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
        p.active = !p.active;
        // Persist active state to backend
        fetch('/api/campaign/' + campaignId + '/game/player-active', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: p.id, active: p.active }) });
        if (!players[currentIndex].active) nextTurn(); else renderPlayers();
      });

      const ntBtn = div.querySelector('.next-turn-btn');
      ntBtn?.addEventListener('click', (e) => { e.stopPropagation(); nextTurn(); });

      div.addEventListener('click', () => showCharModal(p));
      list.appendChild(div);
    });
  }

  async function nextTurn() {
    if (players.length === 0) return;
    let tries = 0;
    do { currentIndex = (currentIndex + 1) % players.length; tries++; } while (!players[currentIndex].active && tries < players.length);
    renderPlayers();
    const p = players[currentIndex];
    await fetch('/api/campaign/' + campaignId + '/game/turn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: p.id, playerName: p.name }) });
  }

  // Character Modal
  async function showCharModal(p) {
    const overlay = document.getElementById('gmCharOverlay');
    const content = document.getElementById('gmCharContent');
    if (!p.characterId) {
      content.innerHTML = '<h2>' + esc(p.name) + '</h2><div style="opacity:0.7;margin:16px 0;">No character submitted.</div><button class="close-btn" id="gmCharClose">Close</button>';
      overlay.classList.add('visible');
      document.getElementById('gmCharClose').onclick = () => overlay.classList.remove('visible');
      return;
    }
    content.innerHTML = '<div style="text-align:center;padding:30px;opacity:0.7;">Loading character...</div>';
    overlay.classList.add('visible');
    try {
      const r = await fetch('/api/character/' + p.characterId); const ch = await r.json();
      const abilIcons = { Strength: '💪', Dexterity: '🏹', Constitution: '🛡️', Intelligence: '🧠', Wisdom: '🔮', Charisma: '✨' };
      function gs(name) { const f = ch.abilityScores?.find(a => a.abilityName?.toLowerCase() === name.toLowerCase()); return f ? f.score : 10; }
      const statsHTML = Object.keys(abilIcons).map(name => {
        const s = gs(name); const m = calcMod(s);
        return '<div class="stat-box"><div class="stat-label">' + abilIcons[name] + ' ' + name.substring(0, 3).toUpperCase() + '</div><div class="stat-value">' + s + '</div><div class="stat-modifier">' + fmtMod(m) + '</div></div>';
      }).join('');
      content.innerHTML = '<h2>' + esc(ch.name || 'Unnamed') + '</h2><div class="char-meta">👤 ' + esc(p.name) + '<br>🏆 Level ' + (ch.level || 1) + '<br>🧬 ' + esc(ch.race || 'Unknown') + '<br>⚔️ ' + esc(ch.characterClass?.name || 'No Class') + '<br>📖 ' + esc(ch.background?.name || 'No Background') + '</div><div style="font-weight:600;margin-bottom:8px;">Ability Scores</div><div class="stats-grid">' + statsHTML + '</div><div style="font-weight:600;margin-bottom:6px;margin-top:10px;">Background Story</div><div class="info-box">' + esc(ch.info || 'No story yet...') + '</div><button class="close-btn" id="gmCharClose">Close</button>';
    } catch (e) { content.innerHTML = '<h2>' + esc(p.name) + '</h2><div style="opacity:0.7;">Failed to load.</div><button class="close-btn" id="gmCharClose">Close</button>'; }
    document.getElementById('gmCharClose').onclick = () => overlay.classList.remove('visible');
  }
  document.getElementById('gmCharOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('visible'); });

  // Dice
  document.getElementById('gmDiceChips').addEventListener('click', e => {
    const chip = e.target.closest('.dice-chip'); if (!chip) return;
    document.querySelectorAll('#gmDiceChips .dice-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected'); selectedDiceSides = parseInt(chip.dataset.sides);
    document.getElementById('gmDiceLabel').textContent = 'D' + selectedDiceSides;
  });

  function showFb(msg, color) {
    const fb = document.getElementById('gmDiceFb'); fb.textContent = msg; fb.style.color = color; fb.style.opacity = '1';
    setTimeout(() => { fb.style.opacity = '0'; }, 3000);
  }

  document.getElementById('gmRollBtn').addEventListener('click', () => {
    const manIn = document.getElementById('gmManualInput');
    if (manIn.value.trim() !== '') { showFb('Manuelles Ergebnis aktiv', 'var(--gold)'); return; }
    const resultEl = document.getElementById('gmDiceResult');
    const rollBtn = document.getElementById('gmRollBtn');
    rollBtn.disabled = true;
    let ticks = 0;
    const iv = setInterval(() => {
      resultEl.textContent = Math.floor(Math.random() * selectedDiceSides) + 1; ticks++;
      if (ticks >= 12) {
        clearInterval(iv); const f = Math.floor(Math.random() * selectedDiceSides) + 1;
        resultEl.textContent = f; resultEl.classList.remove('rolling'); void resultEl.offsetWidth; resultEl.classList.add('rolling');
        rollBtn.disabled = false;
        if (f === selectedDiceSides && selectedDiceSides === 20) showFb('🔥 Kritischer Treffer!', 'var(--accent-green)');
        else if (f === 1 && selectedDiceSides === 20) showFb('💀 Kritischer Fehlschlag!', 'var(--danger)');
        else showFb('🎲 Gewürfelt: ' + f, 'var(--accent-green)');
        fetch('/api/campaign/' + campaignId + '/game/dice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: null, playerName: 'Dungeon Master', diceType: 'd' + selectedDiceSides, result: f }) });
      }
    }, 55);
  });

  document.getElementById('gmManualSet').addEventListener('click', () => {
    const manIn = document.getElementById('gmManualInput');
    const val = parseInt(manIn.value);
    if (isNaN(val) || val < 1 || val > selectedDiceSides) { showFb('Ungültig (1-' + selectedDiceSides + ')', 'var(--danger)'); return; }
    const r = document.getElementById('gmDiceResult');
    r.textContent = val; r.classList.remove('rolling'); void r.offsetWidth; r.classList.add('rolling');
    showFb('✓ Manuell: ' + val, 'var(--accent-green)'); manIn.value = '';
    document.getElementById('gmRollBtn').disabled = false;
    fetch('/api/campaign/' + campaignId + '/game/dice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: null, playerName: 'Dungeon Master', diceType: 'd' + selectedDiceSides, result: val }) });
  });

  const manIn = document.getElementById('gmManualInput');
  manIn.addEventListener('input', () => { document.getElementById('gmRollBtn').disabled = manIn.value.trim() !== ''; });
  manIn.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('gmManualSet').click(); });

  // Decisions
  function updateCounter(inputId, counterId, max) {
    const len = document.getElementById(inputId).value.length;
    const c = document.getElementById(counterId);
    c.textContent = len + ' / ' + max;
    c.classList.remove('near-limit', 'at-limit');
    if (len >= max) c.classList.add('at-limit'); else if (len >= max * 0.8) c.classList.add('near-limit');
  }

  document.getElementById('gmNewDecBtn').addEventListener('click', () => {
    document.getElementById('gmDecTitle').value = ''; document.getElementById('gmDecText').value = '';
    updateCounter('gmDecTitle', 'gmTitleCnt', 60); updateCounter('gmDecText', 'gmTextCnt', 200);
    document.getElementById('gmDecModal').style.display = 'flex';
  });
  document.getElementById('gmDecCancel').addEventListener('click', () => { document.getElementById('gmDecModal').style.display = 'none'; });
  document.getElementById('gmDecModal').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.style.display = 'none'; });
  document.getElementById('gmDecTitle').addEventListener('input', () => updateCounter('gmDecTitle', 'gmTitleCnt', 60));
  document.getElementById('gmDecText').addEventListener('input', () => updateCounter('gmDecText', 'gmTextCnt', 200));

  document.getElementById('gmDecSave').addEventListener('click', async () => {
    const title = document.getElementById('gmDecTitle').value.trim();
    const text = document.getElementById('gmDecText').value.trim();
    if (!title || !text) return;
    document.getElementById('gmDecModal').style.display = 'none';
    await fetch('/api/campaign/' + campaignId + '/game/decision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: esc(title), text: esc(text) }) });
  });

  window._gmVote = async function(did, type) {
    const d = decisions.find(x => x.id === did); if (!d || d.status === 'RESOLVED') return;
    await fetch('/api/campaign/' + campaignId + '/game/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisionId: did, vote: type, playerName: 'Dungeon Master' }) });
  };

  function renderDecisions() {
    const c = document.getElementById('gmDecisionList');
    if (decisions.length === 0) { c.innerHTML = '<div class="decisions-empty"><div class="decisions-empty-icon">⚖️</div><div class="decisions-empty-text">Noch keine Entscheidungen.<br>Klicke <strong>+</strong>.</div></div>'; return; }
    c.innerHTML = decisions.slice().reverse().map(d => {
      const total = d.yes + d.no; const yP = total > 0 ? Math.round((d.yes / total) * 100) : 0; const nP = total > 0 ? 100 - yP : 0;
      const resolved = d.status === 'RESOLVED';
      return '<div class="decision-card" style="' + (resolved ? 'opacity:0.7;border-left:3px solid var(--accent-green);' : '') + '">' +
        '<h4>' + (d.title || '') + '</h4><div class="decision-desc">' + (d.text || '') + '</div>' +
        (total > 0 ? '<div class="vote-bar-container"><div class="vote-bar-labels"><span class="vote-yes">👍 ' + yP + '%</span><span class="vote-no">👎 ' + nP + '%</span></div><div class="vote-bar"><div class="vote-bar-yes" style="width:' + yP + '%"></div><div class="vote-bar-no" style="width:' + nP + '%"></div></div></div>' : '') +
        (resolved ? '<div style="text-align:center;padding:8px;font-weight:700;color:var(--accent-green);">Ergebnis: ' + (d.decisionMade || (d.yes >= d.no ? 'Ja' : 'Nein')) + '</div>'
          : '<div class="vote-buttons"><button class="vote-btn vote-btn-yes" onclick="window._gmVote(' + d.id + ',\'yes\')">👍 Ja (' + d.yes + ')</button><button class="vote-btn vote-btn-no" onclick="window._gmVote(' + d.id + ',\'no\')">👎 Nein (' + d.no + ')</button></div>') +
        '</div>';
    }).join('');
  }

  // Chat
  document.getElementById('gmChatSend').addEventListener('click', () => {
    const input = document.getElementById('gmChatInput'); const msg = input.value.trim(); if (!msg) return;
    const chat = document.getElementById('gmChat'); const div = document.createElement('div');
    div.innerHTML = '<strong>DM:</strong> ' + esc(msg); chat.appendChild(div); chat.scrollTop = chat.scrollHeight; input.value = '';
  });
  document.getElementById('gmChatInput').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('gmChatSend').click(); });

  // Load decisions
  async function loadDecisions() {
    try { const r = await fetch('/api/campaign/' + campaignId + '/game/decisions'); if (r.ok) { decisions = await r.json(); renderDecisions(); } } catch (e) {}
  }

  // Init – load markers BEFORE players so the "create default group" check works
  initMiniMap();
  connectSSE();
  await loadMapMarkers();
  await loadPlayers();
  loadDecisions();

  return () => {
    destroyHeader();
    if (eventSource) { eventSource.close(); eventSource = null; }
    if (mapCanvas) { mapCanvas.destroy(); mapCanvas = null; }
    if (mapCanvasMax) { mapCanvasMax.destroy(); mapCanvasMax = null; }
    delete window._gmVote;
    document.body.style.overflow = '';
  };
}

