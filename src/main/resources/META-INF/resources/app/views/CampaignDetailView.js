/**
 * Campaign Detail View – shows DM/Player/Not-Joined views
 */
import { requirePlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { esc, getActiveCampaignMap, getCampaignMaps, initials, playerLoginName, renderMapPicture } from '../services/utils.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { showMapCropModal } from '../components/mapCropModal.js';
import { showToast } from '../components/toast.js';
import { bindMaxPlayerCountValidation, readMaxPlayerCount } from '../services/campaignValidation.js';
import { connectCampaignEvents } from '../services/campaignEvents.js';

const MAX_CAMPAIGN_MAPS = 5;
const START_POLL_INTERVAL_MS = 10000;

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
  let dmInitialState = null;
  let disposed = false;
  let closeEvents = null;
  let startPollTimer = null;
  let reloadInFlight = null;
  let reloadQueued = false;

  const content = document.getElementById('cdContent');

  function setStatus(msg, isError = false) {
    showToast(msg, isError ? 'error' : 'success');
  }

  function showDeleteMapDialog(mapName = 'diese Karte') {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'dk-confirm-overlay';
      overlay.innerHTML = `
        <div class="dk-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="dkConfirmTitle">
          <div class="dk-confirm-title" id="dkConfirmTitle">Karte löschen?</div>
          <div class="dk-confirm-copy">Soll ${esc(mapName)} wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.</div>
          <div class="dk-confirm-actions">
            <button class="btn btn-secondary" type="button" id="dkConfirmCancel">Abbrechen</button>
            <button class="btn btn-danger" type="button" id="dkConfirmDelete">Löschen</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const close = (confirmed) => {
        document.removeEventListener('keydown', onKeydown);
        overlay.remove();
        resolve(confirmed);
      };

      overlay.querySelector('#dkConfirmCancel').addEventListener('click', () => close(false));
      overlay.querySelector('#dkConfirmDelete').addEventListener('click', () => close(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });
      const onKeydown = (e) => {
        if (e.key === 'Escape') {
          close(false);
        }
      };
      document.addEventListener('keydown', onKeydown);
      overlay.querySelector('#dkConfirmDelete').focus();
    });
  }

  function getDMName() {
    const dm = campaignPlayers.find(cp => cp.role === 'DM');
    return dm ? (playerNameMap[dm.playerId] || `Spieler ${dm.playerId}`) : 'Unbekannt';
  }

  function renderPreviewMap(mapImagePath, imgId = '') {
    return renderMapPicture(mapImagePath, {
      variant: 'preview',
      alt: 'Kampagnenkarte',
      imgId,
      pictureStyle: 'display:block;width:100%;',
      imgStyle: 'width:100%;max-height:300px;object-fit:cover;border-radius:12px;display:block;'
    });
  }

  function renderMapManager() {
    const maps = getCampaignMaps(campaign);
    const active = getActiveCampaignMap(campaign);
    const options = maps.map(m => `<option value="${m.index}" ${active && m.path === active.path ? 'selected' : ''}>${esc(m.name)}</option>`).join('');
    const mapList = maps.length === 0
      ? '<div style="font-size:12px;opacity:0.65;margin-top:8px;">Noch keine Karte hochgeladen.</div>'
      : `<div style="display:flex;gap:8px;align-items:center;margin:8px 0;">
          <select id="cdMapSelect" style="flex:1;">${options}</select>
          <button class="btn btn-danger" id="cdDeleteMap" type="button" style="padding:8px 12px;">Löschen</button>
        </div>`;
    const preview = active
      ? `<div class="map-section" style="margin-top:12px"><div id="cdMapMedia">${renderPreviewMap(active.path, 'cdMapImg')}</div></div>`
      : '<div class="map-section" style="display:none;margin-top:12px"><div id="cdMapMedia"></div></div>';
    return `
      <div class="form-group" id="cdMapManager"><label>Karten (${maps.length}/${MAX_CAMPAIGN_MAPS})</label>
        <div class="map-upload ${maps.length >= MAX_CAMPAIGN_MAPS ? 'disabled' : ''}" id="cdMapUploadArea" style="${maps.length >= MAX_CAMPAIGN_MAPS ? 'opacity:0.55;pointer-events:none;' : ''}">
          <span class="map-upload-icon">+</span><span class="map-upload-text">${maps.length >= MAX_CAMPAIGN_MAPS ? 'Maximal 5 Karten erreicht' : 'Karten hochladen'}</span>
          <input type="file" id="cdMapFile" accept=".jpg,.png,.svg" multiple style="display:none;" />
        </div>
        ${mapList}
        ${preview}
      </div>`;
  }

  function refreshMapManager() {
    const manager = document.getElementById('cdMapManager');
    if (!manager) return;
    manager.outerHTML = renderMapManager();
    bindMapManagerEvents();
    updateDmDirtyState();
  }

  function getMapSignature() {
    return getCampaignMaps(campaign).map(m => m.path).join('|') + '::' + (campaign?.selectedMapIndex || 0);
  }

  function getDmCurrentState() {
    return {
      name: document.getElementById('cdTitle')?.value.trim() || '',
      description: document.getElementById('cdDesc')?.value.trim() || '',
      story: document.getElementById('cdStory')?.value.trim() || '',
      isPublic,
      maxPlayerCount: document.getElementById('cdMaxPlayers')
        ? readMaxPlayerCount(document.getElementById('cdMaxPlayers')).value
        : null,
      maps: getMapSignature()
    };
  }

  function snapshotDmState() {
    dmInitialState = getDmCurrentState();
  }

  function updateDmDirtyState() {
    const btn = document.getElementById('cdUpdate');
    if (!btn || !dmInitialState) return;
    const current = getDmCurrentState();
    const isDirty = Object.keys(dmInitialState).some(key => current[key] !== dmInitialState[key]);
    btn.disabled = !isDirty;
    btn.classList.toggle('is-idle', !isDirty);
  }

  async function uploadMapFile(file, croppedBlob = null) {
    const fd = new FormData();
    fd.append('file', croppedBlob || file, croppedBlob ? 'map-cropped.png' : file.name);
    const uploadRes = await fetch('/api/campaign/' + id + '/upload-map', { method: 'POST', body: fd });
    if (!uploadRes.ok) throw new Error(await uploadRes.text() || 'Karten-Upload fehlgeschlagen');
    return uploadRes.json();
  }

  function bindMapManagerEvents() {
    const mapSelect = document.getElementById('cdMapSelect');
    if (mapSelect) {
      mapSelect.addEventListener('change', async () => {
        const res = await fetch('/api/campaign/' + id + '/selected-map', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedMapIndex: parseInt(mapSelect.value) })
        });
        if (res.ok) {
          campaign = await res.json();
          refreshMapManager();
        }
      });
    }

    const deleteMapBtn = document.getElementById('cdDeleteMap');
    if (deleteMapBtn) {
      deleteMapBtn.addEventListener('click', async () => {
        const selectedIndex = parseInt(document.getElementById('cdMapSelect').value);
        const selectedMap = getCampaignMaps(campaign).find(m => m.index === selectedIndex);
        if (!await showDeleteMapDialog(selectedMap?.name || 'diese Karte')) return;
        deleteMapBtn.disabled = true;
        const res = await fetch('/api/campaign/' + id + '/maps/' + selectedIndex, { method: 'DELETE' });
        if (res.ok) {
          campaign = await res.json();
          refreshMapManager();
        } else {
          deleteMapBtn.disabled = false;
          setStatus(await res.text() || 'Karte konnte nicht gelöscht werden', true);
        }
      });
    }

    const uploadArea = document.getElementById('cdMapUploadArea');
    const fileInput = document.getElementById('cdMapFile');
    if (!uploadArea || !fileInput) return;

    uploadArea.addEventListener('click', () => {
      if (getCampaignMaps(campaign).length >= MAX_CAMPAIGN_MAPS) {
        setStatus('Maximal 5 Karten pro Kampagne', true);
        return;
      }
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      if (getCampaignMaps(campaign).length + files.length > MAX_CAMPAIGN_MAPS) {
        setStatus('Maximal 5 Karten pro Kampagne', true);
        e.target.value = '';
        refreshMapManager();
        return;
      }

      for (let i = 0; i < files.length; i++) {
        try {
          const croppedBlob = i === 0 ? await showMapCropModal(files[i]) : null;
          campaign = await uploadMapFile(files[i], croppedBlob);
          refreshMapManager();
        } catch (err) {
          setStatus('Fehler: ' + (err.message || 'Karten-Upload fehlgeschlagen'), true);
        }
      }
      e.target.value = '';
    });
  }

  function renderPlayersCompact() {
    if (campaignPlayers.length === 0) return '<span class="empty-players">Noch keine Spieler beigetreten</span>';
    return campaignPlayers.map(cp => {
      const name = playerNameMap[cp.playerId] || `Spieler ${cp.playerId}`;
      const roleClass = cp.role === 'DM' ? 'role-dm' : 'role-player';
      return `<div class="player-compact">
        <span class="player-avatar">${initials(name)}</span>
        <span>${esc(name)}</span>
        <span class="player-role ${roleClass}">${cp.role === 'DM' ? 'DM' : 'Spieler'}</span>
      </div>`;
    }).join('');
  }

  /** Status of the player's own character; a rejected character can be corrected and submitted again. */
  function renderOwnCharacterStatus() {
    const ownCp = campaignPlayers.find(cp => cp.playerId === player.id);
    if (!ownCp) return '';
    if (ownCp.characterStatus === 'REJECTED' && ownCp.characterId) {
      return `<div class="status-message error show" style="margin-top:12px">
          <strong>Dein Charakter wurde abgelehnt.</strong>
          ${ownCp.dmNotes ? `<div style="white-space:pre-wrap;margin-top:6px">${esc(ownCp.dmNotes)}</div>` : ''}
          <button class="btn btn-primary" id="cdEditCharacter" style="margin-top:10px">Charakter überarbeiten</button>
        </div>`;
    }
    if (ownCp.characterStatus === 'PENDING') {
      return '<div class="status-message show" style="margin-top:12px">⏳ Dein Charakter wartet auf die Freigabe durch den DM.</div>';
    }
    if (!ownCp.characterId || ownCp.characterStatus === 'NONE') {
      return `<div class="status-message show" style="margin-top:12px">Du hast noch keinen Charakter eingereicht.
          <button class="btn btn-primary" id="cdSelectCharacter" style="margin-top:10px">Charakter auswählen</button></div>`;
    }
    return '';
  }

  // --- Not Joined View ---
  function renderNotJoinedView() {
    content.innerHTML = `
      <div class="preview">
        <div class="preview-title">${esc(campaign.name)}</div>
        ${campaign.isPublic ? '<span class="badge-public">Öffentlich</span>' : ''}
        <div class="preview-desc">${esc(campaign.description || 'Keine Beschreibung')}</div>
        <div class="preview-divider"></div>
        <div class="preview-info">
          <div class="preview-info-item"><strong>DM:</strong> <span>${esc(getDMName())}</span></div>
          <div class="preview-info-item"><strong>Spieler:</strong> <span>${campaignPlayers.filter(cp => cp.role === 'PLAYER').length}</span></div>
          <div class="preview-info-item"><strong>Max:</strong> <span>${campaign.maxPlayerCount ?? 'Unbegrenzt'}</span></div>
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
        ${campaign.isPublic ? '<span class="badge-public">Öffentlich</span>' : ''}
        <div class="your-role">Deine Rolle: <span class="player-role role-player">Spieler</span></div>
        ${renderOwnCharacterStatus()}
        <div class="preview-desc" style="margin-top:12px">${esc(campaign.description || 'Keine Beschreibung')}</div>
        <div class="preview-divider"></div>
        <div class="preview-info">
          <div class="preview-info-item"><strong>DM:</strong> <span>${esc(getDMName())}</span></div>
          <div class="preview-info-item"><strong>Spieler:</strong> <span>${campaignPlayers.filter(cp => cp.role === 'PLAYER').length}</span></div>
          <div class="preview-info-item"><strong>Max:</strong> <span>${campaign.maxPlayerCount ?? 'Unbegrenzt'}</span></div>
        </div>
        <div class="preview-divider"></div>
        <div class="players-title">Beigetretene Spieler</div>
        <div class="players-horizontal">${renderPlayersCompact()}</div>
        ${getActiveCampaignMap(campaign) ? `<div class="map-section" style="margin-top:16px"><div class="players-title" style="margin-bottom:10px">Kampagnenkarte</div>${renderPreviewMap(getActiveCampaignMap(campaign).path)}</div>` : ''}
      </div>
      <div class="footer">
        <button class="btn btn-secondary" id="cdBack">Abbrechen</button>
        <button class="btn btn-danger" id="cdLeave">Verlassen</button>
      </div>
    `;
    document.getElementById('cdBack').onclick = () => navigate('/campaigns');
    const ownCp = campaignPlayers.find(cp => cp.playerId === player.id);
    const editBtn = document.getElementById('cdEditCharacter');
    if (editBtn && ownCp?.characterId) {
      editBtn.onclick = () => navigate('/character/edit/' + ownCp.characterId + '?campaignId=' + id);
    }
    const selectBtn = document.getElementById('cdSelectCharacter');
    if (selectBtn) selectBtn.onclick = () => navigate('/campaign/' + id + '/select-character');
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
      <div class="form-group"><label>Max. Spieler</label><input type="number" id="cdMaxPlayers" min="1" step="1" value="${campaign.maxPlayerCount ?? ''}" aria-describedby="cdMaxPlayersError" style="max-width:150px;" /><div id="cdMaxPlayersError" role="alert" style="display:none;color:var(--danger);font-size:12px;margin-top:4px;"></div></div>
      <div class="switch-wrapper">
        <span class="switch-label-text">Sichtbarkeit</span>
        <div class="switch ${campaign.isPublic ? 'public' : 'private'}" id="cdSwitch">
          <div class="switch-thumb"></div>
          <div class="switch-option option-public">Öffentlich</div>
          <div class="switch-option option-private">Privat</div>
        </div>
      </div>
      ${renderMapManager()}
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
      updateDmDirtyState();
    };

    bindMapManagerEvents();
    const maxPlayersInput = document.getElementById('cdMaxPlayers');
    const validateMaxPlayers = bindMaxPlayerCountValidation(
      maxPlayersInput,
      document.getElementById('cdMaxPlayersError'),
      updateDmDirtyState
    );

    // Render players for DM
    const playersList = document.getElementById('cdPlayersList');
    campaignPlayers.forEach(cp => {
      const name = playerNameMap[cp.playerId] || `Spieler ${cp.playerId}`;
      const div = document.createElement('div');
      div.className = 'player' + (cp.role !== 'DM' && (cp.characterStatus === 'PENDING' || cp.characterStatus === 'REJECTED') ? ' clickable' : '');
      const roleClass = cp.role === 'DM' ? 'role-dm' : 'role-player';

      let statusBadge = '';
      if (cp.role !== 'DM') {
        if (cp.characterStatus === 'PENDING') statusBadge = '<span class="character-status status-pending">⏳ Ausstehend</span>';
        else if (cp.characterStatus === 'APPROVED') statusBadge = '<span class="character-status status-approved">✓ Freigegeben</span>';
        else if (cp.characterStatus === 'REJECTED') statusBadge = '<span class="character-status status-rejected">✗ Abgelehnt</span>';
        else statusBadge = '<span class="character-status status-none">Kein Charakter</span>';
      }

      div.innerHTML = `
        <div class="player-left">
          <span class="player-avatar">${initials(name)}</span>
          <span class="player-name">${esc(name)}</span>
          ${statusBadge}
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="player-role ${roleClass}">${cp.role === 'DM' ? 'DM' : 'Spieler'}</span>
          ${cp.role !== 'DM' ? `<button class="kick-btn" data-pid="${cp.playerId}">Entfernen</button>` : ''}
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
    ['cdTitle', 'cdDesc', 'cdStory', 'cdMaxPlayers'].forEach(inputId => {
      document.getElementById(inputId).addEventListener('input', updateDmDirtyState);
    });
    snapshotDmState();
    updateDmDirtyState();

    document.getElementById('cdUpdate').onclick = async () => {
      const btn = document.getElementById('cdUpdate');
      if (btn.disabled) return;
      const maxPlayers = validateMaxPlayers();
      if (!maxPlayers.valid) {
        setStatus(maxPlayers.message, true);
        maxPlayersInput.focus();
        return;
      }
      btn.disabled = true; btn.textContent = 'Aktualisiere...';
      try {
        const payload = {
          name: document.getElementById('cdTitle').value.trim(),
          description: document.getElementById('cdDesc').value.trim(),
          story: document.getElementById('cdStory').value.trim(),
          isPublic,
          maxPlayerCount: maxPlayers.value
        };
        const res = await fetch('/api/campaign/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || 'Speichern fehlgeschlagen');
        }
        campaign = await res.json();
        setStatus('Kampagne aktualisiert');
        btn.disabled = false; btn.textContent = 'Aktualisieren';
        renderDMView();
      } catch (err) { setStatus('Fehler: ' + err.message, true); btn.disabled = false; btn.textContent = 'Aktualisieren'; }
    };

    document.getElementById('cdDelete').onclick = async () => {
      if (!confirm('Kampagne wirklich löschen?')) return;
      const btn = document.getElementById('cdDelete');
      btn.disabled = true;
      try {
        const res = await fetch('/api/campaign/' + id, { method: 'DELETE' });
        if (!res.ok) throw new Error(await res.text() || 'Kampagne konnte nicht gelöscht werden');
        setStatus('Gelöscht');
        setTimeout(() => navigate('/campaigns'), 1500);
      } catch (err) {
        setStatus('Löschen fehlgeschlagen: ' + (err.message || ''), true);
        btn.disabled = false;
      }
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
          if (pRes.ok) { const p = await pRes.json(); playerNameMap[cp.playerId] = playerLoginName(p, `Spieler ${cp.playerId}`); }
        } catch (e) { playerNameMap[cp.playerId] = `Spieler ${cp.playerId}`; }
      }

      const roleRes = await fetch('/api/campaign-player/' + id + '/' + player.id + '/role', { cache: 'no-store' });
      let myCP = null;
      if (roleRes.ok) { myCP = await roleRes.json(); playerRole = myCP.role; }

      // Redirect to game UIs if campaign is started
      if (campaign.started) {
        if (playerRole === 'DM') { navigate('/campaign/' + id + '/gm'); return; }
        if (playerRole === 'PLAYER' && myCP && myCP.characterStatus === 'APPROVED') { navigate('/campaign/' + id + '/play'); return; }
      }

      if (disposed) return;
      if (playerRole === 'DM') renderDMView();
      else if (playerRole === 'PLAYER') { renderPlayerView(); watchForCampaignStart(); }
      else { stopLiveUpdates(); renderNotJoinedView(); }
    } catch (err) { setStatus('Fehler: ' + err.message, true); }
  }

  // Players waiting in the lobby must follow the DM into the game without reloading.
  function watchForCampaignStart() {
    if (disposed) return;
    if (!closeEvents) {
      closeEvents = connectCampaignEvents(id, {
        campaign_started: () => reloadLobby(),
        campaign_updated: () => reloadLobby(),
        roster_updated: () => reloadLobby(),
        campaign_deleted: () => {
          setStatus('Die Kampagne wurde gelöscht', true);
          navigate('/campaigns');
        }
      }, {
        // Catches a start that happened while the stream was (re)connecting.
        onConnected: ({ reconnect }) => { if (reconnect) return reloadLobby(); }
      });
    }
    // Fallback in case the event stream is blocked or drops an event.
    if (!startPollTimer) {
      startPollTimer = setInterval(pollCampaignStarted, START_POLL_INTERVAL_MS);
    }
  }

  async function pollCampaignStarted() {
    if (disposed || document.hidden) return;
    try {
      const res = await fetch('/api/campaign/' + id + '?playerId=' + player.id, { cache: 'no-store' });
      if (!res.ok) return;
      const latest = await res.json();
      if (latest.started) reloadLobby();
    } catch (e) {
      // Network hiccup; the next poll or SSE event will catch up.
    }
  }

  async function reloadLobby() {
    if (disposed) return;
    if (reloadInFlight) { reloadQueued = true; return reloadInFlight; }
    reloadInFlight = (async () => {
      try {
        do {
          reloadQueued = false;
          await loadCampaignData();
        } while (reloadQueued && !disposed);
      } finally {
        reloadInFlight = null;
      }
    })();
    return reloadInFlight;
  }

  function stopLiveUpdates() {
    if (startPollTimer) { clearInterval(startPollTimer); startPollTimer = null; }
    if (closeEvents) { closeEvents(); closeEvents = null; }
  }

  function stopWatching() {
    disposed = true;
    stopLiveUpdates();
  }

  loadCampaignData();

  return () => { stopWatching(); destroyHeader(); };
}
