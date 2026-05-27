# Reaction Video Workflow

Batch render reaction-style Dani videos pairing a reaction clip with all 6 web-demo feature walkthroughs. Each variant can either pick a **random** reaction clip or use a **specific** one via the optional `reactionSrc` field.

## Video Assets

| Source | Count | Format |
|--------|-------|--------|
| `public/video-assets/reactions/001.mp4` – `014.mp4` | 14 | Reaction clips (randomly chosen per variant) |
| `public/video-assets/web-demo/001_upload.mp4` | 1 | Upload PDF feature |
| `public/video-assets/web-demo/002_note.mp4` | 1 | AI-generated notes feature |
| `public/video-assets/web-demo/003_quiz.mp4` | 1 | Quiz feature |
| `public/video-assets/web-demo/004_flashcard.mp4` | 1 | Flashcard feature |
| `public/video-assets/web-demo/005_printable.mp4` | 1 | Printable notes feature |
| `public/video-assets/web-demo/006_feynman.mp4` | 1 | Feynman technique feature |

## Generated Video Structure

Each rendered video has 7 segments (in order):

| Segment | Source | Content |
|---------|--------|---------|
| 1 | Random `reactions/*.mp4` (or `reactionSrc` override) | Reaction hook (POV, teaser, etc.) |
| 2 | `web-demo/001_upload.mp4` | Upload PDF |
| 3 | `web-demo/002_note.mp4` | AI notes |
| 4 | `web-demo/003_quiz.mp4` | Quiz |
| 5 | `web-demo/004_flashcard.mp4` | Flashcards |
| 6 | `web-demo/005_printable.mp4` | Printable |
| 7 | `web-demo/006_feynman.mp4` | Feynman |

## Step 1: Create Template JSON

Create a template file like `scripts/sample/reaction/1.json`. Each variant must have exactly **7 segments** (1 reaction + 6 web-demo texts). The `src` field is omitted — the script auto-fills it.

Optionally, add `reactionSrc` to pin a specific reaction clip. Omitting it picks a random one.

```json
[
  {
    "caption": "POV: you found the study app that does everything 🤯 #notespark #studytok",
    "videoSequence": [
      { "text": "POV: you discovered the ultimate study app 🔥" },
      { "text": "Upload any PDF 📄" },
      { "text": "AI generates perfect notes 🤖" },
      { "text": "Quiz yourself on the material 🧠" },
      { "text": "Review with flashcards 💡" },
      { "text": "Export printable study sheets 📝" },
      { "text": "Master every topic with Feynman 🎯" }
    ]
  },
  {
    "caption": "From PDF to passing in record time 🚀 #notespark #studytok",
    "videoSequence": [
      { "text": "Stop wasting hours on manual notes 💀" },
      { "text": "Drop your PDF here 📄" },
      { "text": "AI organizes everything 🤖" },
      { "text": "Quiz mode: unlocked 🧠" },
      { "text": "Flashcards: auto-generated 💡" },
      { "text": "Printable: one tap 📝" },
      { "text": "Feynman mode: explain it simply 🎯" }
    ]
  },
  {
    "caption": "Your brain on Notespark AI 🧠⚡️ #notespark #studytok #productivity",
    "reactionSrc": "video-assets/reactions/007.mp4",
    "videoSequence": [
      { "text": "Your brain on manual studying 😵‍💫" },
      { "text": "Your brain on Notespark AI 🧠⚡️" },
      { "text": "Step 1: upload PDF 📄" },
      { "text": "Step 2: let AI cook 🤖" },
      { "text": "Step 3: learn with quizzes 🧠" },
      { "text": "Step 4: solidify with flashcards 💡" },
      { "text": "Step 5: print & go 📝" }
    ]
  }
]
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `caption` | string | yes | Upload caption / TikTok description (used as video title) |
| `reactionSrc` | string | no | Pin a specific reaction clip (e.g. `"video-assets/reactions/005.mp4"`). Omit for random. |
| `videoSequence` | array | yes | Exactly 7 objects with `text` and optional `orientation` |

Each video sequence object:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | yes | — | Overlay text displayed on the video segment |
| `orientation` | string | no | `"bottom"` | Text position: `"top"`, `"center"`, or `"bottom"` |

## Step 2: Render

If `reactionSrc` is set on a variant, that specific clip is used for segment 1. Otherwise, a random reaction clip is picked. Segments 2–7 are always filled with the web-demo videos in order.

### Render only (no upload)

```bash
python3 scripts/reaction.py \
  --api-key ve_YOUR_API_KEY \
  --project-id proj_YOUR_PROJECT_ID \
  --render-only \
  scripts/sample/reaction/1.json
```

Output: `out/reaction/variant_00.mp4`, `variant_01.mp4`, etc.

### Render + Upload

```bash
python3 scripts/reaction.py \
  --api-key ve_YOUR_API_KEY \
  --project-id proj_YOUR_PROJECT_ID \
  scripts/sample/reaction/1.json
```

### Upload only (already rendered videos)

```bash
python3 scripts/reaction.py \
  --api-key ve_YOUR_API_KEY \
  --project-id proj_YOUR_PROJECT_ID \
  --upload-only \
  scripts/sample/reaction/1.json
```

## CLI Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `template` | yes | — | Path to template JSON file |
| `--api-key` | yes | — | API key (`x-api-key` header) |
| `--project-id` | yes | — | Target project ID |
| `--base-url` | no | `http://localhost:3000` | VideoEngine app URL |
| `--output-dir` | no | `out/reaction` | Output directory for rendered MP4s |
| `--render-only` | no | — | Skip upload after rendering |
| `--upload-only` | no | — | Upload already rendered files (from `--output-dir`) |

## Quick Start (Shortcut)

```bash
./scripts/local-reaction.sh
```

This runs `reaction.py` with default credentials against `scripts/sample/reaction/1.json` in render-only mode.

## Prerequisites

- Node.js + npm (for `npx remotion render`)
- Python 3 + `requests` library (`pip install requests`)
- Remotion project set up with the `Dani` composition
- Valid API key + project ID for VideoEngine upload

## File Reference

| File | Purpose |
|------|---------|
| `scripts/reaction.py` | Main script (render + upload) |
| `scripts/local-reaction.sh` | Quick-start wrapper with credentials |
| `scripts/sample/reaction/1.json` | Sample template (3 variants) |
| `public/video-assets/reactions/` | 14 reaction clips (001–014) |
| `public/video-assets/web-demo/` | 6 feature demo clips |
