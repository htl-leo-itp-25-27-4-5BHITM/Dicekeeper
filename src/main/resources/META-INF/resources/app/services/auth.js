import { parseAccountDeletionError } from './accountDeletion.js';

const PLAYER_KEY = 'player';
const CONTINUATION_KEY = 'dicekeeper.auth.continuation';
const FETCH_INTERCEPTOR_FLAG = '__dicekeeperAuthFetchInstalled';
const BACKGROUND_AUTH_REQUEST_KEY = '__dicekeeperBackgroundAuthRequest';

let sharedCoordinator = null;

export function getPlayer() {
  try {
    const raw = sessionStorage.getItem(PLAYER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Failed to parse player', e);
    return null;
  }
}

export function setPlayer(player) {
  sessionStorage.setItem(PLAYER_KEY, JSON.stringify(player));
}

export function clearPlayer() {
  sessionStorage.removeItem(PLAYER_KEY);
}

export function sanitizeRedirectPath(path, fallback = '/campaigns') {
  if (!path || typeof path !== 'string') return fallback;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return fallback;
  }
  return trimmed;
}

export function getCurrentHashPath(target = window) {
  return sanitizeRedirectPath(target.location?.hash?.slice(1) || '/', '/campaigns');
}

function loginDestination(nextPath) {
  const safeNextPath = sanitizeRedirectPath(nextPath, '/campaigns');
  const callbackHash = '/#/login?kc=1&next=' + encodeURIComponent(safeNextPath);
  return '/api/auth/login?redirect=' + encodeURIComponent(callbackHash);
}

export function startLogin(nextPath = getCurrentHashPath()) {
  window.location.assign(loginDestination(nextPath));
}

export async function syncAuthenticatedPlayer() {
  const res = await fetch('/api/auth/me', { cache: 'no-store' });
  if (!res.ok) {
    const contentType = res.headers?.get?.('content-type') || '';
    if (contentType.toLowerCase().includes('json')) {
      const deletionError = await parseAccountDeletionError(res);
      if (deletionError.code === 'ACCOUNT_DELETION_PENDING'
          || deletionError.code === 'ACCOUNT_DELETION_COMPLETED') {
        const error = new Error(deletionError.message);
        error.status = res.status;
        error.code = deletionError.code;
        error.retryable = deletionError.retryable;
        throw error;
      }
    }
    const error = new Error('Anmeldung konnte nicht synchronisiert werden.');
    error.status = res.status;
    throw error;
  }

  const player = await res.json();
  setPlayer(player);
  return player;
}

export function logout() {
  clearPlayer();
  window.location.assign('/api/auth/logout');
}

export function backgroundAuthRequest(options = {}) {
  return { ...options, [BACKGROUND_AUTH_REQUEST_KEY]: true };
}

// Compatibility name used by existing background callers.
export const suppressAuthRedirect = backgroundAuthRequest;

export function createAuthenticationRecoveryCoordinator({
  storage = sessionStorage,
  navigation = destination => window.location.assign(destination),
  clearCachedPlayer = clearPlayer,
  currentPath = getCurrentHashPath,
  publish = state => document.dispatchEvent(new CustomEvent('dicekeeper:auth-recovery', {
    detail: state
  }))
} = {}) {
  let state = Object.freeze({
    status: 'authenticated',
    continuationPath: null,
    loginStarted: false
  });
  const listeners = new Set();

  function emit() {
    publish?.(state);
    for (const listener of [...listeners]) listener(state);
  }

  function update(next) {
    state = Object.freeze({ ...state, ...next });
    emit();
    return state;
  }

  function beginLogin() {
    if (state.loginStarted) return false;
    const continuationPath = sanitizeRedirectPath(
      state.continuationPath || currentPath(),
      '/campaigns'
    );
    update({ status: 'expired', continuationPath, loginStarted: true });
    navigation(loginDestination(continuationPath));
    return true;
  }

  function expired({ interactive = false, continuationPath } = {}) {
    if (state.status !== 'expired') {
      const safeContinuation = sanitizeRedirectPath(
        continuationPath || currentPath(),
        '/campaigns'
      );
      clearCachedPlayer();
      storage?.setItem?.(CONTINUATION_KEY, safeContinuation);
      update({
        status: 'expired',
        continuationPath: safeContinuation,
        loginStarted: false
      });
    }
    if (interactive) beginLogin();
    return state;
  }

  function authenticated() {
    storage?.removeItem?.(CONTINUATION_KEY);
    return update({
      status: 'authenticated',
      continuationPath: null,
      loginStarted: false
    });
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    authenticated,
    beginLogin,
    expired,
    getState: () => state,
    subscribe
  };
}

export function getAuthenticationRecoveryCoordinator() {
  if (!sharedCoordinator) sharedCoordinator = createAuthenticationRecoveryCoordinator();
  return sharedCoordinator;
}

export function startAuthenticationRecovery(nextPath = getCurrentHashPath()) {
  const coordinator = getAuthenticationRecoveryCoordinator();
  coordinator.expired({ interactive: false, continuationPath: nextPath });
  return coordinator.beginLogin();
}

export async function completeAuthenticationCallback(nextPath, {
  syncPlayer = syncAuthenticatedPlayer,
  navigate = path => { window.location.hash = '#' + path; },
  coordinator = getAuthenticationRecoveryCoordinator()
} = {}) {
  const safeNextPath = sanitizeRedirectPath(nextPath, '/campaigns');
  clearPlayer();
  const player = await syncPlayer();
  coordinator.authenticated();
  navigate(safeNextPath);
  return player;
}

function isAuthenticationRedirect(response, origin) {
  if (response?.type === 'opaqueredirect') return true;
  if (!response?.redirected || !response.url) return false;
  try {
    const redirectedUrl = new URL(response.url, origin);
    return redirectedUrl.origin !== origin || !redirectedUrl.pathname.startsWith('/api/');
  } catch {
    return true;
  }
}

export function installAuthFetchInterceptor({
  target = window,
  coordinator = getAuthenticationRecoveryCoordinator()
} = {}) {
  if (target[FETCH_INTERCEPTOR_FLAG]) return;

  const originalFetch = target.fetch.bind(target);
  target.fetch = async (input, init = {}) => {
    const isBackground = Boolean(init[BACKGROUND_AUTH_REQUEST_KEY]);
    const { [BACKGROUND_AUTH_REQUEST_KEY]: _background, ...fetchInit } = init;
    const requestUrl = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
    const origin = target.location?.origin || window.location.origin;
    const url = requestUrl ? new URL(requestUrl, origin) : null;
    const isApiRequest = url && url.origin === origin && url.pathname.startsWith('/api/');

    let nextInit = fetchInit;
    if (isApiRequest) {
      const requestHeaders = typeof Request !== 'undefined' && input instanceof Request
        ? input.headers
        : undefined;
      const headers = new Headers(requestHeaders);
      new Headers(fetchInit.headers || undefined).forEach((value, key) => headers.set(key, value));
      headers.set('X-Requested-With', 'JavaScript');
      nextInit = { ...fetchInit, headers };
    }

    const response = await originalFetch(input, nextInit);
    const onCallback = target.location?.hash?.includes('kc=1');
    if (isApiRequest
        && (response.status === 499 || isAuthenticationRedirect(response, origin))) {
      coordinator.expired({ interactive: !isBackground && !onCallback });
    }
    return response;
  };
  target[FETCH_INTERCEPTOR_FLAG] = true;
}

export function requirePlayer() {
  const player = getPlayer();
  if (!player) {
    window.location.hash = '#/login?next=' + encodeURIComponent(getCurrentHashPath());
    return null;
  }
  return player;
}
