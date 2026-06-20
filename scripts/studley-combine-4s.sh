#!/bin/bash
set -uo pipefail

SRC="public/video-assets/studley-clips"
DEST="public/video-assets/studley-clips-4s"
COUNT=100
TRIM_DURATION=1.2

echo "Source: $SRC"
echo "Dest:   $DEST"
echo "Count:  $COUNT"
echo "Format: full 3s clip + ${TRIM_DURATION}s trim = 4.2s"
echo ""

mkdir -p "$DEST"

mapfile -t FILES < <(ls "$SRC"/*.mp4 | sort)
TOTAL=${#FILES[@]}
SEED=$RANDOM
echo "Found $TOTAL clips (seed: $SEED)"

# Shuffle indices once for pair variety
mapfile -t IDX < <(seq 0 $((TOTAL - 1)) | shuf --random-source=/dev/urandom)

declare -A seen
i=0
attempts=0
while [ $i -lt $COUNT ]; do
  a=${IDX[$(( (i * 2) % TOTAL ))]}
  b=${IDX[$(( (i * 2 + 1) % TOTAL ))]}
  if [ $a -eq $b ]; then b=${IDX[$(( (b + 7) % TOTAL ))]}; fi
  key="${a}_${b}"
  if [ -n "${seen[$key]:-}" ]; then
    attempts=$((attempts + 1))
    if [ $attempts -gt 1000 ]; then break; fi
    # cycle b forward
    IDX[$(( (i * 2 + 1) % TOTAL ))]=$(( (b + 1) % TOTAL ))
    continue
  fi
  seen[$key]=1
  attempts=0

  # Random start between 0.0 and 1.8 (using /dev/urandom for real randomness)
  start_int=$(od -An -N2 -tu2 /dev/urandom | tr -d ' ')
  start=$(awk "BEGIN { printf \"%.2f\", ($start_int % 1800) / 1000 }")

  out=$(printf "%s/combined_%03d.mp4" "$DEST" $i)
  tmp_trim=$(mktemp --suffix=.mp4)
  concat_list=$(mktemp)

  ffmpeg -y -ss "$start" -t "$TRIM_DURATION" -i "${FILES[$b]}" -c copy "$tmp_trim" -v error 2>&1 || true

  echo "file '$(realpath "${FILES[$a]}")'" > "$concat_list"
  echo "file '$(realpath "$tmp_trim")'" >> "$concat_list"

  echo "[$((i+1))/$COUNT] ${FILES[$a]##*/} (3s) + ${FILES[$b]##*/} (${TRIM_DURATION}s @ ${start}s) -> ${out##*/}"
  ffmpeg -y -f concat -safe 0 -i "$concat_list" -c copy "$out" -v error 2>&1 || true

  rm -f "$concat_list" "$tmp_trim"
  i=$((i+1))
done

echo ""
echo "Done. Generated $(ls "$DEST"/*.mp4 2>/dev/null | wc -l) videos in $DEST"
du -sh "$DEST"
