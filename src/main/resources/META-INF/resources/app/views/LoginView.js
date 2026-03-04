/**
 * Login View – matches original Login.html exactly
 */
import { setPlayer } from '../services/auth.js';
import { navigate } from '../router.js';

export default async function LoginView() {
  const app = document.getElementById('app');
  document.body.classList.remove('has-header');

  app.innerHTML = `
    <div class="login-page">
      <div class="login-box" role="form" aria-labelledby="login-title">
        <h1 id="login-title" class="login-title">Login</h1>
        <div class="form-group">
          <label for="email" class="label">Email</label>
          <input type="email" id="email" name="email" class="input" placeholder="name@example.com" autocomplete="email" required />
        </div>
        <button type="button" class="btn-login" id="loginBtn">Sign in</button>
        <div id="loginStatus" style="margin-top:12px;font-size:0.95rem;color:#98a2b3;"></div>
      </div>
    </div>
  `;

  const emailInput = document.getElementById('email');
  const btn = document.getElementById('loginBtn');
  const statusEl = document.getElementById('loginStatus');

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg || '';
    statusEl.style.color = isError ? '#f97373' : '#98a2b3';
  }

  async function login() {
    const email = (emailInput.value || '').trim();
    if (!email) { setStatus('Bitte gib eine E-Mail-Adresse ein.', true); emailInput.focus(); return; }
    btn.disabled = true;
    const origText = btn.textContent;
    btn.textContent = 'Signing in...';
    setStatus('Logging in...');
    try {
      const res = await fetch('/api/player/' + encodeURIComponent(email), { cache: 'no-store' });
      if (!res.ok) {
        let txt = null;
        try { txt = await res.text(); } catch (e) {}
        setStatus('Login failed: ' + (txt || res.statusText || ('HTTP ' + res.status)), true);
        return;
      }
      const player = await res.json();
      setPlayer(player);
      setStatus('Login successful. Redirecting…');
      navigate('/campaigns');
    } catch (err) {
      setStatus('Login failed: ' + (err.message || 'Unknown error'), true);
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }

  btn.addEventListener('click', login);
  emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); login(); } });

  return () => {};
}
