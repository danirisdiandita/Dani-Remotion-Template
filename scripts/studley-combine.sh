#!/bin/bash
set -uo pipefail

SRC="public/video-assets/studley-clips"
DEST="public/video-assets/studley-clips-6s"
COUNT=100

echo "Source: $SRC"
echo "Dest:   $DEST"
echo "Count:  $COUNT"

mkdir -p "$DEST"

mapfile -t FILES < <(ls "$SRC"/*.mp4 | sort)
TOTAL=${#FILES[@]}
echo "Found $TOTAL clips"

declare -A seen
i=0
while [ $i -lt $COUNT ]; do
  a=$(( RANDOM % TOTAL ))
  b=$(( RANDOM % TOTAL ))
  if [ $a -eq $b ]; then continue; fi
  key="${a}_${b}"
  if [ -n "${seen[$key]:-}" ]; then continue; fi
  seen[$key]=1

  out=$(printf "%s/combined_%03d.mp4" "$DEST" $i)
  concat_list=$(mktemp)
  echo "file '$(realpath "${FILES[$a]}")'" > "$concat_list"
  echo "file '$(realpath "${FILES[$b]}")'" >> "$concat_list"

  echo "[$((i+1))/$COUNT] ${FILES[$a]##*/} + ${FILES[$b]##*/} -> ${out##*/}"
  ffmpeg -y -f concat -safe 0 -i "$concat_list" -c copy "$out" -v error 2>&1 || true
  rm -f "$concat_list"

  i=$((i+1))
done

echo ""
echo "Done. Generated $(ls "$DEST"/*.mp4 2>/dev/null | wc -l) videos in $DEST"
