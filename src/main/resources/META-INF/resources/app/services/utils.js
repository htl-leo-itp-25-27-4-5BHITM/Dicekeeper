/**
 * Shared utility functions
 */
export function esc(s) {
  return String(s || '').replace(/[&<>"]/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].substring(0, 2).toUpperCase();
}

export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Gerade eben';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + ' Min.';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + ' Std.';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + ' Tage';
  return new Date(timestamp).toLocaleDateString();
}

export function calcMod(score) { return Math.floor((score - 10) / 2); }
export function fmtMod(mod) { return mod >= 0 ? '+' + mod : '' + mod; }

const IMAGOR_BASE_PATH = '/imagor';
const LOCAL_IMAGE_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const DEFAULT_VIEWPORT = { width: 1280, height: 720, dpr: 1 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getViewportMetrics() {
  try {
    const docEl = document.documentElement;
    const width = Math.max(window.innerWidth || 0, docEl?.clientWidth || 0, DEFAULT_VIEWPORT.width);
    const height = Math.max(window.innerHeight || 0, docEl?.clientHeight || 0, DEFAULT_VIEWPORT.height);
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2.5);
    return { width, height, dpr };
  } catch (e) {
    return DEFAULT_VIEWPORT;
  }
}

function getResponsiveDimensions(preset, options = {}) {
  const viewport = getViewportMetrics();
  const width = options.width ?? Math.round(viewport.width * preset.widthRatio * viewport.dpr);
  const height = options.height ?? Math.round(viewport.height * preset.heightRatio * viewport.dpr);

  return {
    width: clamp(width, preset.minWidth, preset.maxWidth),
    height: clamp(height, preset.minHeight, preset.maxHeight)
  };
}

function normalizeImagePath(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('blob:') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  return imagePath.startsWith('/') ? imagePath : '/' + imagePath;
}

function shouldUseImagor(normalizedPath) {
  if (!normalizedPath || !normalizedPath.startsWith('/uploads/')) return false;
  if (normalizedPath.toLowerCase().endsWith('.svg')) return false;
  try {
    return !LOCAL_IMAGE_HOSTS.has(window.location.hostname);
  } catch (e) {
    return true;
  }
}

function encodeImagorSourcePath(sourcePath) {
  return sourcePath
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

export function resolveProcessedImageUrl(imagePath, options = {}) {
  const normalizedPath = normalizeImagePath(imagePath);
  if (!normalizedPath) return '';
  if (!shouldUseImagor(normalizedPath)) return normalizedPath;

  const width = Number.isFinite(Number(options.width)) ? Math.max(0, Math.floor(Number(options.width))) : 0;
  const height = Number.isFinite(Number(options.height)) ? Math.max(0, Math.floor(Number(options.height))) : 0;
  const quality = Number.isFinite(Number(options.quality)) ? Math.max(1, Math.min(100, Math.floor(Number(options.quality)))) : null;
  const sourcePath = encodeImagorSourcePath(normalizedPath.replace(/^\/uploads\//, ''));
  const filters = [];

  if (options.format) {
    filters.push(`format(${options.format})`);
  }
  if (quality) {
    filters.push(`quality(${quality})`);
  }
  if (Array.isArray(options.filters)) {
    filters.push(...options.filters.filter(Boolean));
  }

  if (!(width > 0 || height > 0 || filters.length > 0 || options.smart)) {
    return normalizedPath;
  }

  const parts = [IMAGOR_BASE_PATH, 'unsafe'];
  if (options.fitIn !== false) {
    parts.push('fit-in');
  }
  if (width > 0 || height > 0) {
    parts.push(`${width}x${height}`);
  }
  if (options.smart) {
    parts.push('smart');
  }
  if (filters.length > 0) {
    parts.push(`filters:${filters.join(':')}`);
  }
  parts.push(sourcePath);
  return parts.join('/');
}

export function resolveAvatarUrl(profilePicture, options = {}) {
  const avatarSize = Number.isFinite(Number(options.cssSize)) ? Number(options.cssSize) : 80;
  const viewport = getViewportMetrics();
  const dimension = clamp(
    Math.round(avatarSize * viewport.dpr * 1.5),
    96,
    384
  );

  return resolveProcessedImageUrl(profilePicture, {
    width: dimension,
    height: dimension,
    quality: 85,
    format: 'webp',
    smart: true,
    fitIn: false,
    ...options
  });
}

/**
 * Resolve a map image path stored in the DB to a valid URL.
 * Uploaded files are served from /uploads/* by the backend and can be routed
 * through imagor in production for resizing/format conversion.
 */
export function resolveMapUrl(mapImagePath, options = {}) {
  const preset = options.variant === 'preview'
    ? { widthRatio: 0.92, heightRatio: 0.55, minWidth: 480, maxWidth: 1600, minHeight: 320, maxHeight: 1200 }
    : { widthRatio: 1.1, heightRatio: 1.1, minWidth: 960, maxWidth: 3200, minHeight: 960, maxHeight: 3200 };
  const dimensions = getResponsiveDimensions(preset, options);

  return resolveProcessedImageUrl(mapImagePath, {
    width: dimensions.width,
    height: dimensions.height,
    quality: 85,
    format: 'webp',
    fitIn: true,
    ...options
  });
}
