"""
Mock Prompt Synthesis Service
실제 구현 시 Gemini Flash Text API로 교체하세요.
"""
from models.schemas import SearchResult

# 한국어 → 영어 키워드 번역 사전
# 실제 구현 시 이 함수를 LLM 번역 호출로 교체
KO_TO_EN: dict[str, list[str]] = {
    # 분위기
    "산뜻": ["fresh", "airy", "clean", "light"],
    "산뜻한": ["fresh", "airy", "clean", "light"],
    "고급": ["premium", "luxury", "elegant", "sophisticated"],
    "고급스러운": ["premium", "luxury", "elegant", "sophisticated"],
    "따뜻": ["warm", "cozy", "golden", "soft"],
    "따뜻한": ["warm", "cozy", "golden", "soft"],
    "자연": ["natural", "organic", "earthy", "botanical"],
    "자연스러운": ["natural", "organic", "earthy", "botanical"],
    "활기": ["vibrant", "energetic", "dynamic", "bold"],
    "활기찬": ["vibrant", "energetic", "dynamic", "bold"],
    "어두운": ["dark", "moody", "dramatic", "deep"],
    "다크": ["dark", "moody", "dramatic"],
    "밝은": ["bright", "light", "airy", "cheerful"],
    "귀여운": ["cute", "playful", "pastel", "soft"],
    "세련된": ["sophisticated", "minimal", "editorial", "clean"],
    "미니멀": ["minimal", "clean", "simple", "geometric"],
    "빈티지": ["vintage", "retro", "nostalgic", "film"],
    "봄": ["spring", "fresh", "pastel", "floral", "light"],
    "여름": ["summer", "bright", "vibrant", "warm"],
    "가을": ["autumn", "warm", "earthy", "golden"],
    "겨울": ["winter", "cool", "crisp", "minimal"],
    "느낌": [],        # 조사류 — 번역 불필요
    "으로": [],
    "한": [],
}


def translate_query(korean_query: str) -> str:
    """
    한국어 쿼리를 영어 키워드로 변환합니다.

    실제 구현:
        import google.generativeai as genai
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"Translate to English keywords for image search: '{korean_query}'"
        )
        return response.text.strip()
    """
    import re
    tokens = re.split(r"[\s,./]+", korean_query.strip())
    en_keywords: list[str] = []

    for token in tokens:
        lower = token.lower()
        if lower in KO_TO_EN:
            en_keywords.extend(KO_TO_EN[lower])
        elif token.isascii():
            # 이미 영어면 그대로
            en_keywords.append(token)
        # 미등록 한국어는 원문 유지 (모델이 어느 정도 처리 가능)

    translated = ", ".join(dict.fromkeys(en_keywords)) if en_keywords else korean_query
    return translated


async def synthesize_prompt(user_input: str, results: list[SearchResult]) -> str:
    """
    사용자 입력 + 검색된 브랜드 DNA → 최종 프롬프트 합성

    실제 구현:
        import google.generativeai as genai
        model = genai.GenerativeModel("gemini-1.5-flash")
        context = format_dna_context(results)
        response = model.generate_content(
            f"Brand DNA context:\n{context}\n\nUser request: {user_input}\n"
            "Generate a detailed English image generation prompt:"
        )
        return response.text
    """
    translated_input = translate_query(user_input)

    if not results:
        return f"{translated_input}, high quality, brand consistent, professional"

    top = results[:3]

    all_keywords: list[str] = []
    all_moods: list[str] = []
    color_palettes: list[str] = []
    lightings: list[str] = []

    for r in top:
        all_keywords.extend(r.style_dna.style_keywords)
        all_moods.append(r.style_dna.mood)
        color_palettes.extend(r.style_dna.color_palette[:2])
        lightings.append(r.style_dna.lighting)

    unique_keywords = list(dict.fromkeys(all_keywords))[:5]
    unique_moods = list(dict.fromkeys(all_moods))[:2]
    unique_lightings = list(dict.fromkeys(lightings))[:1]

    parts = [
        translated_input,
        ", ".join(unique_moods),
        ", ".join(unique_keywords),
        f"{unique_lightings[0]} lighting" if unique_lightings else "",
        f"dominant colors: {', '.join(color_palettes[:4])}",
        "brand consistent, ultra detailed, professional photography, 8k",
    ]

    return ", ".join(p for p in parts if p)
