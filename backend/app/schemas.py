from pydantic import BaseModel
from typing import List, Optional

class MediaDumpResponse(BaseModel):
    id: str
    status: str
    media_count: int
    message: str

class MediaFileSchema(BaseModel):
    id: int
    telegram_file_id: Optional[str] = None
    temp_filename: Optional[str] = None
    file_type: str
    original_filename: Optional[str] = None

class ListingResponse(BaseModel):
    id: str
    status: str
    configuration: Optional[str] = None
    rent_amount: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    admin_notes: Optional[str] = None
    media_files: List[MediaFileSchema] = []
    created_at: str

class ListingUpdate(BaseModel):
    configuration: Optional[str] = None
    rent_amount: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    admin_notes: Optional[str] = None
    status: Optional[str] = "active"
