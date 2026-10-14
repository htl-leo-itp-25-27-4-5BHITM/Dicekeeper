/**
 * Character Create View – multi-step wizard
 */
import { requirePlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { esc, calcMod, fmtMod } from '../services/utils.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { clearSessionDraft, readSessionDraft, writeSessionDraft } from '../services/sessionDraft.js';

export default async function CharacterCreateView(routeParams = {}) {
  const player = requirePlayer();
  if (!player) return;

  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const campaignId = params.get('campaignId');
  // Edit mode: correct an existing (e.g. rejected) character instead of creating a new one.
  const editId = routeParams.id ? Number(routeParams.id) : null;
  const isEdit = Number.isFinite(editId) && editId > 0;
  const draftKey = isEdit
    ? 'dicekeeper:character-edit:draft:' + editId
    : 'dicekeeper:character-create:draft:' + (campaignId || 'standalone');

  const saveLabel = isEdit ? (campaignId ? 'Speichern & erneut einreichen' : 'Änderungen speichern') : 'Charakter erstellen';
  const app = document.getElementById('app');
  document.body.classList.add('has-header');

  app.innerHTML = renderHeader() + `
    <div class="character-create-page">
      <div class="container"><div class="card">
        <a href="#" class="back-link" id="ccBackLink">← Zurück</a>
        <div class="card-header">
          <h1 class="card-title">${isEdit ? 'Charakter bearbeiten' : 'Charakter erstellen'}</h1>
          <p class="card-subtitle" id="ccStepTitle">Schritt 1: Grunddaten</p>
        </div>
        <div id="ccDmNotes" hidden></div>
        <div class="steps"><div class="step active" data-step="1"></div><div class="step" data-step="2"></div><div class="step" data-step="3"></div><div class="step" data-step="4"></div></div>
        <div id="ccStatus" class="status-message"></div>
        <div id="ccStep1" class="step-content active">
          <div class="section">
            <div class="form-group"><label>Name des Charakters</label><input type="text" id="ccCharName" placeholder="Name" maxlength="100"></div>
            <div class="form-group"><label>Volk</label>
              <select id="ccRace"><option value="">Volk auswählen…</option>
                <option>Mensch</option><option>Elf</option><option>Zwerg</option><option>Halbling</option>
                <option>Drachenblütiger</option><option>Gnom</option><option>Halbelf</option><option>Halbork</option><option>Tiefling</option>
              </select></div>
            <div class="form-group"><label>Gesinnung</label>
              <select id="ccAlign"><option value="">Gesinnung auswählen…</option>
                <option>Rechtschaffen Gut</option><option>Neutral Gut</option><option>Chaotisch Gut</option>
                <option>Rechtschaffen Neutral</option><option>Neutral</option><option>Chaotisch Neutral</option>
                <option>Rechtschaffen Böse</option><option>Neutral Böse</option><option>Chaotisch Böse</option>
              </select></div>
          </div>
          <div class="nav-buttons"><button class="btn btn-secondary" id="ccCancel">Abbrechen</button><button class="btn btn-primary" id="ccNext1">Weiter: Klasse wählen</button></div>
        </div>
        <div id="ccStep2" class="step-content">
          <div class="section"><div class="section-title">Wähle deine Klasse</div><div class="selection-grid" id="ccClassGrid"><div class="loading">Klassen werden geladen…</div></div><div class="selection-details" id="ccClassDetails" hidden></div></div>
          <div class="nav-buttons"><button class="btn btn-secondary" id="ccBack2">Zurück</button><button class="btn btn-primary" id="ccNext2" disabled>Weiter: Hintergrund</button></div>
        </div>
        <div id="ccStep3" class="step-content">
          <div class="section"><div class="section-title">Wähle deinen Hintergrund</div><div class="selection-grid" id="ccBgGrid"><div class="loading">Hintergründe werden geladen…</div></div><div class="selection-details" id="ccBgDetails" hidden></div></div>
          <div class="form-group" style="margin-top:20px"><label>Vorgeschichte (optional)</label><textarea id="ccBackstory" placeholder="Die Vorgeschichte deines Charakters…"></textarea></div>
          <div class="nav-buttons"><button class="btn btn-secondary" id="ccBack3">Zurück</button><button class="btn btn-primary" id="ccNext3" disabled>Weiter: Attributswerte</button></div>
        </div>
        <div id="ccStep4" class="step-content">
          <div class="section"><div class="section-title">Attributswerte verteilen</div>
            <div class="points-remaining"><div class="points-remaining-value" id="ccPoints">27</div><div class="points-remaining-label">Verbleibende Punkte</div></div>
            <div class="ability-grid" id="ccAbilityGrid"></div>
          </div>
          <div class="nav-buttons"><button class="btn btn-secondary" id="ccBack4">Zurück</button><button class="btn btn-success" id="ccCreateBtn">${saveLabel}</button></div>
        </div>
        <div id="ccStep5" class="step-content">
          <div id="ccPreview"></div>
          <div class="status-message success show" style="text-align:center" id="ccDoneMessage"><strong>${isEdit ? 'Charakter gespeichert!' : 'Charakter erstellt!'}</strong><br>Dein Charakter ist bereit.</div>
          <div class="nav-buttons">${isEdit ? '' : '<button class="btn btn-secondary" id="ccAnother">Weiteren erstellen</button>'}<button class="btn btn-success" id="ccDone">Fertig</button></div>
        </div>
      </div></div>
    </div>
  `;
  initHeader();

  const backLink = document.getElementById('ccBackLink');
  if (campaignId) {
    backLink.href = '#/campaign/' + campaignId + '/select-character';
    backLink.textContent = '← Zurück zur Charakterauswahl';
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
  const subtitles = ['Schritt 1: Grunddaten', 'Schritt 2: Klasse wählen', 'Schritt 3: Hintergrund wählen', 'Schritt 4: Attributswerte verteilen', isEdit ? 'Charakter gespeichert!' : 'Charakter fertig!'];
  let isRestoringDraft = false;

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
    saveDraft();
  }

  function getDraftData() {
    return {
      currentStep,
      name: document.getElementById('ccCharName').value,
      race: document.getElementById('ccRace').value,
      alignment: document.getElementById('ccAlign').value,
      selectedClassId,
      selectedBackgroundId,
      backstory: document.getElementById('ccBackstory').value,
      abilityScores
    };
  }

  function saveDraft() {
    if (isRestoringDraft) return;
    if (currentStep > 4) return;
    writeSessionDraft(draftKey, getDraftData());
  }

  function clearDraft() {
    clearSessionDraft(draftKey);
  }

  function applyDraft(draft) {
    if (!draft || typeof draft !== 'object') return 1;
    isRestoringDraft = true;
    document.getElementById('ccCharName').value = draft.name || '';
    selectValue('ccRace', draft.race);
    selectValue('ccAlign', draft.alignment);
    document.getElementById('ccBackstory').value = draft.backstory || '';
    selectedClassId = draft.selectedClassId ? Number(draft.selectedClassId) : null;
    selectedBackgroundId = draft.selectedBackgroundId ? Number(draft.selectedBackgroundId) : null;
    abilityScores = draft.abilityScores && typeof draft.abilityScores === 'object' ? { ...draft.abilityScores } : {};
    isRestoringDraft = false;
    return Math.max(1, Math.min(4, Number(draft.currentStep) || 1));
  }

  const ABILITY_ABBR = { strength: 'STÄ', dexterity: 'GES', constitution: 'KON', intelligence: 'INT', wisdom: 'WEI', charisma: 'CHA' };
  function abilityAbbr(name) {
    return ABILITY_ABBR[String(name || '').toLowerCase()] || String(name || '').substring(0, 3).toUpperCase();
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
      box.innerHTML = `<div class="ability-label">${esc(abilityAbbr(ab.name))}</div>
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
        saveDraft();
      });
    });
    const el = document.getElementById('ccPoints');
    const rem = getRemaining();
    el.textContent = rem;
    el.style.color = rem < 0 ? 'var(--danger)' : 'var(--green-accent)';
  }

  function descriptionParagraphs(description) {
    return String(description || '')
      .split(/<br\s*\/?>/i)
      .map(part => part.trim())
      .filter(Boolean);
  }

  function descriptionPreview(description) {
    return descriptionParagraphs(description)[0] || '';
  }

  function renderSelectionDetails(containerId, item) {
    const box = document.getElementById(containerId);
    if (!box) return;
    if (!item) {
      box.innerHTML = '<p class="selection-details-hint">Wähle eine Karte, um die vollständige Beschreibung zu lesen.</p>';
      box.hidden = false;
      return;
    }
    const paragraphs = descriptionParagraphs(item.description);
    box.innerHTML = `<div class="selection-details-name">${esc(item.name)}</div>`
      + (paragraphs.length ? paragraphs.map(p => `<p>${esc(p)}</p>`).join('') : '<p>Keine Beschreibung vorhanden.</p>');
    box.hidden = false;
  }

  function renderClassGrid() {
    const grid = document.getElementById('ccClassGrid');
    grid.innerHTML = '';
    classes.forEach(cls => {
      const card = document.createElement('div');
      card.className = 'selection-card' + (selectedClassId === cls.id ? ' selected' : '');
      card.innerHTML = `<div class="selection-card-icon">⚔️</div><div class="selection-card-name">${esc(cls.name)}</div>
        <div class="selection-card-desc">${esc(descriptionPreview(cls.description))}</div>`;
      card.addEventListener('click', () => {
        selectedClassId = cls.id;
        grid.querySelectorAll('.selection-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        renderSelectionDetails('ccClassDetails', cls);
        document.getElementById('ccNext2').disabled = false;
        saveDraft();
      });
      grid.appendChild(card);
    });
    document.getElementById('ccNext2').disabled = !selectedClassId;
    renderSelectionDetails('ccClassDetails', classes.find(c => c.id === selectedClassId));
  }

  async function loadClasses() {
    const grid = document.getElementById('ccClassGrid');
    try {
      const r = await fetch('/api/classes');
      classes = await r.json();
      renderClassGrid();
    } catch (e) {
      grid.innerHTML = '<p style="opacity:0.7">Klassen konnten nicht geladen werden</p>';
    }
  }

  function renderBackgroundGrid() {
    const grid = document.getElementById('ccBgGrid');
    grid.innerHTML = '';
    backgrounds.forEach(bg => {
      const card = document.createElement('div');
      card.className = 'selection-card' + (selectedBackgroundId === bg.id ? ' selected' : '');
      card.innerHTML = `<div class="selection-card-icon">📜</div><div class="selection-card-name">${esc(bg.name)}</div>
        <div class="selection-card-desc">${esc(descriptionPreview(bg.description))}</div>`;
      card.addEventListener('click', () => {
        selectedBackgroundId = bg.id;
        grid.querySelectorAll('.selection-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        renderSelectionDetails('ccBgDetails', bg);
        document.getElementById('ccNext3').disabled = false;
        saveDraft();
      });
      grid.appendChild(card);
    });
    document.getElementById('ccNext3').disabled = backgrounds.length > 0 && !selectedBackgroundId;
    renderSelectionDetails('ccBgDetails', backgrounds.find(b => b.id === selectedBackgroundId));
  }

  async function loadBackgrounds() {
    const grid = document.getElementById('ccBgGrid');
    try {
      const r = await fetch('/api/background/all');
      backgrounds = await r.json();
      renderBackgroundGrid();
    } catch (e) {
      grid.innerHTML = '<p style="opacity:0.7">Keine Hintergründe</p>';
      document.getElementById('ccNext3').disabled = false;
    }
  }

  async function loadAbilities() {
    try {
      const r = await fetch('/api/ability/all');
      abilities = await r.json();
      abilities.forEach(ab => { if (!abilityScores[ab.id]) abilityScores[ab.id] = 8; });
      renderAbilityGrid();
    } catch (e) {
      document.getElementById('ccAbilityGrid').innerHTML = '<p>Laden fehlgeschlagen</p>';
    }
  }

  // Step 1
  ['ccCharName', 'ccRace', 'ccAlign', 'ccBackstory'].forEach(inputId => {
    document.getElementById(inputId).addEventListener('input', saveDraft);
    document.getElementById(inputId).addEventListener('change', saveDraft);
  });

  document.getElementById('ccCancel').addEventListener('click', () => {
    if (campaignId) navigate('/campaign/' + campaignId + '/select-character');
    else navigate('/campaigns');
  });

  document.getElementById('ccNext1').addEventListener('click', async () => {
    const name = document.getElementById('ccCharName').value.trim();
    if (!name) { showStatus('Bitte gib einen Namen ein', 'error'); return; }
    goToStep(2);
    await loadClasses();
  });

  // Step 2
  document.getElementById('ccBack2').addEventListener('click', () => goToStep(1));
  document.getElementById('ccNext2').addEventListener('click', async () => {
    if (!selectedClassId) { showStatus('Bitte wähle eine Klasse', 'error'); return; }
    goToStep(3);
    await loadBackgrounds();
  });

  // Step 3
  document.getElementById('ccBack3').addEventListener('click', () => goToStep(2));
  document.getElementById('ccNext3').addEventListener('click', async () => {
    goToStep(4);
    await loadAbilities();
  });

  // Step 4
  document.getElementById('ccBack4').addEventListener('click', () => goToStep(3));
  document.getElementById('ccCreateBtn').addEventListener('click', async () => {
    const btn = document.getElementById('ccCreateBtn');
    btn.disabled = true; btn.textContent = 'Speichere…';
    showStatus('Speichere…', 'info');
    try {
      const name = document.getElementById('ccCharName').value.trim();
      if (isEdit) {
        characterId = editId;
      } else {
        const r = await fetch('/api/character/createInitialCharacter', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        if (!r.ok) throw new Error(await r.text());
        const c = await r.json();
        characterId = c.id;
      }
      const patchRes = await fetch('/api/character/' + characterId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          level: existingLevel,
          race: document.getElementById('ccRace').value || null,
          alignment: document.getElementById('ccAlign').value || null,
          classId: selectedClassId,
          backgroundId: selectedBackgroundId || null,
          info: document.getElementById('ccBackstory').value.trim() || null
        })
      });
      if (!patchRes.ok) throw new Error(await patchRes.text());
      for (const [abilityId, score] of Object.entries(abilityScores)) {
        const abilityRes = await fetch(`/api/character-ability/${characterId}/${abilityId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score }) });
        if (!abilityRes.ok) throw new Error(await abilityRes.text());
      }
      if (isEdit && campaignMembership?.characterStatus === 'REJECTED' && campaignMembership.characterId === characterId) {
        const resubmitRes = await fetch(`/api/campaign-player/${encodeURIComponent(campaignId)}/${player.id}/resubmit-character`, { method: 'POST' });
        if (!resubmitRes.ok) throw new Error(await resubmitRes.text());
        document.getElementById('ccDoneMessage').innerHTML = '<strong>Charakter gespeichert!</strong><br>Er wurde dem DM erneut zur Prüfung vorgelegt.';
      }
      const charRes = await fetch('/api/character/' + characterId);
      const character = await charRes.json();
      const cn = classes.find(c => c.id === selectedClassId)?.name || 'Unbekannt';
      const ini = (character.name || 'C').substring(0, 2).toUpperCase();
      document.getElementById('ccPreview').innerHTML = `
        <div class="character-preview"><div class="preview-header">
          <div class="preview-avatar">${ini}</div>
          <div class="preview-info"><h3>${esc(character.name)}</h3><div class="preview-meta">Stufe ${character.level || 1} ${esc(character.race || '')} ${esc(cn)}</div></div>
        </div>
        <div class="preview-stats">${abilities.map(ab => `<div class="preview-stat"><div class="preview-stat-label">${esc(abilityAbbr(ab.name))}</div><div class="preview-stat-value">${abilityScores[ab.id] || 8}</div></div>`).join('')}</div>
        </div>`;
      clearDraft();
      goToStep(5);
    } catch (err) { showStatus('Fehler: ' + err.message, 'error'); btn.disabled = false; btn.textContent = saveLabel; }
  });

  // Step 5
  document.getElementById('ccAnother')?.addEventListener('click', () => {
    characterId = null; selectedClassId = null; selectedBackgroundId = null; abilityScores = {};
    clearDraft();
    document.getElementById('ccCharName').value = '';
    document.getElementById('ccRace').value = '';
    document.getElementById('ccAlign').value = '';
    document.getElementById('ccBackstory').value = '';
    document.getElementById('ccNext2').disabled = true;
    document.getElementById('ccNext3').disabled = true;
    goToStep(1);
  });
  document.getElementById('ccDone').addEventListener('click', () => {
    if (campaignId && isEdit) navigate('/campaign/' + campaignId);
    else if (campaignId) navigate('/campaign/' + campaignId + '/select-character');
    else navigate('/campaigns');
  });

  let campaignMembership = null;
  let existingLevel = 1;
  if (isEdit) {
    let existing = null;
    try {
      const r = await fetch('/api/character/' + editId, { cache: 'no-store' });
      if (r.ok) existing = await r.json();
    } catch (e) {}
    if (!existing) {
      showStatus('Charakter nicht gefunden', 'error');
      navigate(campaignId ? '/campaign/' + campaignId : '/campaigns');
      return () => { destroyHeader(); };
    }
    if (campaignId) {
      try {
        const r = await fetch(`/api/campaign-player/${encodeURIComponent(campaignId)}/${player.id}/role`, { cache: 'no-store' });
        if (r.ok) campaignMembership = await r.json();
      } catch (e) {}
    }
    if (campaignMembership?.dmNotes) {
      const notes = document.getElementById('ccDmNotes');
      notes.className = 'status-message error show';
      notes.innerHTML = '<strong>Hinweise des DM:</strong><br><span style="white-space:pre-wrap">' + esc(campaignMembership.dmNotes) + '</span>';
      notes.hidden = false;
    }
    existingLevel = existing.level || 1;
    document.getElementById('ccCharName').value = existing.name || '';
    selectValue('ccRace', existing.race);
    selectValue('ccAlign', existing.alignment);
    document.getElementById('ccBackstory').value = existing.info || '';
    selectedClassId = existing.characterClass?.id ?? null;
    selectedBackgroundId = existing.background?.id ?? null;
    abilityScores = {};
    (existing.abilityScores || []).forEach(a => { if (a?.abilityId) abilityScores[a.abilityId] = a.score; });
  }

  // Older characters may contain values that are no longer in the list; keep them selectable.
  function selectValue(selectId, value) {
    const select = document.getElementById(selectId);
    if (value && ![...select.options].some(o => o.value === value)) select.add(new Option(value, value));
    select.value = value || '';
  }

  const restoredStep = applyDraft(readSessionDraft(draftKey));
  if (restoredStep >= 2) await loadClasses();
  if (restoredStep >= 3) await loadBackgrounds();
  if (restoredStep >= 4) await loadAbilities();
  goToStep(restoredStep);

  return () => { destroyHeader(); };
}
