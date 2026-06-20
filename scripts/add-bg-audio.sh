#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Overlay a looping background audio onto videos in a directory
#
# Usage:
#   ./scripts/add-bg-audio.sh <input-dir> <audio-file> [volume]
#
# Example:
#   ./scripts/add-bg-audio.sh out/studley i_will_pass_all_of_my_exams.mp3 0.3
#
# Audio is looped to match video length and mixed with original sound.
# Volume: 0.0–1.0 (default 0.3 = 30% of original loudness).
#
# Output goes to <input-dir>-with-audio/ (e.g. out/studley-with-audio/).
# ============================================================

INPUT_DIR="${1:?Usage: $0 <input-dir> <audio-file> [volume]}"
AUDIO_FILE="${2:?Usage: $0 <input-dir> <audio-file> [volume]}"
VOLUME="${3:-0.3}"
OUTPUT_DIR="${INPUT_DIR}-with-audio"

if [ ! -d "$INPUT_DIR" ]; then
  echo "✗ Input directory not found: $INPUT_DIR"
  exit 1
fi

if [ ! -f "$AUDIO_FILE" ]; then
  echo "✗ Audio file not found: $AUDIO_FILE"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "→ Input:   $INPUT_DIR/*.mp4"
echo "→ Audio:   $AUDIO_FILE (volume ${VOLUME})"
echo "→ Output:  $OUTPUT_DIR/"
echo ""

VIDEOS=("$INPUT_DIR"/variant_*.mp4)
TOTAL=${#VIDEOS[@]}
echo "→ Found $TOTAL video(s)"
echo ""

for i in "${!VIDEOS[@]}"; do
  VIDEO="${VIDEOS[$i]}"
  BASENAME=$(basename "$VIDEO")
  OUTPUT="$OUTPUT_DIR/$BASENAME"

  echo -n "  [$((i+1))/$TOTAL] $BASENAME ... "

  ffmpeg -y -i "$VIDEO" -stream_loop -1 -i "$AUDIO_FILE" \
    -filter_complex "[1:a]volume=$VOLUME[a1];[0:a][a1]amix=inputs=2:duration=first" \
    -c:v copy -shortest "$OUTPUT" 2>/tmp/add-bg-audio.log

  if [ $? -eq 0 ]; then
    echo "✓"
  else
    echo "✗"
    tail -3 /tmp/add-bg-audio.log
  fi
done

echo ""
echo "→ Done! Videos with background audio: $OUTPUT_DIR/"
