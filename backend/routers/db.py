from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional
from models.schemas import StyleDNA
from services.chroma_service import list_all_entries, get_collection

router = APIRouter(prefix="/db", tags=["db"])


class DBEntry(BaseModel):
    image_id: str
    filename: str
    collection_name: str
    embedding_text: str
    style_dna: StyleDNA


class DBStatusResponse(BaseModel):
    total: int
    entries: List[DBEntry]


@router.get("/entries", response_model=DBStatusResponse)
def get_db_entries(collection_name: Optional[str] = Query(None)):
    entries = list_all_entries(collection_name)
    return DBStatusResponse(
        total=len(entries),
        entries=[DBEntry(**e) for e in entries],
    )
