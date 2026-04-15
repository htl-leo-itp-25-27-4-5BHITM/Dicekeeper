/**
 * Profile View
 */
import { logout, requirePlayer, setPlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { initials, renderAvatarPicture } from '../services/utils.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { getTheme, toggleTheme } from '../services/theme.js';

function renderProfileAvatarMedia(profilePicture) {
  return renderAvatarPicture(profilePicture, {
    cssSize: 120,
    alt: 'Profilbild',
    imgId: 'pvImg',
    pictureStyle: 'position:absolute;inset:0;display:block;width:100%;height:100%;',
    imgStyle: 'width:100%;height:100%;object-fit:cover;display:block;'
  });
}

export default async function ProfileView() {
  const player = requirePlayer();
  if (!player) return;

  const app = document.getElementById('app');
  document.body.classList.add('has-header');

  const isAccessible = getTheme() === 'accessible';

  app.innerHTML = renderHeader() + `
    <div class="profile-page">
      <div class="card" style="max-width:480px;margin:0 auto;">
        <a href="#/campaigns" class="back-link">\u2190 Zur\u00fcck zu Kampagnen</a>
        <div class="card-header" style="text-align:center;"><div class="card-title">Profil</div></div>
        <div class="profile-section" style="display:flex;flex-direction:column;align-items:center;margin-bottom:28px;">
          <div class="profile-avatar" id="pvAvatar" title="Klicke um Profilbild zu \u00e4ndern" style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg, var(--avatar-start), var(--avatar-end));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:42px;color:var(--avatar-text);cursor:pointer;overflow:hidden;margin-bottom:16px;position:relative;">
            <span id="pvInitials" style="${player.profilePicture ? 'display:none;' : ''}">${initials(player.name || player.username)}</span>
            <div id="pvImageSlot" style="position:absolute;inset:0;${player.profilePicture ? '' : 'display:none;'}">${renderProfileAvatarMedia(player.profilePicture)}</div>
            <div style="position:absolute;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;border-radius:50%;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0"><span style="color:white;font-size:14px;">\u00c4ndern</span></div>
          </div>
          <input type="file" id="pvFileInput" accept="image/png,image/jpeg,image/svg+xml" style="display:none;" />
          <div style="font-size:14px;color:rgba(255,255,255,0.7);" id="pvEmail">${player.email || '-'}</div>
        </div>
        <div class="form-group"><label>Benutzername</label><input type="text" id="pvUsername" value="${player.username || ''}" placeholder="Dein Benutzername" maxlength="50" /></div>
        <div class="form-group"><label>Anzeigename</label><input type="text" id="pvName" value="${player.name || ''}" placeholder="Dein Anzeigename" maxlength="100" /></div>
        <button class="btn btn-primary" id="pvSave" style="width:100%;margin-bottom:12px;">\u00c4nderungen speichern</button>
        <button class="btn btn-secondary" id="pvBack" style="width:100%;margin-bottom:12px;">Abbrechen</button>

        <div class="divider"><span>Darstellung</span></div>
        <div class="theme-toggle-row" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;">
          <div>
            <div style="font-size:14px;font-weight:600;color:white;">Barrierefreie Farben</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.5);">Lila/Blau-Palette f\u00fcr bessere Lesbarkeit</div>
          </div>
          <button class="theme-toggle-btn ${isAccessible ? 'active' : ''}" id="pvThemeToggle" role="switch" aria-checked="${isAccessible}" aria-label="Barrierefreies Farbschema umschalten">
            <span class="theme-toggle-knob"></span>
          </button>
        </div>

        <div class="divider"><span>Session</span></div>
        <button class="btn btn-danger" id="pvLogout" style="width:100%;">Abmelden</button>
        <div id="pvStatus" style="margin-top:16px;font-size:0.9rem;text-align:center;min-height:24px;"></div>
      </div>
    </div>
  `;
  initHeader();

  let currentPlayer = player;

  // Fetch latest
  try {
    const r = await fetch('/api/player/id/' + player.id, { cache: 'no-store' });
    if (r.ok) { currentPlayer = await r.json(); setPlayer(currentPlayer); }
  } catch (e) {}

  function setStatus(msg, isError) {
    const el = document.getElementById('pvStatus');
    el.textContent = msg;
    el.style.color = isError ? 'var(--status-error)' : 'var(--green-success)';
  }

  document.getElementById('pvAvatar').addEventListener('click', () => document.getElementById('pvFileInput').click());
  document.getElementById('pvFileInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await fetch('/api/player/' + currentPlayer.id + '/upload-profile-picture', { method: 'POST', body: fd });
      if (!r.ok) throw new Error(await r.text());
      currentPlayer = await r.json();
      setPlayer(currentPlayer);
      const imageSlot = document.getElementById('pvImageSlot');
      const initialsEl = document.getElementById('pvInitials');
      initialsEl.style.display = currentPlayer.profilePicture ? 'none' : '';
      imageSlot.style.display = currentPlayer.profilePicture ? 'block' : 'none';
      imageSlot.innerHTML = renderProfileAvatarMedia(currentPlayer.profilePicture);
      setStatus('Profilbild aktualisiert!', false);
    } catch (err) {
      setStatus('Upload fehlgeschlagen: ' + err.message, true);
    }
  });

  document.getElementById('pvSave').addEventListener('click', async () => {
    const btn = document.getElementById('pvSave');
    btn.disabled = true; btn.textContent = 'Speichern...';
    try {
      const payload = {};
      const u = document.getElementById('pvUsername').value.trim();
      const n = document.getElementById('pvName').value.trim();
      if (u) payload.username = u;
      if (n) payload.name = n;
      const r = await fetch('/api/player/' + currentPlayer.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(await r.text());
      currentPlayer = await r.json();
      setPlayer(currentPlayer);
      setStatus('Profil gespeichert!', false);
    } catch (err) {
      setStatus('Fehler: ' + err.message, true);
    } finally { btn.disabled = false; btn.textContent = '\u00c4nderungen speichern'; }
  });

  document.getElementById('pvThemeToggle').addEventListener('click', () => {
    const newTheme = toggleTheme();
    const btn = document.getElementById('pvThemeToggle');
    btn.classList.toggle('active', newTheme === 'accessible');
    btn.setAttribute('aria-checked', newTheme === 'accessible');
  });

  // Listen for global theme changes and sync UI
  function onThemeChangedProfile(e) {
    const theme = e?.detail?.theme || getTheme();
    const btn = document.getElementById('pvThemeToggle');
    if (btn) {
      btn.classList.toggle('active', theme === 'accessible');
      btn.setAttribute('aria-checked', theme === 'accessible');
    }
  }
  document.addEventListener('theme:changed', onThemeChangedProfile);

  document.getElementById('pvBack').addEventListener('click', () => navigate('/campaigns'));
  document.getElementById('pvLogout').addEventListener('click', logout);

  // Cleanup: remove our theme listener and destroy header when view is torn down
  return () => {
    document.removeEventListener('theme:changed', onThemeChangedProfile);
    destroyHeader();
  };
}
