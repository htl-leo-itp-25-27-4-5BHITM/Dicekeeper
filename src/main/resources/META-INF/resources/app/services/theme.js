/**
 * Theme Service – manages color theme with localStorage persistence.
 * Themes: 'default' (green), 'accessible' (purple/blue, colorblind-friendly)
 */

const STORAGE_KEY = 'dicekeeper-theme';

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'default';
}

export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

export function toggleTheme() {
  const next = getTheme() === 'default' ? 'accessible' : 'default';
  setTheme(next);
  return next;
}

export function applyTheme(theme) {
  document.body.classList.toggle('theme-accessible', theme === 'accessible');
}

/**
 * Read a CSS variable value at runtime (useful for canvas drawing).
 */
export function themeColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// Apply persisted theme on load
applyTheme(getTheme());