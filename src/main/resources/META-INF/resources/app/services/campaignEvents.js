const RECONNECT_LOG_DELAY_MS = 1000;

export function connectCampaignEvents(campaignId, handlers, options = {}) {
  const url = '/api/campaign/' + encodeURIComponent(campaignId) + '/sse';
  const source = new EventSource(url);
  let connectedOnce = false;
  let closed = false;
  let lastErrorLog = 0;

  const logPrefix = '[campaign-sse ' + campaignId + ']';

  source.addEventListener('connected', async event => {
    const reconnect = connectedOnce;
    connectedOnce = true;
    console.info(logPrefix, reconnect ? 'reconnected' : 'connected', {
      lastEventId: event.lastEventId || null
    });
    try {
      await options.onConnected?.({ reconnect, event });
    } catch (error) {
      console.error(logPrefix, 'state reconciliation failed', error);
    }
  });

  source.addEventListener('heartbeat', () => {
    options.onHeartbeat?.();
  });

  Object.entries(handlers).forEach(([eventName, handler]) => {
    source.addEventListener(eventName, event => {
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
      console.warn(logPrefix, 'connection lost; EventSource will reconnect', {
        readyState: source.readyState
      });
      lastErrorLog = now;
    }
    options.onError?.();
  };

  const close = () => {
    closed = true;
    source.close();
    console.info(logPrefix, 'closed');
  };
  close.close = close;
  return close;
}
