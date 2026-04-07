import uuid
from fastapi import APIRouter
from models.schemas import GenerateRequest, GenerateResponse
from services.generation_service import generate_mock_image

router = APIRouter(prefix="/generate", tags=["generate"])


@router.post("", response_model=GenerateResponse)
async def generate_image(request: GenerateRequest):
    image_base64 = await generate_mock_image(request.synthesized_prompt, request.style_dna)
    return GenerateResponse(
        generation_id=str(uuid.uuid4()),
        prompt_used=request.synthesized_prompt,
        image_base64=image_base64,
        used_image_ids=request.used_image_ids,
    )
