/**
 * Lightweight hash-based SPA router for Dicekeeper
 */

const routes = [];
let currentCleanup = null;

export function addRoute(pattern, handler) {
  // Convert pattern like '/campaign/:id/gm' to regex
  const paramNames = [];
  const regexStr = '^' + pattern.replace(/:([^/]+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  }) + '$';
  routes.push({ regex: new RegExp(regexStr), paramNames, handler });
}

export function navigate(hash) {
  window.location.hash = '#' + hash;
}

export function getCurrentPath() {
  return window.location.hash.slice(1) || '/';
}

async function resolve() {
  const fullPath = getCurrentPath();
  const [path] = fullPath.split('?');

  // Run cleanup for previous view
  if (currentCleanup && typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  // Reset state between views
  document.body.classList.remove('has-header');
  window.scrollTo(0, 0);

  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      const cleanup = await route.handler(params);
      if (typeof cleanup === 'function') {
        currentCleanup = cleanup;
      }
      return;
    }
  }

  // 404 fallback
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="text-align:center;padding:80px 20px;color:white;">
      <h1>404</h1>
      <p>Seite nicht gefunden</p>
      <a href="#/" style="color:var(--green-accent);">Zurück zur Startseite</a>
    </div>
  `;
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  resolve();
}

