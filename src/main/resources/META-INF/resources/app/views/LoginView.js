/**
 * Login View – Dicekeeper branded login screen
 */
import { setPlayer } from '../services/auth.js';
import { navigate } from '../router.js';

export default async function LoginView() {
  const app = document.getElementById('app');
  document.body.classList.remove('has-header');

  app.innerHTML = `
    <div class="login-page">
      <div class="login-ambient"></div>
      <div class="login-card">
        <div class="login-brand">
          <div class="login-dice">
            <svg viewBox="0 0 100 100" class="login-dice-svg">
              <polygon points="50,2 95,27 95,73 50,98 5,73 5,27" fill="none" stroke="rgba(var(--primary-rgb),0.5)" stroke-width="2"/>
              <polygon points="50,2 95,27 50,50 5,27" fill="rgba(var(--primary-rgb),0.08)" stroke="rgba(var(--primary-rgb),0.3)" stroke-width="1"/>
              <polygon points="95,27 95,73 50,50" fill="rgba(var(--primary-rgb),0.05)" stroke="rgba(var(--primary-rgb),0.2)" stroke-width="1"/>
              <polygon points="5,27 50,50 5,73" fill="rgba(var(--primary-rgb),0.04)" stroke="rgba(var(--primary-rgb),0.15)" stroke-width="1"/>
              <text x="50" y="56" text-anchor="middle" fill="rgba(var(--primary-rgb),0.9)" font-size="22" font-weight="700" font-family="system-ui">20</text>
            </svg>
          </div>
          <h1 class="login-app-name">Dicekeeper</h1>
          <p class="login-tagline">Dein digitaler Spieltisch für Pen &amp; Paper</p>
        </div>

        <div class="login-form-section">
          <label for="email" class="login-label">E-Mail Adresse</label>
          <div class="login-input-wrap">
            <span class="login-input-icon">✉</span>
            <input type="email" id="email" name="email" class="login-input" placeholder="name@example.com" autocomplete="email" required />
          </div>
          <button type="button" class="login-submit" id="loginBtn">
            <span class="login-submit-text">Anmelden</span>
            <span class="login-submit-arrow">→</span>
          </button>
          <div id="loginStatus" class="login-status"></div>
        </div>
      </div>
      <div class="login-footer">© 2026 Dicekeeper — Roll with it.</div>
    </div>
  `;

  const emailInput = document.getElementById('email');
  const btn = document.getElementById('loginBtn');
  const statusEl = document.getElementById('loginStatus');

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg || '';
    statusEl.className = 'login-status' + (isError ? ' error' : msg ? ' info' : '');
  }

  async function login() {
    const email = (emailInput.value || '').trim();
    if (!email) { setStatus('Bitte gib eine E-Mail-Adresse ein.', true); emailInput.focus(); return; }
    btn.disabled = true;
    btn.querySelector('.login-submit-text').textContent = 'Wird angemeldet…';
    btn.querySelector('.login-submit-arrow').innerHTML = '<span class="login-spinner"></span>';
    setStatus('');
    try {
      const res = await fetch('/api/player/' + encodeURIComponent(email), { cache: 'no-store' });
      if (!res.ok) {
        let txt = null;
        try { txt = await res.text(); } catch (e) {}
        setStatus('Anmeldung fehlgeschlagen: ' + (txt || res.statusText || ('HTTP ' + res.status)), true);
        return;
      }
      const player = await res.json();
      setPlayer(player);
      setStatus('Willkommen zurück! Weiterleitung…');
      navigate('/campaigns');
    } catch (err) {
      setStatus('Anmeldung fehlgeschlagen: ' + (err.message || 'Unbekannter Fehler'), true);
    } finally {
      btn.disabled = false;
      btn.querySelector('.login-submit-text').textContent = 'Anmelden';
      btn.querySelector('.login-submit-arrow').textContent = '→';
    }
  }

  btn.addEventListener('click', login);
  emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); login(); } });

  // Auto-focus email field
  setTimeout(() => emailInput.focus(), 100);

  return () => {};
}
