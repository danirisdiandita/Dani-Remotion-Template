#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Batch render multiple Dani videos from a template JSON file
#
# Usage:
#   ./scripts/batch-render.sh <template.json> [output_dir]
#
# Example:
#   ./scripts/batch-render.sh public/template/dani.json out/batch
#
# Template JSON format (array of variants):
#   [
#     { "videoSequence": [{ "src": "video-assets/foo.mp4", "text": "Hello" }] },
#     { "videoSequence": [{ "src": "video-assets/bar.mp4", "text": "World" }] }
#   ]
#
# Output:
#   out/batch/variant_0.mp4
#   out/batch/variant_1.mp4
#   ...
# ============================================================

: "${TEMPLATE_JSON:="${1:-}"}"
: "${OUTPUT_DIR:="${2:-out/batch}"}"

if [ -z "$TEMPLATE_JSON" ]; then
  echo "Usage: $0 <template.json> [output_dir]"
  echo ""
  echo "Example:"
  echo "  $0 public/template/dani.json out/batch"
  exit 1
fi

if [ ! -f "$TEMPLATE_JSON" ]; then
  echo "✗ Template file not found: $TEMPLATE_JSON"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Count variants in template
VARIANT_COUNT=$(python3 -c "
import json, sys
with open('$TEMPLATE_JSON') as f:
    data = json.load(f)
print(len(data))
")

if [ "$VARIANT_COUNT" -eq 0 ]; then
  echo "✗ No variants found in template"
  exit 1
fi

echo "→ Rendering $VARIANT_COUNT variant(s) to $OUTPUT_DIR/"
echo ""

RENDERED=()
FAILED=()

for i in $(seq 0 $((VARIANT_COUNT - 1))); do
  # Extract this variant's videoSequence
  PROPS=$(python3 -c "
import json, sys
with open('$TEMPLATE_JSON') as f:
    data = json.load(f)
variant = data[$i]
print(json.dumps(variant))
  ")

  # Extract text preview for display
  FIRST_TEXT=$(echo "$PROPS" | python3 -c "
import json, sys
variant = json.load(sys.stdin)
seq = variant.get('videoSequence', [])
if seq:
    print(seq[0].get('text', '')[:50])
  " 2>/dev/null || echo "")

  OUTPUT_FILE="$OUTPUT_DIR/variant_$(printf "%02d" $i).mp4"

  echo -n "  [$((i+1))/$VARIANT_COUNT] ${FIRST_TEXT:-variant $i} ... "

  if npx remotion render Dani "$OUTPUT_FILE" --props="$PROPS" > /tmp/remotion-batch.log 2>&1; then
    echo "✓"
    RENDERED+=("$OUTPUT_FILE")
  else
    echo "✗"
    echo "     $(tail -5 /tmp/remotion-batch.log | head -1)"
    FAILED+=("$i")
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total:    $VARIANT_COUNT"
echo "Rendered: ${#RENDERED[@]}"
echo "Failed:   ${#FAILED[@]}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "${#RENDERED[@]}" -eq 0 ]; then
  exit 1
fi

# Print rendered files for use with bulk-upload.sh
echo ""
echo "→ Rendered files (ready for upload):"
for f in "${RENDERED[@]}"; do
  echo "   $f"
done
echo ""
echo "→ Upload with:"
echo "   API_KEY=ve_... PROJECT_ID=proj_... ./scripts/bulk-upload.sh ${RENDERED[*]}"
