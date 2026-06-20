import argparse
import os
import time

import requests
from dotenv import load_dotenv

load_dotenv()


def get_presigned_url(api_key: str, file_type: str = "video/mp4") -> dict:
    url = "https://autoposting.my.id/api/file/presigner"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    payload = {"fileType": file_type}

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()


def upload_video(
    signed_url: str, file_path: str, content_type: str = "video/mp4"
) -> None:
    with open(file_path, "rb") as f:
        response = requests.put(
            signed_url,
            data=f,
            headers={"Content-Type": content_type},
        )
        response.raise_for_status()


def create_post(
    api_key: str,
    title: str,
    caption: str,
    connections: list[str],
    media_ids: list[str],
    privacy: str = "PUBLIC_TO_EVERYONE",
    media_type: str = "VIDEO",
) -> dict:
    url = "https://autoposting.my.id/api/posts"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    payload = {
        "title": title,
        "caption": caption,
        "connections": connections,
        "privacy": privacy,
        "media_type": media_type,
        "media_ids": media_ids,
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()


def get_connections(api_key: str, start: int = 1, limit: int = 10) -> list[dict]:
    """
    curl -X GET \
      "https://autoposting.my.id/api/connection?page=1&limit=10" \
      -H "Authorization: Bearer autoposting-your-api-key-here"
    """
    url = f"https://autoposting.my.id/api/connection?page={start}&limit={limit}"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    response = requests.get(url, headers=headers)
    print("response", response)
    response.raise_for_status()
    return response.json()


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload a video and create a post")
    # parser.add_argument("file", help="Path to the video file to upload")
    parser.add_argument(
        "--api-key",
        default=os.getenv("AUTOPOSTING_API_KEY"),
        help="API key for authorization (or set API_KEY env var)",
    )
    parser.add_argument(
        "--file-type",
        default="video/mp4",
        help="MIME type of the file (default: video/mp4)",
    )
    # parser.add_argument(
    #     "--connection-id", required=True, help="Connection ID for the post"
    # )
    parser.add_argument("--title", default="My first TikTok video", help="Post title")
    parser.add_argument(
        "--caption", default="This is a video caption", help="Post caption"
    )
    args = parser.parse_args()

    if not args.api_key:
        parser.error("--api-key is required or set API_KEY in .env")

    # get the connection ids from the available connections
    connections = get_connections(args.api_key)
    video_dir = "out/studley-with-audio"
    video_files = os.listdir(video_dir)
    for i, con in enumerate(connections["data"]):
        print("connection", con["connection_slug"])
        video_file = os.path.join(video_dir, video_files[i])

        presigned = get_presigned_url(args.api_key, args.file_type)

        print("presigned", presigned)
        signed_url = presigned["data"]["url"]
        media_id = presigned["data"]["media_id"]
        upload_video(signed_url, video_file, args.file_type)
        print("media_id", media_id)
        print("signed_url", signed_url)
        # exit()
        post = create_post(
            api_key=args.api_key,
            title=args.title,
            caption=args.caption,
            connections=[con["connection_slug"]],
            media_ids=[media_id],
        )
        print(f"Upload complete. Post created: {post}")
        time.sleep(10)

    exit()


if __name__ == "__main__":
    main()
