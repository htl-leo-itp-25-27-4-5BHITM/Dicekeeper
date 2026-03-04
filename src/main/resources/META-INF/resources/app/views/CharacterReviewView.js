/**
 * Character Review View – DM reviews submitted character
 */
import { requirePlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { esc, initials, calcMod, fmtMod } from '../services/utils.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';

export default async function CharacterReviewView({ id, cpId }) {
  const player = requirePlayer();
  if (!player) return;

  const app = document.getElementById('app');
  document.body.classList.add('has-header');

  app.innerHTML = renderHeader() + `
    <div class="character-review-page">
      <div class="container"><div class="card">
        <a href="#/campaign/${id}" class="back-link">← Back to Campaign</a>
        <div class="card-header"><h1 class="card-title">Character Review</h1><p class="card-subtitle">Review this player's submitted character</p></div>
        <div id="crStatus" style="display:none"></div>
        <div id="crContent"><div class="loading">Loading character details...</div></div>
      </div></div>
    </div>
  `;
  initHeader();

  function showStatus(msg, type = 'info') {
    const toastType = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
    showToast(msg, toastType);
  }

  try {
    const campRes = await fetch('/api/campaign/' + id, { cache: 'no-store' });
    if (!campRes.ok) throw new Error('Campaign not found');
    const campaign = await campRes.json();
    if (campaign.playerId !== player.id) { showStatus('Only the DM can review', 'error'); return; }

    const cpRes = await fetch('/api/campaign-player/' + id, { cache: 'no-store' });
    const cps = await cpRes.json();
    const cp = cps.find(c => String(c.id) === String(cpId));
    if (!cp) { showStatus('Campaign player not found', 'error'); return; }

    const pRes = await fetch('/api/player/id/' + cp.playerId, { cache: 'no-store' });
    const playerData = pRes.ok ? await pRes.json() : { name: 'Unknown' };

    let character = null;
    if (cp.characterId) {
      const cRes = await fetch('/api/character/' + cp.characterId, { cache: 'no-store' });
      if (cRes.ok) character = await cRes.json();
    }

    const content = document.getElementById('crContent');
    if (!character) {
      content.innerHTML = `<div style="text-align:center;padding:40px;">
        <div style="font-size:48px;">📝</div><h3>No Character Submitted</h3>
        <button class="btn btn-secondary" onclick="window.location.hash='#/campaign/${id}'">Back</button>
      </div>`;
      return;
    }

    const isPending = cp.characterStatus === 'PENDING';
    const abilities = [
      { key: 'Strength', label: 'STR' }, { key: 'Dexterity', label: 'DEX' }, { key: 'Constitution', label: 'CON' },
      { key: 'Intelligence', label: 'INT' }, { key: 'Wisdom', label: 'WIS' }, { key: 'Charisma', label: 'CHA' }
    ];

    function getScore(name) {
      const f = character.abilityScores?.find(a => a.abilityName?.toLowerCase() === name.toLowerCase());
      return f ? f.score : 10;
    }

    const statsHtml = abilities.map(a => {
      const v = getScore(a.key);
      return `<div class="stat-box"><div class="stat-label">${a.label}</div><div class="stat-value">${v}</div><div class="stat-modifier">${fmtMod(calcMod(v))}</div></div>`;
    }).join('');

    let avatarHtml = initials(playerData.name || playerData.username);
    if (playerData.profilePicture) avatarHtml = `<img src="${esc(playerData.profilePicture)}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;">`;

    content.innerHTML = `
      <div class="player-info">
        <div class="player-avatar" style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#6ee7b7,#34d399);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;color:#064e3b;overflow:hidden;">${avatarHtml}</div>
        <div style="flex:1;"><div style="font-size:16px;font-weight:600;">${esc(playerData.name || playerData.username)}</div><div style="font-size:13px;opacity:0.7;">${esc(playerData.email || '')}</div></div>
        <span class="character-status status-${cp.characterStatus === 'PENDING' ? 'pending' : cp.characterStatus === 'APPROVED' ? 'approved' : 'rejected'}">${cp.characterStatus}</span>
      </div>
      <div class="section" style="margin-top:20px">
        <div class="section-title">Character Information</div>
        <div style="background:rgba(0,0,0,0.2);padding:20px;border-radius:12px;">
          <div style="font-size:22px;font-weight:700;margin-bottom:6px;">${esc(character.name || 'Unnamed')}</div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:14px;opacity:0.85;">
            <span>📜 Level ${character.level || 1}</span>
            ${character.race ? `<span>🧬 ${esc(character.race)}</span>` : ''}
            <span>⚔️ ${esc(character.characterClass?.name || 'No Class')}</span>
            ${character.background?.name ? `<span>📖 ${esc(character.background.name)}</span>` : ''}
            ${character.alignment ? `<span>⚖️ ${esc(character.alignment)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="section" style="margin-top:16px"><div class="section-title">Ability Scores</div><div class="stats-grid">${statsHtml}</div></div>
      ${character.info ? `<div class="section"><div class="section-title">Background Story</div><div style="background:rgba(0,0,0,0.2);padding:16px;border-radius:12px;font-size:14px;line-height:1.5;white-space:pre-wrap;">${esc(character.info)}</div></div>` : ''}
      ${cp.dmNotes ? `<div style="background:rgba(244,67,54,0.15);border:1px solid rgba(244,67,54,0.3);border-radius:12px;padding:14px;margin-top:16px;"><div style="font-size:12px;text-transform:uppercase;color:#ef5350;margin-bottom:8px;">Previous DM Notes</div><div style="font-size:14px;white-space:pre-wrap;">${esc(cp.dmNotes)}</div></div>` : ''}
      ${isPending ? `
        <div style="margin-top:24px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.2);">
          <div class="section-title">DM Review</div>
          <textarea id="crNotes" placeholder="Add notes for the player..." style="width:100%;min-height:120px;background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.3);border-radius:12px;padding:14px;color:white;font-size:14px;resize:vertical;outline:none;"></textarea>
          <div class="actions" style="display:flex;gap:12px;margin-top:20px;">
            <button class="btn btn-danger" id="crReject" style="flex:1;padding:14px;border-radius:999px;font-weight:600;cursor:pointer;border:none;background:linear-gradient(135deg,#f44336,#c62828);color:white;">Reject & Request Changes</button>
            <button class="btn btn-success" id="crApprove" style="flex:1;padding:14px;border-radius:999px;font-weight:600;cursor:pointer;border:none;background:linear-gradient(135deg,#4caf50,#2e7d32);color:white;">Approve Character</button>
          </div>
        </div>
      ` : `<div style="text-align:center;padding:30px;margin-top:16px;">
        <div style="font-size:48px;">${cp.characterStatus === 'APPROVED' ? '✅' : '❌'}</div>
        <h3>Character ${cp.characterStatus === 'APPROVED' ? 'Approved' : 'Rejected'}</h3>
      </div>`}
    `;

    if (isPending) {
      document.getElementById('crApprove').addEventListener('click', async () => {
        const btn = document.getElementById('crApprove');
        btn.disabled = true; btn.textContent = 'Approving...';
        try {
          const r = await fetch(`/api/campaign-player/${id}/approve-character/${cpId}?dmPlayerId=${player.id}`, { method: 'POST' });
          if (!r.ok) throw new Error(await r.text());
          showStatus('Character approved!', 'success');
          setTimeout(() => navigate('/campaign/' + id), 2000);
        } catch (err) { showStatus('Failed: ' + err.message, 'error'); btn.disabled = false; btn.textContent = 'Approve Character'; }
      });

      document.getElementById('crReject').addEventListener('click', async () => {
        const notes = document.getElementById('crNotes').value.trim();
        if (!notes) { showStatus('Please add notes', 'error'); document.getElementById('crNotes').focus(); return; }
        const btn = document.getElementById('crReject');
        btn.disabled = true;
        try {
          const r = await fetch(`/api/campaign-player/${id}/reject-character/${cpId}?dmPlayerId=${player.id}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes })
          });
          if (!r.ok) throw new Error(await r.text());
          showStatus('Character rejected', 'success');
          setTimeout(() => navigate('/campaign/' + id), 2000);
        } catch (err) { showStatus('Failed: ' + err.message, 'error'); btn.disabled = false; }
      });
    }
  } catch (err) { showStatus('Failed: ' + err.message, 'error'); }

  return () => { destroyHeader(); };
}

