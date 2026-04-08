/**
 * Campaign Detail View – shows DM/Player/Not-Joined views
 */
import { requirePlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { esc, initials, resolveMapUrl } from '../services/utils.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { showMapCropModal } from '../components/mapCropModal.js';
import { showToast } from '../components/toast.js';

export default async function CampaignDetailView({ id }) {
  const player = requirePlayer();
  if (!player) return;

  const app = document.getElementById('app');
  document.body.classList.add('has-header');
  app.innerHTML = renderHeader() + `
    <div class="campaign-detail-page">
      <div class="card" id="cdCard">
        <div id="cdContent" style="text-align:center;padding:40px;opacity:0.7;">Lade...</div>
      </div>
    </div>
  `;
  initHeader();

  let campaign = null;
  let campaignPlayers = [];
  let playerNameMap = {};
  let playerRole = null;
  let isPublic = true;

  const content = document.getElementById('cdContent');

  function setStatus(msg, isError = false) {
    showToast(msg, isError ? 'error' : 'success');
  }

  function getDMName() {
    const dm = campaignPlayers.find(cp => cp.role === 'DM');
    return dm ? (playerNameMap[dm.playerId] || `Player ${dm.playerId}`) : 'Unbekannt';
  }

  function renderPlayersCompact() {
    if (campaignPlayers.length === 0) return '<span class="empty-players">Noch keine Spieler beigetreten</span>';
    return campaignPlayers.map(cp => {
      const name = playerNameMap[cp.playerId] || `Player ${cp.playerId}`;
      const roleClass = cp.role === 'DM' ? 'role-dm' : 'role-player';
      return `<div class="player-compact">
        <span class="player-avatar">${initials(name)}</span>
        <span>${esc(name)}</span>
        <span class="player-role ${roleClass}">${cp.role}</span>
      </div>`;
    }).join('');
  }

  // --- Not Joined View ---
  function renderNotJoinedView() {
    content.innerHTML = `
      <div class="preview">
        <div class="preview-title">${esc(campaign.name)}</div>
        ${campaign.isPublic ? '<span class="badge-public">Public</span>' : ''}
        <div class="preview-desc">${esc(campaign.description || 'Keine Beschreibung')}</div>
        <div class="preview-divider"></div>
        <div class="preview-info">
          <div class="preview-info-item"><strong>DM:</strong> <span>${esc(getDMName())}</span></div>
          <div class="preview-info-item"><strong>Spieler:</strong> <span>${campaignPlayers.filter(cp => cp.role === 'PLAYER').length}</span></div>
          <div class="preview-info-item"><strong>Max:</strong> <span>${campaign.maxPlayerCount || 'Unbegrenzt'}</span></div>
        </div>
        <div class="preview-divider"></div>
        <div class="players-title">Beigetretene Spieler</div>
        <div class="players-horizontal">${renderPlayersCompact()}</div>
      </div>
      <div class="footer">
        <button class="btn btn-secondary" id="cdBack">Zurück</button>
        <button class="btn btn-success" id="cdJoin">Beitreten</button>
      </div>
    `;
    document.getElementById('cdBack').onclick = () => navigate('/campaigns');
    document.getElementById('cdJoin').onclick = async () => {
      const btn = document.getElementById('cdJoin');
      btn.disabled = true; btn.textContent = 'Beitreten...';
      try {
        const res = await fetch('/api/campaign-player/' + id + '/join', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: player.id })
        });
        if (!res.ok) { setStatus(await res.text() || 'Fehler', true); btn.disabled = false; btn.textContent = 'Beitreten'; return; }
        setStatus('Beigetreten!');
        setTimeout(() => navigate('/campaign/' + id + '/select-character'), 1000);
      } catch (err) { setStatus('Fehler: ' + err.message, true); btn.disabled = false; btn.textContent = 'Beitreten'; }
    };
  }

  // --- Player View ---
  function renderPlayerView() {
    content.innerHTML = `
      <div class="preview">
        <div class="preview-title">${esc(campaign.name)}</div>
        ${campaign.isPublic ? '<span class="badge-public">Public</span>' : ''}
        <div class="your-role">Deine Rolle: <span class="player-role role-player">PLAYER</span></div>
        <div class="preview-desc" style="margin-top:12px">${esc(campaign.description || 'Keine Beschreibung')}</div>
        <div class="preview-divider"></div>
        <div class="preview-info">
          <div class="preview-info-item"><strong>DM:</strong> <span>${esc(getDMName())}</span></div>
          <div class="preview-info-item"><strong>Spieler:</strong> <span>${campaignPlayers.filter(cp => cp.role === 'PLAYER').length}</span></div>
          <div class="preview-info-item"><strong>Max:</strong> <span>${campaign.maxPlayerCount || 'Unbegrenzt'}</span></div>
        </div>
        <div class="preview-divider"></div>
        <div class="players-title">Beigetretene Spieler</div>
        <div class="players-horizontal">${renderPlayersCompact()}</div>
        ${campaign.mapImagePath ? `<div class="map-section" style="margin-top:16px"><div class="players-title" style="margin-bottom:10px">Kampagnenkarte</div><img src="${esc(resolveMapUrl(campaign.mapImagePath, { variant: 'preview' }))}" alt="Karten" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;" /></div>` : ''}
      </div>
      <div class="footer">
        <button class="btn btn-secondary" id="cdBack">Abbrechen</button>
        <button class="btn btn-danger" id="cdLeave">Verlassen</button>
      </div>
    `;
    document.getElementById('cdBack').onclick = () => navigate('/campaigns');
    document.getElementById('cdLeave').onclick = async () => {
      const btn = document.getElementById('cdLeave');
      btn.disabled = true;
      try {
        await fetch('/api/campaign-player/' + id + '/leave/' + player.id, { method: 'DELETE' });
        setStatus('Kampagne verlassen');
        setTimeout(() => navigate('/campaigns'), 1500);
      } catch (err) { setStatus('Fehler', true); btn.disabled = false; }
    };
  }

  // --- DM View ---
  function renderDMView() {
    content.innerHTML = `
      <div class="your-role" style="margin-bottom:16px;">Deine Rolle: <span class="player-role role-dm">DM</span></div>
      <div class="form-group"><label>Titel</label><input type="text" id="cdTitle" value="${esc(campaign.name || '')}" /></div>
      <div class="form-group"><label>Beschreibung</label><textarea id="cdDesc">${esc(campaign.description || '')}</textarea></div>
      <div class="form-group"><label>Story (nur für dich)</label><textarea id="cdStory" class="story">${esc(campaign.story || '')}</textarea><div style="font-size:11px;opacity:0.6;margin-top:4px;">🔒 Nur für den DM sichtbar</div></div>
      <div class="form-group"><label>Max. Spieler</label><input type="number" id="cdMaxPlayers" min="1" value="${campaign.maxPlayerCount || ''}" style="max-width:150px;" /></div>
      <div class="switch-wrapper">
        <span class="switch-label-text">Sichtbarkeit</span>
        <div class="switch ${campaign.isPublic ? 'public' : 'private'}" id="cdSwitch">
          <div class="switch-thumb"></div>
          <div class="switch-option option-public">Public</div>
          <div class="switch-option option-private">Private</div>
        </div>
      </div>
      <div class="form-group"><label>Karte</label>
        <div class="map-upload" id="cdMapUploadArea"><span class="map-upload-icon">+</span><span class="map-upload-text">Karte hochladen</span><input type="file" id="cdMapFile" accept=".jpg,.png,.svg" style="display:none;" /></div>
        ${campaign.mapImagePath ? `<div class="map-section" style="margin-top:12px"><img id="cdMapImg" src="${esc(resolveMapUrl(campaign.mapImagePath, { variant: 'preview' }))}" alt="Karten" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;" /></div>` : '<div class="map-section" style="display:none;margin-top:12px"><img id="cdMapImg" src="" alt="Karten" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;" /></div>'}
      </div>
      <div class="players-section"><div class="players-title">Beigetretene Spieler</div><div class="players" id="cdPlayersList"></div></div>
      <div class="footer">
        <button class="btn btn-secondary" id="cdCancel">Abbrechen</button>
        <button class="btn btn-danger" id="cdDelete">Löschen</button>
        <button class="btn btn-primary" id="cdCockpit">🎮 Cockpit</button>
        <button class="btn btn-primary" id="cdUpdate">Aktualisieren</button>
      </div>
    `;

    isPublic = campaign.isPublic || false;
    const switchEl = document.getElementById('cdSwitch');
    switchEl.onclick = () => {
      isPublic = !isPublic;
      switchEl.classList.toggle('public', isPublic);
      switchEl.classList.toggle('private', !isPublic);
    };

    document.getElementById('cdMapUploadArea').addEventListener('click', () => document.getElementById('cdMapFile').click());
    let cdCroppedBlob = null;
    document.getElementById('cdMapFile').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        cdCroppedBlob = await showMapCropModal(file);
        const url = URL.createObjectURL(cdCroppedBlob);
        const img = document.getElementById('cdMapImg');
        img.src = url;
        img.parentElement.style.display = 'block';
      } catch (err) {
        cdCroppedBlob = null;
      }
    });

    // Render players for DM
    const playersList = document.getElementById('cdPlayersList');
    campaignPlayers.forEach(cp => {
      const name = playerNameMap[cp.playerId] || `Player ${cp.playerId}`;
      const div = document.createElement('div');
      div.className = 'player' + (cp.role !== 'DM' && (cp.characterStatus === 'PENDING' || cp.characterStatus === 'REJECTED') ? ' clickable' : '');
      const roleClass = cp.role === 'DM' ? 'role-dm' : 'role-player';

      let statusBadge = '';
      if (cp.role !== 'DM') {
        if (cp.characterStatus === 'PENDING') statusBadge = '<span class="character-status status-pending">⏳ Pending</span>';
        else if (cp.characterStatus === 'APPROVED') statusBadge = '<span class="character-status status-approved">✓ Approved</span>';
        else if (cp.characterStatus === 'REJECTED') statusBadge = '<span class="character-status status-rejected">✗ Rejected</span>';
        else statusBadge = '<span class="character-status status-none">No Character</span>';
      }

      div.innerHTML = `
        <div class="player-left">
          <span class="player-avatar">${initials(name)}</span>
          <span class="player-name">${esc(name)}</span>
          ${statusBadge}
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="player-role ${roleClass}">${cp.role}</span>
          ${cp.role !== 'DM' ? `<button class="kick-btn" data-pid="${cp.playerId}">KICK</button>` : ''}
        </div>
      `;

      if (cp.role !== 'DM' && (cp.characterStatus === 'PENDING' || cp.characterStatus === 'REJECTED')) {
        div.addEventListener('click', (e) => {
          if (e.target.classList.contains('kick-btn')) return;
          navigate('/campaign/' + id + '/review/' + cp.id);
        });
      }

      if (cp.role !== 'DM') {
        const kickBtn = div.querySelector('.kick-btn');
        if (kickBtn) {
          kickBtn.onclick = async (e) => {
            e.stopPropagation();
            kickBtn.disabled = true;
            await fetch('/api/campaign-player/' + id + '/leave/' + kickBtn.dataset.pid, { method: 'DELETE' });
            setStatus('Spieler entfernt');
            loadCampaignData();
          };
        }
      }

      playersList.appendChild(div);
    });

    document.getElementById('cdCancel').onclick = () => navigate('/campaigns');
    document.getElementById('cdCockpit').onclick = () => navigate('/campaign/' + id + '/cockpit');

    document.getElementById('cdUpdate').onclick = async () => {
      const btn = document.getElementById('cdUpdate');
      btn.disabled = true; btn.textContent = 'Aktualisiere...';
      try {
        const payload = {
          name: document.getElementById('cdTitle').value.trim(),
          description: document.getElementById('cdDesc').value.trim(),
          story: document.getElementById('cdStory').value.trim(),
          isPublic,
          maxPlayerCount: document.getElementById('cdMaxPlayers').value ? parseInt(document.getElementById('cdMaxPlayers').value) : null
        };
        const res = await fetch('/api/campaign/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || 'Update failed');
        }
        campaign = await res.json();
        const mapFile = document.getElementById('cdMapFile');
        if (mapFile.files && mapFile.files.length > 0) {
          const fd = new FormData();
          if (cdCroppedBlob) {
            fd.append('file', cdCroppedBlob, 'map-cropped.png');
          } else {
            fd.append('file', mapFile.files[0]);
          }
          const uploadRes = await fetch('/api/campaign/' + id + '/upload-map', { method: 'POST', body: fd });
          if (uploadRes.ok) {
            campaign = await uploadRes.json();
          }
        }
        setStatus('Kampagne aktualisiert');
        btn.disabled = false; btn.textContent = 'Aktualisieren';
      } catch (err) { setStatus('Fehler: ' + err.message, true); btn.disabled = false; btn.textContent = 'Aktualisieren'; }
    };

    document.getElementById('cdDelete').onclick = async () => {
      if (!confirm('Kampagne wirklich löschen?')) return;
      await fetch('/api/campaign/' + id, { method: 'DELETE' });
      setStatus('Gelöscht');
      setTimeout(() => navigate('/campaigns'), 1500);
    };
  }

  async function loadCampaignData() {
    try {
      const campRes = await fetch('/api/campaign/' + id + '?playerId=' + player.id, { cache: 'no-store' });
      if (!campRes.ok) { setStatus('Kampagne nicht gefunden', true); return; }
      campaign = await campRes.json();

      const cpRes = await fetch('/api/campaign-player/' + id, { cache: 'no-store' });
      if (cpRes.ok) campaignPlayers = await cpRes.json();

      for (const cp of campaignPlayers) {
        try {
          const pRes = await fetch('/api/player/id/' + cp.playerId, { cache: 'no-store' });
          if (pRes.ok) { const p = await pRes.json(); playerNameMap[cp.playerId] = p.name || `Player ${cp.playerId}`; }
        } catch (e) { playerNameMap[cp.playerId] = `Player ${cp.playerId}`; }
      }

      const roleRes = await fetch('/api/campaign-player/' + id + '/' + player.id + '/role', { cache: 'no-store' });
      let myCP = null;
      if (roleRes.ok) { myCP = await roleRes.json(); playerRole = myCP.role; }

      // Redirect to game UIs if campaign is started
      if (campaign.started) {
        if (playerRole === 'DM') { navigate('/campaign/' + id + '/gm'); return; }
        if (playerRole === 'PLAYER' && myCP && myCP.characterStatus === 'APPROVED') { navigate('/campaign/' + id + '/play'); return; }
      }

      if (playerRole === 'DM') renderDMView();
      else if (playerRole === 'PLAYER') renderPlayerView();
      else renderNotJoinedView();
    } catch (err) { setStatus('Fehler: ' + err.message, true); }
  }

  loadCampaignData();

  return () => { destroyHeader(); };
}
