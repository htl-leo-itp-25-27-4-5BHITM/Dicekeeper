/**
 * Character Select View
 */
import { requirePlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { esc, playerLoginName } from '../services/utils.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';

export default async function CharacterSelectView({ campaignId }) {
  const player = requirePlayer();
  if (!player) return;

  const app = document.getElementById('app');
  document.body.classList.add('has-header');

  app.innerHTML = renderHeader() + `
    <div class="character-select-page">
      <div class="container"><div class="card">
        <div class="card-header" style="text-align:center;">
          <h1 class="card-title">Charakter auswählen</h1>
          <p class="card-subtitle">Wähle einen Charakter für diese Kampagne</p>
        </div>
        <div id="csStatus" style="display:none"></div>
        <div id="csContent"><div class="loading">Wird geladen…</div></div>
      </div></div>
    </div>
  `;
  initHeader();

  let selectedCharacterId = null;

  function showStatus(msg, isError) {
    const el = document.getElementById('csStatus');
    el.className = 'status-message ' + (isError ? 'error' : 'success');
    el.textContent = msg;
    el.style.display = 'block';
  }

  try {
    const campaignRes = await fetch(`/api/campaign/${campaignId}`, { cache: 'no-store' });
    if (!campaignRes.ok) throw new Error('Kampagne konnte nicht geladen werden');
    const campaign = await campaignRes.json();

    let dmName = 'Unbekannt';
    if (campaign.playerId) {
      const dmRes = await fetch(`/api/player/id/${campaign.playerId}`, { cache: 'no-store' });
      if (dmRes.ok) { const dm = await dmRes.json(); dmName = playerLoginName(dm, 'Unbekannt'); }
    }

    const charsRes = await fetch('/api/character/all', { cache: 'no-store' });
    const characters = charsRes.ok ? await charsRes.json() : [];

    const content = document.getElementById('csContent');
    const charListHtml = characters.length > 0
      ? characters.map(c => `
        <div class="character-item" data-id="${c.id}">
          <div class="character-item-name">${esc(c.name) || 'Ohne Namen'}</div>
          <div class="character-item-meta">${esc(c.characterClass?.name || 'Keine Klasse')} • Stufe ${c.level || 1}</div>
        </div>`).join('')
      : '<div class="empty-message">Du hast noch keine Charaktere.</div>';

    content.innerHTML = `
      <div class="campaign-info-box"><div class="campaign-name">${esc(campaign.name)}</div><div class="campaign-dm">DM: ${esc(dmName)}</div></div>
      <div class="section-title">Deine Charaktere</div>
      <div class="character-list" id="charList">${charListHtml}</div>
      <div class="divider"><span>oder</span></div>
      <button class="create-new-btn" id="createNewBtn">+ Neuen Charakter erstellen</button>
      <div class="actions">
        <button class="btn btn-secondary" id="csCancelBtn">Abbrechen</button>
        <button class="btn btn-primary" id="csSubmitBtn" disabled>Charakter einreichen</button>
      </div>
    `;

    const charList = document.getElementById('charList');
    const submitBtn = document.getElementById('csSubmitBtn');

    charList.addEventListener('click', (e) => {
      const item = e.target.closest('.character-item');
      if (!item) return;
      charList.querySelectorAll('.character-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      selectedCharacterId = item.dataset.id;
      submitBtn.disabled = false;
    });

    document.getElementById('createNewBtn').addEventListener('click', () => {
      navigate('/character/create?campaignId=' + campaignId);
    });

    document.getElementById('csCancelBtn').addEventListener('click', () => navigate('/campaigns'));

    submitBtn.addEventListener('click', async () => {
      if (!selectedCharacterId) { showStatus('Bitte wähle einen Charakter.', true); return; }
      submitBtn.disabled = true; submitBtn.textContent = 'Wird eingereicht…';
      try {
        const res = await fetch(`/api/campaign-player/${campaignId}/${player.id}/submit-character`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId: parseInt(selectedCharacterId) })
        });
        if (!res.ok) throw new Error(await res.text() || 'Fehlgeschlagen');
        showStatus('Charakter wurde dem DM zur Freigabe vorgelegt!', false);
        setTimeout(() => navigate('/campaign/' + campaignId), 1500);
      } catch (err) {
        showStatus('Fehler: ' + err.message, true);
        submitBtn.disabled = false; submitBtn.textContent = 'Charakter einreichen';
      }
    });
  } catch (err) {
    showStatus('Fehler: ' + err.message, true);
  }

  return () => { destroyHeader(); };
}
