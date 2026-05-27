#!/usr/bin/env python3
"""
Bulk render + upload Dani videos + auto-post as TikTok drafts.

Extends studley.py with AutoPosting API integration (see scripts/post.sh).
After rendering and uploading to a VideoEngine project, each video is also
uploaded to the AutoPosting API and posted to TikTok as a draft.

Usage:
  python3 scripts/studley-post.py \\
    --api-key ve_... \\
    --project-id proj_... \\
    --autopost-api-key autoposting-... \\
    --autopost-connection-id d618... \\
    --autopost-base-url https://ultimate-tunnel.danirisdiandita.com \\
    scripts/sample/studley/1.json
"""

import argparse
import json
import os
import random
import subprocess
import sys
import tempfile
from pathlib import Path

import requests

CLIPS_DIR = Path("public/video-assets/studley-clips-4s")
STUDLEY_SRC = "video-assets/studley-outro.mp4"
SRCS = ["video-assets/flashcard-feynman.mp4", "video-assets/quiz.mp4"]


def parse_args():
    p = argparse.ArgumentParser(
        description="Bulk render + upload Dani videos with studley outro + TikTok draft posting"
    )
    p.add_argument("template", help="Path to template JSON file")
    p.add_argument("--api-key", default="", help="VideoEngine API key (x-api-key header)")
    p.add_argument("--project-id", default="", help="Target VideoEngine project ID")
    p.add_argument(
        "--base-url",
        default="http://localhost:3000",
        help="VideoEngine base URL (default: http://localhost:3000)",
    )
    p.add_argument(
        "--output-dir",
        default="out/studley",
        help="Output directory for rendered videos (default: out/studley)",
    )
    p.add_argument(
        "--render-only",
        action="store_true",
        help="Only render videos, skip all uploads",
    )
    p.add_argument(
        "--upload-only",
        action="store_true",
        help="Only upload existing rendered videos (from --output-dir)",
    )
    # AutoPosting args
    p.add_argument(
        "--autopost-api-key",
        default=os.environ.get("AUTOPOST_API_KEY", ""),
        help="AutoPosting API key (or set AUTOPOST_API_KEY env var)",
    )
    p.add_argument(
        "--autopost-connection-id",
        default=os.environ.get("AUTOPOST_CONNECTION_ID", ""),
        help="TikTok connection ID (or set AUTOPOST_CONNECTION_ID env var)",
    )
    p.add_argument(
        "--autopost-base-url",
        default=os.environ.get("AUTOPOST_BASE_URL", "https://ultimate-tunnel.danirisdiandita.com"),
        help="AutoPosting API base URL",
    )
    p.add_argument(
        "--autopost-mode",
        default="UPLOAD_AS_DRAFT",
        choices=["UPLOAD_AS_DRAFT", "DIRECT_POST"],
        help="Post mode: UPLOAD_AS_DRAFT (default) or DIRECT_POST",
    )
    p.add_argument(
        "--skip-autopost",
        action="store_true",
        help="Skip TikTok auto-posting (only render + project upload)",
    )
    return p.parse_args()


def render_variants(template_path, output_dir):
    if not template_path.exists():
        print(f"✗ Template not found: {template_path}")
        sys.exit(1)

    clips = sorted(CLIPS_DIR.glob("*.mp4"))
    if not clips:
        print(f"✗ No clips found in {CLIPS_DIR}")
        sys.exit(1)

    with open(template_path) as f:
        variants = json.load(f)

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"→ Clips available: {len(clips)}")
    print(f"→ Variants:         {len(variants)}")
    print(f"→ Output:           {output_dir}/")
    print()

    manifest = []
    failed = []

    for i, variant in enumerate(variants):
        clip = random.choice(clips)
        clip_src = (
            str(clip).replace("public/", "", 1)
            if str(clip).startswith("public/")
            else str(clip)
        )

        caption = variant.get("caption", "")
        seq = variant["videoSequence"]

        for j, seg in enumerate(seq):
            seg["src"] = clip_src if j == 0 else random.choice(SRCS)
            seg.setdefault("orientation", "center")

        props = {"videoSequence": seq}

        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False
        ) as tf:
            json.dump(props, tf, ensure_ascii=False)
            props_file = tf.name

        output_file = output_dir / f"variant_{i:02d}.mp4"

        first_text = seq[0].get("text", "") if seq else ""
        label = first_text[:60]

        print(f"  [{i + 1}/{len(variants)}] {label} ... ", end="", flush=True)

        result = subprocess.run(
            [
                "npx",
                "remotion",
                "render",
                "Dani",
                str(output_file),
                f"--props={props_file}",
                "--gl=egl",
                '--chromium-flags="--use-gl=egl --use-angle=gl --ignore-gpu-blocklist --disable-gpu-sandbox"',
            ],
            capture_output=True,
            text=True,
        )

        os.unlink(props_file)

        if result.returncode == 0:
            print("✓")
            manifest.append(
                {
                    "file": str(output_file),
                    "caption": caption,
                    "fileType": "video/mp4",
                }
            )
        else:
            print("✗")
            lines = result.stderr.strip().split("\n")
            for line in lines[-3:]:
                print(f"     {line}")
            failed.append(i)

    success = len(variants) - len(failed)
    print()
    print(f"→ Rendered: {success} / {len(variants)}")

    return manifest, success, len(variants)


