#!/usr/bin/env bash
# Deploy Dicekeeper — pushes to main which triggers the GitHub Actions pipeline
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# ── Load .env ──
if [[ -f "$PROJECT_DIR/.env" ]]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
else
  echo "❌ .env file not found!"
  exit 1
fi

if [[ -z "${GITHUB_PAT:-}" || "$GITHUB_PAT" == "your_pat_here" ]]; then
  echo "❌ GITHUB_PAT not set in .env"
  exit 1
fi

echo "=============================="
echo " Dicekeeper Deploy"
echo "=============================="

# Check we're on main
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  echo "⚠️  You're on branch '$BRANCH', not 'main'."
  echo "   Merge to main first, or switch branches."
  exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo ""
  echo "📝 You have uncommitted changes:"
  git status --short
  echo ""
  read -rp "Commit message: " MSG
  git add -A
  git commit -m "${MSG:-deploy}"
fi

IMAGE="ghcr.io/htl-leo-itp-25-27-4-5bhitm/dicekeeper"
SHA=$(git rev-parse HEAD)

# ── Build & push Docker image locally ──
echo ""
echo "[1/2] Building & pushing Docker image..."
echo "$GITHUB_PAT" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
docker buildx build --platform linux/amd64 -t "$IMAGE:latest" -t "$IMAGE:$SHA" --push .

# ── Push to main → triggers K8s deployment via GitHub Actions ──
echo ""
echo "[2/2] Pushing to main..."
git push git@github.com:htl-leo-itp-25-27-4-5BHITM/Dicekeeper.git main

echo ""
echo "✅ Done!"
echo "   • Docker image pushed to ghcr.io ✓"
echo "   • GitHub Actions will now deploy to Kubernetes"
echo ""
echo "Watch the pipeline:"
echo "   https://github.com/htl-leo-itp-25-27-4-5BHITM/Dicekeeper/actions"
