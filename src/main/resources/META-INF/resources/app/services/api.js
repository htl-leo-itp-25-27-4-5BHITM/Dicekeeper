/**
 * Thin fetch wrapper for API calls
 */
export async function api(path, options = {}) {
  const res = await fetch(path, { cache: 'no-store', ...options });
  return res;
}

export async function apiJson(path, options = {}) {
  const res = await api(path, options);
  if (!res.ok) {
    let msg;
    try { msg = await res.text(); } catch (e) { msg = res.statusText; }
    throw new Error(msg || 'HTTP ' + res.status);
  }
  return res.json();
}

export async function apiPost(path, body) {
  return api(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function apiPatch(path, body) {
  return api(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function apiDelete(path) {
  return api(path, { method: 'DELETE' });
}

