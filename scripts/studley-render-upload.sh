#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Studley Render + Upload
#
# Renders Dani videos using random 3s clips for segment 1
# and studley outro for segment 2, then bulk-uploads to a project.
#
# Usage:
#   API_KEY=ve_... PROJECT_ID=proj_... ./studley-render-upload.sh <template.json> [output_dir]
#
# Example:
#   API_KEY=ve_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6 \
#   PROJECT_ID=cm8xyzabc00011234abcd \
#   BASE_URL=https://video.example.com \
#   ./studley-render-upload.sh templates/studley-template.json
#
# Template JSON format (no src needed — auto-filled):
# [
#   {
#     "caption": "I use Notespark AI 😭 #studytok",
#     "videoSequence": [
#       { "text": "👩: you got 100?!?! 😤" },
#       { "text": "me: 😏📱" }
#     ]
#   },
#   {
#     "caption": "I use Notespark AI 💀 #studytok",
#     "videoSequence": [
#       { "text": "👯: you got HIGHER than me?!?! 😭" },
#       { "text": "10 mins a day 💅" }
#     ]
#   }
# ]
#
# Segment 1 src → random clip from tmp/perfect_score_3s/
# Segment 2 src → tmp/studley-new-format-1080x1920.mp4
#
# Env vars:
#   API_KEY    (required) Your API key
#   PROJECT_ID (required) Target project ID
#   BASE_URL   (optional) Default: http://localhost:3000
# ============================================================

CLIPS_DIR="public/video-assets/studley-clips"
STUDLEY_VIDEO="video-assets/studley-outro.mp4"
STUDLEY_VIDEO_DISK="public/$STUDLEY_VIDEO"

: "${BASE_URL:="http://localhost:3000"}"
: "${API_KEY:?API_KEY is required}"
: "${PROJECT_ID:?PROJECT_ID is required}"

TEMPLATE_JSON="${1:-}"
OUTPUT_DIR="${2:-out/studley}"

if [ -z "$TEMPLATE_JSON" ]; then
  echo "Usage: API_KEY=ve_... PROJECT_ID=proj_... $0 <template.json> [output_dir]"
  echo ""
  echo "Example:"
  echo "  API_KEY=ve_... PROJECT_ID=proj_... $0 templates/studley-template.json"
  exit 1
fi

if [ ! -f "$TEMPLATE_JSON" ]; then
  echo "✗ Template file not found: $TEMPLATE_JSON"
  exit 1
fi

if [ ! -f "$STUDLEY_VIDEO_DISK" ]; then
  echo "✗ Studley video not found: $STUDLEY_VIDEO_DISK"
  exit 1
fi

