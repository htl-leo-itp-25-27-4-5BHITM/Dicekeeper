/**
 * Character Select View
 */
import { requirePlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { esc } from '../services/utils.js';
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
          <h1 class="card-title">Select Your Character</h1>
          <p class="card-subtitle">Choose a character to use in this campaign</p>
        </div>
        <div id="csStatus" style="display:none"></div>
        <div id="csContent"><div class="loading">Loading...</div></div>
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
    if (!campaignRes.ok) throw new Error('Failed to load campaign');
    const campaign = await campaignRes.json();

    let dmName = 'Unknown';
    if (campaign.playerId) {
      const dmRes = await fetch(`/api/player/id/${campaign.playerId}`, { cache: 'no-store' });
      if (dmRes.ok) { const dm = await dmRes.json(); dmName = dm.username || dm.name; }
    }

    const charsRes = await fetch('/api/character/all', { cache: 'no-store' });
    const characters = charsRes.ok ? await charsRes.json() : [];

    const content = document.getElementById('csContent');
    const charListHtml = characters.length > 0
      ? characters.map(c => `
        <div class="character-item" data-id="${c.id}">
          <div class="character-item-name">${esc(c.name) || 'Unnamed'}</div>
          <div class="character-item-meta">${esc(c.characterClass?.name || 'No class')} • Level ${c.level || 1}</div>
        </div>`).join('')
      : '<div class="empty-message">You don\'t have any characters yet.</div>';

    content.innerHTML = `
      <div class="campaign-info-box"><div class="campaign-name">${esc(campaign.name)}</div><div class="campaign-dm">DM: ${esc(dmName)}</div></div>
      <div class="section-title">Your Characters</div>
      <div class="character-list" id="charList">${charListHtml}</div>
      <div class="divider"><span>or</span></div>
      <button class="create-new-btn" id="createNewBtn">+ Create New Character</button>
      <div class="actions">
        <button class="btn btn-secondary" id="csCancelBtn">Cancel</button>
        <button class="btn btn-primary" id="csSubmitBtn" disabled>Submit Character</button>
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
      if (!selectedCharacterId) { showStatus('Please select a character.', true); return; }
      submitBtn.disabled = true; submitBtn.textContent = 'Submitting...';
      try {
        const res = await fetch(`/api/campaign-player/${campaignId}/${player.id}/submit-character`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId: parseInt(selectedCharacterId) })
        });
        if (!res.ok) throw new Error(await res.text() || 'Failed');
        showStatus('Character submitted for DM approval!', false);
        setTimeout(() => navigate('/campaign/' + campaignId), 1500);
      } catch (err) {
        showStatus('Error: ' + err.message, true);
        submitBtn.disabled = false; submitBtn.textContent = 'Submit Character';
      }
    });
  } catch (err) {
    showStatus('Error: ' + err.message, true);
  }

  return () => { destroyHeader(); };
}

