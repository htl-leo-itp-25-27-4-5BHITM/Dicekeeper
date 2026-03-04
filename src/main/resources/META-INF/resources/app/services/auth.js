/**
 * Auth helpers – read/write player from sessionStorage
 */
export function getPlayer() {
  try {
    const raw = sessionStorage.getItem('player');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Failed to parse player', e);
    return null;
  }
}

export function setPlayer(player) {
  sessionStorage.setItem('player', JSON.stringify(player));
}

export function clearPlayer() {
  sessionStorage.removeItem('player');
}

export function requirePlayer() {
  const p = getPlayer();
  if (!p) {
    window.location.hash = '#/login';
    return null;
  }
  return p;
}

