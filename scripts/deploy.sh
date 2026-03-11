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

# Push to main using PAT for authentication
echo ""
echo "🚀 Pushing to main..."
git push "https://${GHCR_USER}:${GITHUB_PAT}@github.com/htl-leo-itp-25-27-4-5BHITM/Dicekeeper.git" main

echo ""
echo "✅ Pushed! GitHub Actions will now:"
echo "   1. Build the Docker image (linux/amd64)"
echo "   2. Push it to ghcr.io"
echo "   3. Deploy to Kubernetes"
echo ""
echo "Watch the pipeline:"
echo "   https://github.com/htl-leo-itp-25-27-4-5BHITM/Dicekeeper/actions"
