/**
 * DEV-ONLY: API-Aufrufe der KI-Testseite. Wird mit app/dev/ zusammen gelöscht.
 * streamChat() ist so geschrieben, dass es später für die echten KI-Features wiederverwendet werden kann.
 */
const BASE = '/api/dev/ai';

async function readError(res) {
  try {
    const data = await res.json();
    if (data && data.error) return data.error;
  } catch (e) { /* kein JSON */ }
  if (res.status === 404) return 'Die KI-Testseite ist auf diesem Server nicht aktiviert.';
  if (res.status === 401) return 'Bitte zuerst bei Dicekeeper anmelden.';
  return 'Fehler ' + res.status;
}

async function jsonRequest(path, options = {}) {
  const res = await fetch(BASE + path, { cache: 'no-store', ...options });
  if (!res.ok) throw new Error(await readError(res));
  if (res.status === 204) return null;
  return res.json();
}

export function getStatus() {
  return jsonRequest('/status');
}

export function connectProvider(provider, apiKey) {
  return jsonRequest('/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey })
  });
}

export function disconnectProvider(provider) {
  return jsonRequest('/connect/' + encodeURIComponent(provider), { method: 'DELETE' });
}

export function listModels(provider) {
  return jsonRequest('/models/' + encodeURIComponent(provider));
}

/**
 * Streamt eine Antwort. onEvent bekommt {type:'delta', text} | {type:'done', ...} | {type:'error', text}.
 * Gibt erst zurück, wenn der Stream zu Ende ist. Abbrechen über signal.
 */
export async function streamChat({ provider, model, mode, messages }, onEvent, signal) {
  const res = await fetch(BASE + '/chat', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ provider, model, mode, messages }),
    signal
  });
  if (!res.ok) throw new Error(await readError(res));

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep;
    while ((sep = buffer.search(/\r?\n\r?\n/)) >= 0) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep).replace(/^\r?\n\r?\n/, '');
      const data = rawEvent.split(/\r?\n/)
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).replace(/^ /, ''))
        .join('\n');
      if (!data) continue;
      try {
        onEvent(JSON.parse(data));
      } catch (e) {
        console.warn('[KI-Test] Unlesbares Stream-Ereignis', data);
      }
    }
  }
}
