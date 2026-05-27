#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Local Studley — render Dani videos locally, no upload.
#
# Usage:
#   ./scripts/local-studley-no-post.sh <template.json> [output_dir]
#
# Example:
#   ./scripts/local-studley-no-post.sh scripts/sample/studley/33.json out/studley
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
# Segment 1 src → random clip from public/video-assets/studley-clips/
# Segment 2 src → video-assets/studley-outro.mp4
# ============================================================

CLIPS_DIR="public/video-assets/studley-clips"
STUDLEY_VIDEO="video-assets/studley-outro.mp4"
STUDLEY_VIDEO_DISK="public/$STUDLEY_VIDEO"

TEMPLATE_JSON="${1:-}"
OUTPUT_DIR="${2:-out/studley}"

if [ -z "$TEMPLATE_JSON" ]; then
  echo "Usage: $0 <template.json> [output_dir]"
  echo ""
  echo "Example:"
  echo "  $0 scripts/sample/studley/33.json out/studley"
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
echo ""

# -------------------------------------------------------
# Render each variant
# -------------------------------------------------------
echo "→ Rendering variants..."
FAILED=()

for i in $(seq 0 $((VARIANT_COUNT - 1))); do
  RANDOM_CLIP=$(ls "$CLIPS_DIR"/*.mp4 | shuf -n 1)

  PROPS_FILE="/tmp/studley-props-$i.json"

  FIRST_TEXT=$(python3 -c "
import json, sys

random_clip_full = sys.argv[1]
studley = sys.argv[2]
template = sys.argv[3]
idx = int(sys.argv[4])
props_file = sys.argv[5]

random_clip = random_clip_full.replace('public/', '', 1) if random_clip_full.startswith('public/') else random_clip_full

with open(template) as f:
    variants = json.load(f)

v = variants[idx]
seq = v['videoSequence']

for j, seg in enumerate(seq):
    if j == 0:
        seg['src'] = random_clip
    else:
        seg['src'] = studley
    seg.setdefault('orientation', 'bottom')

with open(props_file, 'w') as f:
    json.dump({'videoSequence': seq}, f, ensure_ascii=False)

first_text = seq[0].get('text', '') if seq else ''
print(first_text[:60])
" "$RANDOM_CLIP" "$STUDLEY_VIDEO" "$TEMPLATE_JSON" "$i" "$PROPS_FILE")

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
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total:    $VARIANT_COUNT"
echo "Rendered: $SUCCESS_COUNT"
echo "Failed:   ${#FAILED[@]}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "→ Rendered files:"
for f in "$OUTPUT_DIR"/variant_*.mp4; do
  if [ -f "$f" ]; then
    echo "   $f"
  fi
done

if [ "$SUCCESS_COUNT" -eq 0 ]; then
  exit 1
fi
