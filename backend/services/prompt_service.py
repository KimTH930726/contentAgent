"""
Prompt Synthesis Service
실제 구현 시 Gemini Flash Text API로 교체하세요.
"""
import colorsys
from models.schemas import SearchResult

# ── 한국어 → 영어 번역 ───────────────────────────────────────────────────────

KO_TO_EN: dict[str, list[str]] = {
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
    "느낌": [], "으로": [], "한": [], "의": [], "이": [],
}


def translate_query(korean_query: str) -> str:
    """
    실제 구현:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"Translate to concise English keywords for image generation: '{korean_query}'"
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
        elif token.isascii() and token:
            en_keywords.append(token)
    return ", ".join(dict.fromkeys(en_keywords)) if en_keywords else korean_query


# ── 색상 이름 변환 ───────────────────────────────────────────────────────────

def _hex_to_hsl(hex_color: str) -> tuple[float, float, float]:
    hex_color = hex_color.lstrip("#")
    if len(hex_color) != 6:
        return (0, 0, 0.5)
    r, g, b = (int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, s, l


def _hue_name(h: float) -> str:
    if h < 15:   return "red"
    if h < 40:   return "orange"
    if h < 70:   return "yellow"
    if h < 80:   return "yellow-green"
    if h < 150:  return "green"
    if h < 195:  return "teal"
    if h < 255:  return "blue"
    if h < 285:  return "purple"
    if h < 330:  return "pink"
    return "red"


def hex_to_color_name(hex_color: str) -> str:
    h, s, l = _hex_to_hsl(hex_color)
    if s < 0.08:
        if l > 0.85: return "white"
        if l > 0.6:  return "light gray"
        if l > 0.3:  return "gray"
        return "charcoal"
    lightness = (
        "pale" if l > 0.82 else
        "light" if l > 0.65 else
        "soft" if l > 0.50 else
        "medium" if l > 0.35 else
        "deep" if l > 0.20 else
        "dark"
    )
    saturation = "muted " if s < 0.25 else "rich " if s > 0.75 else ""
    return f"{lightness} {saturation}{_hue_name(h)}"


# ── 프롬프트 합성 ────────────────────────────────────────────────────────────

# 무드별 negative prompt 사전
MOOD_NEGATIVES: dict[str, list[str]] = {
    "dark":      ["overexposed", "washed out", "bright", "cheerful"],
    "luxury":    ["cheap", "cluttered", "casual", "low quality"],
    "fresh":     ["dark", "gloomy", "saturated", "harsh"],
    "natural":   ["artificial", "plastic", "neon", "industrial"],
    "vibrant":   ["dull", "monotone", "desaturated", "flat"],
    "minimal":   ["busy", "cluttered", "decorative", "ornate"],
    "warm":      ["cold", "blue tones", "sterile", "clinical"],
}

BASE_NEGATIVES = [
    "low quality", "blurry", "pixelated", "jpeg artifacts",
    "watermark", "text overlay", "logo", "overexposed",
    "bad composition", "amateur photography",
]


def _build_negative(moods: list[str]) -> str:
    extra: list[str] = []
    for mood in moods:
        for key, negs in MOOD_NEGATIVES.items():
            if key in mood.lower():
                extra.extend(negs)
    all_negs = list(dict.fromkeys(BASE_NEGATIVES + extra))
    return ", ".join(all_negs[:12])


async def synthesize_prompt(user_input: str, results: list[SearchResult]) -> str:
    """
    실제 구현:
        context = format_dna_context(results)
        response = model.generate_content(
            f"Brand DNA:\n{context}\n\nUser request: {user_input}\n"
            "Write a detailed, structured image generation prompt in English. "
            "Include: scene description, style, lighting, composition, color palette (in words), "
            "technical specs. End with --neg [negative prompts]"
        )
        return response.text
    """
    translated = translate_query(user_input)

    if not results:
        return (
            f"{translated}, professional photography, high quality, "
            "brand consistent, ultra detailed, 8k resolution\n"
            f"--neg {', '.join(BASE_NEGATIVES)}"
        )

    top = results[:3]

    # DNA 수집
    moods       = list(dict.fromkeys(r.style_dna.mood        for r in top))
    lightings   = list(dict.fromkeys(r.style_dna.lighting    for r in top))
    compositions= list(dict.fromkeys(r.style_dna.composition for r in top))
    all_keywords: list[str] = []
    all_colors:   list[str] = []
    for r in top:
        all_keywords.extend(r.style_dna.style_keywords)
        all_colors.extend(r.style_dna.color_palette[:3])

    unique_keywords = list(dict.fromkeys(all_keywords))[:6]
    color_names     = list(dict.fromkeys(hex_to_color_name(c) for c in all_colors))[:5]

    # ── 구조화된 프롬프트 조립 ──
    # 1. 주제/요청
    subject_line = translated

    # 2. 스타일 & 무드
    style_line = f"{', '.join(moods)} aesthetic, {', '.join(unique_keywords)}"

    # 3. 조명 & 구도
    technical_line = f"{lightings[0]} lighting, {compositions[0]} composition"

    # 4. 색상 팔레트 (영어 이름)
    color_line = f"color palette: {', '.join(color_names)}"

    # 5. 기술 품질 태그
    quality_line = (
        "high-end commercial photography, sharp focus, "
        "ultra detailed, professional studio, 8k resolution"
    )

    # 6. Negative prompt
    negative_line = f"--neg {_build_negative(moods)}"

    main_prompt = ", ".join([
        subject_line, style_line, technical_line,
        color_line, quality_line,
    ])

    return f"{main_prompt}\n{negative_line}"
