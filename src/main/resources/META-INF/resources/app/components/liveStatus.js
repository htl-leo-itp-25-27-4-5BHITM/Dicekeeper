import { startAuthenticationRecovery } from '../services/auth.js';

export const LIVE_STATUS_CONTENT = Object.freeze({
  connecting: { label: 'Live-Verbindung wird hergestellt…', tone: 'pending' },
  current: { label: 'Live-Ansicht ist aktuell', tone: 'ok' },
  stale: { label: 'Ansicht ist veraltet – Verbindung unterbrochen', tone: 'warning' },
  reconnecting: { label: 'Verbindung wird wiederhergestellt…', tone: 'warning' },
  reconciling: { label: 'Live-Daten werden abgeglichen…', tone: 'pending' },
  reauthenticating: {
    label: 'Sitzung abgelaufen – erneut anmelden',
    tone: 'danger',
    action: 'reauthenticate',
    actionLabel: 'Erneut anmelden'
  },
  revoked: { label: 'Zugriff auf diese Kampagne wurde entzogen', tone: 'danger' },
  unavailable: {
    label: 'Live-Daten sind derzeit nicht verfügbar',
    tone: 'danger',
    action: 'retry',
    actionLabel: 'Erneut versuchen'
  },
  disposed: { label: 'Live-Verbindung beendet', tone: 'muted' }
});

export function createLiveStatus(target, {
  onReauthenticate = startAuthenticationRecovery,
  onRetry = () => {}
} = {}) {
  const element = typeof target === 'string' ? document.getElementById(target) : target;
  if (!element) throw new Error('Live status target not found');

  function handleClick(event) {
    const action = event.target.closest('[data-live-status-action]')?.dataset.liveStatusAction;
    if (action === 'reauthenticate') onReauthenticate();
    if (action === 'retry') onRetry();
  }

  element.addEventListener('click', handleClick);

  function setState(state) {
    const content = LIVE_STATUS_CONTENT[state] || LIVE_STATUS_CONTENT.unavailable;
    element.className = 'live-status live-status--' + content.tone;
    element.dataset.state = state;
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    element.setAttribute('aria-atomic', 'true');
    element.innerHTML = `
      <span class="live-status__indicator" aria-hidden="true"></span>
      <span class="live-status__text">${content.label}</span>
      ${content.action ? `<button type="button" class="live-status__action" data-live-status-action="${content.action}">${content.actionLabel}</button>` : ''}
    `;
  }

  function destroy() {
    element.removeEventListener('click', handleClick);
  }

  setState('connecting');
  return { destroy, setState };
}
