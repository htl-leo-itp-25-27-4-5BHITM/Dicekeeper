/**
 * Campaigns List View
 */
import { logout, requirePlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';

export default async function CampaignsView() {
  const player = requirePlayer();
  if (!player) return;

  const app = document.getElementById('app');
  document.body.classList.add('has-header');

  app.innerHTML = renderHeader() + `
    <div class="campaigns-page">
      <div class="container">
        <h1>Deine Kampagnen</h1>
        <div id="status" style="color:#98a2b3;text-align:center;margin-bottom:16px;font-size:0.9rem;"></div>
        <div class="top-bar">
          <button id="newBtn" class="add-btn" type="button" title="Neue Kampagne erstellen" aria-label="Neue Kampagne erstellen">+</button>
          <div style="display:flex;gap:8px;">
            <button id="classesBtn" class="logout-btn" type="button" title="Alle Klassen ansehen">📚 Klassen</button>
            <button id="backLogin" class="logout-btn">Abmelden</button>
          </div>
        </div>
        <div id="myCampaignsList"></div>
        <div class="divider"><span>Öffentlich</span></div>
        <div id="publicGamesList"></div>
      </div>
    </div>
  `;

  initHeader();

  const myCampaignsListEl = document.getElementById('myCampaignsList');
  const publicGamesListEl = document.getElementById('publicGamesList');
  const statusEl = document.getElementById('status');

  function setStatus(msg, isErr) {
    statusEl.textContent = '';
    if (msg && isErr) showToast(msg, 'error');
  }

  function createCampaignCard(campaign, campaignPlayerData = null, isDM = false) {
    const card = document.createElement('div');
    card.className = 'campaign';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'campaign-info';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'campaign-title';
    titleDiv.textContent = campaign.name || 'Unbenannte Kampagne';
    const metaDiv = document.createElement('div');
    metaDiv.className = 'campaign-meta';
    const maxPlayers = campaign.maxPlayerCount !== null && campaign.maxPlayerCount !== undefined
      ? `Max: ${campaign.maxPlayerCount} Spieler`
      : 'Unbegrenzt';
    metaDiv.textContent = campaign.description ? `${campaign.description.substring(0, 50)}${campaign.description.length > 50 ? '...' : ''} • ${maxPlayers}` : maxPlayers;
    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(metaDiv);
    card.appendChild(infoDiv);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'campaign-actions';

    if (campaign.isPublic) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'Öffentlich';
      actionsDiv.appendChild(badge);
    }

    if (isDM) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'campaign-delete-btn';
      deleteBtn.type = 'button';
      deleteBtn.title = 'Kampagne löschen';
      deleteBtn.setAttribute('aria-label', `Kampagne ${campaign.name || campaign.id} löschen`);
      deleteBtn.textContent = 'Löschen';
      deleteBtn.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (!confirm(`Kampagne "${campaign.name || 'Unbenannt'}" wirklich löschen?`)) return;

        deleteBtn.disabled = true;
        try {
          const res = await fetch('/api/campaign/' + encodeURIComponent(campaign.id), { method: 'DELETE' });
          if (!res.ok) throw new Error(await res.text() || 'Kampagne konnte nicht gelöscht werden');
          showToast('Kampagne gelöscht', 'success');
          load();
        } catch (err) {
          showToast('Löschen fehlgeschlagen: ' + (err.message || ''), 'error');
          deleteBtn.disabled = false;
        }
      });
      actionsDiv.appendChild(deleteBtn);
    }

    if (actionsDiv.children.length > 0) {
      card.appendChild(actionsDiv);
    }

    card.addEventListener('click', () => {
      if (isDM) {
        if (campaign.started) {
          navigate('/campaign/' + campaign.id + '/gm');
        } else {
          navigate('/campaign/' + campaign.id);
        }
      } else if (campaignPlayerData) {
        if (campaign.started && campaignPlayerData.characterStatus === 'APPROVED') {
          navigate('/campaign/' + campaign.id + '/play');
        } else if (campaignPlayerData.characterStatus === 'REJECTED' && campaignPlayerData.characterId) {
          // Correct the rejected character (shows the DM's notes) and submit it again.
          navigate('/character/edit/' + campaignPlayerData.characterId + '?campaignId=' + campaign.id);
        } else if (campaignPlayerData.characterStatus === 'PENDING' || campaignPlayerData.characterStatus === 'APPROVED') {
          navigate('/campaign/' + campaign.id);
        } else {
          navigate('/campaign/' + campaign.id + '/select-character');
        }
      } else {
        navigate('/campaign/' + campaign.id);
      }
    });

    return card;
  }

  let loading = false;
  let reloadQueued = false;
  async function load() {
    if (loading) { reloadQueued = true; return; }
    loading = true;
    try {
      await loadOnce();
    } finally {
      loading = false;
      if (reloadQueued && !disposed) { reloadQueued = false; load(); }
    }
  }

  async function loadOnce() {
    setStatus('Lade Kampagnen...');
    try {
      const myCampaignsRes = await fetch('/api/campaign/player/' + encodeURIComponent(player.id), { cache: 'no-store' });
      if (!myCampaignsRes.ok) { setStatus('Kampagnen konnten nicht geladen werden', true); return; }
      const myCampaigns = await myCampaignsRes.json();

      const publicRes = await fetch('/api/campaign/public/all', { cache: 'no-store' });
      let publicCampaigns = [];
      if (publicRes.ok) publicCampaigns = await publicRes.json();

      const playerCampaignsRes = await fetch('/api/campaign-player/player/' + encodeURIComponent(player.id), { cache: 'no-store' });
      const joinedCampaignMap = new Map();
      if (playerCampaignsRes.ok) {
        const playerCampaigns = await playerCampaignsRes.json();
        playerCampaigns.forEach(pc => { if (pc.role === 'PLAYER') joinedCampaignMap.set(pc.campaignId, pc); });
      }

      const joinedCampaigns = [];
      for (const campaignId of joinedCampaignMap.keys()) {
        try {
          const res = await fetch('/api/campaign/' + encodeURIComponent(campaignId), { cache: 'no-store' });
          if (res.ok) joinedCampaigns.push(await res.json());
        } catch (err) { /* skip */ }
      }

      const allMyCampaigns = [...myCampaigns, ...joinedCampaigns];
      const myCampaignIds = new Set(allMyCampaigns.map(c => c.id));
      const dmCampaignIds = new Set(myCampaigns.map(c => c.id));

      myCampaignsListEl.innerHTML = '';
      if (allMyCampaigns.length === 0) {
        myCampaignsListEl.innerHTML = '<div class="empty">Noch keine Kampagnen.</div>';
      } else {
        for (const c of allMyCampaigns) {
          const cpd = joinedCampaignMap.get(c.id) || null;
          myCampaignsListEl.appendChild(createCampaignCard(c, cpd, dmCampaignIds.has(c.id)));
        }
      }

      const filteredPublic = publicCampaigns.filter(c => !myCampaignIds.has(c.id));
      publicGamesListEl.innerHTML = '';
      if (filteredPublic.length === 0) {
        publicGamesListEl.innerHTML = '<div class="empty">Keine öffentlichen Kampagnen verfügbar.</div>';
      } else {
        for (const c of filteredPublic) {
          publicGamesListEl.appendChild(createCampaignCard(c));
        }
      }

      setStatus('');
    } catch (err) {
      setStatus('Kampagnen konnten nicht geladen werden: ' + (err.message || ''), true);
    }
  }

  document.getElementById('newBtn').addEventListener('click', () => navigate('/campaign/new'));
  document.getElementById('backLogin').addEventListener('click', logout);
  document.getElementById('classesBtn').addEventListener('click', () => navigate('/guide?section=classes'));

  // ===== Live updates (new / started / deleted campaigns appear without reload) =====
  let disposed = false;
  let lobbySource = null;
  let lobbyRetryTimer = null;
  let lobbyRetryDelay = 2000;
  let reloadTimer = null;
  let connectedOnce = false;

  function scheduleReload() {
    if (disposed) return;
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(load, 300);
  }

  function connectLobby() {
    if (disposed || typeof EventSource === 'undefined') return;
    lobbySource = new EventSource('/api/lobby/sse');
    lobbySource.addEventListener('connected', () => {
      lobbyRetryDelay = 2000;
      // After a reconnect we may have missed events
      if (connectedOnce) scheduleReload();
      connectedOnce = true;
    });
    lobbySource.addEventListener('lobby_changed', scheduleReload);
    lobbySource.onerror = () => {
      if (disposed) return;
      lobbySource?.close();
      lobbySource = null;
      clearTimeout(lobbyRetryTimer);
      lobbyRetryTimer = setTimeout(connectLobby, lobbyRetryDelay);
      lobbyRetryDelay = Math.min(lobbyRetryDelay * 2, 30000);
    };
  }

  // Fallback in case the live connection is blocked by a proxy
  const pollTimer = setInterval(() => { if (!document.hidden) load(); }, 30000);
  const onVisibility = () => { if (!document.hidden) scheduleReload(); };
  document.addEventListener('visibilitychange', onVisibility);

  load();
  connectLobby();

  return () => {
    disposed = true;
    clearInterval(pollTimer);
    clearTimeout(reloadTimer);
    clearTimeout(lobbyRetryTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    if (lobbySource) { lobbySource.close(); lobbySource = null; }
    destroyHeader();
  };
}
