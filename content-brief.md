# Notespark AI — TikTok Script Generation Brief

## Context
- Product: **Notespark AI** ([notespark.id](https://notespark.id))
- What it actually does (use as a *realism boundary*, don't need to name features explicitly in content): upload a lecture recording or PDF → AI generates quizzes, flashcards, mindmaps, and Cornell notes in under 60 seconds. Any "demo" text should stay plausible given this — no unrelated or absurd claims.
- Goal: short-form video scripts (JSON) for TikTok-style content, output as `videoSequence` arrays for a video editor tool.

## Core Concept
Videos follow a **hook + demo** structure built on this tension: *other people (mom, teacher, friends) don't understand how you get good grades without visibly studying — you reveal the "secret."*

### The two-slide formula
1. **Text 1 (hook)** — someone's shocked/confused/jealous reaction to seeing a **perfect grade**. Must contain BOTH halves of the contrast: "you did little/no visible studying" **AND** "but you got a great result." (e.g. "you never study but got 100?!" not just "you never study!!")
2. **Text 2 (demo)** — a short, punchy reply that reveals the app is the reason. Very short — this is the punchline, not an explanation.

### Reference viral examples (formula to imitate)
```
how do you memorise so much in 30 minutes?!?! | me:
how are ur grades SOOOO HIGH!!!! | me, for 10 mins a day
```

## Realism Rules
- **Never** use absurd/unrealistic scenarios as the "lazy" setup (no: watching a concert, cooking dinner, gaming all night, etc. — keep it grounded in normal student life: phone scrolling, sleeping, not taking notes, minimal review time, etc.)
- Text 2 (demo) should stay believable given what the app actually does — reviewing, quizzing, flashcards, short daily sessions — not vague hype.

## JSON Structure
```json
[
  {
    "caption": "caption text here #hashtags",
    "videoSequence": [
      { "text": "hook text" },
      { "text": "demo reply text" }
    ]
  }
]
```

## Caption Rules
- Base hashtags: `#studytok #university #exam #notespark`
- Do **NOT** mention "Notespark AI" by name inside long-form advice captions — those should read as generic, standalone study advice (so they're valuable/shareable on their own, not obviously an ad).
- Two caption styles used:
  1. **Short caption**: a punchy line + hashtags (no explicit product mention needed once long-form captions were introduced; earlier iterations did prefix "I use Notespark AI").
  2. **Long-form caption** (300–450 words): genuine, useful study advice/tips written in first person, sounding like organic advice content, not a product pitch. When this style is used, Text 2 ends with **"(see caption)"** instead of a full reply, pointing viewers to the caption for the full explanation.

## Text 1 (Hook) Variants Used
Rotate between different reactor identities using emoji prefixes:
- `👩:` (mom)
- `👨‍🏫:` (teacher)
- `👯:` (friend/classmate)
- No prefix — for first-person affirmation style hooks, e.g.:
  - "I WILL PASS ALL MY EXAMS. I WILL PASS ALL MY EXAMS!!" (repeated declarative statement, all caps, 😤 emoji)

### Alternating vibes/angles to rotate through (don't stay in only one lane):
1. **Suspicion/disbelief hook**: "How do you get those grades??? u re always on ur phones!!!" → demo: "with Notespark AI for sure"
2. **Self-affirmation hook**: "I will definitely pass my exams!!!" → demo: "Notespark AI 🔥"
3. **Pre-exam panic hook**: "We only have several days b4 exams!! how re u not panic??" → demo: "with this of course!!!"
4. **"I don't see you studying" vibe**: reaction implies they never witness studying happening → reply: "I am studying!!!" / "are you sure?" (calm, confident push-back before demo reveal)

## Tone/Style Notes
- Keep hook and demo text SHORT — this is not a place for long sentences (except in the long-form caption variant).
- Emoji usage: 😭😤😱💀😇😏😈📱💅😌 used liberally but not excessively (2–3 per line max).
- Punctuation: multiple question marks / exclamation marks common ("HOW?!?!", "😭😭😭").
- Vary the emotional flavor of captions (💀 😭 😇 🔥 🤫 💅 😱) rather than reusing the same one repeatedly.

## File / Workflow Conventions
- Each batch of ~10 scripts saved as sequential JSON files: `scripts/sample/studley/<N>.json`
- runner scripts point at a JSON file by filename, updated via `sed` before execution:
  - `scripts/local-studley.sh``
- Standard one-liner pattern used to create + run:
```bash
cat << 'EOF' > scripts/sample/studley/<N>.json
[ ... json content ... ]
EOF
```
```bash
sed -i 's/[0-9]*\.json/<N>.json/' ./scripts/local-studley.sh && ./scripts/local-studley.sh
```

## Example Full Entries

**Short caption style:**
```json
{
  "caption": "I use Notespark AI 😭 #studytok #university #exam #notespark",
  "videoSequence": [
    { "text": "👯: you never study how are ur grades so high?!?! 😭😭" },
    { "text": "me: 😏📱" }
  ]
}
```

**Long-form caption style:**
```json
{
  "caption": "stop re-reading your notes. it doesn't work. your brain learns by being tested not by reading. quiz yourself on everything. find what you don't know. fix only that. sleep early. walk in confident. that's the whole formula for getting 100 every single time 💯 #studytok #university #exam #notespark",
  "videoSequence": [
    { "text": "👯: HOW do you get those grades ur always on ur phone 😭😭😭" },
    { "text": "this is my secret 😏 (see caption)" }
  ]
}
```
