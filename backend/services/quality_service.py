"""
Mock Reverse Quality Test Service
실제 구현 시 Gemini Vision으로 두 이미지의 스타일 유사도를 비교하세요.
"""
import random
from models.schemas import QualityScore


async def compare_quality(original_image_id: str, generated_image_base64: str) -> QualityScore:
    """
    원본 이미지와 생성된 이미지의 브랜드 일치도를 평가합니다.

    실제 구현:
        import google.generativeai as genai
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content([
            "Compare brand consistency between these two images. Score 0-1:",
            original_image, generated_image
        ])
        return parse_scores(response.text)
    """
    color_match = round(random.uniform(0.70, 0.95), 3)
    style_match = round(random.uniform(0.65, 0.92), 3)
    composition_match = round(random.uniform(0.60, 0.88), 3)
    overall = round((color_match * 0.4 + style_match * 0.4 + composition_match * 0.2), 3)

    feedbacks = [
        "브랜드 색상 일치도 우수. 분위기 재현 양호.",
        "스타일 키워드 반영률 높음. 구도 유사도 개선 여지 있음.",
        "색조 일치. 조명 표현이 원본에 근접함.",
        "전반적으로 브랜드 DNA가 잘 반영된 결과물.",
    ]

    return QualityScore(
        overall=overall,
        color_match=color_match,
        style_match=style_match,
        composition_match=composition_match,
        feedback=random.choice(feedbacks),
    )
