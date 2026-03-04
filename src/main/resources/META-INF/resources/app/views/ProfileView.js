/**
 * Profile View
 */
import { requirePlayer, setPlayer, clearPlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { initials } from '../services/utils.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';

export default async function ProfileView() {
  const player = requirePlayer();
  if (!player) return;

  const app = document.getElementById('app');
  document.body.classList.add('has-header');

  app.innerHTML = renderHeader() + `
    <div class="profile-page">
      <div class="card" style="max-width:480px;margin:0 auto;">
        <a href="#/campaigns" class="back-link">← Zurück zu Kampagnen</a>
        <div class="card-header" style="text-align:center;"><div class="card-title">Profil</div></div>
        <div class="profile-section" style="display:flex;flex-direction:column;align-items:center;margin-bottom:28px;">
          <div class="profile-avatar" id="pvAvatar" title="Klicke um Profilbild zu ändern" style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#6ee7b7,#34d399);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:42px;color:#064e3b;cursor:pointer;overflow:hidden;margin-bottom:16px;position:relative;">
            <span id="pvInitials">${initials(player.name || player.username)}</span>
            <img id="pvImg" src="${player.profilePicture || ''}" alt="" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;${player.profilePicture ? '' : 'display:none;'}" />
            <div style="position:absolute;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;border-radius:50%;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0"><span style="color:white;font-size:14px;">Ändern</span></div>
          </div>
          <input type="file" id="pvFileInput" accept="image/png,image/jpeg,image/svg+xml" style="display:none;" />
          <div style="font-size:14px;color:rgba(255,255,255,0.7);" id="pvEmail">${player.email || '-'}</div>
        </div>
        <div class="form-group"><label>Benutzername</label><input type="text" id="pvUsername" value="${player.username || ''}" placeholder="Dein Benutzername" maxlength="50" /></div>
        <div class="form-group"><label>Anzeigename</label><input type="text" id="pvName" value="${player.name || ''}" placeholder="Dein Anzeigename" maxlength="100" /></div>
        <button class="btn btn-primary" id="pvSave" style="width:100%;margin-bottom:12px;">Änderungen speichern</button>
        <button class="btn btn-secondary" id="pvBack" style="width:100%;margin-bottom:12px;">Abbrechen</button>
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
      document.getElementById('pvImg').src = currentPlayer.profilePicture;
      document.getElementById('pvImg').style.display = 'block';
      document.getElementById('pvStatus').textContent = 'Profilbild aktualisiert!';
      document.getElementById('pvStatus').style.color = '#81c784';
    } catch (err) {
      document.getElementById('pvStatus').textContent = 'Upload fehlgeschlagen: ' + err.message;
      document.getElementById('pvStatus').style.color = '#f97373';
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
      document.getElementById('pvStatus').textContent = 'Profil gespeichert!';
      document.getElementById('pvStatus').style.color = '#81c784';
    } catch (err) {
      document.getElementById('pvStatus').textContent = 'Fehler: ' + err.message;
      document.getElementById('pvStatus').style.color = '#f97373';
    } finally { btn.disabled = false; btn.textContent = 'Änderungen speichern'; }
  });

  document.getElementById('pvBack').addEventListener('click', () => navigate('/campaigns'));
  document.getElementById('pvLogout').addEventListener('click', () => { clearPlayer(); navigate('/login'); });

  return () => { destroyHeader(); };
}

