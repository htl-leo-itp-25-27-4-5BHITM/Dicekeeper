/**
 * Table View – Read-only projected screen for the gaming table.
 * Shows: Player turn order + Map with fog of war around player positions.
 * Syncs in real-time with DM changes via SSE.
 */
import { requirePlayer } from '../services/auth.js';
import { esc, resolveMapUrl } from '../services/utils.js';
import { createMapCanvas } from '../components/mapCanvas.js';

export default async function TableView({ id }) {
  const player = requirePlayer();
  if (!player) return;
  const campaignId = id;

  const app = document.getElementById('app');
  // No header for table view – full-screen immersive layout
  document.body.classList.remove('has-header');
  document.body.classList.add('table-view-active');

  app.innerHTML = `
    <div class="table-view">
      <div class="table-sidebar">
        <div class="table-sidebar-header">
          <span class="table-sidebar-icon">⚔️</span>
          <h2 class="table-sidebar-title" id="tvCampaignName">Kampagne</h2>
        </div>
        <div class="table-turn-header">
          <span class="table-section-icon">🎯</span>
          <h3>Spieler Reihenfolge</h3>
        </div>
        <div class="table-player-list" id="tvPlayerList">
          <div class="table-loading"><span class="loading-spinner"></span> Lade Spieler…</div>
        </div>
        <div class="table-dice-display" id="tvDiceDisplay" style="display:none;">
          <div class="table-dice-header">
            <span class="table-section-icon">🎲</span>
            <h3>Letzter Wurf</h3>
          </div>
          <div class="table-dice-content" id="tvDiceContent"></div>
        </div>
      </div>
      <div class="table-map-area">
        <div class="table-map-container" id="tvMapBox">
          <div class="table-loading"><span class="loading-spinner"></span> Karte wird geladen…</div>
        </div>
      </div>
    </div>
  `;

  let campaign = null;
  let players = [];
  let currentTurnPlayerId = null;
  let mapCanvas = null;
  let mapImageUrl = '';
  let mapMarkers = [];
  let eventSource = null;

  // Load campaign
  try {
    const cr = await fetch('/api/campaign/' + campaignId + '?playerId=' + player.id, { cache: 'no-store' });
    if (cr.ok) {
      campaign = await cr.json();
      document.getElementById('tvCampaignName').textContent = campaign.name || 'Kampagne';
      if (campaign.mapImagePath) {
        mapImageUrl = resolveMapUrl(campaign.mapImagePath);
      }
    }
  } catch (e) {}

  // Load game state
  let gameStateData = null;
  try {
    const stateRes = await fetch('/api/campaign/' + campaignId + '/game/state', { cache: 'no-store' });
    if (stateRes.ok) gameStateData = await stateRes.json();
  } catch (e) {}

  const existingHp = gameStateData?.playerHp || {};
  const existingMaxHp = gameStateData?.playerMaxHp || {};
  const existingActive = gameStateData?.playerActive || {};
  const existingTurn = gameStateData?.currentTurnPlayerId;

  // Load players
  try {
    const cpRes = await fetch('/api/campaign-player/' + campaignId, { cache: 'no-store' });
    const cps = await cpRes.json();
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
              maxHp = 10 + conMod + (lvl - 1) * (6 + conMod);
              if (maxHp < 1) maxHp = 1;
              hp = maxHp;
            }
          } catch (e) {}
        }
        const pid = pd.id;
        const restoredHp = existingHp[String(pid)] !== undefined ? existingHp[String(pid)] : hp;
        const restoredMaxHp = existingMaxHp[String(pid)] !== undefined ? existingMaxHp[String(pid)] : maxHp;
        const restoredActive = existingActive[String(pid)] !== undefined ? existingActive[String(pid)] : true;
        players.push({
          id: pid,
          name: pd.username || pd.name || 'Unknown',
          characterId: cp.characterId,
          hp: restoredHp,
          maxHp: restoredMaxHp,
          active: restoredActive
        });
      } catch (e) {}
    }
  } catch (e) {}

  // Determine current turn
  if (existingTurn && existingTurn !== -1) {
    currentTurnPlayerId = existingTurn;
  } else if (players.length > 0) {
    currentTurnPlayerId = players[0].id;
  }

  // Load map markers
  try {
    const r = await fetch('/api/campaign/' + campaignId + '/game/map-markers', { cache: 'no-store' });
    if (r.ok) mapMarkers = await r.json();
  } catch (e) {}

  // Load fog exploration memory
  let fogExplorationData = null;
  try {
    const r = await fetch('/api/campaign/' + campaignId + '/game/fog-exploration', { cache: 'no-store' });
    if (r.ok) { const d = await r.json(); if (d.data) fogExplorationData = d.data; }
  } catch (e) {}

  // ===== RENDER FUNCTIONS =====

  function renderPlayers() {
    const list = document.getElementById('tvPlayerList');
    if (!list) return;
    if (players.length === 0) {
      list.innerHTML = '<div class="table-empty">Keine Spieler beigetreten.</div>';
      return;
    }
    list.innerHTML = players.map((p, i) => {
      const isActive = p.id === currentTurnPlayerId;
      const pct = p.maxHp > 0 ? Math.round((p.hp / p.maxHp) * 100) : 0;
      let hpColor = '#69f0ae';
      if (pct <= 50) hpColor = '#ffc107';
      if (pct <= 25) hpColor = '#ff5252';
      const inactive = !p.active;
      return `
        <div class="table-player-card ${isActive ? 'active-turn' : ''} ${inactive ? 'inactive' : ''}">
          <div class="table-player-order">${i + 1}</div>
          <div class="table-player-avatar">${isActive ? '⚔️' : '🧙'}</div>
          <div class="table-player-info">
            <div class="table-player-name">${esc(p.name)}</div>
            <div class="table-player-hp">
              <div class="table-hp-bar">
                <div class="table-hp-fill" style="width:${pct}%;background:${hpColor};"></div>
              </div>
              <span class="table-hp-text" style="color:${hpColor};">${p.hp}/${p.maxHp}</span>
            </div>
          </div>
          ${isActive ? '<div class="table-turn-indicator"><span class="table-turn-pulse"></span></div>' : ''}
        </div>
      `;
    }).join('');
  }

  function getPlayerMarkerPositions() {
    // Collect all player/player-group marker positions for fog of war
    const positions = [];
    for (const m of mapMarkers) {
      if (m.type === 'player' || m.type === 'player-group') {
        positions.push({ x: m.x, y: m.y });
      }
    }
    return positions;
  }

  function initMap() {
    const box = document.getElementById('tvMapBox');
    if (!mapImageUrl) {
      box.innerHTML = '<div class="table-no-map"><span>🗺️</span><p>Keine Karte verfügbar</p></div>';
      return;
    }
    mapCanvas = createMapCanvas(box, {
      mapImageUrl,
      markers: mapMarkers,
      readOnly: true,
      isMaximized: false,
      players: players.map(p => ({ id: p.id, name: p.name })),
      fogOfWar: true,
      fogSolid: true,
      fogPositions: getPlayerMarkerPositions(),
      initialExplorationData: fogExplorationData,
      gameStarted: true,
      onExplorationChange: (dataUrl) => {
        fetch('/api/campaign/' + campaignId + '/game/fog-exploration', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: dataUrl })
        }).catch(() => {});
      }
    });
  }

  function syncMap() {
    if (mapCanvas) {
      mapCanvas.updateMarkers(mapMarkers);
      if (mapCanvas.updateFog) {
        mapCanvas.updateFog(getPlayerMarkerPositions());
      }
    }
  }

  function showDiceRoll(playerName, diceType, result) {
    const display = document.getElementById('tvDiceDisplay');
    const content = document.getElementById('tvDiceContent');
    if (!display || !content) return;
    display.style.display = 'block';
    const isCrit = result === 20 && diceType === 'd20';
    const isFail = result === 1 && diceType === 'd20';
    content.innerHTML = `
      <div class="table-dice-roll ${isCrit ? 'crit' : ''} ${isFail ? 'fail' : ''}">
        <div class="table-dice-player">${esc(playerName)}</div>
        <div class="table-dice-type">${esc(diceType)}</div>
        <div class="table-dice-value">${result}</div>
        ${isCrit ? '<div class="table-dice-label crit">Kritischer Treffer! 🔥</div>' : ''}
        ${isFail ? '<div class="table-dice-label fail">Kritischer Fehlschlag! 💀</div>' : ''}
      </div>
    `;
    // Auto-hide after 8 seconds
    clearTimeout(showDiceRoll._timer);
    showDiceRoll._timer = setTimeout(() => {
      if (display) display.style.display = 'none';
    }, 8000);
  }

  // ===== SSE =====
  function connectSSE() {
    eventSource = new EventSource('/api/campaign/' + campaignId + '/sse');

    eventSource.addEventListener('turn', e => {
      const d = JSON.parse(e.data);
      currentTurnPlayerId = d.playerId;
      renderPlayers();
    });

    eventSource.addEventListener('hp', e => {
      const d = JSON.parse(e.data);
      const p = players.find(x => x.id === d.playerId);
      if (p) {
        p.hp = d.currentHp;
        p.maxHp = d.maxHp;
        renderPlayers();
      }
    });

    eventSource.addEventListener('dice', e => {
      const d = JSON.parse(e.data);
      showDiceRoll(d.playerName, d.diceType, d.result);
    });

    eventSource.addEventListener('player_active', e => {
      const d = JSON.parse(e.data);
      const p = players.find(x => x.id === d.playerId);
      if (p) {
        p.active = d.active;
        renderPlayers();
      }
    });

    // Map marker SSE events
    eventSource.addEventListener('marker_add', e => {
      const m = JSON.parse(e.data);
      if (!mapMarkers.find(x => x.id === m.id)) {
        mapMarkers.push(m);
        syncMap();
      }
    });

    eventSource.addEventListener('marker_move', e => {
      const d = JSON.parse(e.data);
      const m = mapMarkers.find(x => x.id === d.id);
      if (m) {
        m.x = d.x;
        m.y = d.y;
        syncMap();
      }
    });

    eventSource.addEventListener('marker_remove', e => {
      const d = JSON.parse(e.data);
      mapMarkers = mapMarkers.filter(m => m.id !== d.id);
      syncMap();
    });

    eventSource.addEventListener('marker_group', e => {
      const d = JSON.parse(e.data);
      if (d.allMarkers) {
        mapMarkers = d.allMarkers;
        syncMap();
      }
    });

    eventSource.onerror = () => console.warn('Table SSE lost, reconnecting...');
  }

  // ===== INIT =====
  renderPlayers();
  initMap();
  connectSSE();

  // Cleanup
  return () => {
    document.body.classList.remove('table-view-active');
    if (eventSource) { eventSource.close(); eventSource = null; }
    if (mapCanvas) { mapCanvas.destroy(); mapCanvas = null; }
  };
}


