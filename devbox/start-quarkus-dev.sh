#!/usr/bin/env bash
set -euo pipefail

cd "${CHECKOUT_DIR:-/workspace/dicekeeper}"
export DICEKEEPER_SKIP_LOCAL_PORT_FORWARDS=1

exec mvn quarkus:dev \
  -Dquarkus.http.host=0.0.0.0 \
  -Ddebug=5005 \
  -DdebugHost=0.0.0.0 \
  -Dsuspend=n \
  "$@"
