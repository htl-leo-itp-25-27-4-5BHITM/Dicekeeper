/**
 * GM Cockpit View – management dashboard before game starts
 */
import { requirePlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { esc, initials, resolveMapUrl } from '../services/utils.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { createMapCanvas } from '../components/mapCanvas.js';

export default async function CockpitView({ id }) {
  const player = requirePlayer();
  if (!player) return;
  const campaignId = id;

  const app = document.getElementById('app');
  document.body.classList.add('has-header');

  app.innerHTML = renderHeader() + `
    <div class="cockpit-page">
      <div class="cockpit-layout" id="ckContent">
        <div class="ck-loading"><span class="loading-spinner"></span> Cockpit wird geladen…</div>
      </div>
    </div>
  `;
  initHeader();

  let campaign = null, campaignPlayers = [], playerNameMap = {};
  let ckMapCanvas = null;

  try {
    const cRes = await fetch('/api/campaign/' + campaignId + '?playerId=' + player.id, { cache: 'no-store' });
    campaign = await cRes.json();

    const cpRes = await fetch('/api/campaign-player/' + campaignId, { cache: 'no-store' });
    campaignPlayers = await cpRes.json();

    for (const cp of campaignPlayers) {
      try { const r = await fetch('/api/player/id/' + cp.playerId, { cache: 'no-store' }); if (r.ok) { const p = await r.json(); playerNameMap[cp.playerId] = p.name || p.username || 'Player ' + cp.playerId; } } catch(e) {}
    }

    const content = document.getElementById('ckContent');
    const allApproved = campaignPlayers.filter(cp => cp.role === 'PLAYER').every(cp => cp.characterStatus === 'APPROVED');
    const playerCount = campaignPlayers.filter(cp => cp.role === 'PLAYER').length;
    const canStart = allApproved && playerCount > 0;

    content.innerHTML = `
      <div class="ck-hero">
        <div class="ck-hero-bg"></div>
        <div class="ck-hero-content">
          <div class="ck-hero-top">
            <button class="ck-back-btn" id="ckBack">← Zurück</button>
            <div class="ck-hero-badges">
              <span class="ck-badge ck-badge-role">🎲 Spielleiter</span>
              ${campaign.isPublic ? '<span class="ck-badge ck-badge-public">🌍 Öffentlich</span>' : '<span class="ck-badge ck-badge-private">🔒 Privat</span>'}
            </div>
          </div>
          <h1 class="ck-title">${esc(campaign.name)}</h1>
          <p class="ck-desc">${esc(campaign.description || 'Keine Beschreibung vorhanden.')}</p>
          <div class="ck-stats-row">
            <div class="ck-stat"><span class="ck-stat-value">${playerCount}</span><span class="ck-stat-label">Spieler</span></div>
            <div class="ck-stat"><span class="ck-stat-value">${campaign.maxPlayerCount || '∞'}</span><span class="ck-stat-label">Max</span></div>
            <div class="ck-stat"><span class="ck-stat-value">${canStart ? '✓' : '⏳'}</span><span class="ck-stat-label">Status</span></div>
          </div>
          <div class="ck-hero-actions">
            <button class="ck-btn ck-btn-edit" id="ckEdit">✏️ Bearbeiten</button>
            <button class="ck-btn ck-btn-edit" id="ckTableView" title="Tischansicht in neuem Tab öffnen">📺 Tischansicht</button>
            <button class="ck-btn ck-btn-start" id="ckStartGame" ${!canStart ? 'disabled' : ''}>
              <span class="ck-btn-icon">⚔️</span> Kampagne starten
            </button>
          </div>
        </div>
      </div>

      <div class="ck-grid">
        <div class="ck-card ck-story-card">
          <div class="ck-card-header">
            <span class="ck-card-icon">📖</span>
            <h3>Story & Hintergrund</h3>
          </div>
          <div class="ck-story-content">${esc(campaign.story || 'Noch keine Story hinterlegt. Bearbeite die Kampagne, um eine Geschichte hinzuzufügen.')}</div>
        </div>

        <div class="ck-card ck-players-card">
          <div class="ck-card-header">
            <span class="ck-card-icon">👥</span>
            <h3>Spieler <span class="ck-player-count">${playerCount}</span></h3>
          </div>
          ${!canStart && playerCount > 0 ? '<div class="ck-warning">⚠️ Alle Charaktere müssen genehmigt werden, bevor das Spiel gestartet werden kann.</div>' : ''}
          ${playerCount === 0 ? '<div class="ck-empty">Noch keine Spieler beigetreten. Teile den Kampagnenlink!</div>' : ''}
          <div class="ck-player-list" id="ckPlayers"></div>
        </div>

        <div class="ck-card ck-map-card">
          <div class="ck-card-header">
            <span class="ck-card-icon">🗺️</span>
            <h3>Karte</h3>
            <div class="ck-map-tools">
              <button class="ck-map-btn" id="ckMapZoomIn" title="Zoom +">🔍+</button>
              <button class="ck-map-btn" id="ckMapZoomOut" title="Zoom −">🔍−</button>
              <button class="ck-map-btn" id="ckMapReset" title="Reset">↺</button>
              <button class="ck-map-btn ck-map-add" id="ckMapAddPoint" title="Punkt hinzufügen">+ Punkt</button>
            </div>
          </div>
          <div class="ck-map-box" id="ckMapBox">
            ${campaign.mapImagePath ? '' : '<div class="ck-empty" style="padding:40px;">Keine Karte hochgeladen. Bearbeite die Kampagne, um eine Karte hinzuzufügen.</div>'}
          </div>
          <div class="ck-map-marker-list" id="ckMarkerList"></div>
        </div>
      </div>

      <div id="ckAddPointModal" class="modal">
        <div class="modal-content decision-modal">
          <div class="decision-modal-header"><span>📍</span><h3>Punkt hinzufügen</h3></div>
          <label class="modal-label">Typ</label>
          <select id="ckPointType" style="width:100%;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.08);color:white;border:1px solid rgba(255,255,255,0.15);margin-bottom:12px;">
            <option value="structure">🏠 Gebäude</option>
            <option value="quest">❗ Quest</option>
            <option value="checkpoint">🚩 Checkpoint</option>
          </select>
          <label class="modal-label">Name</label>
          <input type="text" id="ckPointLabel" placeholder="z.B. Taverne" maxlength="40" style="width:100%;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.08);color:white;border:1px solid rgba(255,255,255,0.15);margin-bottom:12px;">
          <div class="decision-modal-actions">
            <button class="modal-cancel-btn" id="ckPointCancel">Abbrechen</button>
            <button class="modal-save-btn" id="ckPointSave">✓ Hinzufügen</button>
          </div>
        </div>
      </div>
    `;

    // Render players
    const playersList = document.getElementById('ckPlayers');
    campaignPlayers.forEach(cp => {
      const name = playerNameMap[cp.playerId] || 'Player ' + cp.playerId;
      const isDM = cp.role === 'DM';
      const isClickable = !isDM && (cp.characterStatus === 'PENDING' || cp.characterStatus === 'REJECTED');

      let statusHTML = '';
      if (!isDM) {
        const statusMap = {
          'PENDING': { cls: 'ck-status-pending', text: '⏳ Ausstehend' },
          'APPROVED': { cls: 'ck-status-approved', text: '✓ Genehmigt' },
          'REJECTED': { cls: 'ck-status-rejected', text: '✕ Abgelehnt' },
        };
        const s = statusMap[cp.characterStatus] || { cls: 'ck-status-none', text: 'Kein Charakter' };
        statusHTML = `<span class="ck-char-status ${s.cls}">${s.text}</span>`;
      }

      const div = document.createElement('div');
      div.className = 'ck-player-item' + (isClickable ? ' clickable' : '');

      div.innerHTML = `
        <div class="ck-player-avatar${isDM ? ' dm' : ''}">${isDM ? '👑' : initials(name)}</div>
        <div class="ck-player-info">
          <div class="ck-player-name">${esc(name)}</div>
          <div class="ck-player-role-line">
            <span class="ck-role-tag ${isDM ? 'dm' : 'player'}">${cp.role}</span>
            ${statusHTML}
          </div>
        </div>
        ${!isDM ? `<button class="ck-kick-btn" data-pid="${cp.playerId}" title="Spieler entfernen">✕</button>` : ''}
      `;

      if (isClickable) {
        div.addEventListener('click', (e) => {
          if (e.target.closest('.ck-kick-btn')) return;
          navigate('/campaign/' + campaignId + '/review/' + cp.id);
        });
      }

      if (!isDM) {
        const kickBtn = div.querySelector('.ck-kick-btn');
        if (kickBtn) {
          kickBtn.onclick = async (e) => {
            e.stopPropagation();
            kickBtn.disabled = true;
            await fetch('/api/campaign-player/' + campaignId + '/leave/' + kickBtn.dataset.pid, { method: 'DELETE' });
            showToast('Spieler entfernt');
            navigate('/campaign/' + campaignId + '/cockpit');
          };
        }
      }

      playersList.appendChild(div);
    });

    document.getElementById('ckBack').addEventListener('click', () => navigate('/campaign/' + campaignId));
    document.getElementById('ckEdit').addEventListener('click', () => navigate('/campaign/' + campaignId));
    document.getElementById('ckTableView').addEventListener('click', () => {
      window.open('#/campaign/' + campaignId + '/table', '_blank');
    });

    document.getElementById('ckStartGame').addEventListener('click', async () => {
      const btn = document.getElementById('ckStartGame');
      btn.disabled = true; btn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px;margin-right:8px;"></span> Starte…';
      try {
        // Reset game state (clears fog exploration from any previous runs)
        await fetch('/api/campaign/' + campaignId + '/game/state', { method: 'DELETE' });
        await fetch('/api/campaign/' + campaignId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ started: true }) });
        showToast('Kampagne gestartet!');
        navigate('/campaign/' + campaignId + '/gm');
      } catch (e) {
        showToast('Fehler beim Starten', 'error');
        btn.disabled = false; btn.innerHTML = '<span class="ck-btn-icon">⚔️</span> Kampagne starten';
      }
    });

    // ===== MAP EDITING IN COCKPIT =====
    let ckMapMarkers = [];

    async function loadCkMarkers() {
      try {
        const r = await fetch('/api/campaign/' + campaignId + '/game/map-markers', { cache: 'no-store' });
        if (r.ok) ckMapMarkers = await r.json();
      } catch (e) {}
    }

    function renderCkMarkerList() {
      const list = document.getElementById('ckMarkerList');
      if (!list) return;
      if (ckMapMarkers.length === 0) {
        list.innerHTML = '<div class="ck-empty" style="padding:8px;font-size:12px;">Keine Punkte auf der Karte</div>';
        return;
      }
      const typeIcons = { 'player-group': '👥', player: '🧙', structure: '🏠', quest: '❗', checkpoint: '🚩' };
      list.innerHTML = ckMapMarkers.map(m => {
        const icon = typeIcons[m.type] || m.icon || '📌';
        return `<div class="ck-marker-item">
          <span class="ck-marker-icon">${icon}</span>
          <span class="ck-marker-label">${esc(m.label || m.type)}</span>
          <button class="ck-marker-del" data-mid="${m.id}" title="Entfernen">✕</button>
        </div>`;
      }).join('');
      list.querySelectorAll('.ck-marker-del').forEach(btn => {
        btn.addEventListener('click', async () => {
          await fetch('/api/campaign/' + campaignId + '/game/map-marker/' + btn.dataset.mid, { method: 'DELETE' });
          ckMapMarkers = ckMapMarkers.filter(m => m.id !== btn.dataset.mid);
          if (ckMapCanvas) ckMapCanvas.updateMarkers(ckMapMarkers);
          renderCkMarkerList();
          showToast('Punkt entfernt');
        });
      });
    }

    async function initCkMap() {
      if (!campaign.mapImagePath) return;
      await loadCkMarkers();
      const box = document.getElementById('ckMapBox');

      // Build player list for map
      const mapPlayers = campaignPlayers
        .filter(cp => cp.role === 'PLAYER')
        .map(cp => ({ id: cp.playerId, name: playerNameMap[cp.playerId] || 'Spieler ' + cp.playerId }));

      // If no player/player-group markers exist yet, auto-create a default group with all players
      if (mapPlayers.length > 0 && ckMapMarkers.filter(m => m.type === 'player' || m.type === 'player-group').length === 0) {
        const allPids = mapPlayers.map(p => String(p.id)).join(',');
        try {
          const res = await fetch('/api/campaign/' + campaignId + '/game/map-marker', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'player-group', label: 'Gruppe', x: 0.5, y: 0.5, playerIds: allPids, icon: '👥' })
          });
          if (res.ok) {
            const marker = await res.json();
            ckMapMarkers.push(marker);
          }
        } catch (e) {}
      }

      ckMapCanvas = createMapCanvas(box, {
        mapImageUrl: resolveMapUrl(campaign.mapImagePath, { width: 2048, height: 2048 }),
        markers: ckMapMarkers,
        readOnly: false,
        isMaximized: false,
        players: mapPlayers,
        fogOfWar: false,
        gameStarted: false,
        onMarkerMove: async (m) => {
          await fetch('/api/campaign/' + campaignId + '/game/map-marker', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: m.id, x: m.x, y: m.y })
          });
        }
      });

      renderCkMarkerList();

      document.getElementById('ckMapZoomIn').addEventListener('click', () => { if (ckMapCanvas) ckMapCanvas.setZoom(Math.min(5, ckMapCanvas.getZoom() + 0.3)); });
      document.getElementById('ckMapZoomOut').addEventListener('click', () => { if (ckMapCanvas) ckMapCanvas.setZoom(Math.max(0.5, ckMapCanvas.getZoom() - 0.3)); });
      document.getElementById('ckMapReset').addEventListener('click', () => { if (ckMapCanvas) ckMapCanvas.resetView(); });
    }

    // Add point modal
    document.getElementById('ckMapAddPoint').addEventListener('click', () => {
      document.getElementById('ckAddPointModal').style.display = 'flex';
      document.getElementById('ckPointLabel').value = '';
    });
    document.getElementById('ckPointCancel').addEventListener('click', () => {
      document.getElementById('ckAddPointModal').style.display = 'none';
    });
    document.getElementById('ckPointSave').addEventListener('click', async () => {
      const type = document.getElementById('ckPointType').value;
      const label = document.getElementById('ckPointLabel').value.trim();
      if (!label) { showToast('Name ist erforderlich', 'error'); return; }
      const icons = { structure: '🏠', quest: '❗', checkpoint: '🚩' };
      try {
        const res = await fetch('/api/campaign/' + campaignId + '/game/map-marker', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, label, x: 0.5, y: 0.5, icon: icons[type] || '📌' })
        });
        if (res.ok) {
          const marker = await res.json();
          ckMapMarkers.push(marker);
          if (ckMapCanvas) ckMapCanvas.updateMarkers(ckMapMarkers);
          renderCkMarkerList();
          showToast('Punkt hinzugefügt');
        }
      } catch (e) { showToast('Fehler', 'error'); }
      document.getElementById('ckAddPointModal').style.display = 'none';
    });

    initCkMap();

  } catch (err) {
    document.getElementById('ckContent').innerHTML = '<div style="text-align:center;padding:60px;color:#f97373;">Fehler: ' + esc(err.message) + '</div>';
  }

  return () => { destroyHeader(); if (ckMapCanvas) { ckMapCanvas.destroy(); ckMapCanvas = null; } };
}
