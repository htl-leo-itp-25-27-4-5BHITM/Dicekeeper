/**
 * Campaign Create/Edit View
 */
import { requirePlayer } from '../services/auth.js';
import { navigate } from '../router.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { showMapCropModal } from '../components/mapCropModal.js';
import { esc, getActiveCampaignMap, getCampaignMaps, renderMapPicture } from '../services/utils.js';
import { bindMaxPlayerCountValidation, readMaxPlayerCount } from '../services/campaignValidation.js';
import { blobToDataUrl, clearSessionDraft, dataUrlToBlob, readSessionDraft, writeSessionDraft } from '../services/sessionDraft.js';

const MAX_CAMPAIGN_MAPS = 5;

function renderPreviewMap(mapImagePath) {
  return renderMapPicture(mapImagePath, {
    variant: 'preview',
    alt: 'Kampagnenkarte',
    imgId: 'ccMapImage',
    pictureStyle: 'display:block;width:100%;',
    imgStyle: 'max-width:100%;max-height:200px;border-radius:8px;display:block;'
  });
}

export default async function CampaignCreateView({ id }) {
  const player = requirePlayer();
  if (!player) return;

  const isEdit = id && id !== 'new';
  const draftKey = 'dicekeeper:campaign-create:draft';
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
            <input type="number" id="ccMaxPlayers" min="1" step="1" value="4" aria-describedby="ccMaxPlayersError" />
            <div id="ccMaxPlayersError" role="alert" style="display:none;color:var(--danger);font-size:12px;margin-top:4px;"></div>
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
          <input type="file" accept="image/jpeg,image/png" multiple style="display:none" id="ccMapFile" />
        </div>
        <div id="ccMapPreview" style="display:none;">
          <div id="ccMapSelector" style="display:none;margin-bottom:8px;"></div>
          <div id="ccMapMedia">
            <img id="ccMapImage" alt="Kampagnenkarte" src="" style="max-width:100%;max-height:200px;border-radius:8px;display:block;" />
          </div>
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
  const maxPlayersInput = document.getElementById('ccMaxPlayers');
  const validateMaxPlayers = bindMaxPlayerCountValidation(
    maxPlayersInput,
    document.getElementById('ccMaxPlayersError'),
    updateEditDirtyState
  );
  let isPublic = true;
  let campaignState = null;
  let pendingMaps = [];
  let selectedMapIndex = 0;
  let initialEditState = null;
  let isRestoringDraft = false;

  storyInput.addEventListener('input', () => {
    descChars.textContent = 'Zeichen: ' + (storyInput.maxLength - storyInput.value.length);
    updateEditDirtyState();
    saveCreateDraft();
  });

  switchEl.addEventListener('click', () => {
    isPublic = !isPublic;
    switchEl.classList.toggle('public', isPublic);
    switchEl.classList.toggle('private', !isPublic);
    visibilityText.textContent = isPublic ? 'Kampagne ist öffentlich' : 'Kampagne ist privat';
    updateEditDirtyState();
    saveCreateDraft();
  });

  document.getElementById('ccMapUpload').addEventListener('click', () => mapInput.click());

  function getEditableMaps() {
    return isEdit ? getCampaignMaps(campaignState) : pendingMaps;
  }

  function updateUploadState() {
    const count = getEditableMaps().length;
    const upload = document.getElementById('ccMapUpload');
    const main = upload.querySelector('.image-upload-text-main');
    const sub = upload.querySelector('.image-upload-text-sub');
    const isFull = count >= MAX_CAMPAIGN_MAPS;
    upload.style.opacity = isFull ? '0.55' : '';
    upload.style.pointerEvents = isFull ? 'none' : '';
    main.textContent = isFull ? 'Maximal 5 Karten erreicht' : 'Karte hochladen';
    sub.textContent = `Karten ${count}/${MAX_CAMPAIGN_MAPS}`;
  }

  function renderMapState() {
    const maps = getEditableMaps();
    const preview = document.getElementById('ccMapPreview');
    const selector = document.getElementById('ccMapSelector');
    const mapMedia = document.getElementById('ccMapMedia');
    const fileName = document.getElementById('ccMapFileName');

    if (maps.length === 0) {
      preview.style.display = 'none';
      selector.style.display = 'none';
      mapMedia.innerHTML = '<img id="ccMapImage" alt="Kampagnenkarte" src="" style="max-width:100%;max-height:200px;border-radius:8px;display:block;" />';
      fileName.textContent = '';
      updateUploadState();
      updateEditDirtyState();
      return;
    }

    const active = isEdit
      ? (getActiveCampaignMap(campaignState) || maps[0])
      : maps[Math.max(0, Math.min(selectedMapIndex, maps.length - 1))];

    preview.style.display = 'block';
    selector.style.display = maps.length > 1 ? 'block' : 'none';
    selector.innerHTML = maps.length > 1
      ? `<select id="ccMapSelect" style="width:100%;">${maps.map((m, index) => {
          const value = isEdit ? m.index : index;
          const selected = active && (isEdit ? m.path === active.path : index === selectedMapIndex) ? 'selected' : '';
          return `<option value="${value}" ${selected}>${esc(m.name || ('Karte ' + (index + 1)))}</option>`;
        }).join('')}</select>`
      : '';
    mapMedia.innerHTML = renderPreviewMap(active.path);
    fileName.textContent = `Karten ${maps.length}/${MAX_CAMPAIGN_MAPS}`;

    const select = document.getElementById('ccMapSelect');
    if (select) {
      select.addEventListener('change', async () => {
        selectedMapIndex = parseInt(select.value, 10);
        if (isEdit) {
          const res = await fetch('/api/campaign/' + encodeURIComponent(id) + '/selected-map', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selectedMapIndex })
          });
          if (res.ok) campaignState = await res.json();
        }
        renderMapState();
      });
    }
    updateUploadState();
    updateEditDirtyState();
    saveCreateDraft();
  }

  function getCreateDraftData() {
    return {
      name: document.getElementById('ccName').value,
      description: storyInput.value,
      story: document.getElementById('ccDmStory').value,
      maxPlayerCount: maxPlayersInput.value,
      isPublic,
      selectedMapIndex,
      maps: pendingMaps.map((map, index) => ({
        index,
        name: map.name,
        dataUrl: map.dataUrl
      })).filter(map => map.dataUrl)
    };
  }

  function saveCreateDraft() {
    if (isEdit || isRestoringDraft) return;
    writeSessionDraft(draftKey, getCreateDraftData());
  }

  function clearCreateDraft() {
    clearSessionDraft(draftKey);
  }

  async function restoreCreateDraft() {
    if (isEdit) return;
    const draft = readSessionDraft(draftKey);
    if (!draft || typeof draft !== 'object') return;

    isRestoringDraft = true;
    document.getElementById('ccName').value = draft.name || '';
    storyInput.value = draft.description || '';
    document.getElementById('ccDmStory').value = draft.story || '';
    maxPlayersInput.value = draft.maxPlayerCount !== undefined && draft.maxPlayerCount !== null ? draft.maxPlayerCount : '4';
    isPublic = draft.isPublic !== false;
    selectedMapIndex = Math.max(0, Number(draft.selectedMapIndex) || 0);

    switchEl.classList.toggle('public', isPublic);
    switchEl.classList.toggle('private', !isPublic);
    visibilityText.textContent = isPublic ? 'Kampagne ist öffentlich' : 'Kampagne ist privat';
    descChars.textContent = 'Zeichen: ' + (storyInput.maxLength - storyInput.value.length);

    pendingMaps = [];
    for (const [index, map] of (draft.maps || []).entries()) {
      if (!map.dataUrl) continue;
      try {
        const blob = await dataUrlToBlob(map.dataUrl);
        pendingMaps.push({
          index,
          name: map.name || ('Karte ' + (index + 1)),
          path: URL.createObjectURL(blob),
          blob,
          dataUrl: map.dataUrl,
          selected: false
        });
      } catch (e) {
        // Skip unreadable map draft entries.
      }
    }
    if (pendingMaps.length > 0) selectedMapIndex = Math.min(selectedMapIndex, pendingMaps.length - 1);
    isRestoringDraft = false;
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Ungültige Bilddatei'));
      };
      img.src = objectUrl;
    });
  }

  async function validateMapFile(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Nur JPG/JPEG/PNG Dateien erlaubt');
    }

    const img = await loadImage(file);
    const ratio = img.width / img.height;
    const allowedRatios = [1, 16/4, 21/9];
    const isRatioOk = allowedRatios.some(r => {
      const lower = r * 0.4;
      const upper = r * 1.6;
      return ratio >= lower && ratio <= upper;
    });
    if (!isRatioOk) {
      throw new Error('Seitenverhältnis erlaubt: 1:1, 16:4, 21:9 (+/- 15%)');
    }

    if (file.type === 'image/png') {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 255) throw new Error('PNG darf keine Transparenz enthalten');
      }
    }
  }

  async function uploadMapBlob(campaignId, blob) {
    const formData = new FormData();
    formData.append('file', blob, 'map-cropped.png');
    const res = await fetch('/api/campaign/' + campaignId + '/upload-map', { method: 'POST', body: formData });
    if (!res.ok) throw new Error(await res.text() || 'Karten-Upload fehlgeschlagen');
    return res.json();
  }

  function getMapSignature() {
    return getEditableMaps().map(m => m.path).join('|') + '::' + selectedMapIndex;
  }

  function getCurrentEditState() {
    return {
      name: document.getElementById('ccName').value.trim(),
      description: storyInput.value.trim(),
      story: document.getElementById('ccDmStory').value.trim(),
      isPublic,
      maxPlayerCount: readMaxPlayerCount(maxPlayersInput).value,
      maps: getMapSignature()
    };
  }

  function snapshotEditState() {
    if (!isEdit) return;
    initialEditState = getCurrentEditState();
  }

  function updateEditDirtyState() {
    if (!isEdit || !initialEditState) return;
    const btn = document.getElementById('ccCreateBtn');
    const current = getCurrentEditState();
    const isDirty = Object.keys(initialEditState).some(key => current[key] !== initialEditState[key]);
    btn.disabled = !isDirty;
  }

  // Upload & Filter
  mapInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const existingCount = getEditableMaps().length;
    if (existingCount >= MAX_CAMPAIGN_MAPS || existingCount + files.length > MAX_CAMPAIGN_MAPS) {
      setStatus('Maximal 5 Karten pro Kampagne', true);
      mapInput.value = '';
      updateUploadState();
      return;
    }

    for (const file of files) {
      try {
        await validateMapFile(file);
        const croppedMapBlob = await showMapCropModal(file);
        const url = URL.createObjectURL(croppedMapBlob);

        if (isEdit) {
          campaignState = await uploadMapBlob(id, croppedMapBlob);
          selectedMapIndex = Number.isFinite(Number(campaignState.selectedMapIndex)) ? Number(campaignState.selectedMapIndex) : getCampaignMaps(campaignState).length - 1;
          URL.revokeObjectURL(url);
        } else {
          const dataUrl = await blobToDataUrl(croppedMapBlob);
          pendingMaps.push({
            index: pendingMaps.length,
            name: 'Karte ' + (pendingMaps.length + 1),
            path: url,
            blob: croppedMapBlob,
            dataUrl,
            selected: false
          });
          selectedMapIndex = pendingMaps.length - 1;
        }
        renderMapState();
      } catch (err) {
        setStatus(err.message || 'Karte konnte nicht verarbeitet werden', true);
      }
    }
    mapInput.value = '';
  });

  if (isEdit) {
    try {
      const res = await fetch('/api/campaign/' + encodeURIComponent(id) + '?playerId=' + player.id, { cache: 'no-store' });
      if (res.ok) {
        const c = await res.json();
        campaignState = c;
        document.getElementById('ccName').value = c.name || '';
        storyInput.value = c.description || '';
        document.getElementById('ccDmStory').value = c.story || '';
        if (c.maxPlayerCount !== null && c.maxPlayerCount !== undefined) maxPlayersInput.value = c.maxPlayerCount;
        isPublic = c.isPublic || false;
        switchEl.classList.toggle('public', isPublic);
        switchEl.classList.toggle('private', !isPublic);
        visibilityText.textContent = isPublic ? 'Kampagne ist öffentlich' : 'Kampagne ist privat';
        selectedMapIndex = Number.isFinite(Number(c.selectedMapIndex)) ? Number(c.selectedMapIndex) : 0;
        renderMapState();
        snapshotEditState();
        updateEditDirtyState();
      }
    } catch (err) {}
  }
  await restoreCreateDraft();
  renderMapState();

  ['ccName', 'ccMaxPlayers', 'ccDmStory'].forEach(inputId => {
    document.getElementById(inputId).addEventListener('input', () => {
      updateEditDirtyState();
      saveCreateDraft();
    });
    document.getElementById(inputId).addEventListener('change', saveCreateDraft);
  });

  function setStatus(msg, isError) {
    if (msg) showToast(msg, isError ? 'error' : 'info');
  }

  document.getElementById('ccBackBtn').addEventListener('click', () => navigate('/campaigns'));

  document.getElementById('ccCreateBtn').addEventListener('click', async () => {
    const btn = document.getElementById('ccCreateBtn');
    if (isEdit && btn.disabled) return;
    const name = document.getElementById('ccName').value.trim();
    if (!name) { setStatus('Kampagnenname ist erforderlich.', true); return; }
    const maxPlayers = validateMaxPlayers();
    if (!maxPlayers.valid) {
      setStatus(maxPlayers.message, true);
      maxPlayersInput.focus();
      return;
    }

    btn.disabled = true;
    setStatus(isEdit ? 'Aktualisiere...' : 'Erstelle...');

    try {
      const payload = {
        name,
        description: storyInput.value.trim(),
        story: document.getElementById('ccDmStory').value.trim(),
        playerId: Number(player.id),
        isPublic,
        maxPlayerCount: maxPlayers.value
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
      let campaign = await res.json();

      if (!isEdit && pendingMaps.length > 0) {
        for (const map of pendingMaps) {
          campaign = await uploadMapBlob(campaign.id, map.blob);
        }
      }

      if (!isEdit) clearCreateDraft();
      navigate('/campaigns');
    } catch (err) {
      setStatus('Fehler: ' + (err.message || ''), true);
      btn.disabled = false;
    }
  });

  return () => { destroyHeader(); };
}
