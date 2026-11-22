/**
 * DEV-ONLY: Versteckte KI-Testseite (#/dev/ki-test).
 *
 * Nutzer verbinden sich mit ihrem eigenen OpenAI- und/oder Claude-API-Key und chatten mit der KI.
 * Nicht verlinkt, nur über die URL erreichbar. Zum Entfernen den Ordner app/dev/ und die markierte
 * Route in main.js löschen (Backend: Paket ai/playground).
 */
import { requirePlayer } from '../services/auth.js';
import { renderHeader, initHeader, destroyHeader } from '../components/header.js';
import { esc } from '../services/utils.js';
import { connectProvider, disconnectProvider, getStatus, listModels, streamChat } from './aiPlaygroundApi.js';
import { renderMarkdown } from './markdown.js';

const PROVIDERS = {
  anthropic: {
    name: 'Claude (Anthropic)',
    keyPlaceholder: 'sk-ant-…',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyUrlLabel: 'Anthropic Console'
  },
  openai: {
    name: 'OpenAI',
    keyPlaceholder: 'sk-…',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyUrlLabel: 'OpenAI Platform'
  }
};

const MODES = [
  { id: 'general', label: 'Allgemein' },
  { id: 'campaign_creation', label: 'Kampagne erstellen' },
  { id: 'session_help', label: 'Während der Session (Regeln & Improvisation)' }
];

const EXAMPLES = {
  general: ['Was ist der Unterschied zwischen Advantage und Inspiration?', 'Wie bereite ich mich auf meine erste Session als DM vor?'],
  campaign_creation: ['Hilf mir, eine Kampagne für 4 Spieler auf Stufe 3 in einer Hafenstadt zu planen.', 'Erfinde einen Bösewicht mit nachvollziehbarem Motiv.'],
  session_help: ['Ein Spieler will einen Gegner von einer Klippe stoßen. Welche Regel gilt?', 'Die Gruppe spricht spontan mit einem Wirt. Gib mir einen NSC mit Namen und Eigenheit.']
};

const STYLE_ID = 'dk-ai-playground-style';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const link = document.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = 'app/dev/aiPlayground.css';
  document.head.appendChild(link);
}

