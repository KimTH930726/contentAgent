"""
Prompt Synthesis Service

우선순위:
  1. LLM (Gemini Flash) — GOOGLE_API_KEY 환경변수가 있을 때
  2. Rule-based fallback — API key 없거나 LLM 호출 실패 시
"""
import colorsys
from models.schemas import SearchResult

# ── Rule-based 번역 사전 (LLM fallback) ─────────────────────────────────────

KO_TO_EN: dict[str, list[str]] = {
    # 밝기/분위기
    "화사한": ["radiant", "luminous", "bright", "glowing", "airy"],
    "화사하고": ["radiant", "luminous", "bright", "glowing"],
    "화사": ["radiant", "luminous", "bright", "glowing"],
    "산뜻": ["fresh", "airy", "clean", "light"],
    "산뜻한": ["fresh", "airy", "clean", "light"],
    "청량한": ["cool", "crisp", "refreshing", "airy", "clear"],
    "청량": ["cool", "crisp", "refreshing", "airy"],
    "밝은": ["bright", "light", "airy", "cheerful"],
    "밝고": ["bright", "light", "airy"],
    "어두운": ["dark", "moody", "dramatic", "deep"],
    "어둡고": ["dark", "moody", "dramatic"],
    "다크": ["dark", "moody", "dramatic"],
    # 고급/세련
    "고급": ["premium", "luxury", "elegant", "sophisticated"],
    "고급스러운": ["premium", "luxury", "elegant", "sophisticated"],
    "고급스럽고": ["premium", "luxury", "elegant"],
    "세련된": ["sophisticated", "minimal", "editorial", "clean"],
    "세련": ["sophisticated", "minimal", "editorial"],
    "럭셔리": ["luxury", "premium", "opulent", "refined"],
    # 따뜻함
    "따뜻": ["warm", "cozy", "golden", "soft"],
    "따뜻한": ["warm", "cozy", "golden", "soft"],
    "따뜻하고": ["warm", "cozy", "golden"],
    "아늑한": ["cozy", "intimate", "warm", "soft"],
    "아늑": ["cozy", "intimate", "warm"],
    # 자연/유기
    "자연": ["natural", "organic", "earthy", "botanical"],
    "자연스러운": ["natural", "organic", "earthy", "botanical"],
    "편안한": ["relaxed", "casual", "natural", "comfortable"],
    "편안": ["relaxed", "casual", "natural"],
    # 역동/활기
    "활기": ["vibrant", "energetic", "dynamic", "bold"],
    "활기찬": ["vibrant", "energetic", "dynamic", "bold"],
    "역동적인": ["dynamic", "energetic", "bold", "powerful"],
    # 귀엽고/발랄
    "귀여운": ["cute", "playful", "pastel", "soft"],
    "발랄한": ["playful", "cheerful", "lively", "fresh"],
    # 심플/미니멀
    "미니멀": ["minimal", "clean", "simple", "geometric"],
    "미니멀한": ["minimal", "clean", "simple"],
    "깔끔한": ["clean", "neat", "crisp", "minimal"],
    "깔끔": ["clean", "neat", "crisp"],
    "모던한": ["modern", "contemporary", "sleek", "minimal"],
    "모던": ["modern", "contemporary", "sleek"],
    # 빈티지
    "빈티지": ["vintage", "retro", "nostalgic", "film"],
    "레트로": ["retro", "vintage", "nostalgic"],
    # 계절
    "봄": ["spring", "fresh", "pastel", "floral", "light"],
    "여름": ["summer", "bright", "vibrant", "warm"],
    "가을": ["autumn", "warm", "earthy", "golden"],
    "겨울": ["winter", "cool", "crisp", "minimal"],
    # 불용어
    "느낌": [], "으로": [], "한": [], "의": [], "이": [],
    "이미지": [], "사진": [], "스타일": [], "느낌으로": [],
}


def _rule_translate(korean_query: str) -> str:
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


def translate_query(korean_query: str) -> str:
    """동기 래퍼 — rule-based. 비동기 LLM 번역은 synthesize_prompt 내부에서 처리."""
    return _rule_translate(korean_query)


# ── 색상 이름 변환 ───────────────────────────────────────────────────────────

