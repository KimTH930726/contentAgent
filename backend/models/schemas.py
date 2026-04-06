from pydantic import BaseModel
from typing import List, Optional


class StyleDNA(BaseModel):
    color_palette: List[str]
    mood: str
    composition: str
    lighting: str
    style_keywords: List[str]
    raw_description: str


class AnalyzeResponse(BaseModel):
    image_id: str
    filename: str
    style_dna: StyleDNA
    stored: bool


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


class SearchResult(BaseModel):
    image_id: str
    filename: str
    score: float
    style_dna: StyleDNA
    image_url: Optional[str] = None


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]


# ── Collections ──────────────────────────────────────────────────────────────

class CollectionInfo(BaseModel):
    name: str
    description: str
    entry_count: int
    preview_colors: List[str]   # 대표 색상 (첫 번째 이미지 팔레트)


class CollectionListResponse(BaseModel):
    collections: List[CollectionInfo]


class CreateCollectionRequest(BaseModel):
    name: str
    description: str = ""


# ── T2I Generation ──────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    synthesized_prompt: str
    style_dna: Optional[StyleDNA] = None
    reference_image_urls: List[str] = []


class GenerateResponse(BaseModel):
    generation_id: str
    prompt_used: str
    image_base64: str  # PNG as base64


# ── Reverse Quality Test ────────────────────────────────────────────────────

class QualityCompareRequest(BaseModel):
    original_image_id: str
    generated_image_base64: str


class QualityScore(BaseModel):
    overall: float
    color_match: float
    style_match: float
    composition_match: float
    feedback: str


class QualityCompareResponse(BaseModel):
    quality_score: QualityScore
    passed: bool