def bulk_upload(manifest, api_key, project_id, base_url):
    if not manifest:
        print("✗ Nothing to upload")
        sys.exit(1)

    sess = requests.Session()
    sess.headers.update({"x-api-key": api_key})

    print()
    print(f"→ Uploading {len(manifest)} video(s) to project {project_id}...")

    items = [
        {
            "fileName": Path(m["file"]).name,
            "caption": m["caption"],
            "fileType": m.get("fileType", "video/mp4"),
        }
        for m in manifest
    ]

    resp = sess.post(
        f"{base_url}/api/uploads/bulk",
        json={"projectId": project_id, "items": items},
    )
    resp.raise_for_status()
    init_data = resp.json()

    print(f"✓ Initialized {len(init_data['items'])} item(s)")

    print()
    print("→ Uploading files to S3...")
    upload_ok = 0
    failed_ids = []

    for j, (item, m) in enumerate(zip(init_data["items"], manifest)):
        presigned_url = item["presignedUrl"]
        render_id = item["id"]
        basename = Path(m["file"]).name

        print(f"  [{j + 1}/{len(manifest)}] {basename} ... ", end="", flush=True)

        with open(m["file"], "rb") as f:
            put_resp = requests.put(
                presigned_url,
                data=f,
                headers={"Content-Type": m.get("fileType", "video/mp4")},
            )

        if put_resp.ok:
            print(f"✓ ({put_resp.status_code})")
            upload_ok += 1
        else:
            print(f"✗ HTTP {put_resp.status_code}")
            failed_ids.append(render_id)

    print()
    if upload_ok > 0:
        confirmed_ids = [
            item["id"]
            for item in init_data["items"]
            if item["id"] not in failed_ids
        ]
        print(f"→ Confirming {len(confirmed_ids)} successful upload(s)...")

        patch_resp = sess.patch(
            f"{base_url}/api/uploads/bulk",
            json={"ids": confirmed_ids},
        )
        patch_resp.raise_for_status()
        confirmed = patch_resp.json().get("confirmedCount", 0)
        print(f"✓ Confirmed {confirmed} render(s)")

    failed_count = len(failed_ids)
    print()
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"Rendered: {len(manifest)}")
    print(f"Uploaded: {upload_ok}")
    print(f"Failed:   {failed_count}")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    if failed_count > 0:
        sys.exit(1)


