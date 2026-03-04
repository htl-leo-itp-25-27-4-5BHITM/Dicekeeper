/**
 * Character Create View – multi-step wizard
 */
import { requirePlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { esc, calcMod, fmtMod } from '../services/utils.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';

export default async function CharacterCreateView() {
  const player = requirePlayer();
  if (!player) return;

  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const campaignId = params.get('campaignId');

  const app = document.getElementById('app');
  document.body.classList.add('has-header');

  app.innerHTML = renderHeader() + `
    <div class="character-create-page">
      <div class="container"><div class="card">
        <a href="#" class="back-link" id="ccBackLink">← Back</a>
        <div class="card-header">
          <h1 class="card-title">Create Character</h1>
          <p class="card-subtitle" id="ccStepTitle">Step 1: Basic Information</p>
        </div>
        <div class="steps"><div class="step active" data-step="1"></div><div class="step" data-step="2"></div><div class="step" data-step="3"></div><div class="step" data-step="4"></div></div>
        <div id="ccStatus" class="status-message"></div>
        <div id="ccStep1" class="step-content active">
          <div class="section">
            <div class="form-group"><label>Character Name</label><input type="text" id="ccCharName" placeholder="Name" maxlength="100"></div>
            <div class="form-group"><label>Race</label>
              <select id="ccRace"><option value="">Select a race...</option>
                <option>Human</option><option>Elf</option><option>Dwarf</option><option>Halfling</option>
                <option>Dragonborn</option><option>Gnome</option><option>Half-Elf</option><option>Half-Orc</option><option>Tiefling</option>
              </select></div>
            <div class="form-group"><label>Alignment</label>
              <select id="ccAlign"><option value="">Select alignment...</option>
                <option>Lawful Good</option><option>Neutral Good</option><option>Chaotic Good</option>
                <option>Lawful Neutral</option><option>True Neutral</option><option>Chaotic Neutral</option>
                <option>Lawful Evil</option><option>Neutral Evil</option><option>Chaotic Evil</option>
              </select></div>
          </div>
          <div class="nav-buttons"><button class="btn btn-secondary" id="ccCancel">Cancel</button><button class="btn btn-primary" id="ccNext1">Next: Choose Class</button></div>
        </div>
        <div id="ccStep2" class="step-content">
          <div class="section"><div class="section-title">Choose Your Class</div><div class="selection-grid" id="ccClassGrid"><div class="loading">Loading classes...</div></div></div>
          <div class="nav-buttons"><button class="btn btn-secondary" id="ccBack2">Back</button><button class="btn btn-primary" id="ccNext2" disabled>Next: Background</button></div>
        </div>
        <div id="ccStep3" class="step-content">
          <div class="section"><div class="section-title">Choose Your Background</div><div class="selection-grid" id="ccBgGrid"><div class="loading">Loading backgrounds...</div></div></div>
          <div class="form-group" style="margin-top:20px"><label>Backstory (Optional)</label><textarea id="ccBackstory" placeholder="Your character's backstory..."></textarea></div>
          <div class="nav-buttons"><button class="btn btn-secondary" id="ccBack3">Back</button><button class="btn btn-primary" id="ccNext3" disabled>Next: Ability Scores</button></div>
        </div>
        <div id="ccStep4" class="step-content">
          <div class="section"><div class="section-title">Assign Ability Scores</div>
            <div class="points-remaining"><div class="points-remaining-value" id="ccPoints">27</div><div class="points-remaining-label">Points Remaining</div></div>
            <div class="ability-grid" id="ccAbilityGrid"></div>
          </div>
          <div class="nav-buttons"><button class="btn btn-secondary" id="ccBack4">Back</button><button class="btn btn-success" id="ccCreateBtn">Create Character</button></div>
        </div>
        <div id="ccStep5" class="step-content">
          <div id="ccPreview"></div>
          <div class="status-message success show" style="text-align:center"><strong>Character Created!</strong><br>Your character is ready.</div>
          <div class="nav-buttons"><button class="btn btn-secondary" id="ccAnother">Create Another</button><button class="btn btn-success" id="ccDone">Done</button></div>
        </div>
      </div></div>
    </div>
  `;
  initHeader();

  const backLink = document.getElementById('ccBackLink');
  if (campaignId) {
    backLink.href = '#/campaign/' + campaignId + '/select-character';
    backLink.textContent = '← Back to Character Selection';
  } else {
    backLink.href = '#/campaigns';
  }

  let currentStep = 1;
  let characterId = null;
  let selectedClassId = null;
  let selectedBackgroundId = null;
  let classes = [];
  let backgrounds = [];
  let abilities = [];
  let abilityScores = {};
  const totalPoints = 27;
  const subtitles = ['Step 1: Basic Information', 'Step 2: Choose Your Class', 'Step 3: Choose Your Background', 'Step 4: Assign Ability Scores', 'Character Complete!'];

  function showStatus(msg, type = 'info') {
    const toastType = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
    showToast(msg, toastType);
  }
  function hideStatus() { /* noop – toasts auto-dismiss */ }

  function goToStep(step) {
    currentStep = step;
    document.querySelectorAll('.step').forEach((el, i) => {
      el.classList.remove('active', 'completed');
      if (i + 1 < step) el.classList.add('completed');
      else if (i + 1 === step) el.classList.add('active');
    });
    document.querySelectorAll('.step-content').forEach((el, i) => {
      el.classList.toggle('active', i + 1 === step);
    });
    document.getElementById('ccStepTitle').textContent = subtitles[step - 1] || '';
    hideStatus();
  }

  const costMap = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  function getUsed() { return Object.values(abilityScores).reduce((s, v) => s + (costMap[v] || 0), 0); }
  function getRemaining() { return totalPoints - getUsed(); }

  function renderAbilityGrid() {
    const grid = document.getElementById('ccAbilityGrid');
    grid.innerHTML = '';
    abilities.forEach(ab => {
      const score = abilityScores[ab.id] || 8;
      const mod = calcMod(score);
      const box = document.createElement('div');
      box.className = 'ability-box';
      box.innerHTML = `<div class="ability-label">${esc(ab.name.substring(0, 3).toUpperCase())}</div>
        <div class="ability-controls">
          <button class="ability-btn" data-id="${ab.id}" data-action="dec">−</button>
          <div class="ability-value">${score}</div>
          <button class="ability-btn" data-id="${ab.id}" data-action="inc">+</button>
        </div>
        <div class="ability-modifier">${fmtMod(mod)}</div>`;
      grid.appendChild(box);
    });
    grid.querySelectorAll('.ability-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const delta = btn.dataset.action === 'inc' ? 1 : -1;
        const cur = abilityScores[id] || 8;
        const nv = cur + delta;
        if (nv < 8 || nv > 15) return;
        const cost = (costMap[nv] || 0) - (costMap[cur] || 0);
        if (cost > getRemaining()) return;
        abilityScores[id] = nv;
        renderAbilityGrid();
      });
    });
    const el = document.getElementById('ccPoints');
    const rem = getRemaining();
    el.textContent = rem;
    el.style.color = rem < 0 ? '#ef5350' : '#81c784';
  }

  // Step 1
  document.getElementById('ccCancel').addEventListener('click', () => {
    if (campaignId) navigate('/campaign/' + campaignId + '/select-character');
    else navigate('/campaigns');
  });

  document.getElementById('ccNext1').addEventListener('click', async () => {
    const name = document.getElementById('ccCharName').value.trim();
    if (!name) { showStatus('Please enter a name', 'error'); return; }
    if (!characterId) {
      showStatus('Creating character...', 'info');
      try {
        const r = await fetch('/api/character/createInitialCharacter', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        if (!r.ok) throw new Error(await r.text());
        const c = await r.json();
        characterId = c.id;
        await fetch('/api/character/' + characterId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, level: 1, race: document.getElementById('ccRace').value || null, alignment: document.getElementById('ccAlign').value || null })
        });
      } catch (err) { showStatus('Error: ' + err.message, 'error'); return; }
    } else {
      try { await fetch('/api/character/' + characterId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, race: document.getElementById('ccRace').value || null, alignment: document.getElementById('ccAlign').value || null })
      }); } catch (e) { /* ignore */ }
    }
    goToStep(2);
    // Load classes
    const grid = document.getElementById('ccClassGrid');
    try {
      const r = await fetch('/api/classes'); classes = await r.json();
      grid.innerHTML = '';
      classes.forEach(cls => {
        const card = document.createElement('div');
        card.className = 'selection-card' + (selectedClassId === cls.id ? ' selected' : '');
        card.innerHTML = `<div class="selection-card-icon">⚔️</div><div class="selection-card-name">${esc(cls.name)}</div>
          <div class="selection-card-desc">${esc((cls.description || '').substring(0, 50))}${cls.description && cls.description.length > 50 ? '...' : ''}</div>`;
        card.addEventListener('click', () => {
          selectedClassId = cls.id;
          grid.querySelectorAll('.selection-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          document.getElementById('ccNext2').disabled = false;
        });
        grid.appendChild(card);
      });
    } catch (e) { grid.innerHTML = '<p style="opacity:0.7">Failed to load classes</p>'; }
  });

  // Step 2
  document.getElementById('ccBack2').addEventListener('click', () => goToStep(1));
  document.getElementById('ccNext2').addEventListener('click', async () => {
    if (!selectedClassId) { showStatus('Select a class', 'error'); return; }
    try { await fetch('/api/character/' + characterId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classId: selectedClassId }) }); } catch (e) {}
    goToStep(3);
    const grid = document.getElementById('ccBgGrid');
    try {
      const r = await fetch('/api/background/all'); backgrounds = await r.json();
      grid.innerHTML = '';
      backgrounds.forEach(bg => {
        const card = document.createElement('div');
        card.className = 'selection-card' + (selectedBackgroundId === bg.id ? ' selected' : '');
        card.innerHTML = `<div class="selection-card-icon">📜</div><div class="selection-card-name">${esc(bg.name)}</div>
          <div class="selection-card-desc">${esc((bg.description || '').substring(0, 50))}${bg.description && bg.description.length > 50 ? '...' : ''}</div>`;
        card.addEventListener('click', () => {
          selectedBackgroundId = bg.id;
          grid.querySelectorAll('.selection-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          document.getElementById('ccNext3').disabled = false;
        });
        grid.appendChild(card);
      });
      if (backgrounds.length === 0) document.getElementById('ccNext3').disabled = false;
    } catch (e) { grid.innerHTML = '<p style="opacity:0.7">No backgrounds</p>'; document.getElementById('ccNext3').disabled = false; }
  });

  // Step 3
  document.getElementById('ccBack3').addEventListener('click', () => goToStep(2));
  document.getElementById('ccNext3').addEventListener('click', async () => {
    try { await fetch('/api/character/' + characterId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backgroundId: selectedBackgroundId || null, info: document.getElementById('ccBackstory').value.trim() || null })
    }); } catch (e) {}
    goToStep(4);
    try {
      const r = await fetch('/api/ability/all'); abilities = await r.json();
      abilities.forEach(ab => { if (!abilityScores[ab.id]) abilityScores[ab.id] = 8; });
      renderAbilityGrid();
    } catch (e) { document.getElementById('ccAbilityGrid').innerHTML = '<p>Failed to load</p>'; }
  });

  // Step 4
  document.getElementById('ccBack4').addEventListener('click', () => goToStep(3));
  document.getElementById('ccCreateBtn').addEventListener('click', async () => {
    const btn = document.getElementById('ccCreateBtn');
    btn.disabled = true; btn.textContent = 'Creating...';
    showStatus('Saving...', 'info');
    try {
      for (const [abilityId, score] of Object.entries(abilityScores)) {
        await fetch(`/api/character-ability/${characterId}/${abilityId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score }) });
      }
      const charRes = await fetch('/api/character/' + characterId);
      const character = await charRes.json();
      const cn = classes.find(c => c.id === selectedClassId)?.name || 'Unknown';
      const ini = (character.name || 'C').substring(0, 2).toUpperCase();
      document.getElementById('ccPreview').innerHTML = `
        <div class="character-preview"><div class="preview-header">
          <div class="preview-avatar">${ini}</div>
          <div class="preview-info"><h3>${esc(character.name)}</h3><div class="preview-meta">Level 1 ${esc(character.race || '')} ${esc(cn)}</div></div>
        </div>
        <div class="preview-stats">${abilities.map(ab => `<div class="preview-stat"><div class="preview-stat-label">${ab.name.substring(0, 3).toUpperCase()}</div><div class="preview-stat-value">${abilityScores[ab.id] || 8}</div></div>`).join('')}</div>
        </div>`;
      goToStep(5);
    } catch (err) { showStatus('Error: ' + err.message, 'error'); btn.disabled = false; btn.textContent = 'Create Character'; }
  });

  // Step 5
  document.getElementById('ccAnother').addEventListener('click', () => {
    characterId = null; selectedClassId = null; selectedBackgroundId = null; abilityScores = {};
    document.getElementById('ccCharName').value = '';
    document.getElementById('ccRace').value = '';
    document.getElementById('ccAlign').value = '';
    document.getElementById('ccNext2').disabled = true;
    document.getElementById('ccNext3').disabled = true;
    goToStep(1);
  });
  document.getElementById('ccDone').addEventListener('click', () => {
    if (campaignId) navigate('/campaign/' + campaignId + '/select-character');
    else navigate('/campaigns');
  });

  return () => { destroyHeader(); };
}

