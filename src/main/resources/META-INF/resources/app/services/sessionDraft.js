export function readSessionDraft(key) {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function writeSessionDraft(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Browsers can reject writes when storage is full or disabled.
  }
}

export function clearSessionDraft(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch (e) {
    // Ignore unavailable storage.
  }
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Datei konnte nicht gelesen werden'));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}
