import json
from typing import Optional
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
    image_url: Optional[str] = None,
) -> None:
    collection = get_collection()
    metadata: dict = {
        "filename": filename,
        "collection_name": collection_name,
        "style_dna_json": json.dumps(style_dna.model_dump()),
    }
    if image_url:
        metadata["image_url"] = image_url
    collection.upsert(
        ids=[image_id],
        documents=[style_dna_to_embedding_text(style_dna)],
        metadatas=[metadata],
    )


def search_style_dna(
    query: str,
    top_k: int = 5,
    collection_name: Optional[str] = None,
) -> list:
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
        cosine_score = round(1 - distance, 4)

        # Lv1: 품질 이력 가중치 적용 (avg_quality_score 0~1, 가중치 ±40%)
        avg_quality = float(metadata.get("avg_quality_score", 0.5))
        weighted = round(cosine_score * (1 + 0.4 * (avg_quality - 0.5)), 4)

        style_dna = StyleDNA(**json.loads(metadata["style_dna_json"]))
        search_results.append(SearchResult(
            image_id=doc_id,
            filename=metadata["filename"],
            score=weighted,
            style_dna=style_dna,
            image_url=metadata.get("image_url"),
        ))

    # 품질 가중치 반영 후 재정렬
    search_results.sort(key=lambda r: r.score, reverse=True)
    return search_results


def list_all_entries(collection_name: Optional[str] = None) -> list:
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
            "image_url": metadata.get("image_url"),
        })
    return entries


def get_collections_summary() -> list:
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


def update_quality_score(image_id: str, score: float) -> None:
    """품질 평가 결과를 누적 저장 (최근 10회 평균 유지)."""
    collection = get_collection()
    existing = collection.get(ids=[image_id], include=["metadatas"])
    if not existing["ids"]:
        return
    metadata = existing["metadatas"][0]
    scores = json.loads(metadata.get("quality_scores", "[]"))
    scores.append(round(score, 3))
    scores = scores[-10:]  # 최근 10회만 유지
    avg = round(sum(scores) / len(scores), 3)
    metadata["quality_scores"] = json.dumps(scores)
    metadata["avg_quality_score"] = avg
    collection.update(ids=[image_id], metadatas=[metadata])


def delete_entry(image_id: str) -> bool:
    collection = get_collection()
    existing = collection.get(ids=[image_id], include=[])
    if not existing["ids"]:
        return False
    collection.delete(ids=[image_id])
    return True


def delete_collection_entries(collection_name: str) -> int:
    collection = get_collection()
    existing = collection.get(where={"collection_name": collection_name}, include=[])
    ids = existing["ids"]
    if ids:
        collection.delete(ids=ids)
    return len(ids)
