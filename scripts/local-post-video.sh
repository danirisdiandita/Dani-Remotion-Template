#!/bin/bash
# Post a single video as TikTok draft (wrapper around post-video.py)
# Usage: ./scripts/local-post-video.sh path/to/video.mp4 [caption]

VIDEO_PATH="${1:?Usage: $0 path/to/video.mp4 [caption]}"
CAPTION="${2:-}"

ARGS=()
if [ -n "$CAPTION" ]; then
  ARGS+=(--caption "$CAPTION")
fi

python3 scripts/post-video.py "$VIDEO_PATH" \
  --autopost-api-key autoposting-4b544a09b47ed5141d651a9e00eb8018f8d12de9be1f42a4a2a63621d5d227f3fe4f3df255b8e74156d2544c5b5151bf0c12234a67fa80d95d46d6bfd23ccd2a56766f37d6dbf69c6f5713a94ab3be443da616e9f037c36c78d09adced4a1c92 \
  --autopost-connection-id 164e697892d492da4ed33d19a9d2bd75 \
  --autopost-base-url https://autoposting.my.id \
  --autopost-mode UPLOAD_AS_DRAFT \
  "${ARGS[@]}"
