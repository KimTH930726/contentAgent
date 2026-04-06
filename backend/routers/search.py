from fastapi import APIRouter, HTTPException
from models.schemas import SearchRequest, SearchResponse
from services.chroma_service import search_style_dna

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def search_styles(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="검색어를 입력해주세요.")

    if request.top_k < 1 or request.top_k > 20:
        raise HTTPException(status_code=400, detail="top_k는 1~20 사이여야 합니다.")

    results = search_style_dna(request.query, request.top_k)

    return SearchResponse(
        query=request.query,
        results=results,
    )
