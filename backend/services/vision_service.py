"""
Mock Vision Service
실제 구현 시 Gemini Flash Vision API 호출로 교체하세요.
"""
import random
from models.schemas import StyleDNA


# 실제 구현 시 아래 함수 내부를 Gemini API 호출로 교체
async def extract_style_dna(image_bytes: bytes, filename: str) -> StyleDNA:
    """
    이미지에서 스타일 DNA를 추출합니다.

    실제 구현:
        import google.generativeai as genai
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content([prompt, image])
        return parse_response(response.text)
    """
    mock_palettes = [
        ["#1A1A2E", "#16213E", "#0F3460", "#E94560"],
        ["#F5F5F5", "#E8E8E8", "#D4A574", "#8B4513"],
        ["#2D6A4F", "#40916C", "#74C69D", "#B7E4C7"],
        ["#FF6B6B", "#FFA07A", "#FFD700", "#98FB98"],
    ]
    mock_moods = ["dark and dramatic", "warm and cozy", "fresh and natural", "vibrant and energetic"]
    mock_compositions = ["rule of thirds", "centered symmetry", "diagonal leading lines", "golden ratio"]
    mock_lightings = ["soft diffused", "hard directional", "golden hour", "studio flat"]
    mock_keywords = [
        ["minimalist", "monochrome", "high contrast", "geometric"],
        ["rustic", "vintage", "textured", "warm tones"],
        ["organic", "earthy", "serene", "botanical"],
        ["bold", "playful", "colorful", "dynamic"],
    ]

    idx = random.randint(0, 3)

    return StyleDNA(
        color_palette=mock_palettes[idx],
        mood=mock_moods[idx],
        composition=mock_compositions[idx],
        lighting=mock_lightings[idx],
        style_keywords=mock_keywords[idx],
        raw_description=f"[MOCK] Image '{filename}' analyzed. Style: {mock_moods[idx]}, "
                        f"Composition: {mock_compositions[idx]}, Lighting: {mock_lightings[idx]}.",
    )
