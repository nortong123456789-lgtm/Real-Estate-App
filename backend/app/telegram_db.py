import os
import json
import time
import requests
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)

class TelegramDBManager:
    """
    Zero-Database Telegram JSON Storage Engine.
    Repurposes Telegram Channel as both media CDN and structured JSON database.
    Strictly follows Telegram Bot API guidelines, rate limits, and sendMediaGroup restrictions.
    Supports local Telegram Bot API server with automatic fallback to official https://api.telegram.org.
    """

    def __init__(self):
        self._index: Dict[str, dict] = {}
        self._pinned_index_msg_id: Optional[int] = None

    def initialize(self):
        """Loads index from Telegram channel or local disk cache on startup."""
        os.makedirs(os.path.dirname(settings.LOCAL_INDEX_CACHE_PATH), exist_ok=True)
        logger.info("Initializing Telegram JSON Database Engine...")

        # 1. Try restoring from local disk cache if available
        if os.path.exists(settings.LOCAL_INDEX_CACHE_PATH):
            try:
                with open(settings.LOCAL_INDEX_CACHE_PATH, "r", encoding="utf-8") as f:
                    self._index = json.load(f)
                logger.info(f"Loaded {len(self._index)} listings from local index cache.")
            except Exception as e:
                logger.warning(f"Failed to read local index cache: {e}")

        # 2. Sync from Telegram Channel pinned message
        self.sync_from_telegram()

    def health_check(self) -> dict:
        """Verifies connection to Telegram Bot API and bot credentials."""
        try:
            bot_info = self._call_telegram_api("getMe")
            return {
                "status": "healthy",
                "bot_username": bot_info.get("username"),
                "can_join_groups": bot_info.get("can_join_groups"),
                "indexed_listings": len(self._index)
            }
        except Exception as e:
            return {
                "status": "degraded",
                "error": str(e),
                "indexed_listings": len(self._index)
            }

    def get_file_download_url(self, telegram_file_id: str) -> Optional[str]:
        """Resolves telegram_file_id into direct download URL from Telegram Bot API Server."""
        try:
            file_info = self._call_telegram_api("getFile", {"file_id": telegram_file_id})
            file_path = file_info.get("file_path")
            if file_path:
                # Strip local container path prefixes if present
                if "/var/lib/telegram-bot-api/" in file_path:
                    file_path = file_path.split("/var/lib/telegram-bot-api/")[-1]
                    if "/" in file_path and ":" in file_path.split("/")[0]:
                        file_path = "/".join(file_path.split("/")[1:])

                return f"https://api.telegram.org/file/bot{settings.TELEGRAM_BOT_TOKEN}/{file_path}"
        except Exception as e:
            logger.error(f"Error resolving file_id {telegram_file_id}: {e}")
        return None

    def _call_telegram_api(self, method: str, data: dict = None, files: dict = None) -> dict:
        """
        Rate-limit aware Telegram Bot API caller with detailed Telegram description error extraction.
        """
        servers = [
            f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}",
            f"{settings.TELEGRAM_LOCAL_API_SERVER}/bot{settings.TELEGRAM_BOT_TOKEN}"
        ]

        unique_servers = []
        for s in servers:
            if s not in unique_servers:
                unique_servers.append(s)

        last_exception = None

        for base_url in unique_servers:
            url = f"{base_url}/{method}"
            for attempt in range(2):
                try:
                    if files:
                        resp = requests.post(url, data=data, files=files, timeout=45)
                    else:
                        resp = requests.post(url, json=data, timeout=15)

                    if resp.status_code == 429:
                        err_data = resp.json()
                        retry_after = err_data.get("parameters", {}).get("retry_after", 5)
                        logger.warning(f"[Rate Limit] Telegram FloodWait hit! Waiting {retry_after}s...")
                        time.sleep(retry_after)
                        continue

                    res_json = resp.json()
                    if resp.ok and res_json.get("ok"):
                        return res_json.get("result", {})
                    else:
                        description = res_json.get("description", f"HTTP {resp.status_code} {resp.text}")
                        logger.error(f"Telegram API {method} Error on {base_url}: {description}")
                        last_exception = RuntimeError(f"{description}")

                except Exception as e:
                    logger.warning(f"Failed to connect to Telegram endpoint {base_url}/{method}: {e}")
                    last_exception = e
                    time.sleep(1)

        raise RuntimeError(f"Telegram API call {method} failed: {last_exception}")

    def sync_from_telegram(self):
        """Fetches channel info to discover pinned master index message."""
        try:
            chat_info = self._call_telegram_api("getChat", {"chat_id": settings.TELEGRAM_CHAT_ID})
            pinned_msg = chat_info.get("pinned_message")

            if pinned_msg:
                self._pinned_index_msg_id = pinned_msg.get("message_id")

                text_content = pinned_msg.get("text") or pinned_msg.get("caption")
                if text_content and (text_content.startswith("{") or text_content.startswith("<b>")):
                    json_str = text_content
                    if "<pre><code>" in text_content:
                        json_str = text_content.split("<pre><code>")[1].split("</code></pre>")[0]
                    self._index = json.loads(json_str)
                    self._save_local_cache()
                    logger.info(f"Synced {len(self._index)} listings from Telegram Pinned Message.")
                    return

                doc = pinned_msg.get("document")
                if doc:
                    file_id = doc.get("file_id")
                    file_info = self._call_telegram_api("getFile", {"file_id": file_id})
                    file_path = file_info.get("file_path")
                    if file_path:
                        download_url = f"https://api.telegram.org/file/bot{settings.TELEGRAM_BOT_TOKEN}/{file_path}"
                        file_resp = requests.get(download_url)
                        if file_resp.ok:
                            self._index = file_resp.json()
                            self._save_local_cache()
                            logger.info(f"Synced {len(self._index)} listings from Telegram Document Index.")
        except Exception as e:
            logger.warning(f"Could not sync index from Telegram channel ({settings.TELEGRAM_CHAT_ID}): {e}")

    def create_instant_draft_stub(self, listing_id: str, file_infos: List[Dict[str, Any]]) -> dict:
        """
        Instantly registers the draft stub in the index so GET /api/listings/drafts
        returns it immediately on the frontend (0 second delay).
        """
        now_str = datetime.utcnow().isoformat()

        initial_media_files = [
            {
                "id": idx + 1,
                "telegram_file_id": None,
                "temp_filename": os.path.basename(item["temp_path"]),
                "file_type": item["file_type"],
                "original_filename": item["original_filename"]
            }
            for idx, item in enumerate(file_infos)
        ]

        listing_record = {
            "id": listing_id,
            "status": "draft",
            "configuration": None,
            "rent_amount": None,
            "neighborhood": None,
            "latitude": None,
            "longitude": None,
            "media_files": initial_media_files,
            "created_at": now_str,
            "updated_at": now_str
        }

        self._index[listing_id] = listing_record
        self._save_local_cache()
        return listing_record

    def process_media_and_update_draft(self, listing_id: str, file_infos: List[Dict[str, Any]]) -> dict:
        """
        Background worker that processes sendMediaGroup, retrieves telegram_file_ids,
        dumps structured JSON into Telegram channel, and updates the master index.
        """
        uploaded_media_files = []

        chunk_size = 10
        chunks = [file_infos[i:i + chunk_size] for i in range(0, len(file_infos), chunk_size)]

        for chunk in chunks:
            media_group = []
            files_dict = {}
            opened_files = []

            for idx, item in enumerate(chunk):
                attach_name = f"media_{idx}"
                f = open(item["temp_path"], "rb")
                opened_files.append(f)
                filename = item["original_filename"] or f"file_{idx}.jpg"
                files_dict[attach_name] = (filename, f, item["file_type"])

                file_type_lower = (item["file_type"] or "").lower()
                filename_lower = filename.lower()

                if "video" in file_type_lower or filename_lower.endswith((".mp4", ".mov", ".mkv", ".avi")):
                    media_type = "video"
                else:
                    media_type = "photo"

                media_group.append({
                    "type": media_type,
                    "media": f"attach://{attach_name}"
                })

            try:
                messages = self._call_telegram_api(
                    "sendMediaGroup",
                    data={
                        "chat_id": settings.TELEGRAM_CHAT_ID,
                        "media": json.dumps(media_group)
                    },
                    files=files_dict
                )

                for f in opened_files:
                    f.close()

                for idx, msg in enumerate(messages):
                    orig_item = chunk[idx]
                    file_id = None
                    if "photo" in msg and msg["photo"]:
                        file_id = msg["photo"][-1]["file_id"]
                    elif "video" in msg and msg["video"]:
                        file_id = msg["video"]["file_id"]

                    uploaded_media_files.append({
                        "id": len(uploaded_media_files) + 1,
                        "telegram_file_id": file_id,
                        "temp_filename": os.path.basename(orig_item["temp_path"]),
                        "file_type": orig_item["file_type"],
                        "original_filename": orig_item["original_filename"]
                    })

            except Exception as e:
                for f in opened_files:
                    f.close()
                logger.error(f"[TELEGRAM ERROR] Could not upload media to Telegram channel {settings.TELEGRAM_CHAT_ID}: {e}")

        # Update Record in Memory
        if listing_id in self._index:
            listing_record = self._index[listing_id]
            if uploaded_media_files:
                listing_record["media_files"] = uploaded_media_files
            listing_record["updated_at"] = datetime.utcnow().isoformat()
        else:
            now_str = datetime.utcnow().isoformat()
            listing_record = {
                "id": listing_id,
                "status": "draft",
                "configuration": None,
                "rent_amount": None,
                "neighborhood": None,
                "latitude": None,
                "longitude": None,
                "media_files": uploaded_media_files,
                "created_at": now_str,
                "updated_at": now_str
            }

        # Post structured JSON message to Telegram Channel in HTML Mode
        try:
            json_payload_str = f"<b>#REAL_ESTATE_DRAFT</b>\n<pre><code>{json.dumps(listing_record, indent=2)}</code></pre>"
            msg_result = self._call_telegram_api(
                "sendMessage",
                data={
                    "chat_id": settings.TELEGRAM_CHAT_ID,
                    "text": json_payload_str,
                    "parse_mode": "HTML"
                }
            )
            listing_record["telegram_message_id"] = msg_result.get("message_id")
        except Exception as e:
            logger.warning(f"[TELEGRAM ERROR] Could not post draft message to Telegram: {e}")

        self._index[listing_id] = listing_record
        self._save_local_cache()

        try:
            self._persist_index()
        except Exception as e:
            logger.warning(f"[TELEGRAM ERROR] Could not persist index to Telegram: {e}")

        return listing_record

    def update_listing(self, listing_id: str, updates: dict) -> dict:
        """Updates listing in Telegram JSON database and updates index."""
        if listing_id not in self._index:
            raise KeyError(f"Listing {listing_id} not found in Telegram database")

        record = self._index[listing_id]

        for key, val in updates.items():
            if val is not None:
                record[key] = val

        record["updated_at"] = datetime.utcnow().isoformat()

        json_payload_str = f"<b>#REAL_ESTATE_UPDATED</b>\n<pre><code>{json.dumps(record, indent=2)}</code></pre>"
        try:
            self._call_telegram_api(
                "sendMessage",
                data={
                    "chat_id": settings.TELEGRAM_CHAT_ID,
                    "text": json_payload_str,
                    "parse_mode": "HTML"
                }
            )
        except Exception as e:
            logger.warning(f"Failed to post update message to Telegram: {e}")

        self._index[listing_id] = record
        self._save_local_cache()

        try:
            self._persist_index()
        except Exception as e:
            logger.warning(f"Could not persist index: {e}")

        return record

    def delete_listing(self, listing_id: str) -> bool:
        """Deletes listing from Telegram JSON database and re-persists index."""
        if listing_id not in self._index:
            raise KeyError(f"Listing {listing_id} not found in Telegram database")

        deleted_record = self._index.pop(listing_id)

        json_payload_str = f"<b>#REAL_ESTATE_DELETED</b>\n<pre><code>{json.dumps({'deleted_id': listing_id}, indent=2)}</code></pre>"
        try:
            self._call_telegram_api(
                "sendMessage",
                data={
                    "chat_id": settings.TELEGRAM_CHAT_ID,
                    "text": json_payload_str,
                    "parse_mode": "HTML"
                }
            )
        except Exception as e:
            logger.warning(f"Failed to post delete notice to Telegram: {e}")

        self._save_local_cache()

        try:
            self._persist_index()
        except Exception as e:
            logger.warning(f"Could not persist index: {e}")

        return True

    def get_drafts(self) -> List[dict]:
        return [l for l in self._index.values() if l.get("status") == "draft"]

    def get_active(self) -> List[dict]:
        return [l for l in self._index.values() if l.get("status") == "active"]

    def get_by_id(self, listing_id: str) -> Optional[dict]:
        return self._index.get(listing_id)

    def _persist_index(self):
        """Persists master index to local cache file and Telegram Pinned Message."""
        self._save_local_cache()

        index_json_str = json.dumps(self._index)

        try:
            if len(index_json_str) < 3900:
                html_index_str = f"<b>#MASTER_INDEX</b>\n<pre><code>{index_json_str}</code></pre>"
                if self._pinned_index_msg_id:
                    try:
                        self._call_telegram_api(
                            "editMessageText",
                            data={
                                "chat_id": settings.TELEGRAM_CHAT_ID,
                                "message_id": self._pinned_index_msg_id,
                                "text": html_index_str,
                                "parse_mode": "HTML"
                            }
                        )
                        return
                    except Exception:
                        pass

                msg = self._call_telegram_api(
                    "sendMessage",
                    data={
                        "chat_id": settings.TELEGRAM_CHAT_ID,
                        "text": html_index_str,
                        "parse_mode": "HTML"
                    }
                )
                new_msg_id = msg.get("message_id")
                self._pinned_index_msg_id = new_msg_id
                self._call_telegram_api(
                    "pinChatMessage",
                    data={
                        "chat_id": settings.TELEGRAM_CHAT_ID,
                        "message_id": new_msg_id,
                        "disable_notification": True
                    }
                )
            else:
                temp_index_file = "/tmp/index.json"
                with open(temp_index_file, "w", encoding="utf-8") as f:
                    f.write(index_json_str)

                with open(temp_index_file, "rb") as f:
                    doc_msg = self._call_telegram_api(
                        "sendDocument",
                        data={
                            "chat_id": settings.TELEGRAM_CHAT_ID,
                            "caption": "#MASTER_INDEX_DOCUMENT"
                        },
                        files={"document": f}
                    )
                new_msg_id = doc_msg.get("message_id")
                self._pinned_index_msg_id = new_msg_id
                self._call_telegram_api(
                    "pinChatMessage",
                    data={
                        "chat_id": settings.TELEGRAM_CHAT_ID,
                        "message_id": new_msg_id,
                        "disable_notification": True
                    }
                )
        except Exception as e:
            logger.error(f"Failed to persist index to Telegram: {e}")

    def _save_local_cache(self):
        try:
            with open(settings.LOCAL_INDEX_CACHE_PATH, "w", encoding="utf-8") as f:
                json.dump(self._index, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not write local cache: {e}")

# Singleton instance
telegram_db = TelegramDBManager()
