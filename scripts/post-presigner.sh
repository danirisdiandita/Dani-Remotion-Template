#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# AutoPosting Presigned-URL Post Script (Robust for large videos)
# =============================================================================
# Flow: Get presigned URL → Upload directly to S3 → Create post on TikTok
# Unlike post.sh, this uploads media directly to S3 via presigned URLs,
# bypassing the API server entirely. Ideal for videos >50MB.
# =============================================================================

# -- CONFIGURATION (fill these in) --------------------------------------------

BASE_URL="https://ultimate-tunnel.danirisdiandita.com"

API_KEY="autoposting-2f259e8c6ac9d1ab0b301fd6f557046c67874bde715636f03893943b838aba5523c81e94ca7777e78df1a7f0486000940d3c08bdeb232b2bc912315843fd94a0bf9d213a5969d5ddd9e26baa496c37c82634a3be87b191f6cd286b2e19ac3af4"

CONNECTION_ID="d618f5df9c619c99e7b526c2ba423d2e"

# -- POST CONFIGURATION -------------------------------------------------------

TITLE="My TikTok video post"
CAPTION="Posted via AutoPosting API (presigned URL)"
POST_MODE="DIRECT_POST"
PRIVACY="PUBLIC_TO_EVERYONE"
MEDIA_TYPE="VIDEO"

# -- MEDIA FILE (single video) ------------------------------------------------
MEDIA_FILE=""

# -----------------------------------------------------------------------------
# End of configuration
# -----------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_err()   { echo -e "${RED}[ERROR]${NC} $*"; }

usage() {
    cat <<EOF
Usage: ./scripts/post-presigner.sh [OPTIONS] <video_file>

Post a video to TikTok using presigned S3 URLs for direct upload.
Ideal for large video files — uploads bypass the API server entirely.

OPTIONS:
  -t, --title TITLE          Post title (default: "$TITLE")
  -c, --caption CAPTION      Post caption (default: "$CAPTION")
  -p, --privacy LEVEL        Privacy level (default: $PRIVACY)
  -d, --draft                Upload as draft instead of posting immediately
  -h, --help                 Show this help

TOP-LEVEL CONFIG (edit the script directly):
  BASE_URL, API_KEY, CONNECTION_ID

EXAMPLES:
  ./scripts/post-presigner.sh video.mp4
  ./scripts/post-presigner.sh -t "My Video" -c "Check it out" -p PUBLIC_TO_EVERYONE video.mp4
  ./scripts/post-presigner.sh --draft video.mp4
EOF
}

# ---------------------------------------------------------------------------
# Parse CLI arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        -t|--title)       TITLE="$2"; shift 2 ;;
        -c|--caption)     CAPTION="$2"; shift 2 ;;
        -p|--privacy)     PRIVACY="$2"; shift 2 ;;
        -d|--draft)       POST_MODE="UPLOAD_AS_DRAFT"; shift ;;
        -h|--help)        usage; exit 0 ;;
        -*)               log_err "Unknown option: $1"; usage; exit 1 ;;
        *)                MEDIA_FILE="$1"; shift ;;
    esac
done

# -- Validation ---------------------------------------------------------------

die() { log_err "$1"; exit 1; }

[[ -n "$BASE_URL" ]]       || die "BASE_URL is not set. Edit the script to configure it."
[[ -n "$API_KEY" ]]        || die "API_KEY is not set. Edit the script to configure it."
[[ -n "$CONNECTION_ID" ]]  || die "CONNECTION_ID is not set. Edit the script to configure it."
[[ -n "$MEDIA_FILE" ]]     || die "No video file provided. Usage: ./scripts/post-presigner.sh <video_file>"
[[ -f "$MEDIA_FILE" ]]     || die "File not found: $MEDIA_FILE"

BASE_URL="${BASE_URL%/}"

# Determine MIME type from file extension
FILE_EXT="${MEDIA_FILE##*.}"
FILE_EXT_LOWER=$(echo "$FILE_EXT" | tr '[:upper:]' '[:lower:]')

case "$FILE_EXT_LOWER" in
    mp4)  FILE_MIME="video/mp4" ;;
    webm) FILE_MIME="video/webm" ;;
    mov)  FILE_MIME="video/quicktime" ;;
    *)    die "Unsupported video format: .$FILE_EXT_LOWER (supported: mp4, webm, mov)" ;;
