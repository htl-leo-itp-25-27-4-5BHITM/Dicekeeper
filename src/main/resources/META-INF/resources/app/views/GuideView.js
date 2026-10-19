/**
 * Getting Started / User Guide view.
 */
import { navigate } from '../router.js';
import { getPlayer } from '../services/auth.js';
import { esc, richText, teaser } from '../services/utils.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { getGuideSections, getGuideStats, getLandingGuideSteps } from '../guide/guideContent.js';

function roleLabel(audience) {
  switch (audience) {
    case 'dm': return 'DM';
    case 'player': return 'Spieler';
    case 'new': return 'Start';
    default: return 'Alle';
  }
}

function renderList(items, className) {
  if (!items || items.length === 0) return '';
  return `<ul class="${className}">${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function renderSection(section, index) {
  return `
    <article class="guide-section" id="guide-${esc(section.id)}">
      <div class="guide-section-marker">${index + 1}</div>
      <div class="guide-section-body">
        <div class="guide-section-kicker">${esc(roleLabel(section.audience))}</div>
        <h2>${esc(section.title)}</h2>
        ${section.summary ? `<p class="guide-section-summary">${esc(section.summary)}</p>` : ''}
        ${renderList(section.steps, 'guide-steps-list')}
        <div class="guide-section-meta">
          ${section.capabilities && section.capabilities.length ? `
            <div>
              <span class="guide-meta-label">Funktionen</span>
              ${renderList(section.capabilities, 'guide-feature-list')}
            </div>
          ` : ''}
        </div>
      </div>
    </article>
  `;
}

export default async function GuideView() {
  const app = document.getElementById('app');
  const player = getPlayer();
  document.body.classList.toggle('has-header', Boolean(player));

  const sections = getGuideSections();
  const stats = getGuideStats();
  const quickSteps = getLandingGuideSteps();
  const header = player ? renderHeader() : '';

  app.innerHTML = header + `
    <div class="guide-page">
      <nav class="guide-topbar">
        <button class="guide-back-btn" id="guideBackBtn">${player ? 'Zur Kampagnenübersicht' : 'Zur Startseite'}</button>
        <a class="guide-brand" href="#/">Dicekeeper</a>
      </nav>

      <main class="guide-shell">
        <section class="guide-hero">
          <div class="guide-hero-copy">
            <p class="guide-eyebrow">Erste Schritte / Anleitung</p>
            <h1>Von Account bis Abenteuer</h1>
            <p>Diese Anleitung gibt dir einen klaren Überblick über Dicekeeper: vom ersten Login über Kampagnen und Charaktere bis zum gemeinsamen Spieltisch.</p>
            <div class="guide-stats" aria-label="Guide Umfang">
              <span><strong>${stats.sections}</strong> Kapitel</span>
              <span><strong>${stats.steps}</strong> Schritte</span>
              <span><strong>${stats.features}</strong> Funktionen</span>
            </div>
            <div class="guide-hero-actions">
              <button class="guide-primary-link" data-guide-target="guide-account">Loslegen</button>
              <button class="guide-secondary-link" data-guide-target="guide-player-play">Zum Spielen</button>
            </div>
          </div>
          <div class="guide-hero-visual" aria-label="Dicekeeper Ablaufgrafik">
            <img src="/images/Wuerfel20.png" alt="W20 Würfel" class="guide-dice-img">
            <div class="guide-flow">
              ${quickSteps.map(step => `
                <button data-guide-target="guide-${esc(step.id)}">
                  <strong>${esc(step.title)}</strong>
                  <span>${esc(step.summary || '')}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </section>

        <div class="guide-layout">
          <aside class="guide-toc">
            <div class="guide-toc-title">Inhalt</div>
            ${sections.map((section, index) => `<button data-guide-target="guide-${esc(section.id)}"><span>${index + 1}</span>${esc(section.title)}</button>`).join('')}
            <button data-guide-target="guide-classes"><span>⚔️</span>Klassen</button>
          </aside>
          <div class="guide-content">
            ${sections.map(renderSection).join('')}
            <article class="guide-section" id="guide-classes">
              <div class="guide-section-marker">⚔️</div>
              <div class="guide-section-body">
                <div class="guide-section-kicker">Alle</div>
                <h2>Klassen im Überblick</h2>
                <p class="guide-section-summary">Alle Klassen, die du bei der Charaktererstellung wählen kannst – auch ohne Kampagne einsehbar. „Stufe“ ist das Level deines Charakters (Start: Stufe 1); höhere Stufen erhöhen Lebenspunkte und Übungsbonus.</p>
                <div id="guideClassList" class="guide-class-list">${player ? '<div style="opacity:0.6">Lade Klassen…</div>' : '<div style="opacity:0.7">Melde dich an, um alle Klassen zu sehen.</div>'}</div>
              </div>
            </article>
          </div>
        </div>
      </main>
    </div>
  `;

  if (player) initHeader();

  document.getElementById('guideBackBtn').addEventListener('click', () => {
    navigate(player ? '/campaigns' : '/');
  });

  document.querySelectorAll('[data-guide-target]').forEach(button => {
    button.addEventListener('click', () => {
      document.getElementById(button.dataset.guideTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  if (player) {
    try {
      const r = await fetch('/api/classes', { cache: 'no-store' });
      const classes = r.ok ? await r.json() : [];
      const listEl = document.getElementById('guideClassList');
      if (listEl) {
        listEl.innerHTML = classes.length === 0
          ? '<div style="opacity:0.7">Keine Klassen gefunden.</div>'
          : classes.map(c => `<details class="guide-class-item"><summary><strong>${esc(c.name)}</strong><span>${esc(teaser(c.description, 110))}</span></summary><div class="guide-class-desc">${richText(c.description || '')}</div></details>`).join('');
      }
    } catch (e) {
      const listEl = document.getElementById('guideClassList');
      if (listEl) listEl.innerHTML = '<div style="opacity:0.7">Klassen konnten nicht geladen werden.</div>';
    }
  }

  const query = new URLSearchParams((window.location.hash.split('?')[1]) || '');
  if (query.get('section')) {
    document.getElementById('guide-' + query.get('section'))?.scrollIntoView({ block: 'start' });
  }

  return () => {
    if (player) destroyHeader();
  };
}
