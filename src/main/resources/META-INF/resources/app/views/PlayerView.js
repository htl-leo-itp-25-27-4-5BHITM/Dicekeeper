/**
 * Player Game View – Redesigned immersive Spieler UI
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
    <div id="pvTurnBanner" class="pv2-turn-banner"></div>
    <div id="pvDiceToast" class="dice-toast"><div class="toast-title" id="pvToastTitle"></div><div class="toast-result" id="pvToastResult"></div></div>
    <div class="pv2-loading" id="pvLoading"><span class="loading-spinner"></span> Spiel wird geladen...</div>

    <!-- ===== MOBILE: compact top bar + tab panels ===== -->
    <div class="pv2-mobile-wrapper" id="pvMobile" style="display:none;">
      <div class="pv2-mob-hero" id="pvMobHero"></div>
      <div class="pv2-mob-tabs-content">
        <div class="pv2-mob-panel active" id="pvMobPanelMap">
          <div class="pv2-mob-map-screen">
            <!-- Map fills the whole panel -->
            <div class="pv2-mob-map-canvas" id="pvMobMapCanvasBox"></div>
            <!-- Floating zoom pill -->
            <div class="pv2-mob-zoom-pill">
              <button class="pv2-mob-zoom-btn" id="pvMobMapZoomIn" title="Zoom +">+</button>
              <div class="pv2-mob-zoom-divider"></div>
              <button class="pv2-mob-zoom-btn" id="pvMobMapZoomOut" title="Zoom −">−</button>
              <div class="pv2-mob-zoom-divider"></div>
              <button class="pv2-mob-zoom-btn pv2-mob-zoom-reset" id="pvMobMapReset" title="Reset">↺</button>
            </div>
            <!-- Decisions drawer -->
            <div class="pv2-mob-drawer" id="pvMobDrawer">
              <button class="pv2-mob-drawer-handle" id="pvMobDrawerToggle">
                <span class="pv2-mob-drawer-pill"></span>
                <span class="pv2-mob-drawer-label">⚖️ Abstimmungen <span class="pv2-mob-drawer-badge" id="pvMobDecisionBadge"></span></span>
              </button>
              <div class="pv2-mob-drawer-body" id="pvMobDrawerBody">
                <div class="pv2-mob-drawer-content" id="pvMobDecisions"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="pv2-mob-panel" id="pvMobPanelChar">
          <div class="pv2-mob-char-full" id="pvMobCharFull"></div>
        </div>
        <div class="pv2-mob-panel" id="pvMobPanelDice">
          <div class="pv2-dice-card pv2-mob-dice-card">
            <div class="pv2-card-header"><span>🎲</span><h3>Würfel</h3></div>
            <div class="pv2-dice-body" id="pvMobDiceBody"></div>
          </div>
        </div>
        <div class="pv2-mob-panel" id="pvMobPanelParty">
          <div class="pv2-party-card pv2-mob-party-card">
            <div class="pv2-card-header"><span>👥</span><h3>Gruppe</h3></div>
            <div class="pv2-party-list" id="pvMobPartyList"></div>
          </div>
          <div class="pv2-notes-card pv2-mob-notes-card">
            <div class="pv2-card-header"><span>📝</span><h3>Notizen</h3></div>
            <textarea class="pv2-notes-area" id="pvMobNotesArea" placeholder="NPCs, Orte, Questziele…"></textarea>
            <div class="pv2-notes-hint">💾 Automatisch gespeichert</div>
          </div>
        </div>
      </div>
      <nav class="pv2-mob-tab-bar" id="pvMobTabBar">
        <button class="pv2-mob-tab active" data-tab="pvMobPanelMap"><span class="pv2-mob-tab-icon">🗺️</span><span class="pv2-mob-tab-label">Karte</span></button>
        <button class="pv2-mob-tab" data-tab="pvMobPanelChar"><span class="pv2-mob-tab-icon">⚔️</span><span class="pv2-mob-tab-label">Charakter</span></button>
        <button class="pv2-mob-tab" data-tab="pvMobPanelDice"><span class="pv2-mob-tab-icon">🎲</span><span class="pv2-mob-tab-label">Würfel</span></button>
        <button class="pv2-mob-tab" data-tab="pvMobPanelParty"><span class="pv2-mob-tab-icon">👥</span><span class="pv2-mob-tab-label">Gruppe</span></button>
      </nav>
    </div>

    <!-- ===== DESKTOP: original 3-column layout ===== -->
    <div class="pv2-shell" id="pvDesktop" style="display:none;">
      <!-- Left rail: character identity + core stats -->
      <aside class="pv2-rail" id="pvRail"></aside>

      <!-- Centre: map + decisions + dice -->
      <main class="pv2-centre">
        <div class="pv2-map-card" id="pvMapCard">
          <div class="pv2-map-header">
            <h3>🗺️ Karte</h3>
            <div class="pv2-map-tools">
              <button class="pv2-icon-btn" id="pvMapZoomIn" title="Zoom +">🔍+</button>
              <button class="pv2-icon-btn" id="pvMapZoomOut" title="Zoom −">🔍−</button>
              <button class="pv2-icon-btn" id="pvMapReset" title="Reset">↺</button>
            </div>
          </div>
          <div class="pv2-map-canvas" id="pvMapCanvasBox"></div>
        </div>

        <div class="pv2-bottom-row">
          <div class="pv2-decisions-card">
            <div class="pv2-card-header"><span>⚖️</span><h3>Abstimmungen</h3></div>
            <div class="pv2-decisions-body" id="pvDecisions"></div>
          </div>

          <div class="pv2-dice-card">
            <div class="pv2-card-header"><span>🎲</span><h3>Würfel</h3></div>
            <div class="pv2-dice-body" id="pvDiceBody"></div>
          </div>
        </div>
      </main>

      <!-- Right rail: party + notes -->
      <aside class="pv2-right-rail">
        <div class="pv2-party-card">
          <div class="pv2-card-header"><span>👥</span><h3>Gruppe</h3></div>
          <div class="pv2-party-list" id="pvPartyList"></div>
        </div>
        <div class="pv2-notes-card">
          <div class="pv2-card-header"><span>📝</span><h3>Notizen</h3></div>
          <textarea class="pv2-notes-area" id="pvNotesArea" placeholder="NPCs, Orte, Questziele…"></textarea>
          <div class="pv2-notes-hint">💾 Automatisch gespeichert</div>
        </div>
      </aside>
    </div>
  `;
  initHeader();

  let campaign = null, character = null, campaignPlayers = [], playerNameMap = {}, characterMap = {};
  let currentHP = 0, maxHP = 0, diceHistory = [], decisions = [], votedDecisions = {};
  let eventSource = null, currentTurnPlayerId = null, selectedDiceSides = 20;
  let playerMapCanvas = null, playerMapMarkers = [];
  let mobileMapCanvas = null;
  let fogExplorationData = null;
  const isMobile = () => window.innerWidth <= 768;

  function getScore(name) {
    if (!character?.abilityScores) return 10;
    const f = character.abilityScores.find(a => a.abilityName?.toLowerCase() === name.toLowerCase());
    return f ? f.score : 10;
  }
  function getProfBonus() { return Math.floor(((character?.level || 1) - 1) / 4) + 2; }

  // ===== SSE =====
  function connectSSE() {
    eventSource = new EventSource('/api/campaign/' + campaignId + '/sse');
    eventSource.addEventListener('turn', e => {
      const d = JSON.parse(e.data); currentTurnPlayerId = d.playerId;
      updateTurnBanner(d.playerId, d.playerName);
      renderParty();
    });
    eventSource.addEventListener('hp', e => {
      const d = JSON.parse(e.data);
      if (d.playerId === currentPlayer.id) {
        currentHP = d.currentHp; maxHP = d.maxHp; renderCoreStats();
        if (d.delta < 0) showToast('Du hast ' + Math.abs(d.delta) + ' Schaden erhalten! ❤️ ' + currentHP + '/' + maxHP, 'error');
        else if (d.delta > 0) showToast('Du wurdest um ' + d.delta + ' geheilt! ❤️ ' + currentHP + '/' + maxHP, 'success');
      }
    });
    eventSource.addEventListener('dice', e => {
      const d = JSON.parse(e.data);
      if (d.playerId !== currentPlayer.id) showDiceToast(d.playerName, d.diceType, d.result);
    });
    eventSource.addEventListener('decision', e => {
      const d = JSON.parse(e.data); decisions.push(d); renderDecisions(); if (isMobile()) renderMobDecisions();
      showToast('⚖️ Neue Abstimmung: ' + d.title, 'info');
    });
    eventSource.addEventListener('vote', e => {
      const d = JSON.parse(e.data); const dec = decisions.find(x => x.id === d.decisionId);
      if (dec) { dec.yes = d.yes; dec.no = d.no; renderDecisions(); if (isMobile()) renderMobDecisions(); }
    });
    eventSource.addEventListener('decision_resolved', e => {
      const d = JSON.parse(e.data); const dec = decisions.find(x => x.id === d.decisionId);
      if (dec) { dec.status = 'RESOLVED'; dec.yes = d.yes; dec.no = d.no; dec.decisionMade = d.decisionMade; renderDecisions(); if (isMobile()) renderMobDecisions(); }
    });
    eventSource.addEventListener('marker_add', e => {
      const m = JSON.parse(e.data);
      if (!playerMapMarkers.find(x => x.id === m.id)) { playerMapMarkers.push(m); syncPlayerMap(); }
    });
    eventSource.addEventListener('marker_move', e => {
      const d = JSON.parse(e.data);
      const m = playerMapMarkers.find(x => x.id === d.id);
      if (m) { m.x = d.x; m.y = d.y; syncPlayerMap(); }
    });
    eventSource.addEventListener('marker_remove', e => {
      const d = JSON.parse(e.data);
      playerMapMarkers = playerMapMarkers.filter(m => m.id !== d.id);
      syncPlayerMap();
    });
    eventSource.addEventListener('marker_group', e => {
      const d = JSON.parse(e.data);
      if (d.allMarkers) { playerMapMarkers = d.allMarkers; syncPlayerMap(); }
    });
    eventSource.addEventListener('undo', e => {
      const d = JSON.parse(e.data);
      if (d.allMarkers) { playerMapMarkers = d.allMarkers; syncPlayerMap(); }
      if (d.fogExploration) {
        if (playerMapCanvas) playerMapCanvas.loadExplorationData(d.fogExploration);
        if (mobileMapCanvas) mobileMapCanvas.loadExplorationData(d.fogExploration);
      }
    });
    eventSource.addEventListener('player_active', e => {
      renderParty();
    });
  }

  function syncPlayerMap() {
    if (playerMapCanvas) {
      playerMapCanvas.updateMarkers(playerMapMarkers);
    }
    if (mobileMapCanvas) {
      mobileMapCanvas.updateMarkers(playerMapMarkers);
    }
  }

  let turnBannerTimeout = null;
  function updateTurnBanner(playerId, playerName) {
    const b = document.getElementById('pvTurnBanner');
    clearTimeout(turnBannerTimeout);
    if (playerId === currentPlayer.id) {
      b.className = 'pv2-turn-banner my-turn visible';
      b.innerHTML = '<span class="pv2-turn-dot"></span> <strong>Du bist am Zug!</strong>';
    } else {
      b.className = 'pv2-turn-banner other-turn visible';
      b.innerHTML = '⏳ ' + esc(playerName || 'Ein Spieler') + ' ist am Zug';
    }
    // Auto-dismiss on mobile so it doesn't cover content
    if (isMobile()) {
      const delay = playerId === currentPlayer.id ? 8000 : 5000;
      turnBannerTimeout = setTimeout(() => {
        b.classList.remove('visible');
      }, delay);
    }
  }

  let toastTimeout = null;
  function showDiceToast(name, dt, result) {
    document.getElementById('pvToastTitle').textContent = '🎲 ' + name + ' würfelt ' + dt;
    document.getElementById('pvToastResult').textContent = result;
    document.getElementById('pvDiceToast').classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => document.getElementById('pvDiceToast').classList.remove('visible'), 4000);
  }

  // ===== LOAD =====
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
      try { const r = await fetch('/api/campaign/' + campaignId + '/game/map-markers', { cache: 'no-store' }); if (r.ok) playerMapMarkers = await r.json(); } catch(e) {}
      try { const r = await fetch('/api/campaign/' + campaignId + '/game/fog-exploration', { cache: 'no-store' }); if (r.ok) { const d = await r.json(); if (d.data) fogExplorationData = d.data; } } catch(e) {}

      connectSSE();
      renderAll();
      document.getElementById('pvLoading').style.display = 'none';
      if (isMobile()) {
        document.getElementById('pvMobile').style.display = 'flex';
        initMobileTabBar();
      } else {
        document.getElementById('pvDesktop').style.display = 'grid';
      }
    } catch (err) { document.getElementById('pvLoading').innerHTML = 'Fehler beim Laden.'; }
  }

  function renderAll() {
    if (isMobile()) {
      renderMobHero();
      renderMobCharFull();
      renderMobMap();
      renderMobDecisions();
      renderMobDice();
      renderMobParty();
      renderMobNotes();
    } else {
      renderRail();
      renderMap();
      renderDecisions();
      renderDice();
      renderParty();
      renderNotes();
    }
  }

  // ===== LEFT RAIL =====
  function renderRail() {
    const rail = document.getElementById('pvRail');
    const cn = character.characterClass?.name || 'Keine Klasse';
    const race = character.race || 'Unbekannt';
    const lvl = character.level || 1;
    const bgSkills = character.background?.skills ? character.background.skills.split(',').map(s => s.trim().toLowerCase()) : [];

    let html = `
      <div class="pv2-identity">
        <div class="pv2-avatar">${currentPlayer.profilePicture ? '<img src="' + esc(currentPlayer.profilePicture) + '" alt="">' : initials(character.name || currentPlayer.name)}</div>
        <div class="pv2-char-name">${esc(character.name)}</div>
        <div class="pv2-char-meta">${esc(race)} · ${esc(cn)}</div>
        <div class="pv2-level-badge">⭐ Stufe ${lvl}</div>
      </div>

      <div class="pv2-core-stats" id="pvCoreStats"></div>

      <div class="pv2-section">
        <div class="pv2-section-title">Attribute</div>
        <div class="pv2-abilities-grid">
          ${ABILITIES.map(name => {
            const s = getScore(name); const m = calcMod(s);
            return `<div class="pv2-ability">
              <div class="pv2-ability-icon">${ICONS[name]}</div>
              <div class="pv2-ability-abbr">${ABILITY_ABBR[name]}</div>
              <div class="pv2-ability-score">${s}</div>
              <div class="pv2-ability-mod ${m < 0 ? 'neg' : ''}">${fmtMod(m)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="pv2-section pv2-scrollable">
        <div class="pv2-section-title">Fertigkeiten</div>
        ${SKILLS.map(skill => {
          const m = calcMod(getScore(skill.ability));
          const prof = bgSkills.some(s => s === skill.name.toLowerCase());
          const bonus = prof ? m + getProfBonus() : m;
          return `<div class="pv2-skill-row">
            <span class="pv2-skill-dot ${prof ? 'prof' : ''}"></span>
            <span class="pv2-skill-name">${skill.de}</span>
            <span class="pv2-skill-bonus ${bonus >= 0 ? 'pos' : 'neg'}">${fmtMod(bonus)}</span>
          </div>`;
        }).join('')}
      </div>
    `;
    rail.innerHTML = html;
    renderCoreStats();
  }

  function renderCoreStats() {
    const el = document.getElementById('pvCoreStats');
    if (el) {
      const dexMod = calcMod(getScore('Dexterity'));
      const pct = maxHP > 0 ? Math.round((currentHP / maxHP) * 100) : 0;
      let hpColor = 'var(--accent-green)'; if (pct <= 50) hpColor = 'var(--gold)'; if (pct <= 25) hpColor = 'var(--danger)';
      el.innerHTML = `
        <div class="pv2-core-stat">
          <div class="pv2-core-icon" style="color:${hpColor}">❤️</div>
          <div class="pv2-core-val" style="color:${hpColor}">${currentHP}<span class="pv2-core-max">/${maxHP}</span></div>
          <div class="pv2-core-label">Trefferpunkte</div>
          <div class="pv2-hp-bar"><div class="pv2-hp-fill" style="width:${pct}%;background:${hpColor};"></div></div>
        </div>
        <div class="pv2-core-row">
          <div class="pv2-core-mini"><span>🛡️</span><strong>${10 + dexMod}</strong><small>RK</small></div>
          <div class="pv2-core-mini"><span>⚡</span><strong>${fmtMod(dexMod)}</strong><small>Initiative</small></div>
          <div class="pv2-core-mini"><span>🏃</span><strong>30</strong><small>Tempo</small></div>
          <div class="pv2-core-mini"><span>📐</span><strong>+${getProfBonus()}</strong><small>Übung</small></div>
        </div>
      `;
    }
    // Also update mobile hero if visible
    if (isMobile()) renderMobHero();
  }

  // ===== MAP =====
  function renderMap() {
    const box = document.getElementById('pvMapCanvasBox');
    if (!campaign.mapImagePath) {
      box.innerHTML = '<div class="pv2-no-map"><span>🗺️</span><p>Keine Karte verfügbar</p></div>';
      return;
    }
    const allPlayers = campaignPlayers
      .filter(cp => cp.role === 'PLAYER')
      .map(cp => ({ id: cp.playerId, name: playerNameMap[cp.playerId] || 'Spieler ' + cp.playerId }));

    playerMapCanvas = createMapCanvas(box, {
      mapImageUrl: resolveMapUrl(campaign.mapImagePath),
      markers: playerMapMarkers,
      readOnly: true,
      isMaximized: false,
      players: allPlayers,
      fogOfWar: true,
      fogSolid: true,
      initialExplorationData: fogExplorationData,
      gameStarted: true,
      onExplorationChange: (dataUrl) => {
        fetch('/api/campaign/' + campaignId + '/game/fog-exploration', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: dataUrl })
        }).catch(() => {});
      }
    });

    document.getElementById('pvMapZoomIn').addEventListener('click', () => { if (playerMapCanvas) playerMapCanvas.setZoom(Math.min(5, playerMapCanvas.getZoom() + 0.3)); });
    document.getElementById('pvMapZoomOut').addEventListener('click', () => { if (playerMapCanvas) playerMapCanvas.setZoom(Math.max(0.5, playerMapCanvas.getZoom() - 0.3)); });
    document.getElementById('pvMapReset').addEventListener('click', () => { if (playerMapCanvas) playerMapCanvas.resetView(); });
  }

// ===== DECISIONS =====
  function renderDecisions() {
    const container = document.getElementById('pvDecisions');
    if (!container) return;

    if (decisions.length === 0) {
      container.innerHTML = '<div class="pv2-empty">Keine Abstimmungen</div>';
      return;
    }

    container.innerHTML = decisions.slice().reverse().map(d => {
      const total = (d.yes || 0) + (d.no || 0);
      const yP = total > 0 ? Math.round((d.yes / total) * 100) : 0;
      const nP = total > 0 ? 100 - yP : 0;
      const voted = votedDecisions[d.id];
      const resolved = d.status === 'RESOLVED';

      let result = d.decisionMade || (d.yes >= d.no ? 'Ja' : 'Nein');
      let color = 'gray';
      if (d.yes > d.no) color = 'var(--accent-green)';
      else if (d.no > d.yes) color = '#ff8a80';

      let html = `<div class="pv2-decision ${resolved ? 'resolved' : ''}">
      <div class="pv2-decision-title">${esc(d.title || '')}${resolved ? ' ✅' : ''}</div>
      <div class="pv2-decision-desc">${esc(d.text || '')}</div>`;

      if (resolved) {
        html += `<div class="pv2-decision-result" style="color:${color}">Ergebnis: ${esc(result)}</div>`;
      } else if (!voted) {
        html += `<div class="pv2-vote-row">
        <button class="pv2-vote-btn yes" data-did="${d.id}" data-v="yes">👍 Ja</button>
        <button class="pv2-vote-btn no" data-did="${d.id}" data-v="no">👎 Nein</button>
      </div>`;
      } else {
        html += `<div class="pv2-vote-row">
        <button class="pv2-vote-btn yes voted" disabled>👍 ${d.yes}</button>
        <button class="pv2-vote-btn no voted" disabled>👎 ${d.no}</button>
      </div>`;
      }

      if (total > 0) {
        html += `<div class="pv2-vote-bar">
        <div class="pv2-vote-yes" style="width:${yP}%"></div>
      </div>
      <div class="pv2-vote-labels">
        <span class="yes">${yP}%</span>
        <span class="no">${nP}%</span>
      </div>`;
      }

      html += '</div>';
      return html;
    }).join('');

    container.querySelectorAll('.pv2-vote-btn[data-did]').forEach(btn => {
      btn.addEventListener('click', () => {
        const did = parseInt(btn.dataset.did);
        const vt = btn.dataset.v;

        if (votedDecisions[did]) return;

        votedDecisions[did] = vt;
        renderDecisions();

        const name = playerNameMap[currentPlayer.id] || currentPlayer.name || 'Unknown';

        fetch('/api/campaign/' + campaignId + '/game/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decisionId: did,
            vote: vt,
            playerName: name,
            playerId: currentPlayer.id
          })
        });
      });
    });
  }

  // ===== DICE =====
  function renderDice() {
    const el = document.getElementById('pvDiceBody');
    const types = [4, 6, 8, 10, 12, 20, 100];
    el.innerHTML = `
      <div class="pv2-dice-display"><div class="pv2-dice-type" id="pvDiceLabel">D20</div><div class="pv2-dice-value" id="pvDiceVal">—</div><div class="pv2-dice-fb" id="pvDiceFb"></div></div>
      <div class="pv2-dice-chips">${types.map(s => `<button class="pv2-dice-chip${s === 20 ? ' active' : ''}" data-sides="${s}">d${s}</button>`).join('')}</div>
      <button class="pv2-roll-btn" id="pvRollBtn">🎲 Würfeln</button>
      <div class="pv2-dice-manual"><input type="number" id="pvManualIn" min="1" placeholder="Manuell…"><button class="pv2-manual-btn" id="pvManualSet">Setzen</button></div>
      <div class="pv2-dice-history" id="pvDiceHist"><div class="pv2-hist-empty">Noch keine Würfe</div></div>
    `;
    el.querySelector('.pv2-dice-chips').addEventListener('click', e => {
      const c = e.target.closest('.pv2-dice-chip'); if (!c) return;
      el.querySelectorAll('.pv2-dice-chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active'); selectedDiceSides = parseInt(c.dataset.sides);
      document.getElementById('pvDiceLabel').textContent = 'D' + selectedDiceSides;
    });
    function showFb(msg, color) { const fb = document.getElementById('pvDiceFb'); fb.textContent = msg; fb.style.color = color; fb.style.opacity = '1'; setTimeout(() => { fb.style.opacity = '0'; }, 3000); }
    function renderHist() {
      const h = document.getElementById('pvDiceHist');
      if (diceHistory.length === 0) { h.innerHTML = '<div class="pv2-hist-empty">Noch keine Würfe</div>'; return; }
      h.innerHTML = diceHistory.map(e => `<div class="pv2-hist-row"><span class="pv2-hist-dice">${e.dice}</span><span class="pv2-hist-result">${e.result}</span><span class="pv2-hist-time">${e.time}</span></div>`).join('');
    }
    document.getElementById('pvRollBtn').addEventListener('click', () => {
      const manIn = document.getElementById('pvManualIn');
      if (manIn.value.trim() !== '') { showFb('Manuelles Ergebnis aktiv', 'var(--gold)'); return; }
      const rollBtn = document.getElementById('pvRollBtn'); rollBtn.disabled = true;
      let ticks = 0;
      const iv = setInterval(() => {
        document.getElementById('pvDiceVal').textContent = Math.floor(Math.random() * selectedDiceSides) + 1; ticks++;
        if (ticks >= 12) {
          clearInterval(iv); const f = Math.floor(Math.random() * selectedDiceSides) + 1;
          const r = document.getElementById('pvDiceVal');
          r.textContent = f; r.classList.remove('rolling'); void r.offsetWidth; r.classList.add('rolling');
          rollBtn.disabled = false;
          if (f === selectedDiceSides && selectedDiceSides === 20) showFb('🔥 Kritischer Treffer!', 'var(--accent-green)');
          else if (f === 1 && selectedDiceSides === 20) showFb('💀 Kritischer Fehlschlag!', 'var(--danger)');
          else showFb('🎲 Gewürfelt: ' + f, 'var(--accent-green)');
          diceHistory.unshift({ dice: 'd' + selectedDiceSides, result: f, time: new Date().toLocaleTimeString() });
          if (diceHistory.length > 20) diceHistory.pop(); renderHist();
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
      if (isNaN(val) || val < 1 || val > selectedDiceSides) { showFb('Ungültig', 'var(--danger)'); return; }
      const r = document.getElementById('pvDiceVal');
      r.textContent = val; r.classList.remove('rolling'); void r.offsetWidth; r.classList.add('rolling');
      showFb('✓ Manuell: ' + val, 'var(--accent-green)'); manIn.value = '';
      document.getElementById('pvRollBtn').disabled = false;
      diceHistory.unshift({ dice: 'd' + selectedDiceSides + ' (manuell)', result: val, time: new Date().toLocaleTimeString() }); renderHist();
      const myName = playerNameMap[currentPlayer.id] || currentPlayer.name;
      fetch('/api/campaign/' + campaignId + '/game/dice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: currentPlayer.id, playerName: myName, diceType: 'd' + selectedDiceSides, result: val }) });
    });
  }

  // ===== PARTY =====
  function renderParty() {
    const list = document.getElementById('pvPartyList'); if (!list) return;
    const html = buildPartyHtml();
    list.innerHTML = html;
    // Also update mobile party
    if (isMobile()) renderMobParty();
  }

  function buildPartyHtml() {
    return campaignPlayers.map(cp => {
      const name = playerNameMap[cp.playerId] || 'Spieler ' + cp.playerId;
      const isDM = cp.role === 'DM';
      const ch = characterMap[cp.playerId];
      const detail = isDM ? 'Spielleiter' : (ch ? [ch.race, ch.characterClass?.name].filter(Boolean).join(' · ') || 'Abenteurer' : 'Abenteurer');
      const isTurn = currentTurnPlayerId === cp.playerId;
      const isMe = cp.playerId === currentPlayer.id;
      return `<div class="pv2-party-member ${isTurn ? 'on-turn' : ''} ${isMe ? 'is-me' : ''}">
        <div class="pv2-party-avatar ${isDM ? 'dm' : ''}">${isDM ? '👑' : initials(ch ? ch.name : name)}</div>
        <div class="pv2-party-info">
          <div class="pv2-party-name">${esc(isDM ? name : (ch ? ch.name : name))}${isMe ? ' (Du)' : ''}${isTurn && !isDM ? ' 🟢' : ''}</div>
          <div class="pv2-party-detail">${esc(detail)}</div>
        </div>
        <span class="pv2-party-role ${isDM ? 'dm' : 'player'}">${cp.role}</span>
      </div>`;
    }).join('');
  }

  // ===== NOTES =====
  function renderNotes() {
    const key = 'notes_' + campaignId + '_' + currentPlayer.id;
    const area = document.getElementById('pvNotesArea');
    if (!area) return;
    area.value = localStorage.getItem(key) || '';
    let t;
    area.addEventListener('input', function() {
      clearTimeout(t); t = setTimeout(() => localStorage.setItem(key, this.value), 500);
    });
  }

  // =============================================
  //  MOBILE-SPECIFIC RENDERERS
  // =============================================

  function initMobileTabBar() {
    const bar = document.getElementById('pvMobTabBar');
    if (!bar) return;
    bar.addEventListener('click', e => {
      const tab = e.target.closest('.pv2-mob-tab');
      if (!tab) return;
      const target = tab.dataset.tab;
      bar.querySelectorAll('.pv2-mob-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.pv2-mob-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(target);
      if (panel) panel.classList.add('active');
      // resize map when switching to map tab
      if (target === 'pvMobPanelMap' && mobileMapCanvas) {
        setTimeout(() => mobileMapCanvas.resize(), 50);
      }
    });
    // Drawer toggle
    const drawerToggle = document.getElementById('pvMobDrawerToggle');
    const drawer = document.getElementById('pvMobDrawer');
    if (drawerToggle && drawer) {
      drawerToggle.addEventListener('click', () => {
        drawer.classList.toggle('open');
      });
    }
  }

  function renderMobHero() {
    const el = document.getElementById('pvMobHero');
    if (!el) return;
    const cn = character.characterClass?.name || '';
    const race = character.race || '';
    const pct = maxHP > 0 ? Math.round((currentHP / maxHP) * 100) : 0;
    let hpColor = 'var(--accent-green)'; if (pct <= 50) hpColor = 'var(--gold)'; if (pct <= 25) hpColor = 'var(--danger)';
    const dexMod = calcMod(getScore('Dexterity'));
    el.innerHTML = `
      <div class="pv2-mob-hero-left">
        <div class="pv2-mob-avatar">${currentPlayer.profilePicture ? '<img src="' + esc(currentPlayer.profilePicture) + '" alt="">' : initials(character.name || currentPlayer.name)}</div>
        <div class="pv2-mob-hero-info">
          <div class="pv2-mob-hero-name">${esc(character.name)}</div>
          <div class="pv2-mob-hero-meta">${esc(race)}${race && cn ? ' · ' : ''}${esc(cn)} · Stufe ${character.level || 1}</div>
        </div>
      </div>
      <div class="pv2-mob-hero-stats">
        <div class="pv2-mob-hp">
          <span class="pv2-mob-hp-text" style="color:${hpColor}">❤️ ${currentHP}/${maxHP}</span>
          <div class="pv2-mob-hp-bar"><div class="pv2-mob-hp-fill" style="width:${pct}%;background:${hpColor};"></div></div>
        </div>
        <div class="pv2-mob-mini-stats">
          <span title="Rüstungsklasse">🛡️${10 + dexMod}</span>
          <span title="Initiative">⚡${fmtMod(dexMod)}</span>
          <span title="Übungsbonus">📐+${getProfBonus()}</span>
        </div>
      </div>
    `;
  }

  function renderMobCharFull() {
    const el = document.getElementById('pvMobCharFull');
    if (!el) return;
    const cn = character.characterClass?.name || 'Keine Klasse';
    const race = character.race || 'Unbekannt';
    const lvl = character.level || 1;
    const bgSkills = character.background?.skills ? character.background.skills.split(',').map(s => s.trim().toLowerCase()) : [];
    const pct = maxHP > 0 ? Math.round((currentHP / maxHP) * 100) : 0;
    let hpColor = 'var(--accent-green)'; if (pct <= 50) hpColor = 'var(--gold)'; if (pct <= 25) hpColor = 'var(--danger)';
    const dexMod = calcMod(getScore('Dexterity'));

    el.innerHTML = `
      <div class="pv2-mob-char-identity">
        <div class="pv2-avatar">${currentPlayer.profilePicture ? '<img src="' + esc(currentPlayer.profilePicture) + '" alt="">' : initials(character.name || currentPlayer.name)}</div>
        <div class="pv2-char-name">${esc(character.name)}</div>
        <div class="pv2-char-meta">${esc(race)} · ${esc(cn)}</div>
        <div class="pv2-level-badge">⭐ Stufe ${lvl}</div>
      </div>
      <div class="pv2-mob-char-hp">
        <div class="pv2-core-stat">
          <div class="pv2-core-icon" style="color:${hpColor}">❤️</div>
          <div class="pv2-core-val" style="color:${hpColor}">${currentHP}<span class="pv2-core-max">/${maxHP}</span></div>
          <div class="pv2-core-label">Trefferpunkte</div>
          <div class="pv2-hp-bar"><div class="pv2-hp-fill" style="width:${pct}%;background:${hpColor};"></div></div>
        </div>
        <div class="pv2-core-row">
          <div class="pv2-core-mini"><span>🛡️</span><strong>${10 + dexMod}</strong><small>RK</small></div>
          <div class="pv2-core-mini"><span>⚡</span><strong>${fmtMod(dexMod)}</strong><small>Initiative</small></div>
          <div class="pv2-core-mini"><span>🏃</span><strong>30</strong><small>Tempo</small></div>
          <div class="pv2-core-mini"><span>📐</span><strong>+${getProfBonus()}</strong><small>Übung</small></div>
        </div>
      </div>
      <div class="pv2-mob-char-section">
        <div class="pv2-section-title">Attribute</div>
        <div class="pv2-abilities-grid pv2-mob-abilities-grid">
          ${ABILITIES.map(name => {
            const s = getScore(name); const m = calcMod(s);
            return `<div class="pv2-ability">
              <div class="pv2-ability-icon">${ICONS[name]}</div>
              <div class="pv2-ability-abbr">${ABILITY_ABBR[name]}</div>
              <div class="pv2-ability-score">${s}</div>
              <div class="pv2-ability-mod ${m < 0 ? 'neg' : ''}">${fmtMod(m)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="pv2-mob-char-section">
        <div class="pv2-section-title">Fertigkeiten</div>
        <div class="pv2-mob-skills-list">
          ${SKILLS.map(skill => {
            const m = calcMod(getScore(skill.ability));
            const prof = bgSkills.some(s => s === skill.name.toLowerCase());
            const bonus = prof ? m + getProfBonus() : m;
            return `<div class="pv2-skill-row">
              <span class="pv2-skill-dot ${prof ? 'prof' : ''}"></span>
              <span class="pv2-skill-name">${skill.de}</span>
              <span class="pv2-skill-bonus ${bonus >= 0 ? 'pos' : 'neg'}">${fmtMod(bonus)}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderMobMap() {
    const box = document.getElementById('pvMobMapCanvasBox');
    if (!box) return;
    if (!campaign.mapImagePath) {
      box.innerHTML = `<div class="pv2-mob-no-map">
        <div class="pv2-mob-no-map-icon">🗺️</div>
        <div class="pv2-mob-no-map-title">Keine Karte</div>
        <div class="pv2-mob-no-map-sub">Der DM hat noch keine Karte hochgeladen</div>
      </div>`;
      return;
    }
    const allPlayers = campaignPlayers
      .filter(cp => cp.role === 'PLAYER')
      .map(cp => ({ id: cp.playerId, name: playerNameMap[cp.playerId] || 'Spieler ' + cp.playerId }));

    mobileMapCanvas = createMapCanvas(box, {
      mapImageUrl: resolveMapUrl(campaign.mapImagePath),
      markers: playerMapMarkers,
      readOnly: true,
      isMaximized: false,
      players: allPlayers,
      fogOfWar: true,
      fogSolid: true,
      initialExplorationData: fogExplorationData,
      gameStarted: true,
      onExplorationChange: (dataUrl) => {
        fetch('/api/campaign/' + campaignId + '/game/fog-exploration', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: dataUrl })
        }).catch(() => {});
      }
    });

    const zoomIn = document.getElementById('pvMobMapZoomIn');
    const zoomOut = document.getElementById('pvMobMapZoomOut');
    const reset = document.getElementById('pvMobMapReset');
    if (zoomIn) zoomIn.addEventListener('click', () => { if (mobileMapCanvas) mobileMapCanvas.setZoom(Math.min(5, mobileMapCanvas.getZoom() + 0.3)); });
    if (zoomOut) zoomOut.addEventListener('click', () => { if (mobileMapCanvas) mobileMapCanvas.setZoom(Math.max(0.5, mobileMapCanvas.getZoom() - 0.3)); });
    if (reset) reset.addEventListener('click', () => { if (mobileMapCanvas) mobileMapCanvas.resetView(); });
  }

  function renderMobDecisions() {
    const container = document.getElementById('pvMobDecisions'); if (!container) return;
    // Update badge
    const badge = document.getElementById('pvMobDecisionBadge');
    const activeCount = decisions.filter(d => d.status !== 'RESOLVED').length;
    if (badge) {
      badge.textContent = activeCount > 0 ? activeCount : '';
      badge.style.display = activeCount > 0 ? 'inline-flex' : 'none';
    }
    if (decisions.length === 0) { container.innerHTML = '<div class="pv2-mob-drawer-empty">Keine aktiven Abstimmungen</div>'; return; }
    container.innerHTML = decisions.slice().reverse().map(d => {
      const total = (d.yes || 0) + (d.no || 0);
      const yP = total > 0 ? Math.round((d.yes / total) * 100) : 0;
      const nP = total > 0 ? 100 - yP : 0;
      const voted = votedDecisions[d.id];
      const resolved = d.status === 'RESOLVED';
      let html = `<div class="pv2-decision ${resolved ? 'resolved' : ''}">
        <div class="pv2-decision-title">${esc(d.title || '')}${resolved ? ' ✅' : ''}</div>
        <div class="pv2-decision-desc">${esc(d.text || '')}</div>`;
      if (resolved) html += `<div class="pv2-decision-result">Ergebnis: ${esc(d.decisionMade || (d.yes >= d.no ? 'Ja' : 'Nein'))}</div>`;
      else if (!voted) html += `<div class="pv2-vote-row"><button class="pv2-vote-btn yes" data-did="${d.id}" data-v="yes">👍 Ja</button><button class="pv2-vote-btn no" data-did="${d.id}" data-v="no">👎 Nein</button></div>`;
      else html += `<div class="pv2-vote-row"><button class="pv2-vote-btn yes voted" disabled>👍 ${d.yes}</button><button class="pv2-vote-btn no voted" disabled>👎 ${d.no}</button></div>`;
      if (total > 0) html += `<div class="pv2-vote-bar"><div class="pv2-vote-yes" style="width:${yP}%"></div></div><div class="pv2-vote-labels"><span class="yes">${yP}%</span><span class="no">${nP}%</span></div>`;
      html += '</div>';
      return html;
    }).join('');
    container.querySelectorAll('.pv2-vote-btn[data-did]').forEach(btn => {
      btn.addEventListener('click', () => {
        const did = parseInt(btn.dataset.did); const vt = btn.dataset.v;
        if (votedDecisions[did]) return;
        votedDecisions[did] = vt; renderMobDecisions();
        const name = playerNameMap[currentPlayer.id] || currentPlayer.name || 'Unknown';
        fetch('/api/campaign/' + campaignId + '/game/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decisionId: did, vote: vt, playerName: name, playerId: currentPlayer.id }) });
      });
    });
  }

  function renderMobDice() {
    const el = document.getElementById('pvMobDiceBody');
    if (!el) return;
    const types = [4, 6, 8, 10, 12, 20, 100];
    el.innerHTML = `
      <div class="pv2-dice-display"><div class="pv2-dice-type" id="pvMobDiceLabel">D20</div><div class="pv2-dice-value" id="pvMobDiceVal">—</div><div class="pv2-dice-fb" id="pvMobDiceFb"></div></div>
      <div class="pv2-dice-chips">${types.map(s => `<button class="pv2-dice-chip${s === 20 ? ' active' : ''}" data-sides="${s}">d${s}</button>`).join('')}</div>
      <button class="pv2-roll-btn" id="pvMobRollBtn">🎲 Würfeln</button>
      <div class="pv2-dice-manual"><input type="number" id="pvMobManualIn" min="1" placeholder="Manuell…"><button class="pv2-manual-btn" id="pvMobManualSet">Setzen</button></div>
      <div class="pv2-dice-history" id="pvMobDiceHist"><div class="pv2-hist-empty">Noch keine Würfe</div></div>
    `;
    let mobSelectedDice = 20;
    el.querySelector('.pv2-dice-chips').addEventListener('click', e => {
      const c = e.target.closest('.pv2-dice-chip'); if (!c) return;
      el.querySelectorAll('.pv2-dice-chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active'); mobSelectedDice = parseInt(c.dataset.sides);
      selectedDiceSides = mobSelectedDice;
      document.getElementById('pvMobDiceLabel').textContent = 'D' + mobSelectedDice;
    });
    function showFb(msg, color) { const fb = document.getElementById('pvMobDiceFb'); if (fb) { fb.textContent = msg; fb.style.color = color; fb.style.opacity = '1'; setTimeout(() => { fb.style.opacity = '0'; }, 3000); } }
    function renderHist() {
      const h = document.getElementById('pvMobDiceHist');
      if (!h) return;
      if (diceHistory.length === 0) { h.innerHTML = '<div class="pv2-hist-empty">Noch keine Würfe</div>'; return; }
      h.innerHTML = diceHistory.map(e => `<div class="pv2-hist-row"><span class="pv2-hist-dice">${e.dice}</span><span class="pv2-hist-result">${e.result}</span><span class="pv2-hist-time">${e.time}</span></div>`).join('');
    }
    document.getElementById('pvMobRollBtn').addEventListener('click', () => {
      const manIn = document.getElementById('pvMobManualIn');
      if (manIn.value.trim() !== '') { showFb('Manuelles Ergebnis aktiv', 'var(--gold)'); return; }
      const rollBtn = document.getElementById('pvMobRollBtn'); rollBtn.disabled = true;
      let ticks = 0;
      const iv = setInterval(() => {
        document.getElementById('pvMobDiceVal').textContent = Math.floor(Math.random() * selectedDiceSides) + 1; ticks++;
        if (ticks >= 12) {
          clearInterval(iv); const f = Math.floor(Math.random() * selectedDiceSides) + 1;
          const r = document.getElementById('pvMobDiceVal');
          r.textContent = f; r.classList.remove('rolling'); void r.offsetWidth; r.classList.add('rolling');
          rollBtn.disabled = false;
          if (f === selectedDiceSides && selectedDiceSides === 20) showFb('🔥 Kritischer Treffer!', 'var(--accent-green)');
          else if (f === 1 && selectedDiceSides === 20) showFb('💀 Kritischer Fehlschlag!', 'var(--danger)');
          else showFb('🎲 Gewürfelt: ' + f, 'var(--accent-green)');
          diceHistory.unshift({ dice: 'd' + selectedDiceSides, result: f, time: new Date().toLocaleTimeString() });
          if (diceHistory.length > 20) diceHistory.pop(); renderHist();
          const myName = playerNameMap[currentPlayer.id] || currentPlayer.name || 'Spieler';
          fetch('/api/campaign/' + campaignId + '/game/dice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: currentPlayer.id, playerName: myName, diceType: 'd' + selectedDiceSides, result: f }) });
        }
      }, 55);
    });
    const manIn = document.getElementById('pvMobManualIn');
    manIn.addEventListener('input', () => { document.getElementById('pvMobRollBtn').disabled = manIn.value.trim() !== ''; });
    manIn.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('pvMobManualSet').click(); });
    document.getElementById('pvMobManualSet').addEventListener('click', () => {
      const val = parseInt(manIn.value);
      if (isNaN(val) || val < 1 || val > selectedDiceSides) { showFb('Ungültig', 'var(--danger)'); return; }
      const r = document.getElementById('pvMobDiceVal');
      r.textContent = val; r.classList.remove('rolling'); void r.offsetWidth; r.classList.add('rolling');
      showFb('✓ Manuell: ' + val, 'var(--accent-green)'); manIn.value = '';
      document.getElementById('pvMobRollBtn').disabled = false;
      diceHistory.unshift({ dice: 'd' + selectedDiceSides + ' (manuell)', result: val, time: new Date().toLocaleTimeString() }); renderHist();
      const myName = playerNameMap[currentPlayer.id] || currentPlayer.name;
      fetch('/api/campaign/' + campaignId + '/game/dice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: currentPlayer.id, playerName: myName, diceType: 'd' + selectedDiceSides, result: val }) });
    });
  }

  function renderMobParty() {
    const list = document.getElementById('pvMobPartyList'); if (!list) return;
    list.innerHTML = campaignPlayers.map(cp => {
      const name = playerNameMap[cp.playerId] || 'Spieler ' + cp.playerId;
      const isDM = cp.role === 'DM';
      const ch = characterMap[cp.playerId];
      const detail = isDM ? 'Spielleiter' : (ch ? [ch.race, ch.characterClass?.name].filter(Boolean).join(' · ') || 'Abenteurer' : 'Abenteurer');
      const isTurn = currentTurnPlayerId === cp.playerId;
      const isMe = cp.playerId === currentPlayer.id;
      return `<div class="pv2-party-member ${isTurn ? 'on-turn' : ''} ${isMe ? 'is-me' : ''}">
        <div class="pv2-party-avatar ${isDM ? 'dm' : ''}">${isDM ? '👑' : initials(ch ? ch.name : name)}</div>
        <div class="pv2-party-info">
          <div class="pv2-party-name">${esc(isDM ? name : (ch ? ch.name : name))}${isMe ? ' (Du)' : ''}${isTurn && !isDM ? ' 🟢' : ''}</div>
          <div class="pv2-party-detail">${esc(detail)}</div>
        </div>
        <span class="pv2-party-role ${isDM ? 'dm' : 'player'}">${cp.role}</span>
      </div>`;
    }).join('');
  }

  function renderMobNotes() {
    const key = 'notes_' + campaignId + '_' + currentPlayer.id;
    const area = document.getElementById('pvMobNotesArea');
    if (!area) return;
    area.value = localStorage.getItem(key) || '';
    let t;
    area.addEventListener('input', function() {
      clearTimeout(t); t = setTimeout(() => localStorage.setItem(key, this.value), 500);
    });
  }

  loadGame();

  return () => {
    destroyHeader();
    if (eventSource) { eventSource.close(); eventSource = null; }
    if (playerMapCanvas) { playerMapCanvas.destroy(); playerMapCanvas = null; }
    if (mobileMapCanvas) { mobileMapCanvas.destroy(); mobileMapCanvas = null; }
  };
}

