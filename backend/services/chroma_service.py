import json
import chromadb
from chromadb.config import Settings
from models.schemas import StyleDNA, SearchResult

_client = None
_collection = None

COLLECTION_NAME = "brand_style_dna"


def get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(
            path="./chroma_db",
            settings=Settings(anonymized_telemetry=False),
        )
        _collection = _client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def style_dna_to_embedding_text(style_dna: StyleDNA) -> str:
    parts = [
        f"mood: {style_dna.mood}",
        f"composition: {style_dna.composition}",
        f"lighting: {style_dna.lighting}",
        f"colors: {', '.join(style_dna.color_palette)}",
        f"style: {', '.join(style_dna.style_keywords)}",
        style_dna.raw_description,
    ]
    return " | ".join(parts)


def store_style_dna(
    image_id: str,
    filename: str,
    style_dna: StyleDNA,
    collection_name: str = "default",
) -> None:
    collection = get_collection()
    collection.upsert(
        ids=[image_id],
        documents=[style_dna_to_embedding_text(style_dna)],
        metadatas=[{
            "filename": filename,
            "collection_name": collection_name,
            "style_dna_json": json.dumps(style_dna.model_dump()),
        }],
    )


def search_style_dna(
    query: str,
    top_k: int = 5,
    collection_name: str | None = None,
) -> list[SearchResult]:
    collection = get_collection()
    count = collection.count()
    if count == 0:
        return []

    where = {"collection_name": collection_name} if collection_name else None

    # collection_name 필터 적용 시 해당 컬렉션 내 항목 수 확인
    if where:
        filtered = collection.get(where=where, include=[])
        available = len(filtered["ids"])
        if available == 0:
            return []
        n_results = min(top_k, available)
    else:
        n_results = min(top_k, count)

    kwargs = dict(query_texts=[query], n_results=n_results)
    if where:
        kwargs["where"] = where

    results = collection.query(**kwargs)

    search_results = []
    for i, doc_id in enumerate(results["ids"][0]):
        metadata = results["metadatas"][0][i]
        distance = results["distances"][0][i]
        score = round(1 - distance, 4)
        style_dna = StyleDNA(**json.loads(metadata["style_dna_json"]))
        search_results.append(SearchResult(
            image_id=doc_id,
            filename=metadata["filename"],
            score=score,
            style_dna=style_dna,
        ))
    return search_results


def list_all_entries(collection_name: str | None = None) -> list[dict]:
    collection = get_collection()
    if collection.count() == 0:
        return []

    where = {"collection_name": collection_name} if collection_name else None
    kwargs = dict(include=["documents", "metadatas"])
    if where:
        kwargs["where"] = where

    result = collection.get(**kwargs)
    entries = []
    for i, doc_id in enumerate(result["ids"]):
        metadata = result["metadatas"][i]
        style_dna = StyleDNA(**json.loads(metadata["style_dna_json"]))
        entries.append({
            "image_id": doc_id,
            "filename": metadata["filename"],
            "collection_name": metadata.get("collection_name", "default"),
            "embedding_text": result["documents"][i],
            "style_dna": style_dna,
        })
    return entries


def get_collections_summary() -> list[dict]:
    """컬렉션별 통계 및 대표 색상 반환"""
    entries = list_all_entries()
    summary: dict[str, dict] = {}
    for e in entries:
        cn = e["collection_name"]
        if cn not in summary:
            summary[cn] = {"count": 0, "preview_colors": []}
        summary[cn]["count"] += 1
        if len(summary[cn]["preview_colors"]) == 0:
            summary[cn]["preview_colors"] = e["style_dna"].color_palette[:4]
    return [{"name": k, **v} for k, v in summary.items()]


def delete_collection_entries(collection_name: str) -> int:
    collection = get_collection()
    existing = collection.get(where={"collection_name": collection_name}, include=[])
    ids = existing["ids"]
    if ids:
        collection.delete(ids=ids)
    return len(ids)