export default async function AiPlaygroundView() {
  const player = requirePlayer();
  if (!player) return;

  ensureStyles();
  const app = document.getElementById('app');
  document.body.classList.add('has-header');

  const state = {
    status: {},            // provider -> { connected, keyHint }
    models: {},            // provider -> { models: [], defaultModel }
    provider: null,
    model: {},             // provider -> gewähltes Modell
    mode: 'general',
    messages: [],          // { role, content, meta? }
    streaming: false,
    abort: null
  };

  app.innerHTML = renderHeader() + `
    <div class="aip-page">
      <div class="aip-dev-banner" role="note">
        <strong>Entwickler-Testseite</strong> · nicht verlinkt und nur zum Ausprobieren der KI-Anbindung.
        Wird vor dem Release wieder entfernt.
      </div>
      <div class="aip-layout">
        <aside class="aip-panel aip-connections" aria-label="KI-Konten verbinden">
          <h2>Konten verbinden</h2>
          <p class="aip-muted">
            Verbinde dich mit deinem eigenen API-Key. Der Key wird nur im Arbeitsspeicher des Servers gehalten
            (max. 12 Stunden), nie gespeichert und nie an den Browser zurückgegeben. Die Kosten laufen über dein Konto beim Anbieter.
          </p>
          <div id="aipProviders"></div>
          <details class="aip-help">
            <summary>Warum ein API-Key statt ChatGPT-/Claude-Login?</summary>
            <p>ChatGPT Plus und Claude Pro/Max sind Abos für die Apps der Anbieter. Fremde Apps wie Dicekeeper
            dürfen sich damit nicht anmelden. Für eigene Anwendungen gibt es die Entwickler-Plattformen von
            OpenAI und Anthropic: Dort legst du einen API-Key an und zahlst pro Nutzung.</p>
          </details>
        </aside>

        <section class="aip-panel aip-chat" aria-label="Chat">
          <div class="aip-toolbar">
            <label>Anbieter
              <select id="aipProvider"></select>
            </label>
            <label>Modell
              <select id="aipModel"></select>
            </label>
            <label>Modus
              <select id="aipMode">${MODES.map(m => `<option value="${m.id}">${esc(m.label)}</option>`).join('')}</select>
            </label>
            <button class="btn btn-secondary" id="aipNewChat" type="button">Neuer Chat</button>
          </div>
          <div class="aip-messages" id="aipMessages" aria-live="polite"></div>
          <form class="aip-composer" id="aipComposer">
            <textarea id="aipInput" rows="3" placeholder="Frag die KI etwas… (Enter senden, Shift+Enter neue Zeile)" maxlength="12000"></textarea>
            <div class="aip-composer-actions">
              <span class="aip-muted" id="aipUsage"></span>
              <button class="btn btn-secondary" id="aipStop" type="button" hidden>Stopp</button>
              <button class="btn btn-primary" id="aipSend" type="submit">Senden</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  `;
  initHeader();

  const el = {
    providers: document.getElementById('aipProviders'),
    provider: document.getElementById('aipProvider'),
    model: document.getElementById('aipModel'),
    mode: document.getElementById('aipMode'),
    messages: document.getElementById('aipMessages'),
    composer: document.getElementById('aipComposer'),
    input: document.getElementById('aipInput'),
    send: document.getElementById('aipSend'),
    stop: document.getElementById('aipStop'),
    usage: document.getElementById('aipUsage'),
    newChat: document.getElementById('aipNewChat')
  };

  const connectedProviders = () => Object.keys(PROVIDERS).filter(p => state.status[p]?.connected);

  function renderProviders() {
    el.providers.innerHTML = Object.entries(PROVIDERS).map(([id, p]) => {
      const st = state.status[id] || {};
      if (st.connected) {
        return `
          <div class="aip-provider is-connected" data-provider="${id}">
            <div class="aip-provider-head">
              <span class="aip-provider-name">${esc(p.name)}</span>
              <span class="aip-badge">verbunden</span>
            </div>
            <div class="aip-muted">Key ${esc(st.keyHint || '')}</div>
            <button class="btn btn-secondary aip-disconnect" type="button" data-provider="${id}">Trennen</button>
          </div>`;
      }
      return `
        <form class="aip-provider" data-provider="${id}">
          <div class="aip-provider-head">
            <span class="aip-provider-name">${esc(p.name)}</span>
            <span class="aip-badge is-off">nicht verbunden</span>
          </div>
          <label class="aip-key-label">API-Key
            <input type="password" name="apiKey" autocomplete="off" spellcheck="false" placeholder="${esc(p.keyPlaceholder)}" required />
          </label>
          <div class="aip-muted">Key erstellen: <a href="${p.keyUrl}" target="_blank" rel="noopener noreferrer">${esc(p.keyUrlLabel)}</a></div>
          <div class="aip-provider-error" role="alert"></div>
          <button class="btn btn-primary" type="submit">Verbinden</button>
        </form>`;
    }).join('');
  }

  function renderToolbar() {
    const connected = connectedProviders();
    if (!connected.includes(state.provider)) state.provider = connected[0] || null;
    el.provider.innerHTML = connected.length
      ? connected.map(p => `<option value="${p}" ${p === state.provider ? 'selected' : ''}>${esc(PROVIDERS[p].name)}</option>`).join('')
      : '<option value="">– zuerst verbinden –</option>';
    el.provider.disabled = !connected.length || state.streaming;

    const info = state.models[state.provider];
    if (state.provider && info) {
      const selected = state.model[state.provider] || info.defaultModel;
      state.model[state.provider] = selected;
      el.model.innerHTML = info.models.map(m =>
        `<option value="${esc(m.id)}" ${m.id === selected ? 'selected' : ''}>${esc(m.displayName || m.id)}${m.id === info.defaultModel ? ' (Standard)' : ''}</option>`
      ).join('') || `<option value="${esc(selected)}">${esc(selected)}</option>`;
    } else {
      el.model.innerHTML = '<option value="">–</option>';
    }
    el.model.disabled = !state.provider || state.streaming;
    el.mode.disabled = state.streaming;
    el.send.disabled = !state.provider || state.streaming;
    el.input.disabled = !state.provider;
    el.stop.hidden = !state.streaming;
    el.newChat.disabled = state.streaming;
  }

  function renderMessages() {
    if (!state.messages.length) {
      const examples = EXAMPLES[state.mode] || [];
      el.messages.innerHTML = `
        <div class="aip-empty">
          <div class="aip-empty-title">${state.provider ? 'Worüber möchtest du sprechen?' : 'Verbinde links ein Konto, um zu starten.'}</div>
          ${state.provider ? `<div class="aip-examples">${examples.map(e => `<button type="button" class="aip-example">${esc(e)}</button>`).join('')}</div>` : ''}
        </div>`;
      return;
    }
    el.messages.innerHTML = state.messages.map((m, i) => {
      const body = m.role === 'assistant'
        ? (m.content ? renderMarkdown(m.content) : '<span class="aip-typing" aria-label="KI schreibt">●●●</span>')
        : esc(m.content).replace(/\n/g, '<br>');
      const meta = m.meta ? `<div class="aip-meta${m.meta.error ? ' is-error' : ''}">${esc(m.meta.text)}</div>` : '';
      return `<div class="aip-msg aip-msg-${m.role}" data-index="${i}"><div class="aip-bubble">${body}</div>${meta}</div>`;
    }).join('');
    el.messages.scrollTop = el.messages.scrollHeight;
  }

  function renderAll() {
    renderProviders();
    renderToolbar();
    renderMessages();
  }

  async function loadModels(provider) {
    try {
      state.models[provider] = await listModels(provider);
    } catch (e) {
      state.models[provider] = { models: [], defaultModel: '' };
    }
  }

  async function refreshStatus() {
    try {
      const data = await getStatus();
      state.status = data.providers || {};
    } catch (e) {
      el.messages.innerHTML = `<div class="aip-empty"><div class="aip-empty-title">${esc(e.message)}</div></div>`;
      return false;
    }
    await Promise.all(connectedProviders().filter(p => !state.models[p]).map(loadModels));
    return true;
  }

  // ---- Verbinden / Trennen ----
  el.providers.addEventListener('submit', async (ev) => {
    const form = ev.target.closest('form.aip-provider');
    if (!form) return;
    ev.preventDefault();
    const provider = form.dataset.provider;
    const input = form.querySelector('input[name="apiKey"]');
    const errorEl = form.querySelector('.aip-provider-error');
    const button = form.querySelector('button[type="submit"]');
    errorEl.textContent = '';
    button.disabled = true;
    button.textContent = 'Prüfe Key…';
    try {
      const result = await connectProvider(provider, input.value.trim());
      input.value = '';
      state.models[provider] = result;
      state.status[provider] = { connected: true };
      await refreshStatus();
      state.provider = provider;
      renderAll();
    } catch (e) {
      errorEl.textContent = e.message;
      button.disabled = false;
      button.textContent = 'Verbinden';
    }
  });

  el.providers.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('.aip-disconnect');
    if (!btn) return;
    btn.disabled = true;
    try {
      await disconnectProvider(btn.dataset.provider);
    } catch (e) { /* trotzdem neu laden */ }
    delete state.models[btn.dataset.provider];
    await refreshStatus();
    renderAll();
  });

  // ---- Toolbar ----
  el.provider.addEventListener('change', () => { state.provider = el.provider.value || null; renderToolbar(); renderMessages(); });
  el.model.addEventListener('change', () => { if (state.provider) state.model[state.provider] = el.model.value; });
  el.mode.addEventListener('change', () => { state.mode = el.mode.value; if (!state.messages.length) renderMessages(); });
  el.newChat.addEventListener('click', () => { state.messages = []; el.usage.textContent = ''; renderMessages(); el.input.focus(); });

  el.messages.addEventListener('click', (ev) => {
    const example = ev.target.closest('.aip-example');
    if (!example) return;
    el.input.value = example.textContent;
    el.input.focus();
  });

  // ---- Chat ----
  el.input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      el.composer.requestSubmit();
    }
  });

  el.stop.addEventListener('click', () => state.abort?.abort());

  el.composer.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const text = el.input.value.trim();
    if (!text || !state.provider || state.streaming) return;

    const provider = state.provider;
    const model = state.model[provider] || state.models[provider]?.defaultModel;
    state.messages.push({ role: 'user', content: text });
    const history = state.messages
      .filter(m => !m.meta?.error && m.content)
      .map(({ role, content }) => ({ role, content }));
    const answer = { role: 'assistant', content: '' };
    state.messages.push(answer);
    el.input.value = '';
    state.streaming = true;
    state.abort = new AbortController();
    renderToolbar();
    renderMessages();

    let pending = false;
    const scheduleRender = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; renderMessages(); });
    };

    const started = performance.now();
    try {
      await streamChat({ provider, model, mode: state.mode, messages: history }, (event) => {
        if (event.type === 'delta') {
          answer.content += event.text;
          scheduleRender();
        } else if (event.type === 'done') {
          const secs = ((performance.now() - started) / 1000).toFixed(1);
          const notes = [`${model}`, `${secs}s`];
          if (event.inputTokens != null) notes.push(`${event.inputTokens} → ${event.outputTokens} Tokens`);
          if (event.stopReason === 'max_tokens') notes.push('Antwort abgeschnitten (Token-Limit)');
          if (event.stopReason === 'refusal') notes.push('Das Modell hat die Antwort abgelehnt');
          answer.meta = { text: notes.join(' · ') };
          if (event.inputTokens != null) el.usage.textContent = `Letzte Anfrage: ${event.inputTokens} Input- / ${event.outputTokens} Output-Tokens`;
        } else if (event.type === 'error') {
          answer.meta = { text: event.text, error: true };
        }
      }, state.abort.signal);
    } catch (e) {
      if (e.name === 'AbortError') {
        answer.meta = { text: 'Abgebrochen' };
      } else {
        answer.meta = { text: e.message, error: true };
      }
    } finally {
      if (!answer.content && answer.meta?.error) {
        // Fehlgeschlagene Runde aus dem Verlauf nehmen, damit man es erneut senden kann.
        state.messages.splice(state.messages.indexOf(answer) - 1, 2,
          { role: 'user', content: text, meta: { text: answer.meta.text, error: true } });
        el.input.value = text;
      }
      state.streaming = false;
      state.abort = null;
      renderToolbar();
      renderMessages();
      el.input.focus();
    }
  });

  renderAll();
  if (await refreshStatus()) renderAll();

  return () => {
    state.abort?.abort();
    destroyHeader();
    document.getElementById(STYLE_ID)?.remove();
  };
}
