/**
 * Login View – Keycloak sign-in entry point
 */
import { clearPlayer, getPlayer, sanitizeRedirectPath, startLogin, syncAuthenticatedPlayer } from '../services/auth.js';
import { navigate } from '../router.js';

export default async function LoginView() {
  const app = document.getElementById('app');
  document.body.classList.remove('has-header');

  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const isKeycloakCallback = params.get('kc') === '1';
  const loggedOut = params.get('logout') === '1';
  const keycloakError = params.get('kc_error');
  const keycloakErrorDescription = params.get('kc_error_description');
  const keycloakSessionExpired = params.get('kc_expired') === '1';
  const nextPath = sanitizeRedirectPath(params.get('next'), '/campaigns');

  if (getPlayer() && !isKeycloakCallback && !loggedOut && !keycloakError && !keycloakSessionExpired) {
    navigate(nextPath);
    return;
  }

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
          <label class="login-label">Account</label>
          <div class="login-input-wrap" style="padding:16px 18px;">
            <span class="login-input-icon">🔐</span>
            <div>
              <div style="font-weight:600;color:white;">Anmeldung über Keycloak</div>
              <div style="font-size:0.92rem;color:rgba(255,255,255,0.65);">Du wirst zu deinem zentralen Login weitergeleitet.</div>
            </div>
          </div>
          <button type="button" class="login-submit" id="loginBtn">
            <span class="login-submit-text">Mit Keycloak anmelden</span>
            <span class="login-submit-arrow">→</span>
          </button>
          <div id="loginStatus" class="login-status"></div>
        </div>
      </div>
      <div class="login-footer">© 2026 Dicekeeper — Roll with it.</div>
    </div>
  `;

  const btn = document.getElementById('loginBtn');
  const statusEl = document.getElementById('loginStatus');

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg || '';
    statusEl.className = 'login-status' + (isError ? ' error' : msg ? ' info' : '');
  }

  function renderKeycloakError() {
    if (keycloakSessionExpired) {
      setStatus('Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.', true);
      return;
    }

    if (!keycloakError && !keycloakErrorDescription) {
      return;
    }

    if (keycloakErrorDescription === 'authentication_expired') {
      setStatus('Die Anmeldung in diesem Tab ist abgelaufen. Wenn die Verifizierung bereits im neuen Fenster geklappt hat, kannst du dieses Fenster schließen oder dich hier erneut anmelden.', true);
      return;
    }

    const detail = keycloakErrorDescription || keycloakError || 'Unbekannter Fehler';
    setStatus('Keycloak-Fehler: ' + detail, true);
  }

  async function completeKeycloakLogin() {
    btn.disabled = true;
    btn.querySelector('.login-submit-text').textContent = 'Authentifiziere…';
    btn.querySelector('.login-submit-arrow').innerHTML = '<span class="login-spinner"></span>';
    setStatus('Synchronisiere Benutzerprofil…');
    try {
      await syncAuthenticatedPlayer();
      setStatus('Anmeldung erfolgreich. Weiterleitung…');
      navigate(nextPath);
    } catch (err) {
      setStatus('Anmeldung fehlgeschlagen: ' + (err.message || 'Unbekannter Fehler'), true);
    } finally {
      btn.disabled = false;
      btn.querySelector('.login-submit-text').textContent = 'Mit Keycloak anmelden';
      btn.querySelector('.login-submit-arrow').textContent = '→';
    }
  }

  btn.addEventListener('click', () => {
    setStatus('Weiterleitung zu Keycloak…');
    startLogin(nextPath);
  });

  if (loggedOut) {
    clearPlayer();
    setStatus('Du wurdest abgemeldet.');
  }

  renderKeycloakError();

  if (isKeycloakCallback) {
    completeKeycloakLogin();
  }

  return () => {};
}
