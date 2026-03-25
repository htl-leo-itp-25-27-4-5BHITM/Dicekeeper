const PLAYER_KEY = 'player';
const FETCH_INTERCEPTOR_FLAG = '__dicekeeperAuthFetchInstalled';

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
  if (!path || typeof path !== 'string') {
    return fallback;
  }

  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return fallback;
  }

  return trimmed;
}

export function getCurrentHashPath() {
  return sanitizeRedirectPath(window.location.hash.slice(1) || '/', '/campaigns');
}

export function startLogin(nextPath = getCurrentHashPath()) {
  const safeNextPath = sanitizeRedirectPath(nextPath, '/campaigns');
  const callbackHash = '/#/login?kc=1&next=' + encodeURIComponent(safeNextPath);
  const authRedirect = '/api/auth/login?redirect=' + encodeURIComponent(callbackHash);
  window.location.assign(authRedirect);
}

export async function syncAuthenticatedPlayer() {
  const res = await fetch('/api/auth/me', { cache: 'no-store' });
  if (!res.ok) {
    let text = '';
    try {
      text = await res.text();
    } catch (e) {
      text = '';
    }
    throw new Error(text || res.statusText || ('HTTP ' + res.status));
  }

  const player = await res.json();
  setPlayer(player);
  return player;
}

export function logout() {
  clearPlayer();
  window.location.assign('/api/auth/logout');
}

export function installAuthFetchInterceptor() {
  if (window[FETCH_INTERCEPTOR_FLAG]) {
    return;
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const requestUrl = typeof input === 'string' ? input : input?.url;
    const url = requestUrl ? new URL(requestUrl, window.location.origin) : null;
    const isApiRequest = url
      && url.origin === window.location.origin
      && url.pathname.startsWith('/api/');

    let nextInit = init;
    if (isApiRequest) {
      const headers = new Headers(typeof input === 'object' && input instanceof Request ? input.headers : undefined);
      const initHeaders = new Headers(init.headers || undefined);
      initHeaders.forEach((value, key) => headers.set(key, value));
      headers.set('X-Requested-With', 'JavaScript');
      nextInit = { ...init, headers };
    }

    const response = await originalFetch(input, nextInit);
    if (isApiRequest && !window.location.hash.includes('kc=1')) {
      if (response.status === 499
          || (response.redirected && response.url && !new URL(response.url, window.location.origin).pathname.startsWith('/api/'))) {
        clearPlayer();
        startLogin(getCurrentHashPath());
      }
    }

    return response;
  };

  window[FETCH_INTERCEPTOR_FLAG] = true;
}

export function requirePlayer() {
  const p = getPlayer();
  if (!p) {
    window.location.hash = '#/login?next=' + encodeURIComponent(getCurrentHashPath());
    return null;
  }
  return p;
}
