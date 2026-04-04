#!/bin/bash

# Exit on any error
set -e

echo "🔨 Building project..."
npm run build

echo "🎬 Rendering test video (Dani)..."
# We render Dani specifically to ensure it works before pushing
# Rendering 001.mp4 would take too long, so we can just check if build succeeds 
# or do a partial render. But here we'll just try to render it fully.
npx remotion render Dani out.mp4

echo "🚀 Committing and pushing..."
git add .
git commit -m "feat: add video editor"
git push

echo "✅ Success! Project built, rendered, and pushed."