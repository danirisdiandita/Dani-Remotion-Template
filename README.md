# Remotion video

My Collections of Remotion Template 

## Commands

**Install Dependencies**

```console
npm i
```

**Start Preview**

```console
npm run dev
```

**Render video**

```console
npx remotion render
```

**Upgrade Remotion**

```console
npx remotion upgrade
```

## License

I use [Remotion](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).

## API Endpoints

### 📸 NicStudy Carousel Rendering
Renders a 3-slide educational carousel (Title, Tips, CTA) and packages it into a ZIP file.

**Endpoint:** `POST /api/nicstudy`

**Payload Structure:**
```json
{
  "projectId": "clp123...", 
  "title": "Hari 1: Penalaran Umum (PU)",
  "description": "Fokus: Mengolah informasi secara logis...",
  "tipsTitle": "Materi Wajib",
  "tips": [
    "Logika Analitik",
    "Analisis Grafik"
  ],
  "handle": "@nicstudy.id",
  "titleImage": "s3-key-or-url",
  "tipsImage": "s3-key-or-url",
  "ctaImage": "s3-key-or-url",
  "durationPerSlide": 150
}
```

**Parameters:**
- `projectId` (Required): Valid project ID from the database.
- `title/description`: Content for the first slide.
- `tips/tipsTitle`: Content for the second slide (tips is an array of strings).
- `handle`: Watermark/Handle shown across all slides.
- `titleImage/tipsImage/ctaImage`: Backgrounds. Supports S3 keys (auto-resolves to pre-signed URLs) or direct URLs.
- `durationPerSlide`: Frame duration for each still capture (default: 150).

**Example Call:**
```bash
curl -X POST http://localhost:3000/api/nicstudy \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "clp123...",
    "title": "New Lesson",
    "tips": ["Point A", "Point B"]
  }'
```

### ⚡ NicStudy Async (Background Tasks)
Queues the render task to be processed asynchronously via Google Cloud Tasks.

**Endpoint:** `POST /api/nicstudy/async`

**Payload:** Same as the standard endpoint.

**Benefits:**
- Returns immediately with `200 OK`.
- Robust background processing via Cloud Tasks.
- Best for batch processing or UI triggers.
