/**
 * Profile View
 */
import { clearPlayer, logout, requirePlayer, setPlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { esc, initials, renderAvatarPicture } from '../services/utils.js';
import { showToast } from '../components/toast.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { getTheme, toggleTheme } from '../services/theme.js';
import { runAccountDeletionFlow } from '../services/accountDeletion.js';

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
          <input type="file" id="pvFileInput" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif,.jpg,.jpeg,.png,.svg,.webp,.gif" style="display:none;" />
          <div id="pvAvatarHint" class="profile-avatar-hint" role="status" aria-live="polite">Klicke auf das Bild, um es zu ändern (JPG, PNG, SVG, WebP, GIF · max. 10 MB)</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.7);" id="pvEmail">${esc(player.email || '-')}</div>
        </div>
        <div class="form-group"><label>Benutzername</label><input type="text" id="pvUsername" value="${esc(player.username || '')}" placeholder="Dein Benutzername" maxlength="50" /></div>
        <div class="form-group"><label>Anzeigename</label><input type="text" id="pvName" value="${esc(player.name || '')}" placeholder="Dein Anzeigename" maxlength="100" /></div>
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
        <div class="divider"><span>Gefahrenbereich</span></div>
        <div class="profile-danger-copy">
          Dein Account wird dauerhaft gelöscht. Dazu gehören dein Dicekeeper-Profil, deine Mitgliedschaften und dein Keycloak-Konto.
        </div>
        <button class="btn btn-danger" id="pvDeleteAccount" style="width:100%;">Account endgültig löschen</button>
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
    if (el) {
      el.textContent = msg;
      el.style.color = isError ? 'var(--status-error)' : 'var(--green-success)';
    }
    if (msg) showToast(msg, isError ? 'error' : 'success');
  }

  // ===== Profile picture: pick → preview → save with "Änderungen speichern" =====
  const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
  const DIRECT_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif'];
  const DIRECT_EXT = /\.(png|jpe?g|svg|webp|gif)$/i;
  let pendingAvatar = null;   // File/Blob that will be uploaded on save
  let previewUrl = null;

  function setAvatarHint(msg, kind = '') {
    const hint = document.getElementById('pvAvatarHint');
    if (!hint) return;
    hint.textContent = msg;
    hint.className = 'profile-avatar-hint' + (kind ? ' ' + kind : '');
  }

  function showAvatar(innerHtml) {
    const imageSlot = document.getElementById('pvImageSlot');
    const initialsEl = document.getElementById('pvInitials');
    initialsEl.style.display = innerHtml ? 'none' : '';
    imageSlot.style.display = innerHtml ? 'block' : 'none';
    imageSlot.innerHTML = innerHtml || '';
  }

  function updateHeaderAvatar() {
    const headerAvatar = document.getElementById('userAvatar');
    if (!headerAvatar || !currentPlayer.profilePicture) return;
    headerAvatar.innerHTML = renderAvatarPicture(currentPlayer.profilePicture, { cssSize: 40, alt: 'Avatar', loading: 'eager' });
  }

  /** Converts formats the server does not store (e.g. BMP, AVIF) to PNG via canvas. */
  function convertToPng(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const max = 1024;
          const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => {
            URL.revokeObjectURL(url);
            if (!blob) { reject(new Error('Bild konnte nicht umgewandelt werden')); return; }
            resolve(new File([blob], (file.name || 'avatar').replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' }));
          }, 'image/png');
        } catch (err) { URL.revokeObjectURL(url); reject(err); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Dieses Bildformat wird nicht unterstützt. Bitte JPG, PNG, SVG, WebP oder GIF verwenden.')); };
      img.src = url;
    });
  }

  document.getElementById('pvAvatar').addEventListener('click', () => document.getElementById('pvFileInput').click());
  document.getElementById('pvFileInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarHint('Datei ist zu groß (max. 10 MB).', 'error');
      showToast('Profilbild zu groß (max. 10 MB)', 'error');
      return;
    }
    let prepared = file;
    try {
      const direct = DIRECT_TYPES.includes(file.type) && DIRECT_EXT.test(file.name || '');
      if (!direct) prepared = await convertToPng(file);
    } catch (err) {
      setAvatarHint(err.message, 'error');
      showToast(err.message, 'error');
      return;
    }
    pendingAvatar = prepared;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(prepared);
    showAvatar(`<img id="pvImg" src="${previewUrl}" alt="Neues Profilbild" style="width:100%;height:100%;object-fit:cover;display:block;">`);
    setAvatarHint('Neues Bild ausgewählt – klicke auf „Änderungen speichern“, um es zu übernehmen.', 'pending');
    document.getElementById('pvSave').classList.add('has-pending');
  });

  async function uploadPendingAvatar() {
    const fd = new FormData();
    fd.append('file', pendingAvatar, pendingAvatar.name || 'avatar.png');
    const r = await fetch('/api/player/' + currentPlayer.id + '/upload-profile-picture', { method: 'POST', body: fd });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      throw new Error(r.status === 413 ? 'Datei ist zu groß' : (text || 'Upload fehlgeschlagen (HTTP ' + r.status + ')'));
    }
    currentPlayer = await r.json();
    setPlayer(currentPlayer);
    pendingAvatar = null;
  }

  document.getElementById('pvSave').addEventListener('click', async () => {
    const btn = document.getElementById('pvSave');
    btn.disabled = true; btn.textContent = 'Speichern...';
    const saved = [];
    try {
      if (pendingAvatar) {
        try {
          await uploadPendingAvatar();
          saved.push('Profilbild');
          showAvatar(renderProfileAvatarMedia(currentPlayer.profilePicture));
          updateHeaderAvatar();
          setAvatarHint('Profilbild gespeichert ✓', 'success');
        } catch (err) {
          setAvatarHint('Profilbild nicht gespeichert: ' + err.message, 'error');
          throw new Error('Profilbild konnte nicht gespeichert werden: ' + err.message);
        }
      }

      const payload = {};
      const u = document.getElementById('pvUsername').value.trim();
      const n = document.getElementById('pvName').value.trim();
      if (u && u !== (currentPlayer.username || '')) payload.username = u;
      if (n && n !== (currentPlayer.name || '')) payload.name = n;
      if (Object.keys(payload).length > 0) {
        const r = await fetch('/api/player/' + currentPlayer.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!r.ok) throw new Error(await r.text() || 'Profil konnte nicht gespeichert werden');
        currentPlayer = await r.json();
        setPlayer(currentPlayer);
        saved.push('Profildaten');
        const headerName = document.querySelector('#userProfile .user-name');
        if (headerName && currentPlayer.username) headerName.textContent = currentPlayer.username;
      }

      if (saved.length === 0) setStatus('Keine Änderungen zum Speichern', false);
      else setStatus(saved.join(' und ') + ' gespeichert ✓', false);
      btn.classList.remove('has-pending');
    } catch (err) {
      setStatus('Fehler: ' + err.message, true);
    } finally { btn.disabled = false; btn.textContent = 'Änderungen speichern'; }
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
  document.getElementById('pvDeleteAccount').addEventListener('click', async () => {
    const btn = document.getElementById('pvDeleteAccount');
    await runAccountDeletionFlow({
      confirmFn: () => prompt('Dieser Schritt löscht deinen Dicekeeper-Account und dein Keycloak-Konto dauerhaft. Tippe LÖSCHEN, um fortzufahren.'),
      button: btn,
      onStatus: setStatus,
      onComplete: () => {
        clearPlayer();
        sessionStorage.clear();
        localStorage.clear();
        window.location.assign('/');
      }
    });
  });

  // Cleanup: remove our theme listener and destroy header when view is torn down
  return () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    document.removeEventListener('theme:changed', onThemeChangedProfile);
    destroyHeader();
  };
}
