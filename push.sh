#!/bin/bash

# Exit on any error
set -e

echo "🏗️  Starting Production Suite Verification..."

echo "📦 Phase 1: Next.js Web App Build..."
npm run build

echo "🎨 Phase 2: Remotion Video Bundle..."
npm run bundle

# Optional: You can add a small test render here if needed
# npx remotion render Dani out.mp4 --frames 1

echo "🚀 Phase 3: Committing and Pushing to Repository..."
git add .
# We use a timestamped commit message for clarity
git commit -m "chore: Production suite build & bundle success - $(date +'%Y-%m-%d %H:%M')" || echo "No changes to commit"
git push

echo "✅ Success! Project built, bundled, and delivered."