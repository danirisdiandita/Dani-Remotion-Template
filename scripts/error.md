# 404 "No post created" — Possible Causes

Based on the source at `src/app/api/posts/route.ts`, the 404 error does **not** mean the route is missing. The request reaches the server; the 404 is returned by business logic at **line 405-413** when the TikTok API call fails to return a `publish_id`.

Error code path (video branch, line 309-377, 400-413):

```
TikTok API  →  response.data_.data.publish_id  →  falsy  →  post_history_obj stays empty  →  404
```

---

## 1. Missing Token Refresh in Video Branch

**Lines 309-377** (video path) do **not** refresh the TikTok access token before calling the API. The PHOTO branch (lines 146-182) refreshes the token, but the video branch does not.

If the access token has expired, the call to `https://open.tiktokapis.com/v2/post/publish/inbox/video/init/` returns an error, `data_.data.publish_id` is undefined, and the 404 is returned.

**Fix:** Add token refresh logic (same as lines 146-182) before the TikTok API call in the video branch, or make the endpoint always refresh the token from the stored refresh_token.

---

## 2. TikTok API Error (Swallowed)

At **line 361**, the TikTok response is stored in `data_`:
```ts
const data_ = await response.json();
dataOutput.push(data_)

if (data_.data.publish_id) {
    post_history_obj.push({...})
}
```

If TikTok returns an error (e.g., invalid video, quota exceeded, region block), `data_.data.publish_id` is absent, but `data_.error` would contain the reason. The current code **ignores it** — it only checks for `publish_id`. Compare with `ondashboard/route.ts` line 333-336 which surfaces the error.

**Fix:** Log or return `data_?.error` when `publish_id` is missing instead of silently returning 404.

---

## 3. TikTok Cannot Reach the Video URL

At **line 327**, the video URL is constructed as:
```
${Config.NEXT_PUBLIC_URL}/api/file/${mediaIds[0]}
```

TikTok's servers must be able to **HTTP GET** this URL to pull the video. If `NEXT_PUBLIC_URL` resolves to `localhost`, a private IP, or a firewall that blocks TikTok's IP range, the pull fails.

Check that:
- `https://autoposting.my.id/api/file/<media_id>` is publicly accessible
- TikTok's crawler can reach it (TikTok uses specific IP ranges)

---

## 4. S3 Upload Didn't Actually Persist

The presigner returns an S3 presigned URL. The client uploads directly to S3, but:
- The presigned URL may have expired (it's valid for **600 seconds** per line 94)
- The upload may have failed silently (the Python script only checks `s3_resp.raise_for_status()`)
- The S3 bucket is on a different provider (GCS with `forcePathStyle: true` — see `presigner/route.ts:16` comment "GCS requires virtual-hosted-style URLs (false)" — the config has `true` which may be wrong for GCS)

If the file is not actually in S3 at the expected key, the `/api/file/[fname]` endpoint returns 404, and TikTok can't pull the video.

---

## 5. Invalid media_id Format

The presigner returns `media_id` as:
```ts
const s3Key = `${crypto.randomUUID()}.${extension_[fileType]}`
// e.g. "ca5e6d98-3a53-487f-8d08-978f0b803ae9.mp4"
```

This includes the file extension. The `/api/file/[fname]` route uses this directly as the S3 key. This is consistent, so it should work — unless the file wasn't uploaded.

---

## 6. Connection Lookup Uses `connection_slug` (not `id`)

At **line 280-286**, connections are looked up by `connection_slug`:
```ts
const connections_ = await prisma.connection.findMany({
    where: { connection_slug: { in: connections } }
})
```

If the value passed in `connections` (e.g. `164e697892d492da4ed33d19a9d2bd75`) is a database `id` rather than a `slug`, the query returns zero rows and would return 404 **"Connections not found"** — a different error from "No post created". Since the user gets "No post created", the connection **was** found, so this is not the issue. But worth verifying.

---

## 7. Draft Endpoint vs Direct Post

At **line 330-332**:
```ts
const videoEndpoint = isDraft
    ? 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/'
    : 'https://open.tiktokapis.com/v2/post/publish/video/init/'
```

The draft endpoint requires the user to have the **TikTok inbox** feature enabled. If the TikTok account doesn't support inbox drafts, the API may fail.

---

## Most Likely Culprit

The absent **token refresh** in the video branch (#1) combined with **swallowed TikTok errors** (#2). The access token likely expired, the TikTok API returned an error, and `publish_id` was never set.
