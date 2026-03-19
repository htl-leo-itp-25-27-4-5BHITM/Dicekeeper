export function showMapCropModal(imageFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => openCropUI(img, resolve, reject);
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(imageFile);
  });
}

function openCropUI(img, resolve, reject) {
  const overlay = document.createElement('div');
  overlay.className = 'map-crop-overlay';

  overlay.innerHTML = `
    <div class="map-crop-modal">
      <div class="map-crop-header">
        <h3>🗺️ Karte zuschneiden</h3>
        <p>Ziehe den Rahmen oder nutze Custom.</p>
      </div>

      <div class="map-crop-canvas-wrap">
        <canvas class="map-crop-canvas" id="mcCanvas"></canvas>
      </div>

      <div class="map-crop-controls">
        <span>Seitenverhältnis:</span>
      
        <div class="ratio-box" data-ratio="1" style="display:inline-block;padding:4px 8px;margin:2px;border:1px solid #ccc;cursor:pointer;">1:1</div>
        <div class="ratio-box" data-ratio="16/4" style="display:inline-block;padding:4px 8px;margin:2px;border:1px solid #ccc;cursor:pointer;">16:4</div>
        <div class="ratio-box" data-ratio="21/9" style="display:inline-block;padding:4px 8px;margin:2px;border:1px solid #ccc;cursor:pointer;">21:9</div>
        <div class="ratio-box" id="customBtn" style="display:inline-block;padding:4px 8px;margin:2px;border:1px solid #ccc;cursor:pointer;">Custom</div>
      
        <label style="margin-left:12px;">
          Größe:
          <input type="range" id="mcSizeSlider" min="5" max="100" value="80">
        </label>
      </div>

      <div class="map-crop-actions">
        <button class="btn btn-secondary" id="mcCancel">Abbrechen</button>
        <button class="btn btn-primary" id="mcConfirm">✓ Bestätigen</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const canvas = document.getElementById('mcCanvas');
  const ctx = canvas.getContext('2d');

  const maxW = Math.min(600, window.innerWidth - 80);
  const maxH = Math.min(500, window.innerHeight - 250);
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);

  const dispW = Math.floor(img.width * scale);
  const dispH = Math.floor(img.height * scale);

  canvas.width = dispW;
  canvas.height = dispH;

  let cropRatio = 1;
  let cropW = dispW * 0.8;
  let cropH = dispH * 0.8;
  let cropX = 0;
  let cropY = 0;

  let customMode = false;
  let dragging = false;
  let resizing = false;
  let resizeDir = null;
  let dragStart = {};

  const slider = document.getElementById('mcSizeSlider');

  function centerCrop() {
    cropX = Math.floor((dispW - cropW) / 2);
    cropY = Math.floor((dispH - cropH) / 2);
  }

  function getMaxCropSize() {
    let maxW = dispW;
    let maxH = maxW / cropRatio;
    if (maxH > dispH) {
      maxH = dispH;
      maxW = maxH * cropRatio;
    }
    return { maxW, maxH };
  }

  function updateCropFromSlider() {
    const pct = slider.value / 100;

    if (customMode) {
      const maxSize = Math.min(dispW, dispH);
      const minSize = Math.floor(maxSize * 0.05); // min 5% der Größe
      cropW = Math.floor(minSize + pct * (maxSize - minSize));
      cropH = cropW; // quadratisch
    } else {
      const { maxW, maxH } = getMaxCropSize();
      const minCropW = Math.floor(maxW * 0.05);
      cropW = Math.floor(minCropW + pct * (maxW - minCropW));
      cropH = Math.floor(cropW / cropRatio);
    }

    centerCrop();
    clamp();
    draw();
  }

  slider.addEventListener('input', updateCropFromSlider);

  overlay.querySelectorAll('.ratio-box').forEach(div => {
    div.addEventListener('click', () => {
      overlay.querySelectorAll('.ratio-box').forEach(d => d.classList.remove('active'));

      if (div.id === 'customBtn') {
        customMode = true;
        updateCropFromSlider(); // Slider kontrolliert Größe
      } else {
        customMode = false;
        cropRatio = parseFloat(eval(div.dataset.ratio));
        updateCropFromSlider();
      }

      div.classList.add('active');
    });
  });

  function clamp() {
    cropX = Math.max(0, Math.min(dispW - cropW, cropX));
    cropY = Math.max(0, Math.min(dispH - cropH, cropY));
  }

  function getResizeDir(mx, my) {
    const m = 10;
    const left = Math.abs(mx - cropX) < m;
    const right = Math.abs(mx - (cropX + cropW)) < m;
    const top = Math.abs(my - cropY) < m;
    const bottom = Math.abs(my - (cropY + cropH)) < m;

    if (top && left) return 'tl';
    if (top && right) return 'tr';
    if (bottom && left) return 'bl';
    if (bottom && right) return 'br';
    if (left) return 'l';
    if (right) return 'r';
    if (top) return 't';
    if (bottom) return 'b';
    return null;
  }

  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const dir = getResizeDir(mx, my);

    if (dir && customMode) {
      resizing = true;
      resizeDir = dir;
      return;
    }

    if (mx > cropX && mx < cropX + cropW && my > cropY && my < cropY + cropH) {
      dragging = true;
      dragStart = { mx, my, cx: cropX, cy: cropY };
    }
  });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (resizing) {
      if (resizeDir.includes('r')) cropW = mx - cropX;
      if (resizeDir.includes('b')) cropH = my - cropY;
      if (resizeDir.includes('l')) {
        cropW += cropX - mx;
        cropX = mx;
      }
      if (resizeDir.includes('t')) {
        cropH += cropY - my;
        cropY = my;
      }

      clamp();
      draw();
      return;
    }

    if (!dragging) return;

    cropX = dragStart.cx + (mx - dragStart.mx);
    cropY = dragStart.cy + (my - dragStart.my);
    clamp();
    draw();
  });

  canvas.addEventListener('mouseup', () => {
    dragging = false;
    resizing = false;
  });

  canvas.addEventListener('mouseleave', () => {
    dragging = false;
    resizing = false;
  });

  document.getElementById('mcCancel').onclick = () => {
    overlay.remove();
    reject(new Error('Cancelled'));
  };

  document.getElementById('mcConfirm').onclick = () => {
    const srcX = Math.floor(cropX / scale);
    const srcY = Math.floor(cropY / scale);
    const srcW = Math.floor(cropW / scale);
    const srcH = Math.floor(cropH / scale);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = srcW;
    outCanvas.height = srcH;

    const outCtx = outCanvas.getContext('2d');
    outCtx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

    outCanvas.toBlob(blob => {
      overlay.remove();
      resolve(blob);
    }, 'image/png', 0.92);
  };

  function draw() {
    ctx.clearRect(0, 0, dispW, dispH);
    ctx.drawImage(img, 0, 0, dispW, dispH);

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, dispW, cropY);
    ctx.fillRect(0, cropY + cropH, dispW, dispH - cropY - cropH);
    ctx.fillRect(0, cropY, cropX, cropH);
    ctx.fillRect(cropX + cropW, cropY, dispW - cropX - cropW, cropH);

    ctx.strokeStyle = '#69f0ae';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropW, cropH);

    const s = 8;
    ctx.fillStyle = '#69f0ae';
    [[cropX, cropY], [cropX + cropW, cropY], [cropX, cropY + cropH], [cropX + cropW, cropY + cropH]]
        .forEach(([x, y]) => ctx.fillRect(x - s / 2, y - s / 2, s, s));
  }

  updateCropFromSlider();
}