def _hex_to_hsl(hex_color: str) -> tuple[float, float, float]:
    hex_color = hex_color.lstrip("#")
    if len(hex_color) != 6:
        return (0, 0, 0.5)
    r, g, b = (int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, s, l


def _hue_name(h: float) -> str:
    if h < 15:  return "red"
    if h < 40:  return "orange"
    if h < 70:  return "yellow"
    if h < 80:  return "yellow-green"
    if h < 150: return "green"
    if h < 195: return "teal"
    if h < 255: return "blue"
    if h < 285: return "purple"
    if h < 330: return "pink"
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


# ── Rule-based 프롬프트 합성 (fallback) ─────────────────────────────────────

MOOD_NEGATIVES: dict[str, list[str]] = {
    "dark":    ["overexposed", "washed out", "bright", "cheerful"],
    "luxury":  ["cheap", "cluttered", "casual", "low quality"],
    "fresh":   ["dark", "gloomy", "saturated", "harsh"],
    "natural": ["artificial", "plastic", "neon", "industrial"],
    "vibrant": ["dull", "monotone", "desaturated", "flat"],
    "minimal": ["busy", "cluttered", "decorative", "ornate"],
    "warm":    ["cold", "blue tones", "sterile", "clinical"],
    "radiant": ["dark", "gloomy", "murky", "harsh"],
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


def _infer_quality_tags(lighting: str, mood: str) -> str:
    lighting_lower = lighting.lower()
    mood_lower = mood.lower()
    if any(w in lighting_lower for w in ["natural", "outdoor", "sunlight", "golden hour"]):
        setting = "outdoor lifestyle photography"
    elif any(w in lighting_lower for w in ["studio", "strobe", "softbox"]):
        setting = "professional studio photography"
    else:
        setting = "high-end commercial photography"
    if any(w in mood_lower for w in ["dark", "moody", "dramatic"]):
        return f"{setting}, dramatic lighting, sharp focus, ultra detailed, 8k resolution"
    return f"{setting}, sharp focus, ultra detailed, 8k resolution"


def _deduplicate_moods(results: list[SearchResult]) -> list[str]:
    """유사도 1위 mood 기준으로 충돌 무드 제거."""
    if not results:
        return []
    CONFLICTING: list[tuple[set[str], set[str]]] = [
        ({"dark", "moody", "dramatic"}, {"bright", "fresh", "airy", "cheerful", "radiant"}),
        ({"warm", "golden"},            {"cool", "crisp", "cold"}),
        ({"minimal", "clean"},          {"vibrant", "bold", "decorative", "ornate"}),
    ]
    top_mood = results[0].style_dna.mood.lower()
    kept: list[str] = [results[0].style_dna.mood]
    for r in results[1:]:
        candidate = r.style_dna.mood.lower()
        conflict = False
        for group_a, group_b in CONFLICTING:
            top_in_a = any(w in top_mood for w in group_a)
            top_in_b = any(w in top_mood for w in group_b)
            cand_in_a = any(w in candidate for w in group_a)
            cand_in_b = any(w in candidate for w in group_b)
            if (top_in_a and cand_in_b) or (top_in_b and cand_in_a):
                conflict = True
                break
        if not conflict and candidate not in [m.lower() for m in kept]:
            kept.append(r.style_dna.mood)
    return kept[:2]


def _rule_synthesize(translated: str, results: list[SearchResult]) -> str:
    """Rule-based 프롬프트 합성 (LLM 없을 때 사용)."""
    if not results:
        return (
            f"{translated}, professional photography, high quality, "
            "brand consistent, ultra detailed, 8k resolution\n"
            f"--neg {', '.join(BASE_NEGATIVES)}"
        )

    sorted_results = sorted(results, key=lambda r: r.score, reverse=True)
    top  = sorted_results[:3]
    best = top[0]

    moods        = _deduplicate_moods(top)
    lighting     = best.style_dna.lighting
    composition  = best.style_dna.composition

    all_keywords: list[str] = []
    all_colors:   list[str] = []
    for r in top:
        all_keywords.extend(r.style_dna.style_keywords)
        all_colors.extend(r.style_dna.color_palette[:3])

    unique_keywords = list(dict.fromkeys(all_keywords))[:6]
    color_names     = list(dict.fromkeys(hex_to_color_name(c) for c in all_colors))[:5]

    raw        = best.style_dna.raw_description.strip()
    scene_hint = raw.split(".")[0].strip() if raw else ""

    subject_line   = f"{scene_hint}, {translated}" if scene_hint else translated
    style_line     = f"{', '.join(moods)} aesthetic, {', '.join(unique_keywords)}"
    technical_line = f"{lighting} lighting, {composition} composition"
    color_line     = f"color palette: {', '.join(color_names)}"
    quality_line   = _infer_quality_tags(lighting, moods[0] if moods else "")
    negative_line  = f"--neg {_build_negative(moods)}"

    main_prompt = ", ".join([subject_line, style_line, technical_line, color_line, quality_line])
    return f"{main_prompt}\n{negative_line}"


# ── 메인 합성 함수 ────────────────────────────────────────────────────────────

async def synthesize_prompt(user_input: str, results: list[SearchResult]) -> str:
    """
    1순위: LLM (Gemini Flash) — 번역 + 프롬프트 합성 모두 LLM으로
    2순위: Rule-based fallback (API key 없거나 LLM 실패 시)
    """
    from services import llm_service

    if llm_service.is_available():
        # 1. LLM 번역
        translated_llm = await llm_service.translate_query(user_input)
        translated = translated_llm or _rule_translate(user_input)

        # 2. LLM 프롬프트 합성
        llm_result = await llm_service.synthesize_prompt(user_input, translated, results)
        if llm_result:
            return llm_result

    # Fallback: rule-based
    translated = _rule_translate(user_input)
    return _rule_synthesize(translated, results)
