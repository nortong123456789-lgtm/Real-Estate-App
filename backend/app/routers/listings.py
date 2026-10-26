import os
import uuid
import requests
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File, status, Response, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse

from app.config import settings
from app.telegram_db import telegram_db
from app.schemas import ListingResponse, ListingUpdate, MediaDumpResponse

router = APIRouter(prefix="/listings", tags=["listings"])

@router.get("/health")
def health_check():
    """Health check endpoint verifying connection to Telegram Bot API Server and storage state."""
    return telegram_db.health_check()

@router.post("/media-dump", status_code=status.HTTP_202_ACCEPTED, response_model=MediaDumpResponse)
async def create_media_dump(
    response: Response,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...)
):
    """
    Non-blocking media ingestion endpoint (Zero External DB Architecture).
    Instantly registers draft stub in memory (0ms delay), saves raw files to temp directory,
    triggers background Telegram JSON storage processing, and returns 202 Accepted.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No media files provided")

    listing_id = str(uuid.uuid4())
    os.makedirs(settings.TEMP_MEDIA_DIR, exist_ok=True)
    file_infos = []

    for idx, upload_file in enumerate(files):
        file_ext = os.path.splitext(upload_file.filename)[1] or ".bin"
        temp_filename = f"{listing_id}_{idx}_{uuid.uuid4().hex[:8]}{file_ext}"
        temp_path = os.path.join(settings.TEMP_MEDIA_DIR, temp_filename)

        content = await upload_file.read()
        with open(temp_path, "wb") as f:
            f.write(content)

        file_type = upload_file.content_type or "image/jpeg"
        file_infos.append({
            "temp_path": temp_path,
            "file_type": file_type,
            "original_filename": upload_file.filename
        })

    # 1. Instantly register draft stub so GET /api/listings/drafts returns it immediately on frontend (0ms delay)
    telegram_db.create_instant_draft_stub(listing_id, file_infos)

    # 2. Dispatch background task to process Telegram sendMediaGroup & update Telegram JSON database
    background_tasks.add_task(telegram_db.process_media_and_update_draft, listing_id, file_infos)

    response.status_code = status.HTTP_202_ACCEPTED
    return MediaDumpResponse(
        id=listing_id,
        status="draft",
        media_count=len(files),
        message="Media dump accepted for Telegram JSON ingestion"
    )

@router.get("/drafts", response_model=List[ListingResponse])
def get_draft_listings():
    """Retrieve all pending draft listings from Telegram JSON storage."""
    return telegram_db.get_drafts()

@router.get("", response_model=List[ListingResponse])
def get_active_listings():
    """Retrieve all active listings from Telegram JSON storage for vector map rendering."""
    return telegram_db.get_active()

@router.get("/temp-media/{temp_filename}")
def serve_temp_media(temp_filename: str):
    """Serves temporary local disk image before or during Telegram upload processing."""
    file_path = os.path.join(settings.TEMP_MEDIA_DIR, temp_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Temporary media file not found")
    return FileResponse(file_path)

@router.get("/media/{telegram_file_id}")
def proxy_telegram_media(telegram_file_id: str):
    """
    Production Media Proxy Endpoint.
    Streams image/video binary directly from Telegram Bot API server without exposing bot tokens.
    """
    download_url = telegram_db.get_file_download_url(telegram_file_id)
    if not download_url:
        raise HTTPException(status_code=404, detail="Media file not found on Telegram CDN")

    try:
        req = requests.get(download_url, stream=True, timeout=30)
        req.raise_for_status()

        content_type = req.headers.get("Content-Type", "image/jpeg")
        if content_type == "application/octet-stream" or not content_type:
            if download_url.lower().endswith((".mp4", ".mov", ".mkv", ".avi")):
                content_type = "video/mp4"
            else:
                content_type = "image/jpeg"

        return StreamingResponse(
            req.iter_content(chunk_size=65536),
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000, immutable"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch media from Telegram CDN: {e}")

@router.get("/{listing_id}", response_model=ListingResponse)
def get_listing_by_id(listing_id: str):
    record = telegram_db.get_by_id(listing_id)
    if not record:
        raise HTTPException(status_code=404, detail="Listing not found")
    return record

@router.patch("/{listing_id}", response_model=ListingResponse)
def update_draft_listing(
    listing_id: str,
    payload: ListingUpdate
):
    """
    Manual completion form endpoint.
    Updates listing configuration, rent_amount, neighborhood, and coordinates in Telegram JSON storage.
    """
    updates = payload.dict(exclude_unset=True)
    try:
        updated_record = telegram_db.update_listing(listing_id, updates)
        return updated_record
    except KeyError:
        raise HTTPException(status_code=404, detail="Listing not found")

@router.delete("/{listing_id}")
def delete_listing(listing_id: str):
    """Deletes listing from Telegram JSON database."""
    try:
        telegram_db.delete_listing(listing_id)
        return {"status": "success", "message": f"Listing {listing_id} deleted successfully"}
    except KeyError:
        raise HTTPException(status_code=404, detail="Listing not found")
