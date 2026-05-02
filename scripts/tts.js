const fs = require("fs");
const path = require("path");
require("dotenv").config();

const TTS_URL = "https://api.deepinfra.com/v1/inference/Qwen/Qwen3-TTS";
const API_KEY = process.env.DEEPINFRA_API_KEY;
const OUTPUT_DIR = path.join(__dirname, "..", "public", "tts");

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
  if (data.audio && data.audio.startsWith("data:")) {
    const b64 = data.audio.split(",")[1];
    return Buffer.from(b64, "base64");
  }

  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error("Usage: node scripts/tts.js <quiz-json-file>");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
  const questions = data.quizSequence || [];

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const text = q.question;
    const filename = `question_${i}.mp3`;
    const filepath = path.join(OUTPUT_DIR, filename);

    console.log(`[${i + 1}/${questions.length}] TTS: "${text}"`);
    const audio = await generateTTS(text);
    fs.writeFileSync(filepath, audio);
    console.log(`  Saved: public/tts/${filename} (${audio.length} bytes)`);

    // Update JSON with audioSrc
    q.audioSrc = `tts/${filename}`;
  }

  fs.writeFileSync(inputFile, JSON.stringify(data, null, 2));
  console.log(`\nUpdated ${inputFile} with audioSrc fields`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
