from fastapi import APIRouter
from models.schemas import QualityCompareRequest, QualityCompareResponse
from services.quality_service import compare_quality
from services.chroma_service import update_quality_score, get_collection
import json

router = APIRouter(prefix="/quality", tags=["quality"])

PASS_THRESHOLD     = 0.80
MARGINAL_THRESHOLD = 0.65


def _suggest_exclusions(used_image_ids: list[str], score) -> tuple[list[str], str]:
    """
    Lv2: FAIL/MARGINAL 시 제외할 image_id 추천.
    - 품질 이력이 가장 낮은 항목을 우선 추천
    - 이력 없으면 마지막 항목(유사도 최하위) 추천
    """
    if not used_image_ids:
        return [], ""

    collection = get_collection()
    existing = collection.get(ids=used_image_ids, include=["metadatas"])
    if not existing["ids"]:
        return [], ""

    # 각 항목의 avg_quality_score 조회
    id_to_quality: dict[str, float] = {}
    for i, img_id in enumerate(existing["ids"]):
        meta = existing["metadatas"][i]
        id_to_quality[img_id] = float(meta.get("avg_quality_score", 0.5))

    # 품질 최하위 항목
    worst_id = min(id_to_quality, key=lambda k: id_to_quality[k])
    worst_score = id_to_quality[worst_id]

    # 실패 차원 분석
    scores = {
        "color":       score.color_match,
        "style":       score.style_match,
        "composition": score.composition_match,
    }
    weakest_dim = min(scores, key=scores.get)
    dim_labels = {"color": "색상", "style": "스타일", "composition": "구도"}

    tip = (
        f"{dim_labels[weakest_dim]} 일치도가 가장 낮습니다 ({int(scores[weakest_dim]*100)}%). "
        f"품질 이력이 낮은 이미지를 제외하고 재합성하면 개선될 수 있습니다."
    )

    # 품질 이력이 0.5 이하인 항목만 추천 (이력 없으면 0.5가 기본값이라 마지막 항목)
    suggest = [worst_id] if worst_score <= 0.5 else [used_image_ids[-1]]
    return suggest, tip


@router.post("/compare", response_model=QualityCompareResponse)
async def quality_compare(request: QualityCompareRequest):
    score = await compare_quality(request.original_image_id, request.generated_image_base64)
    overall = score.overall

    # Lv1: 사용된 모든 DNA 항목에 품질 점수 누적
    for image_id in request.used_image_ids:
        update_quality_score(image_id, overall)

    # Lv2: FAIL/MARGINAL 시 제외 추천
    suggested_exclude_ids: list[str] = []
    improvement_tip = ""
    if overall < PASS_THRESHOLD and request.used_image_ids:
        suggested_exclude_ids, improvement_tip = _suggest_exclusions(
            request.used_image_ids, score
        )

    return QualityCompareResponse(
        quality_score=score,
        passed=overall >= PASS_THRESHOLD,
        suggested_exclude_ids=suggested_exclude_ids,
        improvement_tip=improvement_tip,
    )