CLIP_COUNT=$(ls "$CLIPS_DIR"/*.mp4 2>/dev/null | wc -l)
if [ "$CLIP_COUNT" -eq 0 ]; then
  echo "✗ No clips found in $CLIPS_DIR"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

VARIANT_COUNT=$(python3 -c "import json; print(len(json.load(open('$TEMPLATE_JSON'))))")

if [ "$VARIANT_COUNT" -eq 0 ]; then
  echo "✗ No variants found in template"
  exit 1
fi

echo "→ Clips available: $CLIP_COUNT"
echo "→ Variants:         $VARIANT_COUNT"
echo "→ Output:           $OUTPUT_DIR/"
echo "→ Upload to:        $PROJECT_ID"
echo ""

# -------------------------------------------------------
# Step 1: Render each variant
# -------------------------------------------------------
echo "→ Rendering variants..."
MANIFEST_FILE="/tmp/studley-manifest.json"
echo "[]" > "$MANIFEST_FILE"
FAILED=()

for i in $(seq 0 $((VARIANT_COUNT - 1))); do
  # Pick random clip for segment 1
  RANDOM_CLIP=$(ls "$CLIPS_DIR"/*.mp4 | shuf -n 1)

  PROPS_FILE="/tmp/studley-props-$i.json"

  # Python: read template, inject src, write props file, append manifest entry
  FIRST_TEXT=$(python3 -c "
import json, sys

random_clip_full = sys.argv[1]
studley = sys.argv[2]
template = sys.argv[3]
idx = int(sys.argv[4])
props_file = sys.argv[5]
manifest_file = sys.argv[6]
output_file = sys.argv[7]

# Strip 'public/' prefix for Remotion's staticFile()
random_clip = random_clip_full.replace('public/', '', 1) if random_clip_full.startswith('public/') else random_clip_full

with open(template) as f:
    variants = json.load(f)

v = variants[idx]
caption = v.get('caption', '')
seq = v['videoSequence']

for j, seg in enumerate(seq):
    if j == 0:
        seg['src'] = random_clip
    else:
        seg['src'] = studley
    seg.setdefault('orientation', 'bottom')

with open(props_file, 'w') as f:
    json.dump({'videoSequence': seq}, f, ensure_ascii=False)

# Append to manifest
with open(manifest_file) as f:
    manifest = json.load(f)
manifest.append({'file': output_file, 'caption': caption, 'fileType': 'video/mp4'})
with open(manifest_file, 'w') as f:
    json.dump(manifest, f, ensure_ascii=False)

first_text = seq[0].get('text', '') if seq else ''
print(first_text[:60])
" "$RANDOM_CLIP" "$STUDLEY_VIDEO" "$TEMPLATE_JSON" "$i" "$PROPS_FILE" "$MANIFEST_FILE" "$OUTPUT_DIR/variant_$(printf "%02d" $i).mp4")

  OUTPUT_FILE="$OUTPUT_DIR/variant_$(printf "%02d" $i).mp4"

  echo -n "  [$((i+1))/$VARIANT_COUNT] ${FIRST_TEXT} ... "

  if npx remotion render Dani "$OUTPUT_FILE" --props="$PROPS_FILE" > /tmp/studley-render.log 2>&1; then
    echo "✓"
  else
    echo "✗"
    tail -3 /tmp/studley-render.log
    FAILED+=("$i")
  fi
done

SUCCESS_COUNT=$((VARIANT_COUNT - ${#FAILED[@]}))
echo ""
echo "→ Rendered: $SUCCESS_COUNT / $VARIANT_COUNT"

if [ "$SUCCESS_COUNT" -eq 0 ]; then
  echo "✗ No videos rendered successfully"
  exit 1
fi

# -------------------------------------------------------
# Step 2: Bulk upload rendered videos (read from manifest)
# -------------------------------------------------------
echo ""
echo "→ Uploading $SUCCESS_COUNT video(s) to project $PROJECT_ID..."

# Build items JSON from manifest (removing failed entries)
ITEMS_JSON=$(python3 -c "
import json
failed = {$(IFS=,; echo "${FAILED[*]}")}
with open('$MANIFEST_FILE') as f:
    manifest = json.load(f)
items = [{
    'fileName': m['file'].split('/')[-1],
    'caption': m['caption'],
    'fileType': m['fileType']
} for i, m in enumerate(manifest) if i not in failed]
print(json.dumps(items))
")

UPLOAD_COUNT=$SUCCESS_COUNT

# Init bulk upload
INIT_RESPONSE=$(curl -sS --fail-with-body \
  -X POST "$BASE_URL/api/uploads/bulk" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJECT_ID\",\"items\":$ITEMS_JSON}")

ITEM_COUNT=$(echo "$INIT_RESPONSE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['items']))" 2>/dev/null || echo "0")

if [ "$ITEM_COUNT" -ne "$UPLOAD_COUNT" ]; then
  echo "✗ Failed to initialize upload (got $ITEM_COUNT, expected $UPLOAD_COUNT)"
  echo "$INIT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$INIT_RESPONSE"
  exit 1
fi

echo "✓ Initialized $ITEM_COUNT item(s)"

# Upload each file to its presigned URL (using manifest for file paths)
echo ""
echo "→ Uploading files to S3..."
UPLOAD_OK=0
FAILED_IDS=()

for j in $(seq 0 $((UPLOAD_COUNT - 1))); do
  # Get file path from manifest (skip failed indices)
  FILE=$(python3 -c "
import json
failed = {$(IFS=,; echo "${FAILED[*]}")}
with open('$MANIFEST_FILE') as f:
    manifest = json.load(f)
idx = 0
for i, m in enumerate(manifest):
    if i in failed:
        continue
    if idx == $j:
        print(m['file'])
        break
    idx += 1
")
  BASENAME=$(basename "$FILE")

  PRESIGNED_URL=$(echo "$INIT_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['items'][$j]['presignedUrl'])")
  RENDER_ID=$(echo "$INIT_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['items'][$j]['id'])")

  echo -n "  [$((j+1))/$UPLOAD_COUNT] $BASENAME ... "

  HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" \
    -X PUT "$PRESIGNED_URL" \
    -H "Content-Type: video/mp4" \
    --data-binary "@$FILE")

  if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 204 ]; then
    echo "✓ ($HTTP_CODE)"
    UPLOAD_OK=$((UPLOAD_OK + 1))
  else
    echo "✗ HTTP $HTTP_CODE"
    FAILED_IDS+=("$RENDER_ID")
  fi
done

# Confirm successful uploads
echo ""
if [ "$UPLOAD_OK" -gt 0 ]; then
  echo "→ Confirming $UPLOAD_OK successful upload(s)..."

  CONFIRM_IDS="["
  FIRST=true
  for j in $(seq 0 $((UPLOAD_COUNT - 1))); do
    RENDER_ID=$(echo "$INIT_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['items'][$j]['id'])")
    IS_FAILED=false
    for fid in "${FAILED_IDS[@]:-}"; do
      if [ "$fid" = "$RENDER_ID" ]; then IS_FAILED=true; break; fi
    done
    if [ "$IS_FAILED" = false ]; then
      if [ "$FIRST" = false ]; then CONFIRM_IDS+=","; fi
      CONFIRM_IDS+="\"$RENDER_ID\""
      FIRST=false
    fi
  done
  CONFIRM_IDS+="]"

  CONFIRM_RESPONSE=$(curl -sS --fail-with-body \
    -X PATCH "$BASE_URL/api/uploads/bulk" \
    -H "x-api-key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"ids\":$CONFIRM_IDS}")

  CONFIRMED=$(echo "$CONFIRM_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['confirmedCount'])" 2>/dev/null || echo "0")
  echo "✓ Confirmed $CONFIRMED render(s)"
fi

# -------------------------------------------------------
# Summary
# -------------------------------------------------------
FAILED_TOTAL=${#FAILED_IDS[@]:-0}
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Rendered: $SUCCESS_COUNT / $VARIANT_COUNT"
echo "Uploaded: $UPLOAD_OK"
echo "Failed:   $FAILED_TOTAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAILED_TOTAL" -gt 0 ]; then
  exit 1
fi
