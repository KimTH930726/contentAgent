"""
컬렉션 메타데이터 관리 (이름, 설명)
실제 DNA 데이터는 ChromaDB에 collection_name 메타데이터로 저장됨
"""
import json
import os
from typing import Optional

META_FILE = os.path.join(os.path.dirname(__file__), "..", "collections_meta.json")


def _load() -> dict:
    if os.path.exists(META_FILE):
        with open(META_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save(data: dict) -> None:
    with open(META_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def create_collection(name: str, description: str = "") -> None:
    data = _load()
    if name not in data:
        data[name] = {"description": description}
        _save(data)


def get_description(name: str) -> str:
    return _load().get(name, {}).get("description", "")


def delete_collection_meta(name: str) -> None:
    data = _load()
    data.pop(name, None)
    _save(data)


def list_collection_names() -> list[str]:
    return list(_load().keys())
