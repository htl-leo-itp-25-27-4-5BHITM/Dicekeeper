const RECONNECT_LOG_DELAY_MS = 1000;
const MANUAL_RECONNECT_MIN_MS = 1000;
const MANUAL_RECONNECT_MAX_MS = 15000;
// Two missed server heartbeats (every 20s) mean the stream is silently dead.
const STALE_CONNECTION_MS = 45000;

export function connectCampaignEvents(campaignId, handlers, options = {}) {
  const baseUrl = '/api/campaign/' + encodeURIComponent(campaignId) + '/sse';
  let source = null;
  let connectedOnce = false;
  let closed = false;
  let lastErrorLog = 0;
  let lastEventId = null;
  let lastActivity = Date.now();
  let reconnectTimer = null;
  let reconnectDelay = MANUAL_RECONNECT_MIN_MS;
  let watchdogTimer = null;

  const logPrefix = '[campaign-sse ' + campaignId + ']';

  function rememberEvent(event) {
    lastActivity = Date.now();
    if (event.lastEventId) lastEventId = event.lastEventId;
  }

  function open() {
    // The query parameter lets the server replay missed events for a freshly created EventSource;
    // the browser itself only sends Last-Event-ID on its own automatic reconnects.
    const url = lastEventId ? baseUrl + '?lastEventId=' + encodeURIComponent(lastEventId) : baseUrl;
    source = new EventSource(url);
    lastActivity = Date.now();

    source.addEventListener('connected', async event => {
      rememberEvent(event);
      reconnectDelay = MANUAL_RECONNECT_MIN_MS;
      const reconnect = connectedOnce;
      connectedOnce = true;
      console.info(logPrefix, reconnect ? 'reconnected' : 'connected', {
        lastEventId: lastEventId || null
      });
      try {
        await options.onConnected?.({ reconnect, event });
      } catch (error) {
        console.error(logPrefix, 'state reconciliation failed', error);
      }
    });

    source.addEventListener('heartbeat', event => {
      rememberEvent(event);
      options.onHeartbeat?.();
    });

    Object.entries(handlers).forEach(([eventName, handler]) => {
      source.addEventListener(eventName, event => {
        rememberEvent(event);
        try {
          const data = event.data ? JSON.parse(event.data) : null;
          handler(data, event);
        } catch (error) {
          console.error(logPrefix, 'ignored invalid event', {
            eventName,
            lastEventId: event.lastEventId || null,
            data: event.data,
            error
          });
        }
      });
    });

    source.onerror = () => {
      if (closed) return;
      const now = Date.now();
      if (now - lastErrorLog >= RECONNECT_LOG_DELAY_MS) {
        console.warn(logPrefix, 'connection lost; reconnecting', {
          readyState: source.readyState
        });
        lastErrorLog = now;
      }
      // A non-200 response (proxy 502, expired session, ...) makes the browser give up for good.
      if (source.readyState === EventSource.CLOSED) scheduleReconnect();
      options.onError?.();
    };
  }

  function scheduleReconnect() {
    if (closed || reconnectTimer) return;
    if (source) source.close();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!closed) open();
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, MANUAL_RECONNECT_MAX_MS);
  }

  function checkStale() {
    if (closed || reconnectTimer) return;
    if (Date.now() - lastActivity > STALE_CONNECTION_MS) {
      console.warn(logPrefix, 'no heartbeat received; reopening stream');
      scheduleReconnect();
    }
  }

  function onVisible() {
    if (document.visibilityState === 'visible') checkStale();
  }

  open();
  watchdogTimer = setInterval(checkStale, STALE_CONNECTION_MS / 3);
  document.addEventListener('visibilitychange', onVisible);

  const close = () => {
    closed = true;
    clearTimeout(reconnectTimer);
    clearInterval(watchdogTimer);
    document.removeEventListener('visibilitychange', onVisible);
    if (source) source.close();
    console.info(logPrefix, 'closed');
  };
  close.close = close;
  return close;
}
