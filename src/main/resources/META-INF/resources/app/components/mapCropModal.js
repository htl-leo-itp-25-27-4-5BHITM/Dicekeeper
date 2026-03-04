/**
 * Map Crop Modal – Forces a square (1:1) crop with resizable raster overlay.
 * Usage:
 *   showMapCropModal(imageFile).then(croppedBlob => { ... })
 */

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
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'map-crop-overlay';
  overlay.innerHTML = `
    <div class="map-crop-modal">
      <div class="map-crop-header">
        <h3>🗺️ Karte zuschneiden (1:1)</h3>
        <p>Ziehe den quadratischen Rahmen, um den Kartenausschnitt festzulegen.</p>
      </div>
      <div class="map-crop-canvas-wrap">
        <canvas class="map-crop-canvas" id="mcCanvas"></canvas>
      </div>
      <div class="map-crop-controls">
        <label>Größe: <input type="range" id="mcSizeSlider" min="50" max="100" value="80"></label>
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

  // Set canvas size based on image, fit within modal
  const maxW = Math.min(600, window.innerWidth - 80);
  const maxH = Math.min(500, window.innerHeight - 250);
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);
  const dispW = Math.floor(img.width * scale);
  const dispH = Math.floor(img.height * scale);
  canvas.width = dispW;
  canvas.height = dispH;

  // Square crop state (in display coordinates)
  let cropSize = Math.floor(Math.min(dispW, dispH) * 0.8);
  let cropX = Math.floor((dispW - cropSize) / 2);
  let cropY = Math.floor((dispH - cropSize) / 2);

  const slider = document.getElementById('mcSizeSlider');
  slider.value = 80;

  let dragging = false, dragStart = {};

  function draw() {
    ctx.clearRect(0, 0, dispW, dispH);
    ctx.drawImage(img, 0, 0, dispW, dispH);

    // Darken outside
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, dispW, cropY); // top
    ctx.fillRect(0, cropY + cropSize, dispW, dispH - cropY - cropSize); // bottom
    ctx.fillRect(0, cropY, cropX, cropSize); // left
    ctx.fillRect(cropX + cropSize, cropY, dispW - cropX - cropSize, cropSize); // right

    // Grid overlay
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    const gridLines = 4;
    const cellSize = cropSize / gridLines;
    for (let i = 1; i < gridLines; i++) {
      ctx.beginPath();
      ctx.moveTo(cropX + i * cellSize, cropY);
      ctx.lineTo(cropX + i * cellSize, cropY + cropSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cropX, cropY + i * cellSize);
      ctx.lineTo(cropX + cropSize, cropY + i * cellSize);
      ctx.stroke();
    }

    // Crop border
    ctx.strokeStyle = '#69f0ae';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropSize, cropSize);

    // Corner handles
    const hs = 8;
    ctx.fillStyle = '#69f0ae';
    [[cropX, cropY], [cropX + cropSize, cropY], [cropX, cropY + cropSize], [cropX + cropSize, cropY + cropSize]].forEach(([cx, cy]) => {
      ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
    });

    // 1:1 badge
    ctx.fillStyle = 'rgba(105,240,174,0.9)';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('1:1', cropX + 6, cropY + 16);
  }

  function clampCrop() {
    cropX = Math.max(0, Math.min(dispW - cropSize, cropX));
    cropY = Math.max(0, Math.min(dispH - cropSize, cropY));
  }

  function updateSize() {
    const pct = parseInt(slider.value) / 100;
    const maxSize = Math.min(dispW, dispH);
    const minSize = 50;
    const centerX = cropX + cropSize / 2;
    const centerY = cropY + cropSize / 2;
    cropSize = Math.max(minSize, Math.floor(maxSize * pct));
    cropX = Math.floor(centerX - cropSize / 2);
    cropY = Math.floor(centerY - cropSize / 2);
    clampCrop();
    draw();
  }

  slider.addEventListener('input', updateSize);

  // Mouse events for dragging the crop region
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check if inside crop
    if (mx >= cropX && mx <= cropX + cropSize && my >= cropY && my <= cropY + cropSize) {
      dragging = true;
      dragStart = { mx, my, cx: cropX, cy: cropY };
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    cropX = dragStart.cx + (mx - dragStart.mx);
    cropY = dragStart.cy + (my - dragStart.my);
    clampCrop();
    draw();
  });

  canvas.addEventListener('mouseup', () => { dragging = false; });
  canvas.addEventListener('mouseleave', () => { dragging = false; });

  // Touch support
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = t.clientX - rect.left;
    const my = t.clientY - rect.top;
    if (mx >= cropX && mx <= cropX + cropSize && my >= cropY && my <= cropY + cropSize) {
      dragging = true;
      dragStart = { mx, my, cx: cropX, cy: cropY };
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!dragging) return;
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = t.clientX - rect.left;
    const my = t.clientY - rect.top;
    cropX = dragStart.cx + (mx - dragStart.mx);
    cropY = dragStart.cy + (my - dragStart.my);
    clampCrop();
    draw();
  }, { passive: false });

  canvas.addEventListener('touchend', () => { dragging = false; });

  // Buttons
  document.getElementById('mcCancel').addEventListener('click', () => {
    overlay.remove();
    reject(new Error('Cancelled'));
  });

  document.getElementById('mcConfirm').addEventListener('click', () => {
    // Crop the original image at the corresponding source coordinates
    const srcX = Math.floor(cropX / scale);
    const srcY = Math.floor(cropY / scale);
    const srcSize = Math.floor(cropSize / scale);

    const outCanvas = document.createElement('canvas');
    const outSize = Math.min(srcSize, 2048); // max output resolution
    outCanvas.width = outSize;
    outCanvas.height = outSize;
    const outCtx = outCanvas.getContext('2d');
    outCtx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, outSize, outSize);

    outCanvas.toBlob((blob) => {
      overlay.remove();
      resolve(blob);
    }, 'image/png', 0.92);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      reject(new Error('Cancelled'));
    }
  });

  draw();
}


