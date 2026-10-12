import {
  backgroundAuthRequest,
  getAuthenticationRecoveryCoordinator
} from './auth.js';

const DEFAULT_RECONNECT_DELAYS_MS = Object.freeze([1_000, 2_000, 5_000, 10_000]);
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 45_000;

export function connectCampaignEvents(campaignId, handlers = {}, options = {}) {
  const url = '/api/campaign/' + encodeURIComponent(campaignId) + '/sse';
  const sourceFactory = options.sourceFactory || (sourceUrl => new EventSource(sourceUrl));
  const fetchImpl = options.fetchImpl || fetch;
  const authCoordinator = options.authCoordinator || getAuthenticationRecoveryCoordinator();
  const reconnectDelaysMs = options.reconnectDelaysMs || DEFAULT_RECONNECT_DELAYS_MS;
  const heartbeatTimeoutMs = options.heartbeatTimeoutMs || DEFAULT_HEARTBEAT_TIMEOUT_MS;
  const setTimeoutImpl = options.setTimeout || ((callback, delay) => setTimeout(callback, delay));
  const clearTimeoutImpl = options.clearTimeout || (timer => clearTimeout(timer));
  const origin = options.origin || window.location.origin;

  let source = null;
  let state = 'connecting';
  let disposed = false;
  let epoch = 0;
  let reconnectTimer = null;
  let livenessTimer = null;
  let recoveryPromise = null;
  let reconciliationRun = null;
  let reconnectAttempt = 0;
  let connectedOnce = false;
  let lastEventId = null;

  function setState(nextState) {
    if (state === nextState) return;
    state = nextState;
    options.onStateChange?.(state);
  }

  function clearReconnectTimer() {
    if (reconnectTimer !== null) clearTimeoutImpl(reconnectTimer);
    reconnectTimer = null;
  }

  function clearLivenessTimer() {
    if (livenessTimer !== null) clearTimeoutImpl(livenessTimer);
    livenessTimer = null;
  }

  function closeSource() {
    if (!source) return;
    source.close();
    source = null;
  }

  function armLivenessTimer(sourceEpoch) {
    clearLivenessTimer();
    if (disposed || sourceEpoch !== epoch) return;
    livenessTimer = setTimeoutImpl(() => {
      livenessTimer = null;
      handleSourceFailure(sourceEpoch);
    }, heartbeatTimeoutMs);
  }

  async function reconcile(reason, sourceEpoch) {
    if (!options.loadSnapshot) {
      if (!disposed && sourceEpoch === epoch) setState('current');
      return;
    }

    if (reconciliationRun?.epoch === sourceEpoch) {
      reconciliationRun.dirty = true;
      return reconciliationRun.promise;
    }

    const run = {
      epoch: sourceEpoch,
      dirty: false,
      promise: null
    };
    run.promise = (async () => {
      setState('reconciling');
      while (!disposed && run.epoch === epoch) {
        run.dirty = false;
        let snapshot;
        try {
          snapshot = await options.loadSnapshot({
            campaignId,
            reason,
            generation: run.epoch
          });
        } catch (error) {
          if (!disposed && run.epoch === epoch) {
            setState('stale');
            options.onReconciliationError?.(error);
          }
          return;
        }

        if (disposed || run.epoch !== epoch) return;
        if (run.dirty) continue;

        try {
          await options.applySnapshot?.(snapshot, {
            campaignId,
            reason,
            generation: run.epoch
          });
        } catch (error) {
          if (!disposed && run.epoch === epoch) {
            setState('stale');
            options.onReconciliationError?.(error);
          }
          return;
        }

        if (disposed || run.epoch !== epoch) return;
        if (run.dirty) continue;
        setState('current');
        return;
      }
    })().finally(() => {
      if (reconciliationRun === run) reconciliationRun = null;
    });
    reconciliationRun = run;
    return run.promise;
  }

  function scheduleReconnect(delay, recoveryEpoch = epoch) {
    if (disposed || recoveryEpoch !== epoch || reconnectTimer !== null) return false;
    setState('reconnecting');
    reconnectTimer = setTimeoutImpl(() => {
      reconnectTimer = null;
      if (!disposed && recoveryEpoch === epoch) openSource(false);
    }, delay);
    return true;
  }

  async function classifyAndRecover(recoveryEpoch) {
    if (recoveryPromise) return recoveryPromise;
    recoveryPromise = (async () => {
      let response;
      try {
        response = await fetchImpl(
          '/api/campaign/' + encodeURIComponent(campaignId) + '/game/state',
          backgroundAuthRequest({ cache: 'no-store', redirect: 'manual' })
        );
      } catch (error) {
        if (!disposed && recoveryEpoch === epoch) {
          setState('unavailable');
          options.onError?.(error);
        }
        return;
      }

      if (disposed || recoveryEpoch !== epoch) return;
      if (response.status === 499 || response.type === 'opaqueredirect') {
        authCoordinator.expired({ interactive: false });
        setState('reauthenticating');
        return;
      }
      if (response.status === 403) {
        setState('revoked');
        return;
      }
      if (!response.ok) {
        setState('unavailable');
        return;
      }

      const delayIndex = Math.min(reconnectAttempt, reconnectDelaysMs.length - 1);
      const delay = reconnectDelaysMs[delayIndex] ?? 0;
      reconnectAttempt += 1;
      scheduleReconnect(delay, recoveryEpoch);
    })().finally(() => {
      recoveryPromise = null;
    });
    return recoveryPromise;
  }

  function handleSourceFailure(sourceEpoch) {
    if (disposed || sourceEpoch !== epoch || recoveryPromise) return;
    epoch += 1;
    const recoveryEpoch = epoch;
    clearLivenessTimer();
    clearReconnectTimer();
    closeSource();
    setState('stale');
    options.onError?.();
    classifyAndRecover(recoveryEpoch);
  }

  function parseSequence(event) {
    if (!event.lastEventId) return null;
    const value = Number(event.lastEventId);
    return Number.isSafeInteger(value) && value > 0 ? value : Number.NaN;
  }

  function handleEvent(eventName, handler, event, sourceEpoch) {
    if (disposed || sourceEpoch !== epoch) return;

    const sequence = parseSequence(event);
    if (Number.isNaN(sequence)) {
      reconcile('invalid-event-id', sourceEpoch);
      return;
    }
    if (sequence !== null && lastEventId !== null) {
      if (sequence === lastEventId) return;
      if (sequence < lastEventId || sequence > lastEventId + 1) {
        reconcile(sequence < lastEventId ? 'out-of-order-event' : 'event-gap', sourceEpoch);
        return;
      }
    }

    let data = null;
    try {
      data = event.data ? JSON.parse(event.data) : null;
    } catch {
      reconcile('malformed-event', sourceEpoch);
      return;
    }

    if (sequence !== null) lastEventId = sequence;
    if (reconciliationRun?.epoch === sourceEpoch) {
      reconciliationRun.dirty = true;
      return;
    }

    try {
      handler(data, event);
    } catch (error) {
      options.onEventError?.(error, { eventName });
      reconcile('event-handler-failed', sourceEpoch);
    }
  }

  function openSource(initial) {
    if (disposed) return false;
    clearReconnectTimer();
    clearLivenessTimer();
    closeSource();

    epoch += 1;
    const sourceEpoch = epoch;
    setState(initial ? 'connecting' : 'reconnecting');
    source = sourceFactory(url);

    source.addEventListener('connected', event => {
      if (disposed || sourceEpoch !== epoch) return;
      const reconnect = connectedOnce;
      connectedOnce = true;
      reconnectAttempt = 0;
      armLivenessTimer(sourceEpoch);
      options.onConnected?.({ reconnect, event });
      reconcile(reconnect ? 'reconnected' : 'connected', sourceEpoch);
    });

    source.addEventListener('heartbeat', event => {
      if (disposed || sourceEpoch !== epoch) return;
      armLivenessTimer(sourceEpoch);
      options.onHeartbeat?.(event);
    });

    for (const [eventName, handler] of Object.entries(handlers)) {
      source.addEventListener(eventName, event => {
        handleEvent(eventName, handler, event, sourceEpoch);
      });
    }

    source.onerror = () => handleSourceFailure(sourceEpoch);
    return true;
  }

  const stopAuthSubscription = authCoordinator.subscribe(authState => {
    if (disposed || authState.status !== 'authenticated' || state !== 'reauthenticating') return;
    scheduleReconnect(0, epoch);
  });

  function retry() {
    if (disposed || !['unavailable', 'stale', 'revoked'].includes(state)) return false;
    clearReconnectTimer();
    setState('reconnecting');
    return openSource(false);
  }

  function close() {
    if (disposed) return;
    disposed = true;
    epoch += 1;
    clearReconnectTimer();
    clearLivenessTimer();
    closeSource();
    stopAuthSubscription?.();
    setState('disposed');
    options.onClose?.();
  }

  close.close = close;
  close.retry = retry;
  close.reconcile = reason => reconcile(reason || 'explicit', epoch);
  close.getState = () => state;

  openSource(true);
  return close;
}
