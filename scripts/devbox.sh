#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd -- "${script_dir}/.." && pwd)"
manifest_dir="${project_root}/k8s/devbox"
namespace="${DICEKEEPER_DEVBOX_NAMESPACE:-student-it200233}"
http_port="${DICEKEEPER_DEVBOX_HTTP_PORT:-8080}"
debug_port="${DICEKEEPER_DEVBOX_DEBUG_PORT:-5005}"

usage() {
  cat <<'EOF'
Usage: scripts/devbox.sh [-n NAMESPACE] COMMAND

Commands:
  validate              Client- and server-side validate all workspace manifests
  status                Show Deployment, pod, Service, and PVC status
  shell                 Open an interactive Bash shell as the development user
  port-forward          Forward local 8080/5005 to workspace HTTP/debug ports
  remove                Remove Deployment and Service, retaining the workspace PVC
  delete-data CONFIRM    Delete the retained PVC when CONFIRM is DELETE-WORKSPACE-DATA
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--namespace)
      [[ $# -ge 2 ]] || { echo "Missing namespace value." >&2; exit 2; }
      namespace="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      break
      ;;
  esac
done

command_name="${1:-}"
shift || true

case "${command_name}" in
  validate)
    kubectl -n "${namespace}" apply --dry-run=client -f "${manifest_dir}"
    kubectl -n "${namespace}" apply --dry-run=server -f "${manifest_dir}"
    ;;
  status)
    kubectl -n "${namespace}" get \
      deployment/dicekeeper-devbox \
      service/dicekeeper-devbox \
      pvc/dicekeeper-devbox-workspace
    kubectl -n "${namespace}" get pods \
      -l app.kubernetes.io/name=dicekeeper-devbox \
      -o wide
    ;;
  shell)
    exec kubectl -n "${namespace}" exec -it deployment/dicekeeper-devbox -- bash
    ;;
  port-forward)
    exec kubectl -n "${namespace}" port-forward service/dicekeeper-devbox \
      "${http_port}:8080" "${debug_port}:5005" --address 127.0.0.1
    ;;
  remove)
    kubectl -n "${namespace}" delete deployment/dicekeeper-devbox service/dicekeeper-devbox --ignore-not-found
    echo "Retained PVC dicekeeper-devbox-workspace in namespace ${namespace}."
    ;;
  delete-data)
    if [[ "${1:-}" != "DELETE-WORKSPACE-DATA" ]]; then
      echo "Refusing to delete persistent data without: delete-data DELETE-WORKSPACE-DATA" >&2
      exit 2
    fi
    kubectl -n "${namespace}" delete pvc/dicekeeper-devbox-workspace
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
