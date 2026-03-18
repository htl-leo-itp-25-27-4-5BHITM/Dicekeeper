/**
 * Landing Page – standalone marketing page for Dicekeeper
 */
import { navigate } from '../router.js';
import { getPlayer } from '../services/auth.js';
import { getTheme, toggleTheme } from '../services/theme.js';

export default async function LandingView() {
  const app = document.getElementById('app');
  document.body.classList.remove('has-header');

  if (getPlayer()) { navigate('/campaigns'); return; }

  app.innerHTML = `
    <div class="lp">

      <!-- Navbar -->
      <nav class="lp-nav">
        <div class="lp-nav-inner">
          <div class="lp-nav-brand">
            <svg viewBox="0 0 100 100" class="lp-nav-dice">
              <polygon points="50,2 95,27 95,73 50,98 5,73 5,27" fill="none" stroke="rgba(var(--primary-rgb),0.6)" stroke-width="2.5"/>
              <text x="50" y="58" text-anchor="middle" fill="rgba(var(--primary-rgb),0.9)" font-size="26" font-weight="700" font-family="system-ui">20</text>
            </svg>
            <span>Dicekeeper</span>
          </div>
          <div class="lp-nav-right">
            <button class="lp-a11y-toggle" id="lpThemeToggle" title="Barrierefreie Farben">
              <span class="lp-a11y-icon">👁</span>
              <span class="lp-a11y-label">Barrierefreie Farben</span>
            </button>
            <button class="lp-nav-login" id="lpNavLogin">Anmelden</button>
          </div>
        </div>
      </nav>

      <!-- Hero – full viewport -->
      <section class="lp-hero">
        <div class="lp-hero-bg"></div>
        <div class="lp-hero-content">
          <h1>Dein digitaler<br>Spieltisch</h1>
          <p>Pen&nbsp;&&nbsp;Paper Abenteuer online erleben. Kampagnen leiten, Helden erschaffen, gemeinsam w\u00fcrfeln\u00a0\u2013 alles an einem Ort.</p>
          <div class="lp-hero-actions">
            <button class="lp-btn-primary" id="lpHeroCta">Kostenlos starten</button>
          </div>
        </div>
        <div class="lp-hero-scroll">
          <span>\u2193</span>
        </div>
      </section>

      <!-- Features -->
      <section class="lp-section lp-features-section">
        <div class="lp-container">
          <h2 class="lp-heading">Alles was du brauchst</h2>
          <p class="lp-subheading">Vier Werkzeuge, ein Spieltisch.</p>
          <div class="lp-features">
            <div class="lp-feature-card">
              <div class="lp-feature-icon">\u2694\uFE0F</div>
              <h3>Kampagnen</h3>
              <p>Erstelle Welten, lade Spieler ein und steuere den gesamten Spielverlauf als Spielleiter.</p>
            </div>
            <div class="lp-feature-card">
              <div class="lp-feature-icon">\uD83E\uDDD9</div>
              <h3>Charaktere</h3>
              <p>Klasse, Hintergrund, F\u00e4higkeiten \u2013 baue deinen Helden Schritt f\u00fcr Schritt zusammen.</p>
            </div>
            <div class="lp-feature-card">
              <div class="lp-feature-icon">\uD83D\uDDFA\uFE0F</div>
              <h3>Karten & Tokens</h3>
              <p>Lade Battlemap hoch, platziere Tokens und bewege sie live f\u00fcr alle Spieler sichtbar.</p>
            </div>
            <div class="lp-feature-card">
              <div class="lp-feature-icon">\uD83C\uDFB2</div>
              <h3>W\u00fcrfeln & K\u00e4mpfen</h3>
              <p>W\u00fcrfelproben, Initiative und Kampfrunden\u00a0\u2013 direkt am digitalen Tisch.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- How it works -->
      <section class="lp-section lp-steps-section">
        <div class="lp-container">
          <h2 class="lp-heading">So funktioniert\u2019s</h2>
          <div class="lp-steps">
            <div class="lp-step">
              <div class="lp-step-num">1</div>
              <strong>Anmelden</strong>
              <span>Profil mit E-Mail erstellen</span>
            </div>
            <div class="lp-step-line"></div>
            <div class="lp-step">
              <div class="lp-step-num">2</div>
              <strong>Kampagne w\u00e4hlen</strong>
              <span>Eigene starten oder beitreten</span>
            </div>
            <div class="lp-step-line"></div>
            <div class="lp-step">
              <div class="lp-step-num">3</div>
              <strong>Held erstellen</strong>
              <span>Charakter bauen & freigeben lassen</span>
            </div>
            <div class="lp-step-line"></div>
            <div class="lp-step">
              <div class="lp-step-num">4</div>
              <strong>Losw\u00fcrfeln</strong>
              <span>An den Spieltisch & spielen</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Final CTA -->
      <section class="lp-section lp-cta-section">
        <div class="lp-container lp-cta-inner">
          <h2>Bereit f\u00fcr dein n\u00e4chstes Abenteuer?</h2>
          <p>Erstelle deinen Account in Sekunden und starte deine erste Kampagne.</p>
          <button class="lp-btn-primary" id="lpBottomCta">Jetzt loslegen</button>
        </div>
      </section>

      <!-- Footer -->
      <footer class="lp-footer">
        <div class="lp-footer-inner">
          <span>&copy; 2026 Dicekeeper</span>
          <span>Roll with it.</span>
        </div>
      </footer>

    </div>
  `;

  const goLogin = () => navigate('/login');
  document.getElementById('lpNavLogin').addEventListener('click', goLogin);
  document.getElementById('lpHeroCta').addEventListener('click', goLogin);
  document.getElementById('lpBottomCta').addEventListener('click', goLogin);

  // Theme toggle
  const themeBtn = document.getElementById('lpThemeToggle');
  if (getTheme() === 'accessible') themeBtn.classList.add('active');
  themeBtn.addEventListener('click', () => {
    const next = toggleTheme();
    themeBtn.classList.toggle('active', next === 'accessible');
  });

  return () => {};
}