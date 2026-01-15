#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="student-it200233"
TARGET="svc/postgres"
LOCAL_PORT=5432
REMOTE_PORT=5432
PIDFILE=".portforward.pid"
LOGFILE="/tmp/port-forward.log"

# remove stale pidfile
if [[ -f "$PIDFILE" ]] && ! kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  rm -f "$PIDFILE"
fi

# if something is already listening on the port, assume it's fine
if lsof -nP -iTCP:${LOCAL_PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[port-forward] localhost:${LOCAL_PORT} already listening - assuming port-forward is up"
  exit 0
fi

# already running kubectl?
if [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "[port-forward] already running (pid $(cat "$PIDFILE"))"
  exit 0
fi

echo "[port-forward] starting ${LOCAL_PORT}:${REMOTE_PORT} -> ${TARGET} (ns=${NAMESPACE})"
kubectl -n "$NAMESPACE" port-forward "$TARGET" "${LOCAL_PORT}:${REMOTE_PORT}" \
  --address 127.0.0.1 >"$LOGFILE" 2>&1 &

echo $! > "$PIDFILE"

for i in {1..80}; do
  if (echo >"/dev/tcp/127.0.0.1/${LOCAL_PORT}") >/dev/null 2>&1; then
    echo "[port-forward] ready on localhost:${LOCAL_PORT}"
    exit 0
  fi

  if ! kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "[port-forward] FAILED (kubectl exited). Last log lines:"
    tail -n 30 "$LOGFILE" || true
    exit 1
  fi

  sleep 0.1
done

echo "[port-forward] did not become ready in time. Last log lines:"
tail -n 30 "$LOGFILE" || true
exit 1