esac

FILE_SIZE=$(stat -f%z "$MEDIA_FILE" 2>/dev/null || stat -c%s "$MEDIA_FILE" 2>/dev/null)
FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1048576" | bc 2>/dev/null || python3 -c "print(f'{$FILE_SIZE / 1048576:.2f}')")

log_info "Video: $MEDIA_FILE (${FILE_SIZE_MB}MB, $FILE_MIME)"

# ---------------------------------------------------------------------------
# Step 1: Get presigned upload URL from the API
# ---------------------------------------------------------------------------
log_info "Requesting presigned S3 upload URL from ${BASE_URL}/api/file/presigner ..."

PRESIGN_RESPONSE=$(curl -sS -w "\n%{http_code}" \
    --location "${BASE_URL}/api/file/presigner" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${API_KEY}" \
    -d "{\"fileType\": \"${FILE_MIME}\"}") || die "Presigned URL request failed"

HTTP_CODE=$(echo "$PRESIGN_RESPONSE" | tail -1)
BODY=$(echo "$PRESIGN_RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
    die "Failed to get presigned URL (HTTP ${HTTP_CODE}): ${BODY}"
fi

# Parse the response: { message, data: { url, media_id } }
PRESIGNED_URL=$(echo "$BODY" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data['data']['url'])
" 2>/dev/null) || die "Failed to parse presigned URL from response: $BODY"

MEDIA_ID=$(echo "$BODY" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data['data']['media_id'])
" 2>/dev/null) || die "Failed to parse media_id from response: $BODY"

log_ok "Got presigned URL (media_id: ${MEDIA_ID})"

# ---------------------------------------------------------------------------
# Step 2: Upload video directly to S3 using the presigned URL
# ---------------------------------------------------------------------------

log_info "Uploading ${FILE_SIZE_MB}MB directly to S3..."
log_info "(This bypasses the API server — ideal for large files)"

# Use curl with progress bar for visibility on large uploads
# NOTE: no -s (silent) flag so the progress bar is visible; progress bar goes to stderr
UPLOAD_RESPONSE=$(curl --progress-bar -S -w "\n%{http_code}" \
    --location \
    --request PUT \
    --upload-file "${MEDIA_FILE}" \
    -H "Content-Type: ${FILE_MIME}" \
    "${PRESIGNED_URL}") || die "S3 upload failed (curl error)"

UPLOAD_HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -1)
UPLOAD_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

if [[ "$UPLOAD_HTTP_CODE" -lt 200 || "$UPLOAD_HTTP_CODE" -ge 300 ]]; then
    die "S3 upload failed (HTTP ${UPLOAD_HTTP_CODE}): ${UPLOAD_BODY}"
fi

log_ok "Upload to S3 complete"

# ---------------------------------------------------------------------------
# Step 3: Create post on TikTok
# ---------------------------------------------------------------------------
log_info "Creating post on TikTok..."

POST_BODY=$(cat <<EOF
{
    "title": $(echo "$TITLE" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))"),
    "caption": $(echo "$CAPTION" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))"),
    "connections": ["${CONNECTION_ID}"],
    "post_mode": "${POST_MODE}",
    "privacy": "${PRIVACY}",
    "media_type": "${MEDIA_TYPE}",
    "media_ids": ["${MEDIA_ID}"]
}
EOF
)

POST_RESPONSE=$(curl -sS -w "\n%{http_code}" \
    --location "${BASE_URL}/api/posts" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${API_KEY}" \
    -d "${POST_BODY}") || die "Post request failed"

POST_HTTP_CODE=$(echo "$POST_RESPONSE" | tail -1)
POST_RESP_BODY=$(echo "$POST_RESPONSE" | sed '$d')

if [[ "$POST_HTTP_CODE" -lt 200 || "$POST_HTTP_CODE" -ge 300 ]]; then
    die "Post failed (HTTP ${POST_HTTP_CODE}): ${POST_RESP_BODY}"
fi

log_ok "Post created successfully!"

echo "$POST_RESP_BODY" | python3 -m json.tool 2>/dev/null || echo "$POST_RESP_BODY"
