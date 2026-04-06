"""
ChromaDB 샘플 데이터 시드 스크립트
테스트용 브랜드 DNA를 미리 주입합니다.
"""
import sys
import uuid

sys.path.insert(0, ".")

from models.schemas import StyleDNA
from services.chroma_service import store_style_dna, get_collection

SAMPLE_DATA = [
    {
        "filename": "brand_spring_campaign.jpg",
        "style_dna": StyleDNA(
            color_palette=["#F8C8D4", "#A8D8B9", "#FFF9F0", "#E8A0B0"],
            mood="fresh and airy",
            composition="rule of thirds",
            lighting="soft natural daylight",
            style_keywords=["pastel", "minimal", "spring", "clean", "organic"],
            raw_description="Light pastel tones with soft natural lighting. Clean minimal composition evoking freshness.",
        ),
    },
    {
        "filename": "brand_premium_dark.jpg",
        "style_dna": StyleDNA(
            color_palette=["#1A1A2E", "#16213E", "#E94560", "#FFFFFF"],
            mood="dark and luxurious",
            composition="centered symmetry",
            lighting="dramatic studio",
            style_keywords=["premium", "bold", "high-contrast", "luxury", "editorial"],
            raw_description="Dark moody palette with dramatic studio lighting. High-contrast editorial feel.",
        ),
    },
    {
        "filename": "brand_nature_eco.jpg",
        "style_dna": StyleDNA(
            color_palette=["#2D6A4F", "#74C69D", "#D8F3DC", "#1B4332"],
            mood="calm and natural",
            composition="golden ratio",
            lighting="soft diffused outdoor",
            style_keywords=["eco", "natural", "earthy", "sustainable", "serene"],
            raw_description="Deep greens with soft outdoor lighting. Earthy organic feel with golden ratio framing.",
        ),
    },
    {
        "filename": "brand_vibrant_youth.jpg",
        "style_dna": StyleDNA(
            color_palette=["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF"],
            mood="vibrant and energetic",
            composition="diagonal leading lines",
            lighting="bright even",
            style_keywords=["colorful", "dynamic", "youthful", "playful", "bold"],
            raw_description="Vibrant multi-color palette with even bright lighting. Energetic diagonal composition.",
        ),
    },
    {
        "filename": "brand_warm_lifestyle.jpg",
        "style_dna": StyleDNA(
            color_palette=["#D4A574", "#C17F4A", "#FFF8F0", "#8B4513"],
            mood="warm and cozy",
            composition="asymmetric balance",
            lighting="golden hour warm",
            style_keywords=["warm", "cozy", "rustic", "lifestyle", "authentic"],
            raw_description="Warm golden tones with soft sunset lighting. Cozy lifestyle feel with relaxed composition.",
        ),
    },
]


def seed():
    collection = get_collection()
    existing = collection.count()
    if existing > 0:
        print(f"이미 {existing}개의 데이터가 있습니다. 스킵.")
        return

    for item in SAMPLE_DATA:
        image_id = str(uuid.uuid4())
        store_style_dna(image_id, item["filename"], item["style_dna"])
        print(f"  ✓ {item['filename']} 저장 완료")

    print(f"\n총 {len(SAMPLE_DATA)}개 샘플 데이터 주입 완료.")
    print("이제 '산뜻한', '고급스러운', '자연스러운' 등으로 RAG 검색을 테스트해보세요.")


if __name__ == "__main__":
    seed()
