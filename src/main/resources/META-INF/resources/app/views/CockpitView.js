/**
 * GM Cockpit View – management dashboard before game starts
 */
import { requirePlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { esc, initials } from '../services/utils.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';

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

    document.getElementById('ckStartGame').addEventListener('click', async () => {
      const btn = document.getElementById('ckStartGame');
      btn.disabled = true; btn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px;margin-right:8px;"></span> Starte…';
      try {
        await fetch('/api/campaign/' + campaignId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ started: true }) });
        showToast('Kampagne gestartet!');
        navigate('/campaign/' + campaignId + '/gm');
      } catch (e) {
        showToast('Fehler beim Starten', 'error');
        btn.disabled = false; btn.innerHTML = '<span class="ck-btn-icon">⚔️</span> Kampagne starten';
      }
    });

  } catch (err) {
    document.getElementById('ckContent').innerHTML = '<div style="text-align:center;padding:60px;color:#f97373;">Fehler: ' + esc(err.message) + '</div>';
  }

  return () => { destroyHeader(); };
}
