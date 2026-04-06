from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from models.schemas import StyleDNA
from services.chroma_service import list_all_entries, get_collection, delete_entry

router = APIRouter(prefix="/db", tags=["db"])


class DBEntry(BaseModel):
    image_id: str
    filename: str
    collection_name: str
    embedding_text: str
    style_dna: StyleDNA
    image_url: Optional[str] = None


class DBStatusResponse(BaseModel):
    total: int
    entries: List[DBEntry]


@router.delete("/entries/{image_id}")
def delete_db_entry(image_id: str):
    deleted = delete_entry(image_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
    return {"deleted": image_id}


@router.get("/entries", response_model=DBStatusResponse)
def get_db_entries(collection_name: Optional[str] = Query(None)):
    entries = list_all_entries(collection_name)
    return DBStatusResponse(
        total=len(entries),
        entries=[DBEntry(**e) for e in entries],
    )
