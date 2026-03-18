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
import { themeColor } from '../services/theme.js';

export function createMapCanvas(container, opts = {}) {
  const {
    mapImageUrl = '',
    markers: initialMarkers = [],
    onMarkerMove = null,
    onMarkerAdd = null,
    onMarkerRemove = null,
    readOnly = false,
    isMaximized = false,
    players = [], // { id, name } for labeling
    fogOfWar = false,
    fogSolid = false, // (legacy, fog is now always solid+stylized when fogOfWar is true)
    fogPositions: initialFogPositions = [], // [{ x, y }] relative 0-1
    fogRadius = 0.225, // reveal radius as fraction of map size
    initialExplorationData = null, // base64 data URL of a previously saved 256×256 exploration PNG
    onExplorationChange = null, // callback(dataUrl) called when exploration map changes (debounced)
    gameStarted: initialGameStarted = false // exploration only tracked when game has started
  } = opts;

  let gameStarted = initialGameStarted;

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
  let fogPositions = [...initialFogPositions];

  // Exploration memory: a persistent offscreen canvas (at 256×256 resolution)
  // that accumulates every position players have visited.
  // Coordinate system: 0-1 relative to the map square. Each pixel represents
  // whether that map area has been explored (alpha > 0 = explored).
  const FOG_MEM_SIZE = 256;
  let fogMemoryCanvas = null;
  let fogMemoryCtx = null;
  let explorationSaveTimer = null;
  if (fogOfWar) {
    fogMemoryCanvas = document.createElement('canvas');
    fogMemoryCanvas.width = FOG_MEM_SIZE;
    fogMemoryCanvas.height = FOG_MEM_SIZE;
    fogMemoryCtx = fogMemoryCanvas.getContext('2d');

    // Restore from saved data if available
    if (initialExplorationData) {
      const restoreImg = new Image();
      restoreImg.onload = () => {
        fogMemoryCtx.drawImage(restoreImg, 0, 0, FOG_MEM_SIZE, FOG_MEM_SIZE);
        // Now stamp current positions on top
        stampExploration(initialFogPositions);
        const initialPlayerPositions = initialMarkers
          .filter(m => m.type === 'player' || m.type === 'player-group')
          .map(m => ({ x: m.x, y: m.y }));
        stampExploration(initialPlayerPositions);
        draw();
      };
      restoreImg.src = initialExplorationData;
    } else {
      // No saved data — stamp initial positions
      stampExploration(initialFogPositions);
      const initialPlayerPositions = initialMarkers
        .filter(m => m.type === 'player' || m.type === 'player-group')
        .map(m => ({ x: m.x, y: m.y }));
      stampExploration(initialPlayerPositions);
    }
  }

  // Stamp the current player positions onto the exploration memory
  // Only stamps when the game has started (not during pre-game setup in cockpit)
  function stampExploration(positions) {
    if (!fogMemoryCtx || !positions || positions.length === 0) return;
    if (!gameStarted) return; // Don't track exploration before game starts
    const r = fogRadius * FOG_MEM_SIZE; // reveal radius in memory-canvas pixels
    for (const pos of positions) {
      const cx = pos.x * FOG_MEM_SIZE;
      const cy = pos.y * FOG_MEM_SIZE;
      const grad = fogMemoryCtx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.6, 'rgba(255,255,255,1)');
      grad.addColorStop(0.85, 'rgba(255,255,255,0.5)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      fogMemoryCtx.fillStyle = grad;
      fogMemoryCtx.beginPath();
      fogMemoryCtx.arc(cx, cy, r, 0, Math.PI * 2);
      fogMemoryCtx.fill();
    }
    // Notify parent to persist (debounced to avoid spamming on rapid moves)
    scheduleExplorationSave();
  }

  function scheduleExplorationSave() {
    if (!onExplorationChange || !fogMemoryCanvas) return;
    clearTimeout(explorationSaveTimer);
    explorationSaveTimer = setTimeout(() => {
      onExplorationChange(fogMemoryCanvas.toDataURL('image/png'));
    }, 2000); // save 2s after last change
  }

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

      // Fog of war overlay
      if (fogOfWar) {
        drawFogOfWar(ctx, x, y, size);
      }
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
      const _agRgb = themeColor('--accent-green-rgb') || '105,240,174';
      for (let i = Math.min(count - 1, 2); i >= 0; i--) {
        ctx.beginPath();
        ctx.arc(mx + i * 3, my - i * 3, r, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? `rgba(${_agRgb},0.9)` : `rgba(${_agRgb},0.4)`;
        ctx.fill();
        ctx.strokeStyle = isSelected ? (themeColor('--gold') || '#ffc107') : 'rgba(255,255,255,0.8)';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();
      }

      // Count badge
      ctx.shadowBlur = 0;
      ctx.fillStyle = themeColor('--accent-purple') || '#ba68c8';
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
      const _agRgbP = themeColor('--accent-green-rgb') || '105,240,174';
      ctx.fillStyle = `rgba(${_agRgbP},0.85)`;
      ctx.fill();
      ctx.strokeStyle = isSelected ? (themeColor('--gold') || '#ffc107') : 'rgba(255,255,255,0.8)';
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
      ctx.strokeStyle = isSelected ? (themeColor('--gold') || '#ffc107') : 'rgba(255,255,255,0.7)';
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

  function drawFogOfWar(ctx, mapX, mapY, mapSize) {
    const dpr = window.devicePixelRatio || 1;
    // Use full physical pixel dimensions for offscreen canvases to avoid
    // sub-pixel gaps when the DPR transform scales them onto the main canvas.
    const pw = canvas.width;   // physical pixels
    const ph = canvas.height;
    const cw = pw / dpr;       // logical pixels (for coordinate math)
    const ch = ph / dpr;

    // Collect player positions
    let positions = fogPositions.length > 0 ? fogPositions : [];
    if (positions.length === 0) {
      for (const m of markers) {
        if (m.type === 'player' || m.type === 'player-group') {
          positions.push({ x: m.x, y: m.y });
        }
      }
    }

    const revealPx = mapSize * fogRadius;
    const time = Date.now() * 0.0006;

    // Deterministic pseudo-random
    const rng = (a, b) => {
      let x = Math.sin(a * 127.1 + (b || 0) * 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    // Helper: create an offscreen canvas at physical resolution with DPR scaling
    function createFogLayer() {
      const c = document.createElement('canvas');
      c.width = pw; c.height = ph;
      const fctx = c.getContext('2d');
      fctx.scale(dpr, dpr);
      return { canvas: c, ctx: fctx };
    }

    // Helper: draw an offscreen fog layer onto the main canvas
    // We temporarily reset the main ctx transform so the physical-pixel canvas
    // maps 1:1 onto the main canvas's physical pixels (no double-scaling).
    function compositeFogLayer(layer) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }

    // ──────────────────────────────────────
    // Layer 1: Fog base with exploration memory
    //  - Unexplored: fully opaque
    //  - Previously explored: semi-transparent (map visible but hazy)
    //  - Current player position: fully clear
    // ──────────────────────────────────────
    const L1 = createFogLayer();
    const f1 = L1.ctx;

    // Step 1: Fill fully opaque
    f1.fillStyle = themeColor('--fog-base') || '#0a1610';
    f1.fillRect(-2, -2, cw + 4, ch + 4);

    // Step 2: Partially carve out explored areas (reduce to semi-transparent)
    // We use the exploration memory canvas to know which areas have been visited.
    if (fogMemoryCanvas) {
      f1.globalCompositeOperation = 'destination-out';
      // Draw the memory canvas scaled to the map rect, with reduced alpha
      // so explored areas become semi-transparent rather than fully clear.
      // We use an intermediate canvas to control the alpha of the memory stamp.
      const memLayer = document.createElement('canvas');
      memLayer.width = pw; memLayer.height = ph;
      const mlCtx = memLayer.getContext('2d');
      mlCtx.scale(dpr, dpr);
      // Draw memory at 60% opacity → explored areas lose 60% of the fog
      mlCtx.globalAlpha = 0.60;
      mlCtx.drawImage(fogMemoryCanvas, mapX, mapY, mapSize, mapSize);
      mlCtx.globalAlpha = 1.0;
      // Reset scale for drawImage
      f1.save();
      f1.setTransform(1, 0, 0, 1, 0, 0);
      f1.drawImage(memLayer, 0, 0);
      f1.restore();
    }

    // Step 3: Fully carve out current player positions (completely clear)
    f1.globalCompositeOperation = 'destination-out';
    for (const pos of positions) {
      const cx = mapX + pos.x * mapSize;
      const cy = mapY + pos.y * mapSize;
      const grad = f1.createRadialGradient(cx, cy, revealPx * 0.05, cx, cy, revealPx);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.55, 'rgba(0,0,0,1)');
      grad.addColorStop(0.78, 'rgba(0,0,0,0.7)');
      grad.addColorStop(0.92, 'rgba(0,0,0,0.2)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      f1.fillStyle = grad;
      f1.beginPath();
      f1.arc(cx, cy, revealPx, 0, Math.PI * 2);
      f1.fill();
    }
    compositeFogLayer(L1);

    // ──────────────────────────────────────
    // Layer 2: Large rolling cloud blobs across the fog
    // ──────────────────────────────────────
    const L2 = createFogLayer();
    const f2 = L2.ctx;

    // Large cloud patches across entire canvas
    const cloudCount = 30 + Math.floor(cw * ch * 0.00002);
    for (let i = 0; i < cloudCount; i++) {
      const bx = rng(i, 1) * cw;
      const by = rng(i, 2) * ch;
      // Drift slowly
      const dx = Math.sin(time * 0.4 + i * 2.3) * 20;
      const dy = Math.cos(time * 0.3 + i * 1.7) * 15;
      const cloudR = 40 + rng(i, 3) * 120;
      const pulse = 0.7 + Math.sin(time * 0.5 + i * 1.1) * 0.3;
      const alpha = (0.08 + rng(i, 4) * 0.12) * pulse;

      const cg = f2.createRadialGradient(bx + dx, by + dy, 0, bx + dx, by + dy, cloudR);
      const _fogRgb = themeColor('--fog-cloud-rgb') || '100,170,140';
      const _fogRgb2 = themeColor('--fog-cloud-dark-rgb') || '40,110,80';
      cg.addColorStop(0, `rgba(${_fogRgb}, ${alpha})`);
      cg.addColorStop(0.4, `rgba(${_fogRgb}, ${alpha * 0.6})`);
      cg.addColorStop(0.7, `rgba(${_fogRgb}, ${alpha * 0.25})`);
      cg.addColorStop(1, `rgba(${_fogRgb2}, 0)`);
      f2.fillStyle = cg;
      f2.beginPath();
      f2.arc(bx + dx, by + dy, cloudR, 0, Math.PI * 2);
      f2.fill();
    }

    // Mask out the revealed areas AND explored areas
    f2.globalCompositeOperation = 'destination-out';
    // Mask explored memory
    if (fogMemoryCanvas) {
      const memMask = document.createElement('canvas');
      memMask.width = pw; memMask.height = ph;
      const mmCtx = memMask.getContext('2d');
      mmCtx.scale(dpr, dpr);
      mmCtx.globalAlpha = 0.7;
      mmCtx.drawImage(fogMemoryCanvas, mapX, mapY, mapSize, mapSize);
      f2.save();
      f2.setTransform(1, 0, 0, 1, 0, 0);
      f2.drawImage(memMask, 0, 0);
      f2.restore();
    }
    // Mask current positions (fully)
    for (const pos of positions) {
      const cx = mapX + pos.x * mapSize;
      const cy = mapY + pos.y * mapSize;
      const mg = f2.createRadialGradient(cx, cy, revealPx * 0.1, cx, cy, revealPx * 1.05);
      mg.addColorStop(0, 'rgba(0,0,0,1)');
      mg.addColorStop(0.6, 'rgba(0,0,0,0.9)');
      mg.addColorStop(0.85, 'rgba(0,0,0,0.3)');
      mg.addColorStop(1, 'rgba(0,0,0,0)');
      f2.fillStyle = mg;
      f2.beginPath();
      f2.arc(cx, cy, revealPx * 1.05, 0, Math.PI * 2);
      f2.fill();
    }
    compositeFogLayer(L2);

    // ──────────────────────────────────────
    // Layer 3: Bright wispy tendrils at reveal edges
    // ──────────────────────────────────────
    const L3 = createFogLayer();
    const f3 = L3.ctx;

    for (const pos of positions) {
      const cx = mapX + pos.x * mapSize;
      const cy = mapY + pos.y * mapSize;

      // Large prominent wisps
      const wispCount = 28;
      for (let i = 0; i < wispCount; i++) {
        const baseAngle = (i / wispCount) * Math.PI * 2;
        // Swirl the angle over time
        const angle = baseAngle + Math.sin(time * 0.7 + i * 1.9) * 0.5 + time * 0.15;
        const distVar = 0.75 + Math.sin(time * 0.8 + i * 2.7) * 0.2;
        const dist = revealPx * distVar;
        const wx = cx + Math.cos(angle) * dist;
        const wy = cy + Math.sin(angle) * dist;
        const wispR = revealPx * (0.22 + Math.sin(time * 0.6 + i * 1.3) * 0.08);
        const brightness = 0.3 + Math.sin(time * 0.5 + i * 2.1) * 0.15;

        const wg = f3.createRadialGradient(wx, wy, 0, wx, wy, wispR);
        wg.addColorStop(0, `rgba(160, 210, 185, ${brightness})`);
        wg.addColorStop(0.35, `rgba(130, 190, 165, ${brightness * 0.6})`);
        wg.addColorStop(0.7, `rgba(100, 160, 140, ${brightness * 0.2})`);
        wg.addColorStop(1, 'rgba(80, 140, 120, 0)');
        f3.fillStyle = wg;
        f3.beginPath();
        f3.arc(wx, wy, wispR, 0, Math.PI * 2);
        f3.fill();
      }

      // Extra-large outer wisps reaching further
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + time * 0.08 + Math.cos(time + i) * 0.4;
        const dist = revealPx * (0.9 + Math.sin(time * 0.4 + i * 3.1) * 0.15);
        const wx = cx + Math.cos(angle) * dist;
        const wy = cy + Math.sin(angle) * dist;
        const wispR = revealPx * (0.30 + Math.sin(time * 0.35 + i * 2.3) * 0.1);
        const alpha = 0.15 + Math.sin(time * 0.6 + i * 1.7) * 0.08;

        const wg2 = f3.createRadialGradient(wx, wy, 0, wx, wy, wispR);
        wg2.addColorStop(0, `rgba(140, 200, 175, ${alpha})`);
        wg2.addColorStop(0.5, `rgba(110, 170, 150, ${alpha * 0.4})`);
        wg2.addColorStop(1, 'rgba(80, 140, 120, 0)');
        f3.fillStyle = wg2;
        f3.beginPath();
        f3.arc(wx, wy, wispR, 0, Math.PI * 2);
        f3.fill();
      }

      // Glowing ring at the reveal boundary
      f3.strokeStyle = `rgba(120, 200, 170, ${0.08 + Math.sin(time) * 0.04})`;
      f3.lineWidth = revealPx * 0.15;
      f3.beginPath();
      f3.arc(cx, cy, revealPx * 0.85, 0, Math.PI * 2);
      f3.stroke();
    }

    // Mask so wisps don't appear deep inside revealed area
    f3.globalCompositeOperation = 'destination-out';
    for (const pos of positions) {
      const cx = mapX + pos.x * mapSize;
      const cy = mapY + pos.y * mapSize;
      const innerMask = f3.createRadialGradient(cx, cy, revealPx * 0.3, cx, cy, revealPx * 0.7);
      innerMask.addColorStop(0, 'rgba(0,0,0,1)');
      innerMask.addColorStop(0.7, 'rgba(0,0,0,0.5)');
      innerMask.addColorStop(1, 'rgba(0,0,0,0)');
      f3.fillStyle = innerMask;
      f3.beginPath();
      f3.arc(cx, cy, revealPx * 0.7, 0, Math.PI * 2);
      f3.fill();
    }
    compositeFogLayer(L3);

    // ──────────────────────────────────────
    // Layer 4: Fog grain/texture over dark (unexplored) areas only
    // ──────────────────────────────────────
    const L4 = createFogLayer();
    const f4 = L4.ctx;

    // Sample exploration memory once for fast lookups
    let memData = null;
    if (fogMemoryCanvas) {
      memData = fogMemoryCtx.getImageData(0, 0, FOG_MEM_SIZE, FOG_MEM_SIZE).data;
    }
    // Check if a logical-pixel point is in an explored area via memory
    function isExplored(px, py) {
      if (!memData) return false;
      // Convert screen coords to map-relative 0-1
      const mx = (px - mapX) / mapSize;
      const my = (py - mapY) / mapSize;
      if (mx < 0 || mx > 1 || my < 0 || my > 1) return false;
      const ix = Math.floor(mx * (FOG_MEM_SIZE - 1));
      const iy = Math.floor(my * (FOG_MEM_SIZE - 1));
      const idx = (iy * FOG_MEM_SIZE + ix) * 4;
      return memData[idx + 3] > 30; // alpha > ~12% means explored
    }

    const slowSeed = Math.floor(time * 0.15);
    const rng2 = (a) => { let x = Math.sin(a * 91.3 + slowSeed * 173.9) * 43758.5453; return x - Math.floor(x); };
    // Scattered fog speckles
    const speckCount = Math.floor(cw * ch * 0.0008);
    for (let i = 0; i < speckCount; i++) {
      const px = rng2(i * 2) * cw;
      const py = rng2(i * 2 + 1) * ch;
      // Skip inside current reveal OR explored areas
      let skip = false;
      for (const pos of positions) {
        const pcx = mapX + pos.x * mapSize;
        const pcy = mapY + pos.y * mapSize;
        if (Math.sqrt((px - pcx) ** 2 + (py - pcy) ** 2) < revealPx * 0.75) { skip = true; break; }
      }
      if (skip || isExplored(px, py)) continue;
      const a = 0.04 + rng2(i * 3) * 0.08;
      const g = 100 + Math.floor(rng2(i * 4) * 80);
      f4.fillStyle = `rgba(${g}, ${g + 30}, ${g + 15}, ${a})`;
      const sz = 1 + rng2(i * 5) * 4;
      f4.fillRect(px, py, sz, sz);
    }

    // Large soft fog blotches for organic texture
    for (let i = 0; i < 15; i++) {
      const bx = rng2(i * 7 + 100) * cw;
      const by = rng2(i * 7 + 101) * ch;
      const br = 30 + rng2(i * 7 + 102) * 80;
      // Skip if inside reveal or explored
      let skip = false;
      for (const pos of positions) {
        const pcx = mapX + pos.x * mapSize;
        const pcy = mapY + pos.y * mapSize;
        if (Math.sqrt((bx - pcx) ** 2 + (by - pcy) ** 2) < revealPx * 0.6) { skip = true; break; }
      }
      if (skip || isExplored(bx, by)) continue;
      const ba = 0.05 + rng2(i * 7 + 103) * 0.06;
      const bg = f4.createRadialGradient(bx, by, 0, bx, by, br);
      bg.addColorStop(0, `rgba(130, 180, 155, ${ba})`);
      bg.addColorStop(1, 'rgba(100, 150, 130, 0)');
      f4.fillStyle = bg;
      f4.beginPath();
      f4.arc(bx, by, br, 0, Math.PI * 2);
      f4.fill();
    }
    compositeFogLayer(L4);

    // Redraw player markers on top of fog so they remain visible
    if (positions.length > 0) {
      for (const m of markers) {
        if (m.type === 'player' || m.type === 'player-group') {
          const mx = mapX + m.x * mapSize;
          const my = mapY + m.y * mapSize;
          drawMarker(ctx, m, mx, my, mapSize, selectedMarkers.has(m.id), hoverMarkerId === m.id);
        }
      }
    }
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
      // Auto-update fog positions from player markers when fog is enabled
      if (fogOfWar) {
        fogPositions = [];
        for (const m of markers) {
          if (m.type === 'player' || m.type === 'player-group') {
            fogPositions.push({ x: m.x, y: m.y });
          }
        }
        stampExploration(fogPositions);
      }
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
    setGameStarted(started) { gameStarted = started; },
    updateFog(positions) { fogPositions = [...positions]; stampExploration(fogPositions); draw(); },
    getExplorationData() { return fogMemoryCanvas ? fogMemoryCanvas.toDataURL('image/png') : null; },
    loadExplorationData(dataUrl) {
      if (!fogMemoryCanvas || !dataUrl) return;
      const img = new Image();
      img.onload = () => { fogMemoryCtx.drawImage(img, 0, 0, FOG_MEM_SIZE, FOG_MEM_SIZE); draw(); };
      img.src = dataUrl;
    },
    draw,
    resize,
    destroy() {
      clearTimeout(explorationSaveTimer);
      ro.disconnect();
      wrap.remove();
    }
  };
}

