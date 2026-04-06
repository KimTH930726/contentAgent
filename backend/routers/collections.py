from fastapi import APIRouter, HTTPException
from models.schemas import CollectionInfo, CollectionListResponse, CreateCollectionRequest
from services.chroma_service import get_collections_summary, delete_collection_entries
from services.collection_service import (
    create_collection, get_description, delete_collection_meta, list_collection_names,
)

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("", response_model=CollectionListResponse)
def list_collections():
    # ChromaDB에 저장된 컬렉션 요약
    db_summary = {c["name"]: c for c in get_collections_summary()}
    # 메타파일에 등록된 컬렉션 (이미지 없어도 표시)
    meta_names = list_collection_names()

    all_names = list(dict.fromkeys(list(db_summary.keys()) + meta_names))
    collections = []
    for name in all_names:
        db = db_summary.get(name, {})
        collections.append(CollectionInfo(
            name=name,
            description=get_description(name),
            entry_count=db.get("count", 0),
            preview_colors=db.get("preview_colors", []),
        ))
    return CollectionListResponse(collections=collections)


@router.post("", response_model=CollectionInfo)
def create(req: CreateCollectionRequest):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="컬렉션 이름을 입력해주세요.")
    create_collection(req.name.strip(), req.description)
    return CollectionInfo(
        name=req.name.strip(),
        description=req.description,
        entry_count=0,
        preview_colors=[],
    )


@router.delete("/{name}")
def delete_collection(name: str):
    deleted = delete_collection_entries(name)
    delete_collection_meta(name)
    return {"deleted_entries": deleted, "collection": name}
