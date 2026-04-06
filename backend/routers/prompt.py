from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from models.schemas import SearchResponse
from services.chroma_service import search_style_dna
from services.prompt_service import synthesize_prompt, translate_query

router = APIRouter(prefix="/prompt", tags=["prompt"])


class PromptGenerateRequest(BaseModel):
    user_input: str
    top_k: int = 5
    collection_name: Optional[str] = None


class PromptGenerateResponse(BaseModel):
    user_input: str
    translated_query: str
    retrieved: SearchResponse
    synthesized_prompt: str


@router.post("/generate", response_model=PromptGenerateResponse)
async def generate_prompt(request: PromptGenerateRequest):
    if not request.user_input.strip():
        raise HTTPException(status_code=400, detail="입력값을 입력해주세요.")

    translated = translate_query(request.user_input)
    results = search_style_dna(translated, request.top_k, request.collection_name)
    final_prompt = await synthesize_prompt(request.user_input, results)

    from models.schemas import SearchResponse
    return PromptGenerateResponse(
        user_input=request.user_input,
        translated_query=translated,
        retrieved=SearchResponse(query=translated, results=results),
        synthesized_prompt=final_prompt,
    )
