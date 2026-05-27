#!/bin/zsh
# Generate SFX using Minimax music_generation API (music-2.6 model)
API_KEY="sk-cp-tVcwbJ1GRPm3pLSDXul-oqJjDncx3wmoy49XVv4GeT0F2-yO3hCuwxlvjea-T6LFj4UbDovbbnzwsSNNWwOazV7ADorlcejQuAQRhBvYC7SXed8Ew1vTAzQ"
OUTDIR="/Users/jeffny/sources/4.project/claude_demo1/Taiwu/public/assets/audio/sfx"
API_URL="https://api.minimax.chat/v1/music_generation"

set -A NAMES \
  "sfx-cricket-defeat" \
  "sfx-round-lose" \
  "sfx-button-click" \
  "sfx-gacha-open" \
  "sfx-gacha-reveal" \
  "sfx-gacha-legendary" \
  "sfx-room-join" \
  "sfx-ready" \
  "sfx-countdown" \
  "sfx-ui-panel" \
  "sfx-cricket-chirp"

set -A PROMPTS \
  "A sad descending erhu melody, cricket insect defeated, dramatic downward tone, short melancholic defeat sting for game SFX" \
  "A short sad defeat sting, descending low erhu notes, round lost disappointment, brief minor key melody for game SFX" \
  "A single short wooden click tap sound effect, crisp percussive button press, ancient Chinese UI SFX" \
  "A mysterious magical cage opening sound, sparkling chimes and anticipation, ancient Chinese gacha reveal opening SFX" \
  "A dramatic reveal fanfare, rising tension then bright reveal, gacha item revealed, ancient Chinese game SFX" \
  "A grand epic legendary reveal sound, golden shimmering fanfare, ultra rare pull celebration, powerful Chinese gongs SFX" \
  "A welcoming bright chime, entering a room, bamboo door sliding open, ancient Chinese room join notification SFX" \
  "A sharp ready signal, brief drum hit and bell, battle preparation confirmation, ancient Chinese game ready SFX" \
  "A tense ticking countdown, drum beats counting down, each beat more urgent, ancient Chinese battle countdown SFX" \
  "A smooth sliding panel open, parchment unfurling, brief UI transition, ancient Chinese scroll panel SFX" \
  "A peaceful cricket insect chirping ambient sound, rhythmic cricket song, night atmosphere, traditional Chinese garden SFX"

i=1
success=0
fail=0
while [ $i -le ${#NAMES[@]} ]; do
  name="${NAMES[$i]}"
  prompt="${PROMPTS[$i]}"
  echo "[$(date '+%H:%M:%S')] Generating $name (${i}/${#NAMES[@]})..."

  resp=$(curl -s --max-time 120 -X POST "$API_URL" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg p "$prompt" '{
      model: "music-2.6",
      prompt: $p,
      is_instrumental: true,
      audio_setting: {sample_rate: 44100, bitrate: 256000, format: "mp3"},
      output_format: "url"
    }')")

  if [ -z "$resp" ]; then
    echo "  FAILED: empty response (timeout)"
    fail=$((fail + 1))
  else
    url=$(echo "$resp" | jq -r '.data.audio // empty')
    stcode=$(echo "$resp" | jq -r '.base_resp.status_code // "error"')
    if [ -n "$url" ] && [ "$stcode" = "0" ]; then
      curl -s -o "$OUTDIR/$name.mp3" "$url"
      size=$(ls -lh "$OUTDIR/$name.mp3" | awk '{print $5}')
      echo "  OK: $size"
      success=$((success + 1))
    else
      errmsg=$(echo "$resp" | jq -r '.base_resp.status_msg // "unknown"')
      echo "  FAILED: stcode=$stcode msg=$errmsg"
      echo "  Response: $(echo "$resp" | head -c 300)"
      fail=$((fail + 1))
      if echo "$errmsg" | grep -q "usage limit"; then
        echo "  QUOTA EXCEEDED - stopping."
        break
      fi
    fi
  fi

  i=$((i + 1))
  if [ $i -le ${#NAMES[@]} ]; then
    echo "  Waiting 5s..."
    sleep 5
  fi
done

echo ""
echo "=== SFX Generation Complete ==="
echo "Success: $success, Failed: $fail"
echo ""
ls -lhS "$OUTDIR"/*.mp3 | awk '{printf "%-35s %s\n", $NF, $5}'
