/**
 * Theme Service – manages color theme with localStorage persistence.
 * Themes: 'default' (green), 'accessible' (purple/blue, colorblind-friendly)
 */

const STORAGE_KEY = 'dicekeeper-theme';

function getCookieTheme() {
  const match = document.cookie.match(new RegExp('(?:^|; )' + STORAGE_KEY + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

function persistThemeCookie(theme) {
  document.cookie = STORAGE_KEY + '=' + encodeURIComponent(theme) + '; Path=/; Max-Age=31536000; SameSite=Lax';
}

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || getCookieTheme() || 'default';
}

export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  persistThemeCookie(theme);
  applyTheme(theme);
}

export function toggleTheme() {
  const next = getTheme() === 'default' ? 'accessible' : 'default';
  setTheme(next);
  return next;
}

export function applyTheme(theme) {
  document.body.classList.toggle('theme-accessible', theme === 'accessible');
  // Dispatch an event for other components to sync their UI (toggle buttons etc.)
  try {
    const ev = new CustomEvent('theme:changed', { detail: { theme } });
    document.dispatchEvent(ev);
  } catch (e) {
    // older browsers - fallback
    const ev2 = document.createEvent('CustomEvent');
    ev2.initCustomEvent('theme:changed', true, true, { theme });
    document.dispatchEvent(ev2);
  }
}

/**
 * Read a CSS variable value at runtime (useful for canvas drawing).
 */
export function themeColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// Apply persisted theme on load and mirror it for non-SPA pages.
const initialTheme = getTheme();
persistThemeCookie(initialTheme);
applyTheme(initialTheme);
