from fastapi import APIRouter
from models.schemas import QualityCompareRequest, QualityCompareResponse
from services.quality_service import compare_quality

router = APIRouter(prefix="/quality", tags=["quality"])


@router.post("/compare", response_model=QualityCompareResponse)
async def quality_compare(request: QualityCompareRequest):
    score = await compare_quality(request.original_image_id, request.generated_image_base64)
    return QualityCompareResponse(
        quality_score=score,
        passed=score.overall >= 0.70,
    )
