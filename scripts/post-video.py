#!/usr/bin/env python3
"""
Post a single video to TikTok as a draft via the AutoPosting API.
No rendering, no project upload — just upload + post.

Usage:
  python3 scripts/post-video.py path/to/video.mp4 \
    --autopost-api-key autoposting-... \
    --autopost-connection-id d618... \
    --autopost-base-url https://autoposting.my.id
"""

import argparse
import os
import sys
from pathlib import Path

import requests


def parse_args():
    p = argparse.ArgumentParser(description="Post a single video to TikTok as draft")
    p.add_argument("video_path", help="Path to the video file to post")
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
        default=os.environ.get("AUTOPOST_BASE_URL", "https://autoposting.my.id"),
        help="AutoPosting API base URL",
    )
    p.add_argument(
        "--autopost-mode",
        default="UPLOAD_AS_DRAFT",
        choices=["UPLOAD_AS_DRAFT", "DIRECT_POST"],
        help="Post mode: UPLOAD_AS_DRAFT (default) or DIRECT_POST",
    )
    p.add_argument(
        "--caption",
        default="",
        help="Optional caption for the TikTok post",
    )
    p.add_argument(
        "--title",
        default="",
        help="Optional title (defaults to filename without extension)",
    )
    return p.parse_args()


def post_video(args):
    video_path = Path(args.video_path)

    if not video_path.exists():
        print(f"Video not found: {video_path}")
        sys.exit(1)

    if not args.autopost_api_key:
        print("No autopost API key provided")
        sys.exit(1)

    if not args.autopost_connection_id:
        print("No autopost connection ID provided")
        sys.exit(1)

    base_url = args.autopost_base_url.rstrip("/")
    headers = {"Authorization": f"Bearer {args.autopost_api_key}"}
    file_size_mb = os.path.getsize(video_path) / (1024 * 1024)
    title = args.title or video_path.stem
    caption = args.caption or title

    print(f"Video:  {video_path.name} ({file_size_mb:.1f} MB)")
    print(f"Mode:   {args.autopost_mode}")
    print(f"Title:  {title}")
    print()

    # Step 1: Get presigned S3 upload URL + media_id
    print("Getting presigned upload URL...", end=" ", flush=True)
    resp = requests.post(
        f"{base_url}/api/file/presigner",
        json={"fileType": "video/mp4"},
        headers={**headers, "Content-Type": "application/json"},
    )
    if not resp.ok:
        body = resp.text[:500]
        print(f"✗ HTTP {resp.status_code} | {body}")
        sys.exit(1)
    presign_data = resp.json()
    presigned_url = presign_data["data"]["url"]
    media_id = presign_data["data"]["media_id"]
    print(f"done (media_id: {media_id})")

    # Step 2: Upload directly to S3 via presigned URL
    print("Uploading to S3...", end=" ", flush=True)
    with open(video_path, "rb") as fh:
        s3_resp = requests.put(
            presigned_url,
            data=fh,
            headers={"Content-Type": "video/mp4"},
        )
    if not s3_resp.ok:
        print(f"✗ HTTP {s3_resp.status_code}")
        sys.exit(1)
    print("done")

    # Step 3: Create TikTok post
    print("Creating draft post...", end=" ", flush=True)
    post_body = {
        "title": title[:80],
        "caption": caption,
        "connections": [args.autopost_connection_id],
        "post_mode": args.autopost_mode,
        "privacy": "PUBLIC_TO_EVERYONE",
        "media_type": "VIDEO",
        "media_ids": [media_id],
    }
    post_resp = requests.post(
        f"{base_url}/api/posts",
        json=post_body,
        headers={**headers, "Content-Type": "application/json"},
    )
    if not post_resp.ok:
        body = post_resp.text[:500]
        print(f"✗ HTTP {post_resp.status_code} | {body}")
        sys.exit(1)
    print("done")

    print()
    print(f"Posted successfully as {args.autopost_mode.replace('_', ' ').lower()}")


def main():
    args = parse_args()
    post_video(args)


if __name__ == "__main__":
    main()
