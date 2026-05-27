#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# AutoPosting TikTok Post Script
# =============================================================================
# Flow: Upload media → Get media IDs → Create post on TikTok
# Docs: src/app/(dashboard)/docs/page.tsx
# =============================================================================

# -- CONFIGURATION (fill these in) --------------------------------------------

# Your API base URL (e.g. http://localhost:3000 or https://yourdomain.com)
BASE_URL="https://ultimate-tunnel.danirisdiandita.com"

# Your API key from /api-keys page
API_KEY="autoposting-2f259e8c6ac9d1ab0b301fd6f557046c67874bde715636f03893943b838aba5523c81e94ca7777e78df1a7f0486000940d3c08bdeb232b2bc912315843fd94a0bf9d213a5969d5ddd9e26baa496c37c82634a3be87b191f6cd286b2e19ac3af4"

# TikTok connection ID from /connections page
CONNECTION_ID="d618f5df9c619c99e7b526c2ba423d2e"

# -- POST CONFIGURATION -------------------------------------------------------

# Post title
TITLE="My TikTok post"

# Post caption
CAPTION="Posted via AutoPosting API"

# Post mode: DIRECT_POST (publish immediately) or UPLOAD_AS_DRAFT (save as draft on TikTok)
POST_MODE="DIRECT_POST"

# Privacy level: SELF_ONLY, MUTUAL_FOLLOW_FRIENDS, FOLLOWER_OF_CREATOR, PUBLIC_TO_EVERYONE
PRIVACY="PUBLIC_TO_EVERYONE"

# Media type: PHOTO or VIDEO
MEDIA_TYPE="PHOTO"

# Path(s) to media file(s)
# For PHOTO: space-separated list of image paths (max 35)
# For VIDEO: single video path (max 50MB)
MEDIA_FILES=()

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
Usage: ./scripts/post.sh [OPTIONS] <media_files...>

Post photos or a video to TikTok via the AutoPosting API.

OPTIONS:
  -t, --title TITLE          Post title (default: "$TITLE")
  -c, --caption CAPTION      Post caption (default: "$CAPTION")
  -m, --media-type TYPE      PHOTO or VIDEO (default: $MEDIA_TYPE)
  -p, --privacy LEVEL        Privacy level (default: $PRIVACY)
  -d, --draft                Upload as draft instead of posting immediately
  -h, --help                 Show this help

TOP-LEVEL CONFIG (edit the script directly):
  BASE_URL, API_KEY, CONNECTION_ID

EXAMPLES:
  # Post photos
  ./scripts/post.sh -m PHOTO -t "My pics" -c "Check these out" photo1.jpg photo2.jpg

  # Post a video
  ./scripts/post.sh -m VIDEO -t "My video" video.mp4

  # Upload as draft (doesn't publish, saves to TikTok drafts)
  ./scripts/post.sh --draft -m VIDEO -t "My draft" video.mp4
EOF
}

# ---------------------------------------------------------------------------
# Parse CLI arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        -t|--title)       TITLE="$2"; shift 2 ;;
        -c|--caption)     CAPTION="$2"; shift 2 ;;
        -m|--media-type)  MEDIA_TYPE="$2"; shift 2 ;;
        -p|--privacy)     PRIVACY="$2"; shift 2 ;;
        -d|--draft)       POST_MODE="UPLOAD_AS_DRAFT"; shift ;;
        -h|--help)        usage; exit 0 ;;
        -*)               log_err "Unknown option: $1"; usage; exit 1 ;;
        *)                MEDIA_FILES+=("$1"); shift ;;
    esac
done

# -- Validation ---------------------------------------------------------------

die() { log_err "$1"; exit 1; }

[[ -n "$BASE_URL" ]]       || die "BASE_URL is not set. Edit the script to configure it."
[[ -n "$API_KEY" ]]        || die "API_KEY is not set. Edit the script to configure it."
[[ -n "$CONNECTION_ID" ]]  || die "CONNECTION_ID is not set. Edit the script to configure it."
[[ ${#MEDIA_FILES[@]} -gt 0 ]] || die "No media files provided. Usage: ./scripts/post.sh <file...>"

for f in "${MEDIA_FILES[@]}"; do
    [[ -f "$f" ]] || die "File not found: $f"
done

# Strip trailing slash from BASE_URL
BASE_URL="${BASE_URL%/}"

# ---------------------------------------------------------------------------
# Step 1: Upload media files
# ---------------------------------------------------------------------------
log_info "Uploading ${#MEDIA_FILES[@]} file(s) to ${BASE_URL}/api/file ..."

UPLOAD_ARGS=()
for f in "${MEDIA_FILES[@]}"; do
    UPLOAD_ARGS+=(-F "file=@${f}")
done

UPLOAD_RESPONSE=$(curl -sS -w "\n%{http_code}" \
    --location "${BASE_URL}/api/file" \
    -H "Authorization: Bearer ${API_KEY}" \
    "${UPLOAD_ARGS[@]}") || die "Upload request failed"

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -1)
BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
    die "Upload failed (HTTP ${HTTP_CODE}): ${BODY}"
fi

log_ok "Upload successful"

# Parse media IDs from JSON response (keys are original filenames)
# Build a JSON array of media IDs
MEDIA_IDS=$(echo "$BODY" | python3 -c "
import json, sys
data = json.load(sys.stdin)
ids = list(data.values())
print(json.dumps(ids))
") || die "Failed to parse media IDs from upload response"

log_info "Media IDs: ${MEDIA_IDS}"

# ---------------------------------------------------------------------------
# Step 2: Create post
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
    "media_ids": ${MEDIA_IDS}
}
EOF
)

POST_RESPONSE=$(curl -sS -w "\n%{http_code}" \
    --location "${BASE_URL}/api/posts" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${API_KEY}" \
    -d "${POST_BODY}") || die "Post request failed"

POST_HTTP_CODE=$(echo "$POST_RESPONSE" | tail -1)
POST_BODY=$(echo "$POST_RESPONSE" | sed '$d')

if [[ "$POST_HTTP_CODE" -lt 200 || "$POST_HTTP_CODE" -ge 300 ]]; then
    die "Post failed (HTTP ${POST_HTTP_CODE}): ${POST_BODY}"
fi

log_ok "Post created successfully!"

# Pretty-print the response
echo "$POST_BODY" | python3 -m json.tool 2>/dev/null || echo "$POST_BODY"
