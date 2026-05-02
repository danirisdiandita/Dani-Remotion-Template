const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();
const { execSync } = require("child_process");

const TTS_URL = "https://api.deepinfra.com/v1/inference/Qwen/Qwen3-TTS";
const API_KEY = process.env.DEEPINFRA_API_KEY;
const PUBLIC_DIR = path.join(__dirname, "..", "public");

if (!API_KEY) {
  console.error("DEEPINFRA_API_KEY not found in .env");
  process.exit(1);
}

async function generateTTS(text) {
  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  const b64 = data.audio.split(",")[1];
  return Buffer.from(b64, "base64");
}

function getAudioDurationMs(filepath) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filepath}"`,
    { encoding: "utf-8" }
  );
  return Math.ceil(parseFloat(out.trim()) * 1000);
}

async function main() {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error("Usage: node scripts/tts.js <quiz-json-file>");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
  const questions = data.quizSequence || [];

  // Use existing sessionId from JSON, or generate a new one
  const sessionId = data.sessionId || crypto.randomUUID();
  data.sessionId = sessionId;
  const outputDir = path.join(PUBLIC_DIR, "tts", sessionId);
  fs.mkdirSync(outputDir, { recursive: true });

  if (data.hook) {
    const hookFilename = "hook.wav";
    const hookFilepath = path.join(outputDir, hookFilename);
    if (!fs.existsSync(hookFilepath)) {
      console.log(`[HOOK] TTS: "${data.hook}"`);
      const audio = await generateTTS(data.hook);
      fs.writeFileSync(hookFilepath, audio);
      console.log(`  Saved: public/tts/${sessionId}/${hookFilename} (${audio.length} bytes)`);
    } else {
      console.log(`[HOOK] SKIP (cached): "${data.hook}"`);
    }
    const hookDurationMs = getAudioDurationMs(hookFilepath);
    data.hookAudioSrc = `tts/${sessionId}/${hookFilename}`;
    data.hookDurationInFrames = Math.ceil((hookDurationMs / 1000) * 30) + 30; // 1s buffer
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const text = q.question;
    const filename = `question_${i}.wav`;
    const filepath = path.join(outputDir, filename);

    if (fs.existsSync(filepath)) {
      console.log(`[${i + 1}/${questions.length}] SKIP (cached): ${text}`);
    } else {
      console.log(`[${i + 1}/${questions.length}] TTS: ${text}`);
      const audio = await generateTTS(text);
      fs.writeFileSync(filepath, audio);
      console.log(`  Saved: public/tts/${sessionId}/${filename} (${audio.length} bytes)`);
    }

    const durationMs = getAudioDurationMs(filepath);
    const durationFrames = Math.ceil((durationMs / 1000) * 30);
    console.log(`  Duration: ${durationMs}ms (${durationFrames}f)`);

    q.audioSrc = `tts/${sessionId}/${filename}`;
    q.waitPeriodMs = durationMs;
    q.durationInFrames = durationFrames + 180 + 30;
  }

  fs.writeFileSync(inputFile, JSON.stringify(data, null, 2));
  console.log(`\nUpdated ${inputFile} (session: ${sessionId})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
