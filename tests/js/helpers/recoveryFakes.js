export class FakeClock {
  constructor(startAt = 0) {
    this.nowValue = startAt;
    this.nextId = 1;
    this.tasks = new Map();
  }

  now = () => this.nowValue;

  setTimeout = (callback, delay = 0) => this.schedule(callback, delay, false);

  clearTimeout = id => this.tasks.delete(id);

  setInterval = (callback, delay = 0) => this.schedule(callback, delay, true);

  clearInterval = id => this.tasks.delete(id);

  schedule(callback, delay, repeating) {
    const id = this.nextId++;
    const duration = Math.max(0, Number(delay) || 0);
    this.tasks.set(id, {
      id,
      callback,
      repeating,
      delay: duration,
      dueAt: this.nowValue + duration
    });
    return id;
  }

  tick(milliseconds) {
    const target = this.nowValue + milliseconds;
    while (true) {
      const next = [...this.tasks.values()]
        .filter(task => task.dueAt <= target)
        .sort((a, b) => a.dueAt - b.dueAt || a.id - b.id)[0];
      if (!next) break;
      this.nowValue = next.dueAt;
      if (next.repeating && this.tasks.has(next.id)) {
        next.dueAt += next.delay;
      } else {
        this.tasks.delete(next.id);
      }
      next.callback();
    }
    this.nowValue = target;
  }

  pendingCount() {
    return this.tasks.size;
  }

  adapters() {
    return {
      now: this.now,
      setTimeout: this.setTimeout,
      clearTimeout: this.clearTimeout,
      setInterval: this.setInterval,
      clearInterval: this.clearInterval
    };
  }
}

export function createNavigationSpy() {
  const destinations = [];
  return {
    destinations,
    assign: destination => destinations.push(destination)
  };
}

export function jsonResponse(status, body, options = {}) {
  const url = options.url || 'http://localhost/api/test';
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
}

export function createFetchQueue(entries = []) {
  const queue = [...entries];
  const calls = [];
  const fetch = async (...args) => {
    calls.push(args);
    if (queue.length === 0) throw new Error('Unexpected fetch: ' + args[0]);
    const next = queue.shift();
    if (next instanceof Error) throw next;
    if (typeof next === 'function') return next(...args);
    return next;
  };
  return { fetch, calls, queue };
}

export class FakeEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  constructor(url) {
    this.url = url;
    this.readyState = FakeEventSource.CONNECTING;
    this.listeners = new Map();
    this.onerror = null;
    this.closeCalls = 0;
  }

  addEventListener(name, listener) {
    const listeners = this.listeners.get(name) || [];
    listeners.push(listener);
    this.listeners.set(name, listeners);
  }

  emit(name, data = null, options = {}) {
    if (name === 'connected') this.readyState = FakeEventSource.OPEN;
    const event = {
      data: typeof data === 'string' ? data : data == null ? '' : JSON.stringify(data),
      lastEventId: options.lastEventId || ''
    };
    for (const listener of this.listeners.get(name) || []) listener(event);
  }

  fail({ terminal = false } = {}) {
    this.readyState = terminal ? FakeEventSource.CLOSED : FakeEventSource.CONNECTING;
    this.onerror?.({ type: 'error' });
  }

  close() {
    this.closeCalls += 1;
    this.readyState = FakeEventSource.CLOSED;
  }
}

export function createEventSourceFactory() {
  const sources = [];
  return {
    sources,
    create: url => {
      const source = new FakeEventSource(url);
      sources.push(source);
      return source;
    }
  };
}
