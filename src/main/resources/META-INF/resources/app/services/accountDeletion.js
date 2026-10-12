const MAX_ERROR_BYTES = 4096;

const ERROR_MESSAGES = Object.freeze({
  ACCOUNT_DELETION_PENDING: 'Der Account konnte noch nicht vollständig gelöscht werden. Bitte erneut versuchen.',
  ACCOUNT_DELETION_UNAVAILABLE: 'Die Account-Löschung ist derzeit nicht verfügbar. Bitte später erneut versuchen.',
  ACCOUNT_DELETION_FORBIDDEN: 'Du kannst nur deinen eigenen Account löschen.',
  ACCOUNT_DELETION_FAILED: 'Der Account konnte nicht gelöscht werden. Bitte später erneut versuchen.',
  ACCOUNT_DELETION_COMPLETED: 'Dieser Account wurde bereits gelöscht.'
});

const GENERIC_MESSAGE = 'Die Account-Löschung ist derzeit nicht verfügbar. Bitte später erneut versuchen.';

function isJsonContentType(value) {
  const mediaType = String(value || '').split(';', 1)[0].trim().toLowerCase();
  return mediaType === 'application/json' || mediaType.endsWith('+json');
}

async function readBoundedText(response) {
  const declaredLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_ERROR_BYTES) {
    return null;
  }

  if (!response.body?.getReader) {
    const text = await response.text();
    return new TextEncoder().encode(text).byteLength <= MAX_ERROR_BYTES ? text : null;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ERROR_BYTES) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock?.();
  }
}

export function genericDeletionError(status = 0) {
  return {
    ok: false,
    status,
    code: 'ACCOUNT_DELETION_UNAVAILABLE',
    message: GENERIC_MESSAGE,
    retryable: true
  };
}

export async function parseAccountDeletionError(response) {
  const fallback = genericDeletionError(response?.status || 0);
  if (!response || !isJsonContentType(response.headers?.get?.('content-type'))) {
    return fallback;
  }

  try {
    const text = await readBoundedText(response);
    if (text == null) return fallback;
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fallback;
    if (typeof body.code !== 'string' || body.code.length > 64) return fallback;
    const message = ERROR_MESSAGES[body.code];
    if (!message) return fallback;
    return {
      ok: false,
      status: response.status,
      code: body.code,
      message,
      retryable: body.retryable === true
    };
  } catch (_error) {
    return fallback;
  }
}

export async function requestAccountDeletion(fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl('/api/account', { method: 'DELETE' });
  } catch (_error) {
    return genericDeletionError();
  }

  if (response.status === 204) {
    return { ok: true, status: response.status, retryable: false };
  }
  return parseAccountDeletionError(response);
}

export async function runAccountDeletionFlow({
  confirmFn,
  fetchImpl = fetch,
  button,
  onStatus = () => {},
  onComplete = () => {}
}) {
  const confirmation = confirmFn();
  if (confirmation !== 'LÖSCHEN') {
    onStatus('Account wurde nicht gelöscht.', true);
    return { ok: false, cancelled: true, retryable: false };
  }

  button.disabled = true;
  button.textContent = 'Lösche Account...';
  const result = await requestAccountDeletion(fetchImpl);
  if (result.ok) {
    onComplete();
    return result;
  }

  onStatus(result.message, true);
  if (result.retryable) {
    button.disabled = false;
    button.textContent = 'Account endgültig löschen';
  }
  return result;
}
