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
    """StyleDNA를 ChromaDB 임베딩용 텍스트로 변환"""
    parts = [
        f"mood: {style_dna.mood}",
        f"composition: {style_dna.composition}",
        f"lighting: {style_dna.lighting}",
        f"colors: {', '.join(style_dna.color_palette)}",
        f"style: {', '.join(style_dna.style_keywords)}",
        style_dna.raw_description,
    ]
    return " | ".join(parts)


def store_style_dna(image_id: str, filename: str, style_dna: StyleDNA) -> None:
    collection = get_collection()
    collection.upsert(
        ids=[image_id],
        documents=[style_dna_to_embedding_text(style_dna)],
        metadatas=[{
            "filename": filename,
            "style_dna_json": json.dumps(style_dna.model_dump()),
        }],
    )


def list_all_entries() -> list[dict]:
    """저장된 모든 DNA 엔트리와 임베딩 텍스트 반환"""
    collection = get_collection()
    count = collection.count()
    if count == 0:
        return []

    result = collection.get(include=["documents", "metadatas"])
    entries = []
    for i, doc_id in enumerate(result["ids"]):
        metadata = result["metadatas"][i]
        style_dna = StyleDNA(**json.loads(metadata["style_dna_json"]))
        entries.append({
            "image_id": doc_id,
            "filename": metadata["filename"],
            "embedding_text": result["documents"][i],
            "style_dna": style_dna,
        })
    return entries


def search_style_dna(query: str, top_k: int = 5) -> list[SearchResult]:
    collection = get_collection()
    count = collection.count()
    if count == 0:
        return []

    results = collection.query(
        query_texts=[query],
        n_results=min(top_k, count),
    )

    search_results = []
    for i, doc_id in enumerate(results["ids"][0]):
        metadata = results["metadatas"][0][i]
        distance = results["distances"][0][i]
        score = round(1 - distance, 4)  # cosine distance → similarity score

        style_dna = StyleDNA(**json.loads(metadata["style_dna_json"]))
        search_results.append(SearchResult(
            image_id=doc_id,
            filename=metadata["filename"],
            score=score,
            style_dna=style_dna,
        ))

    return search_results
