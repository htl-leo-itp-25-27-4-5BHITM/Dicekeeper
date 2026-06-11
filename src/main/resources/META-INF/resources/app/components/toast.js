/**
 * Toast Notification System – shows messages in the top-right corner.
 * Usage:
 *   showToast('Kampagne aktualisiert');
 *   showToast('Fehler!', 'error');
 *   showToast('Hinweis', 'info');
 */

let toastContainer = null;

function ensureContainer() {
  if (toastContainer && document.body.contains(toastContainer)) return;
  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);
}

export function showToast(message, type = 'success', duration = 3500) {
  ensureContainer();

  const toast = document.createElement('div');
  toast.className = `app-toast app-toast-${type}`;

  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const icon = icons[type] || icons.success;

  const iconEl = document.createElement('span');
  iconEl.className = 'app-toast-icon';
  iconEl.textContent = icon;

  const messageEl = document.createElement('span');
  messageEl.className = 'app-toast-msg';
  messageEl.textContent = message;

  toast.append(iconEl, messageEl);

  toastContainer.appendChild(toast);

  // Trigger enter animation
  requestAnimationFrame(() => toast.classList.add('visible'));

  const timer = setTimeout(() => dismissToast(toast), duration);

  toast.addEventListener('click', () => {
    clearTimeout(timer);
    dismissToast(toast);
  });
}

function dismissToast(toast) {
  toast.classList.remove('visible');
  toast.classList.add('exiting');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  // Fallback removal
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 400);
}
