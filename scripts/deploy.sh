#!/usr/bin/env bash
# Deploy Dicekeeper — pushes to main which triggers the GitHub Actions pipeline
# CI handles: build image → push to ghcr.io → deploy to K8s
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

# Push to main → triggers GitHub Actions
echo ""
echo "🚀 Pushing to main..."
git push git@github.com:htl-leo-itp-25-27-4-5BHITM/Dicekeeper.git main

echo ""
echo "✅ Pushed! GitHub Actions will now:"
echo "   1. Build Docker image (linux/amd64)"
echo "   2. Push to ghcr.io"
echo "   3. Deploy to Kubernetes"
echo ""
echo "Watch: https://github.com/htl-leo-itp-25-27-4-5BHITM/Dicekeeper/actions"
