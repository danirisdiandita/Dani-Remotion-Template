#!/bin/bash
# Render Dani videos + post as TikTok drafts (no project upload)
# See scripts/studley-post.py for all options

python3 scripts/studley-post.py \
  --output-dir out/studley \
  --autopost-api-key autoposting-4b544a09b47ed5141d651a9e00eb8018f8d12de9be1f42a4a2a63621d5d227f3fe4f3df255b8e74156d2544c5b5151bf0c12234a67fa80d95d46d6bfd23ccd2a56766f37d6dbf69c6f5713a94ab3be443da616e9f037c36c78d09adced4a1c92 \
  --autopost-connection-id 164e697892d492da4ed33d19a9d2bd75 \
  --autopost-base-url https://autoposting.my.id \
  --autopost-mode UPLOAD_AS_DRAFT \
  scripts/sample/studley/32.json
