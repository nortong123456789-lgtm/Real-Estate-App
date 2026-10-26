import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.telegram_db import telegram_db
from app.routers import listings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS setup for Next.js / React web dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    logger.info("Starting up zero-database FastAPI server...")
    telegram_db.initialize()
    logger.info("Telegram JSON Database Engine initialized.")

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "database": "Telegram Bot API (Zero External DB)",
        "status": "online",
        "docs": "/docs"
    }

app.include_router(listings.router, prefix=settings.API_V1_STR)
