
this is nextjs and remotion renderer

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
