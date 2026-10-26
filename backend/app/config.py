import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Real Estate Telegram-JSON Pipeline"
    API_V1_STR: str = "/api"

    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_TELEGRAM_BOT_TOKEN")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "-100123456789")
    TELEGRAM_LOCAL_API_SERVER: str = os.getenv(
        "TELEGRAM_LOCAL_API_SERVER",
        "http://telegram_bot_api:8081"
    )

    # Path to local disk fallback cache or temporary media storage
    TEMP_MEDIA_DIR: str = os.getenv("TEMP_MEDIA_DIR", "/tmp/realestate_media")
    LOCAL_INDEX_CACHE_PATH: str = os.getenv("LOCAL_INDEX_CACHE_PATH", "/tmp/telegram_listings_index.json")

    class Config:
        case_sensitive = True

settings = Settings()
