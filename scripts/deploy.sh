#!/usr/bin/env bash
# Deploy Dicekeeper — pushes to main which triggers the GitHub Actions pipeline
set -euo pipefail

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

# Push to main → triggers GitHub Actions deploy
echo ""
echo "🚀 Pushing to main..."
git push origin main

echo ""
echo "✅ Pushed! GitHub Actions will now:"
echo "   1. Build the Docker image (linux/amd64)"
echo "   2. Push it to ghcr.io"
echo "   3. Deploy to Kubernetes"
echo ""
echo "Watch the pipeline:"
echo "   https://github.com/htl-leo-itp-25-27-4-5BHITM/Dicekeeper/actions"
