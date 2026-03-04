/**
 * Player Game View – Spieler UI (SPA version)
 */
import { requirePlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { esc, initials, calcMod, fmtMod, resolveMapUrl } from '../services/utils.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { createMapCanvas } from '../components/mapCanvas.js';
import { showToast } from '../components/toast.js';

const SKILLS = [
  { name:'Acrobatics', de:'Akrobatik', ability:'Dexterity' },{ name:'Animal Handling', de:'Tierführung', ability:'Wisdom' },
  { name:'Arcana', de:'Arkane Kunde', ability:'Intelligence' },{ name:'Athletics', de:'Athletik', ability:'Strength' },
  { name:'Deception', de:'Täuschung', ability:'Charisma' },{ name:'History', de:'Geschichte', ability:'Intelligence' },
  { name:'Insight', de:'Motiv erkennen', ability:'Wisdom' },{ name:'Intimidation', de:'Einschüchtern', ability:'Charisma' },
  { name:'Investigation', de:'Nachforschen', ability:'Intelligence' },{ name:'Medicine', de:'Heilkunde', ability:'Wisdom' },
  { name:'Nature', de:'Naturkunde', ability:'Intelligence' },{ name:'Perception', de:'Wahrnehmung', ability:'Wisdom' },
  { name:'Performance', de:'Auftreten', ability:'Charisma' },{ name:'Persuasion', de:'Überzeugen', ability:'Charisma' },
  { name:'Religion', de:'Religion', ability:'Intelligence' },{ name:'Sleight of Hand', de:'Fingerfertigkeit', ability:'Dexterity' },
  { name:'Stealth', de:'Heimlichkeit', ability:'Dexterity' },{ name:'Survival', de:'Überlebenskunst', ability:'Wisdom' }
];
const ABILITIES = ['Strength','Dexterity','Constitution','Intelligence','Wisdom','Charisma'];
const ICONS = { Strength:'💪', Dexterity:'🏹', Constitution:'🛡️', Intelligence:'🧠', Wisdom:'🔮', Charisma:'✨' };
const ABILITY_DE = { Strength:'Stärke', Dexterity:'Geschick', Constitution:'Konstitution', Intelligence:'Intelligenz', Wisdom:'Weisheit', Charisma:'Charisma' };
const ABILITY_ABBR = { Strength:'STÄ', Dexterity:'GES', Constitution:'KON', Intelligence:'INT', Wisdom:'WEI', Charisma:'CHA' };

export default async function PlayerView({ id }) {
  const currentPlayer = requirePlayer();
  if (!currentPlayer) return;
  const campaignId = id;

  const app = document.getElementById('app');
  document.body.classList.add('has-header');

  app.innerHTML = renderHeader() + `
    <div id="pvStatusMsg" class="pv-status-message"></div>
    <div id="pvTurnBanner" class="turn-banner"></div>
    <div id="pvDiceToast" class="dice-toast"><div class="toast-title" id="pvToastTitle"></div><div class="toast-result" id="pvToastResult"></div></div>
    <div class="loading-screen" id="pvLoading"><span class="loading-spinner"></span> Spiel wird geladen...</div>
    <div class="player-view-desktop" id="pvDesktop" style="display:none;">
      <div class="pv-sidebar" id="pvSidebar"></div>
      <div class="pv-main">
        <div class="glass pv-campaign-bar" id="pvCampBar"></div>
        <div class="glass" style="padding:0;">
          <div class="pv-tabs">
            <button class="pv-tab active" data-tab="pv-overview">📋 Übersicht</button>
            <button class="pv-tab" data-tab="pv-map">🗺️ Karte</button>
            <button class="pv-tab" data-tab="pv-prof">🛡️ Übung</button>
            <button class="pv-tab" data-tab="pv-party">👥 Gruppe</button>
            <button class="pv-tab" data-tab="pv-dice">🎲 Würfel</button>
            <button class="pv-tab" data-tab="pv-notes">📝 Notizen</button>
          </div>
          <div class="pv-tab-panel active" id="pv-overview"></div>
          <div class="pv-tab-panel pv-map-panel" id="pv-map"></div>
          <div class="pv-tab-panel" id="pv-prof"></div>
          <div class="pv-tab-panel" id="pv-party"></div>
          <div class="pv-tab-panel" id="pv-dice" style="padding:16px;"></div>
          <div class="pv-tab-panel" id="pv-notes"></div>
        </div>
      </div>
    </div>
  `;
  initHeader();

  let campaign = null, character = null, campaignPlayers = [], playerNameMap = {}, characterMap = {};
  let currentHP = 0, maxHP = 0, diceHistory = [], decisions = [], votedDecisions = {};
  let eventSource = null, currentTurnPlayerId = null, selectedDiceSides = 20;
  let playerMapCanvas = null, playerMapMarkers = [];

  function getScore(name) {
    if (!character?.abilityScores) return 10;
    const f = character.abilityScores.find(a => a.abilityName?.toLowerCase() === name.toLowerCase());
    return f ? f.score : 10;
  }
  function getProfBonus() { return Math.floor(((character?.level || 1) - 1) / 4) + 2; }

  function showStatus(msg, isError) {
    showToast(msg, isError ? 'error' : 'success');
  }

  // SSE
  function connectSSE() {
    eventSource = new EventSource('/api/campaign/' + campaignId + '/sse');
    eventSource.addEventListener('turn', e => {
      const d = JSON.parse(e.data); currentTurnPlayerId = d.playerId;
      updateTurnBanner(d.playerId, d.playerName);
    });
    eventSource.addEventListener('hp', e => {
      const d = JSON.parse(e.data);
      if (d.playerId === currentPlayer.id) {
        currentHP = d.currentHp; maxHP = d.maxHp; renderCoreStats();
        if (d.delta < 0) showStatus('Du hast ' + Math.abs(d.delta) + ' Schaden erhalten! ❤️ ' + currentHP + '/' + maxHP, true);
        else if (d.delta > 0) showStatus('Du wurdest um ' + d.delta + ' geheilt! ❤️ ' + currentHP + '/' + maxHP, false);
      }
    });
    eventSource.addEventListener('dice', e => {
      const d = JSON.parse(e.data);
      if (d.playerId !== currentPlayer.id) showDiceToast(d.playerName, d.diceType, d.result);
    });
    eventSource.addEventListener('decision', e => {
      const d = JSON.parse(e.data); decisions.push(d); renderDecisions(); showStatus('⚖️ Neue Abstimmung: ' + d.title, false);
    });
    eventSource.addEventListener('vote', e => {
      const d = JSON.parse(e.data); const dec = decisions.find(x => x.id === d.decisionId);
      if (dec) { dec.yes = d.yes; dec.no = d.no; renderDecisions(); }
    });
    eventSource.addEventListener('decision_resolved', e => {
      const d = JSON.parse(e.data); const dec = decisions.find(x => x.id === d.decisionId);
      if (dec) { dec.status = 'RESOLVED'; dec.yes = d.yes; dec.no = d.no; dec.decisionMade = d.decisionMade; renderDecisions(); }
    });
    // Map marker SSE events
    eventSource.addEventListener('marker_add', e => {
      const m = JSON.parse(e.data);
      if (!playerMapMarkers.find(x => x.id === m.id)) { playerMapMarkers.push(m); if (playerMapCanvas) playerMapCanvas.updateMarkers(playerMapMarkers); }
    });
    eventSource.addEventListener('marker_move', e => {
      const d = JSON.parse(e.data);
      const m = playerMapMarkers.find(x => x.id === d.id);
      if (m) { m.x = d.x; m.y = d.y; if (playerMapCanvas) playerMapCanvas.updateMarkers(playerMapMarkers); }
    });
    eventSource.addEventListener('marker_remove', e => {
      const d = JSON.parse(e.data);
      playerMapMarkers = playerMapMarkers.filter(m => m.id !== d.id);
      if (playerMapCanvas) playerMapCanvas.updateMarkers(playerMapMarkers);
    });
    eventSource.addEventListener('marker_group', e => {
      const d = JSON.parse(e.data);
      if (d.allMarkers) { playerMapMarkers = d.allMarkers; if (playerMapCanvas) playerMapCanvas.updateMarkers(playerMapMarkers); }
    });
  }

  function updateTurnBanner(playerId, playerName) {
    const b = document.getElementById('pvTurnBanner');
    if (playerId === currentPlayer.id) { b.className = 'turn-banner my-turn visible'; b.innerHTML = '🟢 <strong>Du bist am Zug!</strong>'; }
    else { b.className = 'turn-banner other-turn visible'; b.innerHTML = '⏳ ' + esc(playerName || 'Ein Spieler') + ' ist am Zug'; }
  }

  let toastTimeout = null;
  function showDiceToast(name, dt, result) {
    document.getElementById('pvToastTitle').textContent = '🎲 ' + name + ' würfelt ' + dt;
    document.getElementById('pvToastResult').textContent = result;
    document.getElementById('pvDiceToast').classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => document.getElementById('pvDiceToast').classList.remove('visible'), 4000);
  }

  // LOAD
  async function loadGame() {
    try {
      const campRes = await fetch('/api/campaign/' + campaignId + '?playerId=' + currentPlayer.id, { cache: 'no-store' });
      campaign = await campRes.json();

      const cpRes = await fetch('/api/campaign-player/' + campaignId, { cache: 'no-store' });
      campaignPlayers = await cpRes.json();

      const myEntry = campaignPlayers.find(cp => cp.playerId === currentPlayer.id);
      if (!myEntry?.characterId) { document.getElementById('pvLoading').innerHTML = 'Kein Charakter eingereicht.'; return; }

      const charRes = await fetch('/api/character/' + myEntry.characterId, { cache: 'no-store' });
      character = await charRes.json();

      await Promise.all(campaignPlayers.map(async cp => {
        try { const r = await fetch('/api/player/id/' + cp.playerId, { cache: 'no-store' }); if (r.ok) { const p = await r.json(); playerNameMap[cp.playerId] = p.username || p.name; } } catch(e){}
        if (cp.characterId && cp.playerId !== currentPlayer.id) {
          try { const r = await fetch('/api/character/' + cp.characterId, { cache: 'no-store' }); if (r.ok) characterMap[cp.playerId] = await r.json(); } catch(e){}
        }
      }));
      characterMap[currentPlayer.id] = character;

      const conMod = calcMod(getScore('Constitution'));
      maxHP = 10 + conMod * (character.level || 1); if (maxHP < 1) maxHP = 1; currentHP = maxHP;

      await fetch('/api/campaign/' + campaignId + '/game/init-hp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: currentPlayer.id, hp: currentHP, maxHp: maxHP }) });

      try {
        const stateRes = await fetch('/api/campaign/' + campaignId + '/game/state', { cache: 'no-store' });
        if (stateRes.ok) {
          const state = await stateRes.json();
          if (state.playerHp?.[currentPlayer.id] !== undefined) currentHP = state.playerHp[currentPlayer.id];
          if (state.playerMaxHp?.[currentPlayer.id] !== undefined) maxHP = state.playerMaxHp[currentPlayer.id];
          if (state.currentTurnPlayerId && state.currentTurnPlayerId !== -1) {
            currentTurnPlayerId = state.currentTurnPlayerId;
            updateTurnBanner(currentTurnPlayerId, playerNameMap[currentTurnPlayerId] || 'Ein Spieler');
          }
        }
      } catch(e) {}

      try { const r = await fetch('/api/campaign/' + campaignId + '/game/decisions', { cache: 'no-store' }); if (r.ok) decisions = await r.json(); } catch(e) {}

      // Load map markers
      try { const r = await fetch('/api/campaign/' + campaignId + '/game/map-markers', { cache: 'no-store' }); if (r.ok) playerMapMarkers = await r.json(); } catch(e) {}

      connectSSE();
      renderAll();
      document.getElementById('pvLoading').style.display = 'none';
      document.getElementById('pvDesktop').style.display = 'grid';
    } catch (err) { document.getElementById('pvLoading').innerHTML = 'Fehler beim Laden.'; }
  }

  function renderAll() {
    renderSidebar(); renderCampaignBar(); renderOverview(); renderDecisions();
    renderProficiencies(); renderParty(); renderDice(); renderNotes(); renderMap(); setupTabs();
  }

  function renderSidebar() {
    const s = document.getElementById('pvSidebar');
    const cn = character.characterClass?.name || 'Keine Klasse';
    const race = character.race || 'Unbekannte Rasse';
    const lvl = character.level || 1;

    let html = `<div class="glass" style="text-align:center;padding:20px 12px 16px;">
      <div class="char-avatar">${currentPlayer.profilePicture ? '<img src="' + esc(currentPlayer.profilePicture) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' : initials(character.name || currentPlayer.name)}</div>
      <div class="char-name">${esc(character.name)}</div>
      <div class="char-meta-line">${esc(race)} · ${esc(cn)} · ${esc(character.alignment || '')}</div>
      <span class="level-badge">⭐ Stufe ${lvl}</span>
    </div>`;

    html += `<div class="glass core-stats" id="pvCoreStats"></div>`;

    html += `<div class="glass" style="padding:12px"><div class="section-title">Attributswerte</div><div class="abilities-grid">`;
    html += ABILITIES.map(name => {
      const s = getScore(name); const m = calcMod(s);
      return `<div class="ability-box" title="${ABILITY_DE[name]}"><div class="ability-label">${ICONS[name]} ${ABILITY_ABBR[name]}</div><div class="ability-score">${s}</div><div class="ability-mod${m < 0 ? ' negative' : ''}">${fmtMod(m)}</div></div>`;
    }).join('') + '</div></div>';

    html += `<div class="glass" style="padding:12px"><div class="section-title">Rettungswürfe</div>`;
    html += ABILITIES.map(name => {
      const m = calcMod(getScore(name));
      return `<div class="save-row"><span class="save-name">${ICONS[name]} ${ABILITY_DE[name]}</span><span class="save-value${m >= 0 ? ' positive' : ' negative'}">${fmtMod(m)}</span></div>`;
    }).join('') + '</div>';

    html += `<div class="glass" style="padding:12px"><div class="section-title">Fertigkeiten</div>`;
    const bgSkills = character.background?.skills ? character.background.skills.split(',').map(s => s.trim().toLowerCase()) : [];
    html += SKILLS.map(skill => {
      const m = calcMod(getScore(skill.ability));
      const prof = bgSkills.some(s => s === skill.name.toLowerCase());
      const bonus = prof ? m + getProfBonus() : m;
      return `<div class="skill-row"><span class="skill-name"><span class="${prof ? 'skill-proficient' : 'skill-not-proficient'}"></span>${skill.de} <span style="font-size:10px;color:rgba(255,255,255,0.6)">(${ABILITY_ABBR[skill.ability]})</span></span><span class="skill-bonus${bonus >= 0 ? ' positive' : ' negative'}">${fmtMod(bonus)}</span></div>`;
    }).join('') + '</div>';

    s.innerHTML = html;
    renderCoreStats();
  }

  function renderCoreStats() {
    const el = document.getElementById('pvCoreStats'); if (!el) return;
    const dexMod = calcMod(getScore('Dexterity'));
    const pct = maxHP > 0 ? Math.round((currentHP / maxHP) * 100) : 0;
    let hpColor = 'var(--accent-green,#69f0ae)'; if (pct <= 50) hpColor = '#ffc107'; if (pct <= 25) hpColor = '#ff5252';
    el.innerHTML = `
      <div class="core-stat"><div class="core-stat-icon">❤️</div><div class="core-stat-value" style="color:${hpColor}">${currentHP}</div><div class="core-stat-label">TP (${maxHP})</div></div>
      <div class="core-stat"><div class="core-stat-icon">🛡️</div><div class="core-stat-value">${10 + dexMod}</div><div class="core-stat-label">RK</div></div>
      <div class="core-stat"><div class="core-stat-icon">⚡</div><div class="core-stat-value">${fmtMod(dexMod)}</div><div class="core-stat-label">Initiative</div></div>
      <div class="core-stat"><div class="core-stat-icon">🏃</div><div class="core-stat-value">30</div><div class="core-stat-label">Tempo</div></div>
    `;
  }

  function renderCampaignBar() {
    const el = document.getElementById('pvCampBar');
    el.innerHTML = `<div style="flex:1;min-width:0;"><div style="font-size:16px;font-weight:700;">⚔️ ${esc(campaign.name)}</div><div style="font-size:12px;color:rgba(255,255,255,0.6);">${esc(campaign.description || '')}</div></div><button class="bar-btn" id="pvBack">← Zurück</button>`;
    document.getElementById('pvBack').addEventListener('click', () => navigate('/campaigns'));
  }

  function renderOverview() {
    const el = document.getElementById('pv-overview');
    let html = '<div style="padding:16px;">';
    html += '<div id="pvDecisions"></div>';
    html += `<div class="info-card"><div class="info-card-title">📖 Hintergrundgeschichte</div><div class="info-card-body">${esc(character.info) || 'Noch keine Geschichte...'}</div></div>`;
    if (character.characterClass) html += `<div class="info-card"><div class="info-card-title">⚔️ ${esc(character.characterClass.name)}</div><div class="info-card-body">${character.characterClass.description || ''}</div></div>`;
    if (character.background) html += `<div class="info-card"><div class="info-card-title">🏛️ ${esc(character.background.name)}</div><div class="info-card-body">${esc(character.background.description || '')}</div>${character.background.feat ? '<div style="margin-top:8px"><span class="info-tag purple">Talent: ' + esc(character.background.feat) + '</span></div>' : ''}</div>`;
    html += '</div>';
    el.innerHTML = html;
  }

  function renderDecisions() {
    const container = document.getElementById('pvDecisions'); if (!container) return;
    if (decisions.length === 0) { container.innerHTML = ''; return; }
    let html = '<div class="section-title" style="margin-bottom:8px">⚖️ Gruppenentscheidungen</div>';
    decisions.slice().reverse().forEach(d => {
      const total = (d.yes || 0) + (d.no || 0);
      const yP = total > 0 ? Math.round((d.yes / total) * 100) : 0;
      const nP = total > 0 ? 100 - yP : 0;
      const voted = votedDecisions[d.id];
      const resolved = d.status === 'RESOLVED';
      html += `<div class="decision-card-player" style="${resolved ? 'opacity:0.7;border-left-color:#69f0ae;' : ''}">
        <h4>${d.title || ''}${resolved ? ' ✅' : ''}</h4><div class="decision-desc">${d.text || ''}</div>`;
      if (resolved) html += `<div style="text-align:center;padding:8px;font-weight:700;color:#69f0ae;">Ergebnis: ${d.decisionMade || (d.yes >= d.no ? 'Ja' : 'Nein')}</div>`;
      else if (!voted) html += `<div class="vote-buttons"><button class="vote-btn vote-btn-yes" data-did="${d.id}" data-v="yes">👍 Ja</button><button class="vote-btn vote-btn-no" data-did="${d.id}" data-v="no">👎 Nein</button></div>`;
      else html += `<div class="vote-buttons"><button class="vote-btn vote-btn-yes voted" disabled>👍 Ja (${d.yes})</button><button class="vote-btn vote-btn-no voted" disabled>👎 Nein (${d.no})</button></div>`;
      if (total > 0) html += `<div class="vote-bar"><div class="vote-bar-yes" style="width:${yP}%"></div><div class="vote-bar-no" style="width:${nP}%"></div></div><div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px;font-weight:600;"><span style="color:#69f0ae;">👍 ${yP}%</span><span style="color:#ff5252;">👎 ${nP}%</span></div>`;
      html += '</div>';
    });
    container.innerHTML = html;
    container.querySelectorAll('.vote-btn[data-did]').forEach(btn => {
      btn.addEventListener('click', () => {
        const did = parseInt(btn.dataset.did); const vt = btn.dataset.v;
        if (votedDecisions[did]) return;
        votedDecisions[did] = vt; renderDecisions();
        const name = playerNameMap[currentPlayer.id] || currentPlayer.name || 'Unknown';
        fetch('/api/campaign/' + campaignId + '/game/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decisionId: did, vote: vt, playerName: name, playerId: currentPlayer.id })
        });
      });
    });
  }

  function renderProficiencies() {
    const el = document.getElementById('pv-prof'); let html = '<div style="padding:16px;">';
    const bgSkills = character.background?.skills || '';
    if (bgSkills) html += `<div class="prof-group"><div class="prof-group-title">Fertigkeitsübung</div><div>${bgSkills.split(',').map(s => '<span class="info-tag">' + esc(s.trim()) + '</span>').join('')}</div></div>`;
    const bgTools = character.background?.toolProficiencies || '';
    if (bgTools) html += `<div class="prof-group"><div class="prof-group-title">Werkzeugübung</div><div>${bgTools.split(',').map(s => '<span class="info-tag purple">' + esc(s.trim()) + '</span>').join('')}</div></div>`;
    html += `<div class="prof-group"><div class="prof-group-title">Übungsbonus</div><div><span class="info-tag" style="font-size:14px;padding:6px 14px">+${getProfBonus()}</span></div></div>`;
    html += '</div>'; el.innerHTML = html;
  }

  function renderParty() {
    const el = document.getElementById('pv-party');
    let html = '<div style="padding:16px;"><div class="party-grid">';
    campaignPlayers.forEach(cp => {
      const name = playerNameMap[cp.playerId] || 'Spieler ' + cp.playerId;
      const isDM = cp.role === 'DM'; const ch = characterMap[cp.playerId];
      const detail = isDM ? 'Spielleiter' : (ch ? [ch.race, ch.characterClass?.name].filter(Boolean).join(' · ') || 'Abenteurer' : 'Abenteurer');
      const isTurn = currentTurnPlayerId === cp.playerId;
      html += `<div class="party-card" style="${isTurn ? 'border:1px solid #69f0ae;box-shadow:0 0 12px rgba(105,240,174,0.2);' : ''}">
        <div class="party-avatar${isDM ? ' dm' : ''}">${isDM ? '👑' : initials(ch ? ch.name : name)}</div>
        <div class="party-info"><div class="party-name">${esc(isDM ? name : (ch ? ch.name : name))}${isTurn && !isDM ? ' 🟢' : ''}</div><div class="party-detail">${esc(detail)}</div></div>
        <span class="party-role-badge${isDM ? ' dm' : ' player'}">${cp.role}</span>
      </div>`;
    });
    html += '</div></div>'; el.innerHTML = html;
  }

  function renderDice() {
    const el = document.getElementById('pv-dice');
    const types = [4, 6, 8, 10, 12, 20, 100];
    el.innerHTML = `<h3 style="margin:0 0 14px;font-size:16px;">🎲 Würfel</h3>
      <div class="dice-display"><div class="dice-type-label" id="pvDiceLabel">D20</div><div class="dice-result-value" id="pvDiceVal">—</div><div class="dice-feedback-text" id="pvDiceFb"></div></div>
      <div class="dice-chip-row" id="pvDiceChips">${types.map(s => `<button class="dice-chip${s === 20 ? ' selected' : ''}" data-sides="${s}">d${s}</button>`).join('')}</div>
      <button class="roll-btn" id="pvRollBtn">🎲 Würfeln</button>
      <div class="or-divider"><span>oder</span></div>
      <div class="manual-row"><input type="number" id="pvManualIn" min="1" max="20" placeholder="Manuell…"><button class="manual-set-btn" id="pvManualSet">Setzen</button></div>
      <div style="margin-top:14px"><div class="section-title">Verlauf</div><div id="pvDiceHist" class="dice-history"><div class="dice-history-entry" style="justify-content:center;color:rgba(255,255,255,0.6);">Noch keine Würfe</div></div></div>
    `;

    document.getElementById('pvDiceChips').addEventListener('click', e => {
      const c = e.target.closest('.dice-chip'); if (!c) return;
      document.querySelectorAll('#pvDiceChips .dice-chip').forEach(x => x.classList.remove('selected'));
      c.classList.add('selected'); selectedDiceSides = parseInt(c.dataset.sides);
      document.getElementById('pvDiceLabel').textContent = 'D' + selectedDiceSides;
    });

    function showFb(msg, color) {
      const fb = document.getElementById('pvDiceFb'); fb.textContent = msg; fb.style.color = color; fb.style.opacity = '1';
      setTimeout(() => { fb.style.opacity = '0'; }, 3000);
    }

    function renderHist() {
      const el = document.getElementById('pvDiceHist');
      if (diceHistory.length === 0) { el.innerHTML = '<div class="dice-history-entry" style="justify-content:center;">Noch keine Würfe</div>'; return; }
      el.innerHTML = diceHistory.map(h => `<div class="dice-history-entry"><span>${h.dice}</span><span style="font-weight:600;color:#69f0ae;">${h.result}</span><span>${h.time}</span></div>`).join('');
    }

    document.getElementById('pvRollBtn').addEventListener('click', () => {
      const manIn = document.getElementById('pvManualIn');
      if (manIn.value.trim() !== '') { showFb('Manuelles Ergebnis aktiv', '#ffd740'); return; }
      const rollBtn = document.getElementById('pvRollBtn'); rollBtn.disabled = true;
      let ticks = 0;
      const iv = setInterval(() => {
        document.getElementById('pvDiceVal').textContent = Math.floor(Math.random() * selectedDiceSides) + 1; ticks++;
        if (ticks >= 12) {
          clearInterval(iv); const f = Math.floor(Math.random() * selectedDiceSides) + 1;
          const r = document.getElementById('pvDiceVal');
          r.textContent = f; r.classList.remove('rolling'); void r.offsetWidth; r.classList.add('rolling');
          rollBtn.disabled = false;
          if (f === selectedDiceSides && selectedDiceSides === 20) showFb('🔥 Kritischer Treffer!', '#69f0ae');
          else if (f === 1 && selectedDiceSides === 20) showFb('💀 Kritischer Fehlschlag!', '#ff5252');
          else showFb('🎲 Gewürfelt: ' + f, '#69f0ae');
          diceHistory.unshift({ dice: 'd' + selectedDiceSides, result: f, time: new Date().toLocaleTimeString() });
          if (diceHistory.length > 20) diceHistory.pop();
          renderHist();
          const myName = playerNameMap[currentPlayer.id] || currentPlayer.name || 'Spieler';
          fetch('/api/campaign/' + campaignId + '/game/dice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: currentPlayer.id, playerName: myName, diceType: 'd' + selectedDiceSides, result: f }) });
        }
      }, 55);
    });

    const manIn = document.getElementById('pvManualIn');
    manIn.addEventListener('input', () => { document.getElementById('pvRollBtn').disabled = manIn.value.trim() !== ''; });
    manIn.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('pvManualSet').click(); });

    document.getElementById('pvManualSet').addEventListener('click', () => {
      const val = parseInt(manIn.value);
      if (isNaN(val) || val < 1 || val > selectedDiceSides) { showFb('Ungültig', '#ff5252'); return; }
      const r = document.getElementById('pvDiceVal');
      r.textContent = val; r.classList.remove('rolling'); void r.offsetWidth; r.classList.add('rolling');
      showFb('✓ Manuell: ' + val, '#69f0ae'); manIn.value = '';
      document.getElementById('pvRollBtn').disabled = false;
      diceHistory.unshift({ dice: 'd' + selectedDiceSides + ' (manuell)', result: val, time: new Date().toLocaleTimeString() });
      renderHist();
      const myName = playerNameMap[currentPlayer.id] || currentPlayer.name;
      fetch('/api/campaign/' + campaignId + '/game/dice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: currentPlayer.id, playerName: myName, diceType: 'd' + selectedDiceSides, result: val }) });
    });
  }

  function renderNotes() {
    const el = document.getElementById('pv-notes');
    const key = 'notes_' + campaignId + '_' + currentPlayer.id;
    const saved = localStorage.getItem(key) || '';
    el.innerHTML = `<div style="padding:16px;"><div class="section-title" style="margin-bottom:8px">Sitzungsnotizen</div>
      <textarea class="notes-area" id="pvNotesArea" placeholder="NPCs, Orte, Questziele...">${esc(saved)}</textarea>
      <div class="notes-hint">💾 Wird automatisch gespeichert.</div></div>`;
    let t;
    document.getElementById('pvNotesArea').addEventListener('input', function() {
      clearTimeout(t); t = setTimeout(() => localStorage.setItem(key, this.value), 500);
    });
  }

  function setupTabs() {
    document.querySelectorAll('.pv-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.pv-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.pv-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab)?.classList.add('active');
        // Resize map canvas when switching to map tab
        if (tab.dataset.tab === 'pv-map' && playerMapCanvas) {
          setTimeout(() => playerMapCanvas.resize(), 50);
        }
      });
    });
  }

  function renderMap() {
    const el = document.getElementById('pv-map');
    if (!el) return;
    if (!campaign.mapImagePath) {
      el.innerHTML = '<div style="padding:40px;text-align:center;opacity:0.5;">🗺️ Keine Karte verfügbar</div>';
      return;
    }
    el.innerHTML = '<div class="pv-map-toolbar"><button class="map-tb-btn" id="pvMapZoomIn">🔍+</button><button class="map-tb-btn" id="pvMapZoomOut">🔍−</button><button class="map-tb-btn" id="pvMapReset">↺</button></div><div class="pv-map-canvas-box" id="pvMapCanvasBox"></div>';

    const allPlayers = campaignPlayers
      .filter(cp => cp.role === 'PLAYER')
      .map(cp => ({ id: cp.playerId, name: playerNameMap[cp.playerId] || 'Spieler ' + cp.playerId }));

    playerMapCanvas = createMapCanvas(document.getElementById('pvMapCanvasBox'), {
      mapImageUrl: resolveMapUrl(campaign.mapImagePath),
      markers: playerMapMarkers,
      readOnly: true,
      isMaximized: false,
      players: allPlayers
    });

    document.getElementById('pvMapZoomIn').addEventListener('click', () => { if (playerMapCanvas) playerMapCanvas.setZoom(Math.min(5, playerMapCanvas.getZoom() + 0.3)); });
    document.getElementById('pvMapZoomOut').addEventListener('click', () => { if (playerMapCanvas) playerMapCanvas.setZoom(Math.max(0.5, playerMapCanvas.getZoom() - 0.3)); });
    document.getElementById('pvMapReset').addEventListener('click', () => { if (playerMapCanvas) playerMapCanvas.resetView(); });
  }

  loadGame();

  return () => {
    destroyHeader();
    if (eventSource) { eventSource.close(); eventSource = null; }
    if (playerMapCanvas) { playerMapCanvas.destroy(); playerMapCanvas = null; }
  };
}

