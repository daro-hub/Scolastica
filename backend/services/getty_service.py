import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import httpx

GETTY_BASE_URL = "https://api.gettyimages.com/v3"
UNSPLASH_BASE_URL = "https://api.unsplash.com"


def _getty_configured() -> bool:
    return bool(os.environ.get("GETTY_API_KEY"))


def _unsplash_configured() -> bool:
    return bool(os.environ.get("UNSPLASH_ACCESS_KEY"))


async def search_images(
    query: str,
    max_price: float = 1.0,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    if not _getty_configured():
        if _unsplash_configured():
            return await search_free_images(query, page=page, page_size=page_size)
        raise RuntimeError(
            "Neither GETTY_API_KEY nor UNSPLASH_ACCESS_KEY is configured"
        )

    headers = {"Api-Key": os.environ["GETTY_API_KEY"]}
    params = {
        "phrase": query,
        "fields": "largest_downloads,display_set",
        "page": page,
        "page_size": page_size,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{GETTY_BASE_URL}/search/images/creative",
            headers=headers,
            params=params,
        )
        resp.raise_for_status()

    data = resp.json()
    images = []
    for img in data.get("images", []):
        preview_url = None
        for display in img.get("display_sizes", []):
            if display.get("name") == "comp":
                preview_url = display.get("uri")
                break

        largest = img.get("largest_downloads", [{}])
        max_dims = largest[0] if largest else {}

        images.append(
            {
                "id": img["id"],
                "title": img.get("title", ""),
                "preview_url": preview_url,
                "download_url": f"{GETTY_BASE_URL}/downloads/images/{img['id']}",
                "max_dimensions": {
                    "width": max_dims.get("width"),
                    "height": max_dims.get("height"),
                    "bytes": max_dims.get("bytes"),
                },
            }
        )

    return {
        "result_count": data.get("result_count", 0),
        "images": images,
    }


async def download_image(image_id: str, output_dir: str) -> str:
    api_key = os.environ.get("GETTY_API_KEY")
    access_token = os.environ.get("GETTY_ACCESS_TOKEN")
    if not api_key or not access_token:
        raise RuntimeError(
            "GETTY_API_KEY and GETTY_ACCESS_TOKEN are required for downloads"
        )

    headers = {
        "Api-Key": api_key,
        "Authorization": f"Bearer {access_token}",
    }

    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        resp = await client.post(
            f"{GETTY_BASE_URL}/downloads/images/{image_id}",
            headers=headers,
        )
        resp.raise_for_status()
        download_data = resp.json()

        file_url = download_data.get("uri")
        if not file_url:
            raise RuntimeError(f"No download URI returned for image {image_id}")

        file_resp = await client.get(file_url)
        file_resp.raise_for_status()

    content_type = file_resp.headers.get("content-type", "")
    ext = ".jpg"
    if "png" in content_type:
        ext = ".png"
    elif "tiff" in content_type:
        ext = ".tiff"
    else:
        parsed_path = urlparse(file_url).path
        if "." in parsed_path.split("/")[-1]:
            ext = "." + parsed_path.split(".")[-1]

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    file_path = output_path / f"{image_id}{ext}"

    file_path.write_bytes(file_resp.content)
    return str(file_path)


async def track_usage(image_id: str, project_id: str, price: float) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "image_id": image_id,
        "project_id": project_id,
        "price": price,
        "currency": "EUR",
        "tracked_at": datetime.now(timezone.utc).isoformat(),
        "source": "getty",
    }


async def search_free_images(
    query: str,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    access_key = os.environ.get("UNSPLASH_ACCESS_KEY")
    if not access_key:
        raise RuntimeError("UNSPLASH_ACCESS_KEY is not configured")

    headers = {"Authorization": f"Client-ID {access_key}"}
    params = {
        "query": query,
        "page": page,
        "per_page": page_size,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{UNSPLASH_BASE_URL}/search/photos",
            headers=headers,
            params=params,
        )
        resp.raise_for_status()

    data = resp.json()
    images = []
    for photo in data.get("results", []):
        urls = photo.get("urls", {})
        images.append(
            {
                "id": photo["id"],
                "title": photo.get("description") or photo.get("alt_description", ""),
                "preview_url": urls.get("regular"),
                "download_url": urls.get("full"),
                "max_dimensions": {
                    "width": photo.get("width"),
                    "height": photo.get("height"),
                    "bytes": None,
                },
            }
        )

    return {
        "result_count": data.get("total", 0),
        "images": images,
    }
