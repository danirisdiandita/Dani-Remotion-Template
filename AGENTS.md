
this is nextjs and remotion renderer

## Database Migrations

Prefer `npx prisma migrate dev` over `npx prisma db push`. This generates SQL migration files in `prisma/migrations/` so schema changes are versioned and reviewable.

nextjs
```
npm run dev
```

this is how to generate video sample 

```
npx remotion render <composition-id> out/<output>.mp4
```

Available compositions:
- `HelloWorld` — basic hello world
- `OnlyLogo` — logo only
- `Dani` — video sequences with text overlay
- `Carousel` — image carousel
- `nicstudy` — nicstudy slides
- `Quiz` — quiz with questions/options

Example:
```
npx remotion render Quiz out/quiz.mp4
```

### Quiz JSON Schema

The `Quiz` composition accepts a `quizSequence` array via `--props`. Each question object:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `question` | string | yes | — | The question text |
| `options` | string[] | yes | — | 4 answer choices (A, B, C, D) |
| `correctIndex` | number | yes | — | Index of correct option (0-3) |
| `simulatedTapIndex` | number | no | -1 | Which option the simulated user taps (wrong tap creates red highlight; set to `correctIndex` for direct correct) |
| `durationInFrames` | number | no | 180 | Duration per question in frames (30fps: 180 = 6s) |
| `waitPeriodMs` | number | no | 0 | Delay in ms before simulated tap/reveal (0 = auto at 50% duration) |

#### Full prop format:
```json
{
  "quizSequence": [
    {
      "question": "What is 2+2?",
      "options": ["3", "4", "5", "6"],
      "correctIndex": 1,
      "simulatedTapIndex": 0,
      "durationInFrames": 180
    }
  ]
}
```

#### Render with custom JSON inline:
```
npx remotion render Quiz out/quiz.mp4 --props='{"quizSequence":[{"question":"What is 2+2?","options":["3","4","5","6"],"correctIndex":1,"simulatedTapIndex":0}]}'
```

#### Render with JSON file:
```
npx remotion render Quiz out/quiz.mp4 --props=./props/quiz.json
```

### Quiz Programmatic Workflow

**Step 1**: Create a minimal quiz JSON (only questions & answers):
```json
{
  "quizSequence": [
    {
      "question": "What is 2+2?",
      "options": ["3", "4", "5", "6"],
      "correctIndex": 1,
      "simulatedTapIndex": 1
    }
  ]
}
```
All other fields (`durationInFrames`, `waitPeriodMs`, `audioSrc`) are auto-generated.

**Step 2**: Generate TTS audio with DeepInfra:
```
node scripts/tts.js scripts/sample/minimal.json
```
This:
- Calls Qwen3-TTS for each question
- Saves audio to `public/tts/question_N.mp3`
- Measures duration via ffprobe
- Updates JSON with `audioSrc`, `waitPeriodMs`, `durationInFrames`

**Step 3**: Render:
```
npx remotion render Quiz out/quiz.mp4 --props=./scripts/sample/minimal.json
```

Each question follows: TTS reads question → 5s countdown (with timer.mp3) → answer reveal (correct.mp3).

### Dani JSON Schema

The `Dani` composition accepts a `videoSequence` array via `--props`. Each segment object:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `src` | string | yes | — | Path to video file in `public/` (e.g. `"video-assets/reactions/001.mp4"`) |
| `text` | string | yes | — | Overlay text displayed on the video |
| `orientation` | string | no | `"bottom"` | Text position: `"top"`, `"center"`, or `"bottom"` |

Resolution: **1080×1920** (portrait/TikTok format) at **30fps**. Duration is auto-calculated from the video file.

#### Full prop format:
```json
{
  "videoSequence": [
    { "src": "video-assets/reactions/001.mp4", "text": "My custom text 🔥" },
    { "src": "video-assets/demo/upload/001.mp4", "text": "Another segment", "orientation": "top" }
  ]
}
```

#### Render with custom JSON:
```
npx remotion render Dani out/dani.mp4 --props='{"videoSequence":[{"src":"video-assets/reactions/001.mp4","text":"Hello 🔥"}]}'
npx remotion render Dani out/dani.mp4 --props=./props/dani.json
```

### Dani Bulk Render + Upload Workflow

**Step 1**: Create a template JSON file containing an array of variants (one per video you want to generate). Each variant has its own `videoSequence`:
```json
[
  {
    "videoSequence": [
      { "src": "video-assets/reactions/001.mp4", "text": "POV: you figured it out 💀" },
      { "src": "video-assets/demo/upload/001.mp4", "text": "upload your pdf 😊" }
    ]
  },
  {
    "videoSequence": [
      { "src": "video-assets/reactions/001.mp4", "text": "Stop using basic summaries 🛑" },
      { "src": "video-assets/demo/mindmap/001.mp4", "text": "mindmaps 🧠" }
    ]
  }
]
```

**Step 2**: Batch render all variants:
```
./scripts/batch-render.sh public/template/dani.json out/batch
```
Outputs: `out/batch/variant_00.mp4`, `out/batch/variant_01.mp4`, etc.

**Step 3**: Bulk upload to a project:
```
API_KEY=ve_... PROJECT_ID=proj_... ./scripts/bulk-upload.sh out/batch/*.mp4
```

Or with custom captions:
```
CAPTIONS="Figured it out video;Upload feature demo" \
API_KEY=ve_... PROJECT_ID=proj_... ./scripts/bulk-upload.sh out/batch/*.mp4
```

Each variant becomes a render in the project with status `completed`. View them at `/dashboard/projects/<projectId>`.



```
opencode -s ses_20d22fa1dffeMpprshWcaViAx1
```