import json, subprocess, os, requests, sys, base64
from pathlib import Path

env = {}
if Path('.env').exists():
    for line in Path('.env').read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            env[k.strip()] = v.strip()

API_KEY = env.get('DEEPINFRA_API_KEY')
if not API_KEY:
    print("DEEPINFRA_API_KEY not found in .env")
    sys.exit(1)

TTS_URL = "https://api.deepinfra.com/v1/inference/Qwen/Qwen3-TTS"
OUTPUT_DIR = Path("public/tts")

input_file = sys.argv[1] if len(sys.argv) > 1 else "scripts/sample/quiz-5-correct.json"
data = json.loads(Path(input_file).read_text())
questions = data.get("quizSequence", [])

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

if "hook" in data and data["hook"]:
    hook_text = data["hook"]
    hook_filename = "hook.mp3"
    hook_filepath = OUTPUT_DIR / hook_filename
    
    if hook_filepath.exists():
        with open(hook_filepath, "rb") as f:
            start = f.read(20)
            if start.startswith(b'{"input_'):
                hook_filepath.unlink()
                
    if hook_filepath.exists():
        print(f"[HOOK] SKIP (cached): {hook_text}")
    else:
        print(f"[HOOK] TTS: {hook_text}")
        resp = requests.post(TTS_URL,
            json={"input": hook_text},
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            timeout=60
        )
        if resp.status_code != 200:
            print(f"  ERROR: {resp.status_code} {resp.text}")
            sys.exit(1)
        
        try:
            resp_json = resp.json()
            if "audio" in resp_json:
                audio_uri = resp_json["audio"]
                if "," in audio_uri:
                    _, b64 = audio_uri.split(",", 1)
                    hook_filepath.write_bytes(base64.b64decode(b64))
                else:
                    hook_filepath.write_bytes(resp.content)
            else:
                hook_filepath.write_bytes(resp.content)
        except:
            hook_filepath.write_bytes(resp.content)
            
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(hook_filepath)],
        capture_output=True, text=True
    )
    duration_out = result.stdout.strip()
    if not duration_out or duration_out == "N/A":
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=duration", "-of", "csv=p=0", str(hook_filepath)],
            capture_output=True, text=True
        )
        duration_out = result.stdout.strip()

    try:
        duration_s = float(duration_out)
    except (ValueError, TypeError):
        duration_s = 3.0
    
    data["hookAudioSrc"] = f"tts/{hook_filename}"
    data["hookDurationInFrames"] = int(duration_s * 30) + 30 # Add 1s buffer

for i, q in enumerate(questions):
    text = q["question"]
    filename = f"question_{i}.mp3"
    filepath = OUTPUT_DIR / filename

    # Check if cached file is valid (not the corrupted JSON from previous runs)
    if filepath.exists():
        with open(filepath, "rb") as f:
            start = f.read(20)
            if start.startswith(b'{"input_'):
                print(f"  Corrupted cache detected for {filename}, deleting...")
                filepath.unlink()

    if filepath.exists():
        print(f"[{i+1}/{len(questions)}] SKIP (cached): {text}")
    else:
        print(f"[{i+1}/{len(questions)}] TTS: {text}")
        resp = requests.post(TTS_URL,
            json={"input": text},
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            timeout=60
        )
        if resp.status_code != 200:
            print(f"  ERROR: {resp.status_code} {resp.text}")
            sys.exit(1)
        
        try:
            resp_json = resp.json()
            if "audio" in resp_json:
                audio_uri = resp_json["audio"]
                if "," in audio_uri:
                    _, b64 = audio_uri.split(",", 1)
                    audio_bytes = base64.b64decode(b64)
                    filepath.write_bytes(audio_bytes)
                else:
                    filepath.write_bytes(resp.content)
            else:
                filepath.write_bytes(resp.content)
        except:
            filepath.write_bytes(resp.content)
            
        print(f"  Saved: public/tts/{filename} ({filepath.stat().st_size} bytes)")

    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(filepath)],
        capture_output=True, text=True
    )
    
    duration_out = result.stdout.strip()
    if not duration_out or duration_out == "N/A":
        # Fallback for some ffmpeg versions/files
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=duration", "-of", "csv=p=0", str(filepath)],
            capture_output=True, text=True
        )
        duration_out = result.stdout.strip()

    try:
        duration_s = float(duration_out)
    except (ValueError, TypeError):
        print(f"  WARNING: Could not determine duration for {filename}, using fallback 3s")
        duration_s = 3.0

    duration_ms = int(duration_s * 1000)
    print(f"  Duration: {duration_s:.1f}s ({duration_ms}ms)")

    q["audioSrc"] = f"tts/{filename}"
    q["waitPeriodMs"] = duration_ms
    # Add extra buffer for the reveal
    target_frames = int(duration_s * 30) + 180 + 30
    if not q.get("durationInFrames") or q["durationInFrames"] < target_frames:
        q["durationInFrames"] = target_frames

Path(input_file).write_text(json.dumps(data, indent=2))
print(f"\nUpdated {input_file}")
