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
  return resolveProcessedImageUrl(profilePicture, {
    width: 256,
    height: 256,
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
  return resolveProcessedImageUrl(mapImagePath, {
    width: 1600,
    height: 1600,
    quality: 85,
    format: 'webp',
    fitIn: true,
    ...options
  });
}
