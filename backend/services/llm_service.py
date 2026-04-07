"""
LLM Service — Google Gemini Flash
- translate_query : 한국어 검색어 → T2I 영어 키워드
- synthesize_prompt_llm : RAG DNA 요소 → 최적 T2I 프롬프트

GOOGLE_API_KEY 환경변수가 없으면 is_available() == False를 반환하고,
prompt_service.py의 rule-based fallback이 대신 동작합니다.
"""
import os
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Gemini 초기화 ─────────────────────────────────────────────────────────────

_model = None


def _get_model():
    global _model
    if _model is not None:
        return _model

    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        _model = genai.GenerativeModel(model_name)
        logger.info(f"Gemini model loaded: {model_name}")
    except Exception as e:
        logger.warning(f"Gemini 초기화 실패: {e}")
        _model = None

    return _model


def is_available() -> bool:
    return _get_model() is not None


# ── 번역 ──────────────────────────────────────────────────────────────────────

_TRANSLATE_SYSTEM = """You are a professional image generation prompt translator.
Convert the Korean design concept to concise English keywords suitable for a text-to-image model.

Rules:
- Output ONLY English keywords, comma-separated (no explanation, no sentences)
- Max 10 keywords
- Focus on visual qualities: mood, texture, light, color temperature, style
- Do NOT include generic words like "image", "photo", "picture"

Example:
Input: "화사하고 봄 느낌으로"
Output: radiant, luminous, spring, fresh, airy, pastel, floral, soft light
"""


async def translate_query(korean_query: str) -> Optional[str]:
    """
    Returns None if LLM unavailable (caller should use rule-based fallback).
    """
    model = _get_model()
    if not model:
        return None

    try:
        response = model.generate_content(
            f"{_TRANSLATE_SYSTEM}\n\nInput: {korean_query}\nOutput:",
            generation_config={"temperature": 0.2, "max_output_tokens": 80},
        )
        result = response.text.strip().strip('"').strip("'")
        return result if result else None
    except Exception as e:
        logger.warning(f"translate_query LLM 실패: {e}")
        return None


# ── 프롬프트 합성 ─────────────────────────────────────────────────────────────

_SYNTHESIZE_SYSTEM = """You are an expert text-to-image prompt engineer for brand commercial photography.

Given:
1. A user's creative concept (translated to English keywords)
2. Retrieved brand image DNA from a vector database (ordered by similarity score, highest first)

Your task: Write a single, optimized text-to-image prompt that:
- Captures the user's intent as the primary directive
- Incorporates brand DNA naturally (mood, lighting, composition, color palette, style keywords)
- Prioritizes DNA from the highest-similarity results (score closer to 1.0 = more weight)
- Resolves conflicting moods by following the highest-scored result
- Includes a scene/subject description extracted from raw_description
- Ends with a --neg section listing what to avoid

Output format (single block, no markdown, no labels):
[scene description], [user concept], [mood] aesthetic, [style keywords], [lighting] lighting, [composition] composition, color palette: [colors in words], [photography type], sharp focus, ultra detailed, 8k resolution
--neg [comma-separated negatives]

Rules:
- ONLY output the prompt, nothing else
- Keep the total positive prompt under 120 words
- Negative prompt: max 12 terms
- Use natural English, not keyword soup
- photography type: choose from (outdoor lifestyle photography / editorial photography / professional studio photography / high-end commercial photography) based on lighting and mood
"""


def _format_dna_context(results: list) -> str:
    """RAG 결과를 LLM 컨텍스트 문자열로 변환."""
    lines = []
    for i, r in enumerate(results[:5]):
        dna = r.style_dna
        lines.append(
            f"[Result {i+1} | similarity: {r.score:.2f}]\n"
            f"  mood: {dna.mood}\n"
            f"  lighting: {dna.lighting}\n"
            f"  composition: {dna.composition}\n"
            f"  style_keywords: {', '.join(dna.style_keywords)}\n"
            f"  color_palette: {', '.join(dna.color_palette)}\n"
            f"  scene: {dna.raw_description.split('.')[0].strip() if dna.raw_description else ''}"
        )
    return "\n\n".join(lines)


async def synthesize_prompt(
    user_concept: str,
    translated_query: str,
    results: list,
) -> Optional[str]:
    """
    RAG DNA + 사용자 의도 → 최적 T2I 프롬프트.
    Returns None if LLM unavailable.
    """
    model = _get_model()
    if not model:
        return None

    if not results:
        try:
            response = model.generate_content(
                f"{_SYNTHESIZE_SYSTEM}\n\n"
                f"User concept (Korean original): {user_concept}\n"
                f"Translated keywords: {translated_query}\n"
                f"Brand DNA: (no brand images available yet)\n\n"
                "Write an optimized prompt:",
                generation_config={"temperature": 0.4, "max_output_tokens": 300},
            )
            return response.text.strip() or None
        except Exception as e:
            logger.warning(f"synthesize_prompt LLM 실패 (no results): {e}")
            return None

    dna_context = _format_dna_context(results)

    user_message = (
        f"User concept (Korean original): {user_concept}\n"
        f"Translated keywords: {translated_query}\n\n"
        f"Retrieved Brand DNA (ordered by similarity):\n{dna_context}\n\n"
        "Write an optimized prompt:"
    )

    try:
        response = model.generate_content(
            f"{_SYNTHESIZE_SYSTEM}\n\n{user_message}",
            generation_config={"temperature": 0.4, "max_output_tokens": 300},
        )
        result = response.text.strip()
        return result if result else None
    except Exception as e:
        logger.warning(f"synthesize_prompt LLM 실패: {e}")
        return None