def autopost_upload(manifest, args):
    """
    For each video: get presigned S3 URL → upload directly to S3 → create TikTok post.
    Uses presigned URLs (like post-presigner.sh) to bypass Vercel's 4.5MB body limit.
    """
    if not manifest:
        print("✗ Nothing to autopost")
        return

    base_url = args.autopost_base_url.rstrip("/")
    headers = {"Authorization": f"Bearer {args.autopost_api_key}"}

    print()
    print("=" * 60)
    print(f"→ AutoPosting {len(manifest)} video(s) as TikTok drafts...")
    print(f"  Base URL:  {base_url}")
    print(f"  Mode:      {args.autopost_mode}")
    print("=" * 60)

    posted = 0
    failed = 0

    for j, m in enumerate(manifest):
        filepath = m["file"]
        basename = Path(filepath).name
        caption = m.get("caption", basename)
        title = caption[:80]
        file_size_mb = os.path.getsize(filepath) / (1024 * 1024)

        print(f"\n  [{j + 1}/{len(manifest)}] {basename} ({file_size_mb:.1f}MB)")

        # Step 1: Get presigned S3 upload URL + media_id
        print(f"    Getting presigned upload URL...", end=" ", flush=True)
        try:
            presign_resp = requests.post(
                f"{base_url}/api/file/presigner",
                json={"fileType": "video/mp4"},
                headers={**headers, "Content-Type": "application/json"},
            )
            presign_resp.raise_for_status()
            presign_data = presign_resp.json()
            presigned_url = presign_data["data"]["url"]
            media_id = presign_data["data"]["media_id"]
            print(f"✓ (media_id: {media_id})")
        except Exception as e:
            body = presign_resp.text if hasattr(presign_resp, 'text') else ''
            trunc = body[:500] + '...' if len(body) > 500 else body
            print(f"✗ {e} | {trunc}")
            failed += 1
            continue

        # Step 2: Upload directly to S3 via presigned URL
        print(f"    Uploading to S3...", end=" ", flush=True)
        try:
            with open(filepath, "rb") as fh:
                s3_resp = requests.put(
                    presigned_url,
                    data=fh,
                    headers={"Content-Type": "video/mp4"},
                )
            s3_resp.raise_for_status()
            print("✓")
        except Exception as e:
            body = s3_resp.text if hasattr(s3_resp, 'text') else ''
            trunc = body[:500] + '...' if len(body) > 500 else body
            print(f"✗ {e} | {trunc}")
            failed += 1
            continue

        # Step 3: Create TikTok post
        print(f"    Creating draft post...", end=" ", flush=True)
        post_body = {
            "title": title,
            "caption": caption,
            "connections": [args.autopost_connection_id],
            "post_mode": args.autopost_mode,
            "privacy": "PUBLIC_TO_EVERYONE",
            "media_type": "VIDEO",
            "media_ids": [media_id],
        }
        try:
            post_resp = requests.post(
                f"{base_url}/api/posts",
                json=post_body,
                headers={**headers, "Content-Type": "application/json"},
            )
            post_resp.raise_for_status()
            print("✓")
            posted += 1
        except Exception as e:
            body = post_resp.text if hasattr(post_resp, 'text') else ''
            trunc = body[:500] + '...' if len(body) > 500 else body
            print(f"✗ {e} | {trunc}")
            failed += 1

    print()
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"AutoPost drafts: {posted} posted, {failed} failed")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")


def main():
    args = parse_args()

    template_path = Path(args.template)
    output_dir = Path(args.output_dir)

    autopost_enabled = (
        not args.skip_autopost
        and bool(args.autopost_api_key)
        and bool(args.autopost_connection_id)
    )

    if args.upload_only:
        files = sorted(output_dir.glob("variant_*.mp4"))
        if not files:
            print(f"✗ No rendered videos found in {output_dir}/")
            sys.exit(1)

        with open(template_path) as f:
            variants = json.load(f)

        manifest = []
        for i, f in enumerate(files):
            caption = variants[i].get("caption", "") if i < len(variants) else ""
            manifest.append(
                {"file": str(f), "caption": caption, "fileType": "video/mp4"}
            )

        print(f"→ Found {len(manifest)} existing video(s) in {output_dir}/")
        bulk_upload(manifest, args.api_key, args.project_id, args.base_url)

        if autopost_enabled:
            autopost_upload(manifest, args)

        return

    # Render
    manifest, success, total = render_variants(template_path, output_dir)

    if success == 0:
        print("✗ No videos rendered successfully")
        sys.exit(1)

    if args.render_only:
        print()
        print("→ Render-only mode. Skipping all uploads.")
        return

    # Upload to VideoEngine project (only if credentials provided)
    project_upload_enabled = bool(args.api_key) and bool(args.project_id)
    if project_upload_enabled:
        bulk_upload(manifest, args.api_key, args.project_id, args.base_url)
    else:
        print()
        print("→ Skipping project upload (no --api-key / --project-id)")

    # Post to TikTok as draft
    if autopost_enabled:
        autopost_upload(manifest, args)
    elif not project_upload_enabled:
        print()
        print("→ Nothing to upload (no project creds, no autopost creds)")
    else:
        print()
        print("→ Skipping autopost (--skip-autopost or missing --autopost-api-key / --autopost-connection-id)")


if __name__ == "__main__":
    main()
