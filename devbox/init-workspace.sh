#!/usr/bin/env bash
set -euo pipefail

workspace_root="${WORKSPACE_ROOT:-/workspace}"
checkout_dir="${CHECKOUT_DIR:-${workspace_root}/dicekeeper}"
repository_url="${REPOSITORY_URL:-https://github.com/htl-leo-itp-25-27-4-5BHITM/Dicekeeper.git}"
repository_branch="${REPOSITORY_BRANCH:-develop}"

mkdir -p \
  "${workspace_root}/.cache/maven/repository" \
  "${workspace_root}/.cache/npm" \
  "${workspace_root}/.cache/config" \
  "${workspace_root}/.home/.ssh"
chmod 0700 "${workspace_root}/.home/.ssh"

if [[ -d "${checkout_dir}/.git" ]]; then
  echo "Existing Dicekeeper checkout detected; leaving it unchanged."
  exit 0
fi

if [[ -e "${checkout_dir}" ]] && [[ -n "$(find "${checkout_dir}" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
  echo "Workspace initialization refused: ${checkout_dir} contains data but is not a Git checkout." >&2
  exit 1
fi

# A container runtime can pre-create the image WORKDIR on a mounted volume as root.
# Removing that directory is safe only while it is empty; Git then recreates it as the
# non-root development user.
if [[ -d "${checkout_dir}" ]] && [[ ! -w "${checkout_dir}" ]]; then
  rmdir "${checkout_dir}" || {
    echo "Workspace initialization failed: empty ${checkout_dir} is not writable or removable." >&2
    exit 1
  }
fi

echo "Initializing ${repository_branch} from ${repository_url} in ${checkout_dir}."
git clone --branch "${repository_branch}" --single-branch "${repository_url}" "${checkout_dir}"
