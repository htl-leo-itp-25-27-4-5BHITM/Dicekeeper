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

/**
 * Resolve a map image path stored in the DB to a valid URL.
 * Files are served from /uploads/* by the backend.
 */
export function resolveMapUrl(mapImagePath) {
  if (!mapImagePath) return '';
  if (mapImagePath.startsWith('http')) {
    return mapImagePath;
  }
  // Ensure path is absolute (starts with /)
  return mapImagePath.startsWith('/') ? mapImagePath : '/' + mapImagePath;
}

