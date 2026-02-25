#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="student-it200233"

ensure_port_forward() {
  local target="$1"
  local local_port="$2"
  local remote_port="$3"
  local pidfile="$4"
  local logfile="$5"

  # remove stale pidfile
  if [[ -f "$pidfile" ]] && ! kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    rm -f "$pidfile"
  fi

  # if something is already listening on the port, assume it's fine
  if lsof -nP -iTCP:${local_port} -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[port-forward] localhost:${local_port} already listening - assuming port-forward is up"
    return 0
  fi

  # already running kubectl?
  if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "[port-forward] already running (pid $(cat "$pidfile"))"
    return 0
  fi

  echo "[port-forward] starting ${local_port}:${remote_port} -> ${target} (ns=${NAMESPACE})"
  kubectl -n "$NAMESPACE" port-forward "$target" "${local_port}:${remote_port}" \
    --address 127.0.0.1 >"$logfile" 2>&1 &

  echo $! > "$pidfile"

  for i in {1..80}; do
    if (echo >"/dev/tcp/127.0.0.1/${local_port}") >/dev/null 2>&1; then
      echo "[port-forward] ready on localhost:${local_port}"
      return 0
    fi

    if ! kill -0 "$(cat "$pidfile")" 2>/dev/null; then
      echo "[port-forward] FAILED (kubectl exited). Last log lines:"
      tail -n 30 "$logfile" || true
      return 1
    fi

    sleep 0.1
  done

  echo "[port-forward] did not become ready in time. Last log lines:"
  tail -n 30 "$logfile" || true
  return 1
}

ensure_port_forward "svc/postgres" 5432 5432 ".portforward.pid" "/tmp/port-forward-postgres.log"
ensure_port_forward "svc/keycloak" 8000 8080 ".portforward-keycloak.pid" "/tmp/port-forward-keycloak.log"
