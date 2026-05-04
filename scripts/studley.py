#!/usr/bin/env python3
"""
Bulk render + upload Dani videos from a template JSON.

Each variant auto-fills:
  - Segment 1 src → random clip from public/video-assets/studley-clips/
  - Segment 2+ src → video-assets/studley-outro.mp4

Usage:
  python3 scripts/studley.py \\
    --api-key ve_... \\
    --project-id proj_... \\
    scripts/sample/studley/1.json

  python3 scripts/studley.py \\
    --api-key ve_... \\
    --project-id proj_... \\
    --base-url https://video.example.com \\
    --output-dir out/studley \\
    scripts/sample/studley/1.json

Template format:
[
  {
    "caption": "I use Notespark AI #studytok",
    "videoSequence": [
      { "text": "Overlay text for clip 1" },
      { "text": "Overlay text for studley outro" }
    ]
  }
]
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


CLIPS_DIR = Path("public/video-assets/studley-clips")
STUDLEY_SRC = "video-assets/studley-outro.mp4"


def parse_args():
    p = argparse.ArgumentParser(
        description="Bulk render + upload Dani videos with studley outro"
    )
    p.add_argument("template", help="Path to template JSON file")
    p.add_argument("--api-key", required=True, help="API key (x-api-key header)")
    p.add_argument("--project-id", required=True, help="Target project ID")
    p.add_argument(
        "--base-url",
        default="http://localhost:3000",
        help="Base URL of the VideoEngine app (default: http://localhost:3000)",
    )
    p.add_argument(
        "--output-dir",
        default="out/studley",
        help="Output directory for rendered videos (default: out/studley)",
    )
    p.add_argument(
        "--render-only",
        action="store_true",
        help="Only render videos, skip upload",
    )
    p.add_argument(
        "--upload-only",
        action="store_true",
        help="Only upload existing rendered videos (from --output-dir)",
    )
    return p.parse_args()


def render_variants(template_path, output_dir):
    """Render all variants. Returns (manifest list, success count, total count)."""
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
            seg["src"] = clip_src if j == 0 else STUDLEY_SRC
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
    """Upload rendered videos via the bulk API."""
    if not manifest:
        print("✗ Nothing to upload")
        sys.exit(1)

    sess = requests.Session()
    sess.headers.update({"x-api-key": api_key})

    print()
    print(f"→ Uploading {len(manifest)} video(s) to project {project_id}...")

    # Step 1: Init bulk upload — get presigned URLs
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

    # Step 2: Upload each file to its presigned URL
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

    # Step 3: Confirm successful uploads
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

    # Summary
    failed_count = len(failed_ids)
    print()
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"Rendered: {len(manifest)}")
    print(f"Uploaded: {upload_ok}")
    print(f"Failed:   {failed_count}")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    if failed_count > 0:
        sys.exit(1)


def main():
    args = parse_args()

    template_path = Path(args.template)
    output_dir = Path(args.output_dir)

    if args.upload_only:
        # Collect existing rendered files from output dir
        files = sorted(output_dir.glob("variant_*.mp4"))
        if not files:
            print(f"✗ No rendered videos found in {output_dir}/")
            sys.exit(1)

        # Load template for captions
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
        return

    # Render
    manifest, success, total = render_variants(template_path, output_dir)

    if success == 0:
        print("✗ No videos rendered successfully")
        sys.exit(1)

    if args.render_only:
        print()
        print("→ Render-only mode. Skipping upload.")
        return

    # Upload
    bulk_upload(manifest, args.api_key, args.project_id, args.base_url)


if __name__ == "__main__":
    main()
