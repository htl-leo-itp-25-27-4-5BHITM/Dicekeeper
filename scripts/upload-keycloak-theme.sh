#!/usr/bin/env bash

set -euo pipefail

NAMESPACE="${1:-student-it200233}"
POD="${2:-}"
THEME_DIR="${3:-/Users/blauregen/School/SEW/Dicekeeper/keycloak/themes/dicekeeper-email}"
TARGET_ROOT="${4:-/opt/keycloak/themes}"

if [[ -z "$POD" ]]; then
  echo "Usage: $0 <namespace> <pod> [theme_dir] [target_root]" >&2
  exit 1
fi

if [[ ! -d "$THEME_DIR" ]]; then
  echo "Theme directory not found: $THEME_DIR" >&2
  exit 1
fi

THEME_NAME="$(basename "$THEME_DIR")"
TARGET_DIR="${TARGET_ROOT%/}/${THEME_NAME}"

echo "Uploading theme '${THEME_NAME}' to pod '${POD}' in namespace '${NAMESPACE}'..."
kubectl -n "$NAMESPACE" exec "$POD" -- sh -lc "mkdir -p '$TARGET_DIR'"

while IFS= read -r -d '' dir; do
  rel="${dir#"$THEME_DIR"/}"
  [[ "$rel" == "$dir" ]] && rel=""
  if [[ -n "$rel" ]]; then
    kubectl -n "$NAMESPACE" exec "$POD" -- sh -lc "mkdir -p '$TARGET_DIR/$rel'"
  fi
done < <(find "$THEME_DIR" -type d -print0)

while IFS= read -r -d '' file; do
  rel="${file#"$THEME_DIR"/}"
  echo "  -> $rel"
  kubectl -n "$NAMESPACE" exec -i "$POD" -- sh -lc "cat > '$TARGET_DIR/$rel'" < "$file"
done < <(find "$THEME_DIR" -type f -print0)

echo "Theme uploaded to $TARGET_DIR"
echo "Now select the Login Theme = ${THEME_NAME}"
echo "Now select the Email Theme = ${THEME_NAME}"
