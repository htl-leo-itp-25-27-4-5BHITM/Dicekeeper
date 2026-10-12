import {
  backgroundAuthRequest,
  createAuthenticationRecoveryCoordinator,
  installAuthFetchInterceptor
} from '/src/main/resources/META-INF/resources/app/services/auth.js';
import { connectCampaignEvents } from '/src/main/resources/META-INF/resources/app/services/campaignEvents.js';
import { createLiveStatus } from '/src/main/resources/META-INF/resources/app/components/liveStatus.js';
import { loadPlayerRecoverySnapshot } from '/src/main/resources/META-INF/resources/app/services/liveSnapshots.js';

class ControlledEventSource {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.listeners = new Map();
    this.onerror = null;
    this.closeCalls = 0;
  }

  addEventListener(name, listener) {
    const listeners = this.listeners.get(name) || [];
    listeners.push(listener);
    this.listeners.set(name, listeners);
  }

  emit(name, data = null, options = {}) {
    if (name === 'connected') this.readyState = 1;
    const event = {
      data: data == null ? '' : JSON.stringify(data),
      lastEventId: options.lastEventId || ''
    };
    for (const listener of this.listeners.get(name) || []) listener(event);
  }

  fail() {
    this.readyState = 2;
    this.onerror?.({ type: 'error' });
  }

  close() {
    this.closeCalls += 1;
    this.readyState = 2;
  }
}

sessionStorage.setItem('player', JSON.stringify({ id: 5, username: 'fixture-user' }));

const navigationDestinations = [];
const stateHistory = [];
const sources = [];
let applyCount = 0;
let pollCount = 0;
let pollTimer = null;

function updateMetric(id, value) {
  document.getElementById(id).textContent = String(value);
}

const coordinator = createAuthenticationRecoveryCoordinator({
  storage: sessionStorage,
  navigation: destination => {
    navigationDestinations.push(destination);
    updateMetric('loginCount', navigationDestinations.length);
  },
  clearCachedPlayer: () => sessionStorage.removeItem('player'),
  currentPath: () => '/campaign/4/play',
  publish: () => {}
});
installAuthFetchInterceptor({ target: window, coordinator });

async function pollNotifications() {
  pollCount += 1;
  updateMetric('pollCount', pollCount);
  await fetch('/api/notification/player/5/unread/count', backgroundAuthRequest({
    cache: 'no-store'
  }));
}

function startPolling({ immediate = false } = {}) {
  if (immediate) pollNotifications();
  if (!pollTimer) pollTimer = setInterval(pollNotifications, 50);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

coordinator.subscribe(authState => {
  if (authState.status === 'expired') stopPolling();
  if (authState.status === 'authenticated') startPolling({ immediate: true });
});
startPolling({ immediate: true });

let connection = null;
const status = createLiveStatus('liveStatus', {
  onReauthenticate: () => coordinator.beginLogin(),
  onRetry: () => connection?.retry()
});

connection = connectCampaignEvents(4, {}, {
  sourceFactory: url => {
    const source = new ControlledEventSource(url);
    sources.push(source);
    updateMetric('sourceCount', sources.length);
    return source;
  },
  authCoordinator: coordinator,
  fetchImpl: (...args) => window.fetch(...args),
  reconnectDelaysMs: [0],
  heartbeatTimeoutMs: 60_000,
  loadSnapshot: () => loadPlayerRecoverySnapshot(4, 5),
  applySnapshot: snapshot => {
    applyCount += 1;
    updateMetric('applyCount', applyCount);
    const turn = snapshot.state.currentTurnPlayerId;
    document.getElementById('projection').textContent =
      `campaign=${snapshot.campaign.version};turn=${turn};markers=${snapshot.markers.length};decisions=${snapshot.decisions.length}`;
  },
  onStateChange: nextState => {
    stateHistory.push(nextState);
    document.getElementById('stateHistory').textContent = stateHistory.join(' → ');
    status.setState(nextState);
  }
});

window.liveRecovery = {
  authenticate: () => coordinator.authenticated(),
  emitConnected: index => sources[index ?? sources.length - 1]?.emit('connected', { ready: true }),
  fail: index => sources[index ?? sources.length - 1]?.fail(),
  getDiagnostics: () => ({
    applyCount,
    loginCount: navigationDestinations.length,
    pollCount,
    sourceCount: sources.length,
    stateHistory: [...stateHistory]
  })
};

window.addEventListener('beforeunload', () => {
  stopPolling();
  connection?.close();
  status.destroy();
});
