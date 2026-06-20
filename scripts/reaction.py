#!/usr/bin/env python3
"""
Bulk render + upload Dani videos from a template JSON, pairing reaction
clips with web-demo feature walkthroughs.

Each variant auto-fills:
  - Segment 1 src → random clip from public/video-assets/reactions/
  - Segments 2-7 src → public/video-assets/web-demo/001_upload.mp4 through 006_feynman.mp4 (in order)

Usage:
  python3 scripts/reaction.py \
    --api-key ve_... \
    --project-id proj_... \
    scripts/sample/reaction/1.json

  python3 scripts/reaction.py \
    --api-key ve_... \
    --project-id proj_... \
    --base-url https://video.example.com \
    --output-dir out/reaction \
    scripts/sample/reaction/1.json

Template format:
[
  {
    "caption": "Caption for upload",
    "videoSequence": [
      { "text": "Reaction overlay text" },
      { "text": "Web demo 1 overlay text" },
      { "text": "Web demo 2 overlay text" },
      { "text": "Web demo 3 overlay text" },
      { "text": "Web demo 4 overlay text" },
      { "text": "Web demo 5 overlay text" },
      { "text": "Web demo 6 overlay text" }
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

REACTIONS_DIR = Path("public/video-assets/reactions")
WEB_DEMO_DIR = Path("public/video-assets/web-demo")

# Sorted list of web-demo sources
WEB_DEMO_SRCS = sorted(
    str(f).replace("public/", "", 1)
    for f in WEB_DEMO_DIR.glob("*.mp4")
)


def resolve_reaction_src(variant, reactions):
    """Resolve optional reactionSrc from variant. Returns src string or None."""
    reaction_src = variant.get("reactionSrc")
    if not reaction_src:
        return None

    # Normalise: strip public/ prefix if present
    clean = reaction_src.replace("public/", "", 1)

    # Check if it matches an existing file in reactions dir
    for f in reactions:
        f_clean = str(f).replace("public/", "", 1)
        if f_clean == clean:
            return clean

    print(f"  [!] reactionSrc '{reaction_src}' not found in {REACTIONS_DIR}, falling back to random")
    return None


def parse_args():
    p = argparse.ArgumentParser(
        description="Bulk render + upload Dani videos with reaction + web-demo walkthrough"
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
        default="out/reaction",
        help="Output directory for rendered videos (default: out/reaction)",
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
    p.add_argument(
        "--upload-buffer",
        action="store_true",
        help="Upload rendered videos to the buffer.com",
    )
    p.add_argument(
        "--render-timeout",
        type=int,
        default=120000,
        help="Timeout per render in ms (default: 120000 / 2 min). Increase for long videos.",
    )
    p.add_argument(
        "--no-timeout",
        action="store_true",
        help="Disable render timeout entirely",
    )
    return p.parse_args()


def render_variants(template_path, output_dir, render_timeout=120000, no_timeout=False):
    """Render all variants. Returns (manifest list, success count, total count)."""
    if not template_path.exists():
        print(f"✗ Template not found: {template_path}")
        sys.exit(1)

    reactions = sorted(REACTIONS_DIR.glob("*.mp4"))
    if not reactions:
        print(f"✗ No reaction clips found in {REACTIONS_DIR}")
        sys.exit(1)

    if not WEB_DEMO_SRCS:
        print(f"✗ No web-demo videos found in {WEB_DEMO_DIR}")
        sys.exit(1)

    with open(template_path) as f:
        variants = json.load(f)

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"→ Reaction clips available: {len(reactions)}")
    print(f"→ Web-demo videos available: {len(WEB_DEMO_SRCS)}")
    print(f"→ Variants:                  {len(variants)}")
    print(f"→ Output:                    {output_dir}/")
    print()

    manifest = []
    failed = []

    for i, variant in enumerate(variants):
        reaction_src = resolve_reaction_src(variant, reactions)
        if reaction_src is None:
            reaction = random.choice(reactions)
            reaction_src = (
                str(reaction).replace("public/", "", 1)
                if str(reaction).startswith("public/")
                else str(reaction)
            )

        caption = variant.get("caption", "")
        seq = variant["videoSequence"]

        if len(seq) != len(WEB_DEMO_SRCS) + 1:
            print(f"  [!] Variant {i}: expected {len(WEB_DEMO_SRCS) + 1} segments, got {len(seq)}")
            print(f"      Make sure your template has 1 reaction text + {len(WEB_DEMO_SRCS)} web-demo texts")

        for j, seg in enumerate(seq):
            if j == 0:
                seg["src"] = reaction_src
            else:
                demo_idx = j - 1
                if demo_idx < len(WEB_DEMO_SRCS):
                    seg["src"] = WEB_DEMO_SRCS[demo_idx]
            seg.setdefault("orientation", "bottom")

        props = {"videoSequence": seq}

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as tf:
            json.dump(props, tf, ensure_ascii=False)
            props_file = tf.name

        output_file = output_dir / f"variant_{i:02d}.mp4"

        first_text = seq[0].get("text", "") if seq else ""
        label = first_text[:60]

        print(f"  [{i + 1}/{len(variants)}] {label} ... ", end="", flush=True)

        cmd = [
            "npx",
            "remotion",
            "render",
            "Dani",
            str(output_file),
            f"--props={props_file}",
        ]
        if no_timeout:
            cmd.append("--timeout=99999999")
        else:
            cmd.append(f"--timeout={render_timeout}")

        result = subprocess.run(
            cmd,
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
            item["id"] for item in init_data["items"] if item["id"] not in failed_ids
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
    manifest, success, total = render_variants(template_path, output_dir, args.render_timeout, args.no_timeout)

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
