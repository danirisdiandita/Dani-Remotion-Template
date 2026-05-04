#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Bulk upload videos to VideoEngine via API
#
# Usage:
#   API_KEY=ve_... PROJECT_ID=proj_... ./bulk-upload.sh file1.mp4 file2.mp4 ...
#   API_KEY=ve_... PROJECT_ID=proj_... ./bulk-upload.sh dir/*.mp4
#
# Example (auto captions from filenames):
#   API_KEY=ve_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6 \
#   PROJECT_ID=cm8xyzabc00011234abcd \
#   BASE_URL=https://video.example.com \
#   ./scripts/bulk-upload.sh intro.mp4 tutorial.mp4 outro.mp4
#
# Example (custom captions — semicolon-separated):
#   API_KEY=ve_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6 \
#   PROJECT_ID=cm8xyzabc00011234abcd \
#   CAPTIONS="Welcome intro;How to use this;Farewell" \
#   ./scripts/bulk-upload.sh intro.mp4 tutorial.mp4 outro.mp4
#
# Env vars:
#   API_KEY           (required) Your API key (x-api-key header)
#   PROJECT_ID        (required) Target project ID
#   BASE_URL          (optional) Default: http://localhost:3000
#   CAPTIONS          (optional) Semicolon-separated captions, one per file (takes priority over filename)
#   CAPTION_SEPARATOR (optional) Use filenames as captions, split by this. Default: ;
# ============================================================

: "${BASE_URL:="http://localhost:3000"}"
: "${API_KEY:?API_KEY is required}"
: "${PROJECT_ID:?PROJECT_ID is required}"
: "${CAPTION_SEPARATOR:=";"}"

# Parse CAPTIONS into array if provided
if [ -n "${CAPTIONS:-}" ]; then
  IFS=';' read -ra CAPTIONS_ARRAY <<< "$CAPTIONS"
fi

if [ $# -eq 0 ]; then
  echo "Usage: API_KEY=ve_... PROJECT_ID=proj_... $0 file1.mp4 [file2.mp4 ...]"
  exit 1
fi

FILES=("$@")
TOTAL=${#FILES[@]}

echo "→ $TOTAL file(s) to upload to project $PROJECT_ID"
echo "→ Base URL: $BASE_URL"
echo ""

# -------------------------------------------------------
# Step 1: Build items JSON array for the bulk init request
# -------------------------------------------------------
ITEMS_JSON="["
for i in "${!FILES[@]}"; do
  FILE="${FILES[$i]}"
  BASENAME=$(basename "$FILE")
  # Use custom caption if available, otherwise derive from filename
  if [ -n "${CAPTIONS:-}" ]; then
    CAPTION="${CAPTIONS_ARRAY[$i]:-}"
    # Trim whitespace
    CAPTION="$(echo "$CAPTION" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  else
    CAPTION="${BASENAME%${CAPTION_SEPARATOR}*}"
  fi
  FILE_TYPE="video/${BASENAME##*.}"

  if [ "$i" -gt 0 ]; then
    ITEMS_JSON+=","
  fi
  ITEMS_JSON+="{\"fileName\":\"$BASENAME\",\"caption\":\"$CAPTION\",\"fileType\":\"$FILE_TYPE\"}"
done
ITEMS_JSON+="]"

# -------------------------------------------------------
# Step 2: POST /api/uploads/bulk → get presigned URLs
# -------------------------------------------------------
echo "→ Initializing bulk upload..."
RESPONSE=$(curl -sS --fail-with-body \
  -X POST "$BASE_URL/api/uploads/bulk" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"$PROJECT_ID\",\"items\":$ITEMS_JSON}")

# Extract item count from response for validation
ITEM_COUNT=$(echo "$RESPONSE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['items']))" 2>/dev/null || echo "0")

if [ "$ITEM_COUNT" -ne "$TOTAL" ]; then
  echo "✗ Failed to initialize all items (got $ITEM_COUNT, expected $TOTAL)"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

echo "✓ Initialized $ITEM_COUNT item(s)"

# -------------------------------------------------------
# Step 3: Upload each file to its presigned URL
# -------------------------------------------------------
echo ""
echo "→ Uploading files..."

SUCCESS_COUNT=0
FAILED_IDS=()

for i in $(seq 0 $((TOTAL - 1))); do
  FILE="${FILES[$i]}"
  BASENAME=$(basename "$FILE")

  PRESIGNED_URL=$(echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data['items'][$i]['presignedUrl'])
  " 2>/dev/null)

  RENDER_ID=$(echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data['items'][$i]['id'])
  " 2>/dev/null)

  echo -n "  [$((i+1))/$TOTAL] $BASENAME ... "

  HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" \
    -X PUT "$PRESIGNED_URL" \
    -H "Content-Type: video/${BASENAME##*.}" \
    --data-binary "@$FILE")

  if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 204 ]; then
    echo "✓ ($HTTP_CODE)"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo "✗ HTTP $HTTP_CODE"
    FAILED_IDS+=("$RENDER_ID")
  fi
done

# -------------------------------------------------------
# Step 4: PATCH /api/uploads/bulk → confirm completed
# -------------------------------------------------------
echo ""
if [ "$SUCCESS_COUNT" -gt 0 ]; then
  echo "→ Confirming $SUCCESS_COUNT successful upload(s)..."

  # Build list of successfully uploaded render IDs
  CONFIRM_IDS="["
  FIRST=true
  for i in $(seq 0 $((TOTAL - 1))); do
    IS_FAILED=false
    for fid in "${FAILED_IDS[@]}"; do
      if [ "$fid" = "$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['items'][$i]['id'])" 2>/dev/null)" ]; then
        IS_FAILED=true
        break
      fi
    done
    if [ "$IS_FAILED" = false ]; then
      if [ "$FIRST" = false ]; then CONFIRM_IDS+=","; fi
      CONFIRM_IDS+="\"$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['items'][$i]['id'])" 2>/dev/null)\""
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
FAILED_TOTAL=${#FAILED_IDS[@]}
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total:   $TOTAL"
echo "Success: $SUCCESS_COUNT"
echo "Failed:  $FAILED_TOTAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAILED_TOTAL" -gt 0 ]; then
  exit 1
fi
