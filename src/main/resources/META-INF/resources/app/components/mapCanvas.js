/**
 * Interactive Map Canvas Component
 * Supports: zoom, pan, draggable markers (DM), structure/player markers, group display
 *
 * Usage:
 *   const mc = createMapCanvas(container, {
 *     mapImageUrl, markers, onMarkerMove, onMarkerAdd, onMarkerRemove,
 *     readOnly, isMaximized
 *   });
 *   mc.updateMarkers(markers);
 *   mc.destroy();
 */

export function createMapCanvas(container, opts = {}) {
  const {
    mapImageUrl = '',
    markers: initialMarkers = [],
    onMarkerMove = null,
    onMarkerAdd = null,
    onMarkerRemove = null,
    readOnly = false,
    isMaximized = false,
    players = [] // { id, name } for labeling
  } = opts;

  let markers = [...initialMarkers];
  let zoom = 1;
  let panX = 0, panY = 0;
  let mapImg = null;
  let mapLoaded = false;
  let draggingMarker = null;
  let dragOffset = { x: 0, y: 0 };
  let isPanning = false, panStart = { x: 0, y: 0, px: 0, py: 0 };
  let selectedMarkers = new Set();
  let hoverMarkerId = null;
  let didDrag = false;

  // Create DOM
  const wrap = document.createElement('div');
  wrap.className = 'map-canvas-wrap' + (isMaximized ? ' maximized' : '');

  const canvas = document.createElement('canvas');
  canvas.className = 'map-interactive-canvas';
  wrap.appendChild(canvas);

  container.innerHTML = '';
  container.appendChild(wrap);

  const ctx = canvas.getContext('2d');

  // Load map image
  if (mapImageUrl) {
    mapImg = new Image();
    mapImg.crossOrigin = 'anonymous';
    mapImg.onload = () => { mapLoaded = true; resize(); draw(); };
    mapImg.onerror = () => { mapLoaded = false; draw(); };
    mapImg.src = mapImageUrl;
  }

  function resize() {
    const rect = wrap.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    draw();
  }

  function getMapRect() {
    // The map is drawn as a square fitting the canvas
    const cw = canvas.width / (window.devicePixelRatio || 1);
    const ch = canvas.height / (window.devicePixelRatio || 1);
    const mapSize = Math.min(cw, ch) * zoom;
    const ox = (cw - mapSize) / 2 + panX;
    const oy = (ch - mapSize) / 2 + panY;
    return { x: ox, y: oy, size: mapSize };
  }

  function draw() {
    const cw = canvas.width / (window.devicePixelRatio || 1);
    const ch = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, cw, ch);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, cw, ch);

    if (mapLoaded && mapImg) {
      const { x, y, size } = getMapRect();
      ctx.drawImage(mapImg, x, y, size, size);

      // Grid overlay (subtle)
      const gridLines = 10;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let i = 1; i < gridLines; i++) {
        const gx = x + (size / gridLines) * i;
        const gy = y + (size / gridLines) * i;
        ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + size, gy); ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Keine Karte verfügbar', cw / 2, ch / 2);
    }

    // Draw markers
    if (mapLoaded) {
      const { x, y, size } = getMapRect();
      markers.forEach(m => {
        const mx = x + m.x * size;
        const my = y + m.y * size;
        drawMarker(ctx, m, mx, my, size, selectedMarkers.has(m.id), hoverMarkerId === m.id);
      });
    }
  }

  function drawMarker(ctx, marker, mx, my, mapSize, isSelected, isHover) {
    const baseRadius = Math.max(12, mapSize * 0.022);
    const r = isHover ? baseRadius * 1.15 : baseRadius;

    ctx.save();

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    if (marker.type === 'player-group') {
      // Group: stacked circles
      const pids = marker.playerIds ? marker.playerIds.split(',') : [];
      const count = pids.length;

      // Draw stacked circles
      for (let i = Math.min(count - 1, 2); i >= 0; i--) {
        ctx.beginPath();
        ctx.arc(mx + i * 3, my - i * 3, r, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? 'rgba(105,240,174,0.9)' : 'rgba(105,240,174,0.4)';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#ffc107' : 'rgba(255,255,255,0.8)';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();
      }

      // Count badge
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ba68c8';
      ctx.beginPath();
      ctx.arc(mx + r * 0.7, my - r * 0.7, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.max(9, r * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(count, mx + r * 0.7, my - r * 0.7);

    } else if (marker.type === 'player') {
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(105,240,174,0.85)';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffc107' : 'rgba(255,255,255,0.8)';
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.stroke();

      // Player icon
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#003300';
      ctx.font = `${Math.max(10, r * 0.9)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧙', mx, my);

    } else {
      // Structure/quest/checkpoint marker
      const colors = {
        'structure': 'rgba(186,104,200,0.85)',
        'quest': 'rgba(255,193,7,0.85)',
        'checkpoint': 'rgba(33,150,243,0.85)',
      };
      const bgColor = colors[marker.type] || 'rgba(186,104,200,0.85)';

      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fillStyle = bgColor;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffc107' : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.stroke();

      // Icon
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'white';
      ctx.font = `${Math.max(10, r * 0.85)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(marker.icon || '📌', mx, my);
    }

    // Label below
    if (marker.label) {
      ctx.shadowBlur = 0;
      const labelFont = Math.max(9, r * 0.55);
      ctx.font = `600 ${labelFont}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Resolve label: if playerIds, try to show player names
      let displayLabel = marker.label;
      if ((marker.type === 'player' || marker.type === 'player-group') && marker.playerIds) {
        const pids = marker.playerIds.split(',').map(s => s.trim());
        const names = pids.map(pid => {
          const p = players.find(pp => String(pp.id) === pid);
          return p ? p.name : pid;
        });
        if (marker.type === 'player-group') {
          displayLabel = 'Gruppe (' + names.length + ')';
        } else {
          displayLabel = names[0] || marker.label;
        }
      }

      const tw = ctx.measureText(displayLabel).width;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      const pad = 3;
      ctx.fillRect(mx - tw / 2 - pad, my + r + 3, tw + pad * 2, labelFont + 4);
      ctx.fillStyle = 'white';
      ctx.fillText(displayLabel, mx, my + r + 5);
    }

    ctx.restore();
  }

  function getMarkerAt(cx, cy) {
    if (!mapLoaded) return null;
    const { x, y, size } = getMapRect();
    const baseRadius = Math.max(12, size * 0.022);
    // Check in reverse (top-most first)
    for (let i = markers.length - 1; i >= 0; i--) {
      const m = markers[i];
      const mx = x + m.x * size;
      const my = y + m.y * size;
      const dist = Math.sqrt((cx - mx) ** 2 + (cy - my) ** 2);
      if (dist <= baseRadius * 1.5) return m;
    }
    return null;
  }

  function canvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // ZOOM
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoom = Math.max(0.5, Math.min(5, zoom + delta));
    draw();
  }, { passive: false });

  // MOUSE events
  canvas.addEventListener('mousedown', (e) => {
    didDrag = false;
    const pos = canvasPos(e);
    const marker = getMarkerAt(pos.x, pos.y);

    if (marker && !readOnly) {
      // DMs can drag player markers and structures
      const canDrag = !readOnly;
      if (canDrag) {
        const { x, y, size } = getMapRect();
        draggingMarker = marker;
        dragOffset.x = pos.x - (x + marker.x * size);
        dragOffset.y = pos.y - (y + marker.y * size);
        canvas.style.cursor = 'grabbing';
        return;
      }
    }

    // Pan
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY, px: panX, py: panY };
    canvas.style.cursor = 'move';
  });

  canvas.addEventListener('mousemove', (e) => {
    const pos = canvasPos(e);

    if (draggingMarker) {
      didDrag = true;
      const { x, y, size } = getMapRect();
      const newX = (pos.x - dragOffset.x - x) / size;
      const newY = (pos.y - dragOffset.y - y) / size;
      draggingMarker.x = Math.max(0, Math.min(1, newX));
      draggingMarker.y = Math.max(0, Math.min(1, newY));
      draw();
      return;
    }

    if (isPanning) {
      didDrag = true;
      panX = panStart.px + (e.clientX - panStart.x);
      panY = panStart.py + (e.clientY - panStart.y);
      draw();
      return;
    }

    // Hover
    const marker = getMarkerAt(pos.x, pos.y);
    const newHover = marker ? marker.id : null;
    if (newHover !== hoverMarkerId) {
      hoverMarkerId = newHover;
      canvas.style.cursor = hoverMarkerId && !readOnly ? 'grab' : 'default';
      draw();
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (draggingMarker) {
      // Notify of move
      if (onMarkerMove) {
        onMarkerMove(draggingMarker);
      }
      draggingMarker = null;
      canvas.style.cursor = 'default';
    }
    isPanning = false;
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('mouseleave', () => {
    if (draggingMarker) {
      if (onMarkerMove) onMarkerMove(draggingMarker);
      draggingMarker = null;
    }
    isPanning = false;
    hoverMarkerId = null;
    canvas.style.cursor = 'default';
  });

  // TOUCH events
  let touchStartDist = 0;
  let touchStartZoom = 1;

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      // Pinch zoom start
      touchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartZoom = zoom;
      return;
    }
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const pos = { x: t.clientX - rect.left, y: t.clientY - rect.top };
    const marker = getMarkerAt(pos.x, pos.y);

    if (marker && !readOnly) {
      const { x, y, size } = getMapRect();
      draggingMarker = marker;
      dragOffset.x = pos.x - (x + marker.x * size);
      dragOffset.y = pos.y - (y + marker.y * size);
    } else {
      isPanning = true;
      panStart = { x: t.clientX, y: t.clientY, px: panX, py: panY };
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      zoom = Math.max(0.5, Math.min(5, touchStartZoom * (dist / touchStartDist)));
      draw();
      return;
    }
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const pos = { x: t.clientX - rect.left, y: t.clientY - rect.top };

    if (draggingMarker) {
      const { x, y, size } = getMapRect();
      draggingMarker.x = Math.max(0, Math.min(1, (pos.x - dragOffset.x - x) / size));
      draggingMarker.y = Math.max(0, Math.min(1, (pos.y - dragOffset.y - y) / size));
      draw();
    } else if (isPanning) {
      panX = panStart.px + (t.clientX - panStart.x);
      panY = panStart.py + (t.clientY - panStart.y);
      draw();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (draggingMarker) {
      if (onMarkerMove) onMarkerMove(draggingMarker);
      draggingMarker = null;
    }
    isPanning = false;
  });

  // Click to select markers (for DM maximized view)
  canvas.addEventListener('click', (e) => {
    if (readOnly || didDrag) return; // Players can't select; skip after drag
    const pos = canvasPos(e);
    const marker = getMarkerAt(pos.x, pos.y);
    if (marker) {
      if (e.shiftKey) {
        // Multi-select with shift
        if (selectedMarkers.has(marker.id)) selectedMarkers.delete(marker.id);
        else selectedMarkers.add(marker.id);
      } else {
        // Single select
        if (selectedMarkers.has(marker.id) && selectedMarkers.size === 1) {
          selectedMarkers.clear();
        } else {
          selectedMarkers.clear();
          selectedMarkers.add(marker.id);
        }
      }
      draw();
    }
  });

  // Resize observer
  const ro = new ResizeObserver(() => resize());
  ro.observe(wrap);

  // Public API
  return {
    el: wrap,
    canvas,
    updateMarkers(newMarkers) {
      markers = [...newMarkers];
      draw();
    },
    getMarkers() { return markers; },
    getZoom() { return zoom; },
    setZoom(z) { zoom = z; draw(); },
    resetView() { zoom = 1; panX = 0; panY = 0; draw(); },
    selectMarker(id) {
      if (selectedMarkers.has(id)) selectedMarkers.delete(id);
      else selectedMarkers.add(id);
      draw();
    },
    clearSelection() { selectedMarkers.clear(); draw(); },
    getSelectedIds() { return [...selectedMarkers]; },
    setPlayers(p) { players.length = 0; players.push(...p); draw(); },
    draw,
    resize,
    destroy() {
      ro.disconnect();
      wrap.remove();
    }
  };
}

