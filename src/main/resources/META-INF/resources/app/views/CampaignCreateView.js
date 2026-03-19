/**
 * Campaign Create/Edit View
 */
import { requirePlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { showMapCropModal } from '../components/mapCropModal.js';
import { resolveMapUrl } from '../services/utils.js';

export default async function CampaignCreateView({ id }) {
  const player = requirePlayer();
  if (!player) return;

  const isEdit = id && id !== 'new';
  const app = document.getElementById('app');
  document.body.classList.add('has-header');

  app.innerHTML = renderHeader() + `
    <div class="campaign-create-page">
      <div class="card">
        <div class="card-header"><div class="card-title">${isEdit ? 'Kampagne bearbeiten' : 'Kampagne erstellen'}</div></div>
        <div class="form-row">
          <div class="form-group" style="flex:1;">
            <label for="ccName">Titel</label>
            <input type="text" id="ccName" placeholder="Titel der Kampagne" />
          </div>
          <div class="form-group" style="max-width:140px;">
            <label for="ccMaxPlayers">Max Spieler</label>
            <input type="number" id="ccMaxPlayers" min="1" max="99" value="4" />
          </div>
        </div>
        <div class="form-group">
          <label for="ccStory">Beschreibung</label>
          <textarea id="ccStory" maxlength="1000" placeholder="Kurze Beschreibung deiner Kampagne..."></textarea>
          <div class="char-info" id="ccDescChars">Zeichen: 1000</div>
        </div>
        <div class="form-group story-group">
          <label for="ccDmStory">Story (nur für dich sichtbar)</label>
          <textarea id="ccDmStory" maxlength="5000" placeholder="Deine private Storyline, Notizen, Plot-Punkte..."></textarea>
          <div class="char-info">🔒 Diese Story ist nur für den DM sichtbar</div>
        </div>
        <label style="font-size:13px;color:#e5e7eb;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;display:block;">Karte</label>
        <div class="image-upload" id="ccMapUpload">
          <span class="image-upload-icon">+</span>
          <span>
            <span class="image-upload-text-main">Karte hochladen</span><br>
            <span class="image-upload-text-sub">Klicke, um eine Karte auszuwählen</span>
          </span>
          <input type="file" accept="image/jpeg,image/png" style="display:none" id="ccMapFile" />
        </div>
        <div id="ccMapPreview" style="display:none;">
          <img id="ccMapImage" alt="Kampagnenkarte" src="" style="max-width:100%;max-height:200px;border-radius:8px;" />
          <p id="ccMapFileName" style="margin-top:8px;font-size:0.85rem;color:#9ca3af;"></p>
        </div>
        <div class="footer">
          <div>
            <div class="switch-label">Sichtbarkeit</div>
            <div class="switch-wrapper">
              <div class="switch public" id="ccVisibilitySwitch">
                <div class="switch-thumb"></div>
                <div class="switch-option option-public">Public</div>
                <div class="switch-option option-private">Private</div>
              </div>
              <span id="ccVisibilityText" style="font-size:12px;color:#fff;font-weight:bold">Kampagne ist öffentlich</span>
            </div>
          </div>
          <div class="button-row">
            <button class="btn btn-secondary" id="ccBackBtn">Abbrechen</button>
            <button class="btn btn-primary" id="ccCreateBtn">${isEdit ? 'Aktualisieren' : 'Speichern'}</button>
          </div>
        </div>
        <div id="ccStatus" style="margin-top:12px;font-size:0.9rem;color:#98a2b3;"></div>
      </div>
    </div>
  `;

  initHeader();

  const storyInput = document.getElementById('ccStory');
  const descChars = document.getElementById('ccDescChars');
  const switchEl = document.getElementById('ccVisibilitySwitch');
  const visibilityText = document.getElementById('ccVisibilityText');
  const mapInput = document.getElementById('ccMapFile');
  const statusEl = document.getElementById('ccStatus');
  let isPublic = true;
  let croppedMapBlob = null;

  storyInput.addEventListener('input', () => {
    descChars.textContent = 'Zeichen: ' + (storyInput.maxLength - storyInput.value.length);
  });

  switchEl.addEventListener('click', () => {
    isPublic = !isPublic;
    switchEl.classList.toggle('public', isPublic);
    switchEl.classList.toggle('private', !isPublic);
    visibilityText.textContent = isPublic ? 'Kampagne ist öffentlich' : 'Kampagne ist privat';
  });

  document.getElementById('ccMapUpload').addEventListener('click', () => mapInput.click());

  // Upload & Filter
  mapInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // 1️⃣ Dateityp prüfen
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setStatus('Nur JPG/JPEG/PNG Dateien erlaubt', true);
      mapInput.value = '';
      return;
    }

    // 2️⃣ Bild laden und Seitenverhältnis prüfen
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      const ratio = img.width / img.height;
      const allowedRatios = [1, 16/4, 21/9];

      // Funktion prüft ±15% Toleranz
      const isRatioOk = allowedRatios.some(r => {
        const lower = r * 0.4;
        const upper = r * 1.6;
        return ratio >= lower && ratio <= upper;
      });

      if (!isRatioOk) {
        setStatus('Seitenverhältnis erlaubt: 1:1, 16:4, 21:9 (+/- 15%)', true);
        mapInput.value = '';
        return;
      }

      // 3️⃣ Transparenz prüfen (nur für PNG)
      if (file.type === 'image/png') {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
        let transparent = false;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] < 255) {
            transparent = true;
            break;
          }
        }
        if (transparent) {
          setStatus('PNG darf keine Transparenz enthalten', true);
          mapInput.value = '';
          return;
        }
      }

      // 4️⃣ Crop Modal öffnen
      try {
        croppedMapBlob = await showMapCropModal(file);
        const url = URL.createObjectURL(croppedMapBlob);
        document.getElementById('ccMapImage').src = url;
        document.getElementById('ccMapFileName').textContent = file.name + ' (zugeschnitten)';
        document.getElementById('ccMapPreview').style.display = 'block';
      } catch {
        croppedMapBlob = null;
      }
    };

    img.onerror = () => {
      setStatus('Ungültige Bilddatei', true);
      mapInput.value = '';
    };
  });

  if (isEdit) {
    try {
      const res = await fetch('/api/campaign/' + encodeURIComponent(id) + '?playerId=' + player.id, { cache: 'no-store' });
      if (res.ok) {
        const c = await res.json();
        document.getElementById('ccName').value = c.name || '';
        storyInput.value = c.description || '';
        document.getElementById('ccDmStory').value = c.story || '';
        if (c.maxPlayerCount) document.getElementById('ccMaxPlayers').value = c.maxPlayerCount;
        isPublic = c.isPublic || false;
        switchEl.classList.toggle('public', isPublic);
        switchEl.classList.toggle('private', !isPublic);
        visibilityText.textContent = isPublic ? 'Kampagne ist öffentlich' : 'Kampagne ist privat';
        if (c.mapImagePath) {
          document.getElementById('ccMapImage').src = resolveMapUrl(c.mapImagePath);
          document.getElementById('ccMapFileName').textContent = 'Karte geladen';
          document.getElementById('ccMapPreview').style.display = 'block';
        }
      }
    } catch (err) {}
  }

  function setStatus(msg, isError) {
    if (msg) showToast(msg, isError ? 'error' : 'info');
  }

  document.getElementById('ccBackBtn').addEventListener('click', () => navigate('/campaigns'));

  document.getElementById('ccCreateBtn').addEventListener('click', async () => {
    const name = document.getElementById('ccName').value.trim();
    if (!name) { setStatus('Kampagnenname ist erforderlich.', true); return; }

    const btn = document.getElementById('ccCreateBtn');
    btn.disabled = true;
    setStatus(isEdit ? 'Aktualisiere...' : 'Erstelle...');

    try {
      const payload = {
        name,
        description: storyInput.value.trim(),
        story: document.getElementById('ccDmStory').value.trim(),
        playerId: Number(player.id),
        isPublic,
        maxPlayerCount: document.getElementById('ccMaxPlayers').value ? parseInt(document.getElementById('ccMaxPlayers').value) : null
      };

      let res;
      if (isEdit) {
        res = await fetch('/api/campaign/' + encodeURIComponent(id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) throw new Error(await res.text() || 'Fehler');
      const campaign = await res.json();

      if (croppedMapBlob) {
        const formData = new FormData();
        formData.append('file', croppedMapBlob, 'map-cropped.png');
        await fetch('/api/campaign/' + campaign.id + '/upload-map', { method: 'POST', body: formData });
      }

      navigate('/campaigns');
    } catch (err) {
      setStatus('Fehler: ' + (err.message || ''), true);
      btn.disabled = false;
    }
  });

  return () => { destroyHeader(); };
}