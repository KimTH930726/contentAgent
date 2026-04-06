# Brand Content Agent — Architecture & Overview

## 프로젝트 개요

브랜드 전용 이미지 자산을 분석하고, 브랜드 일관성이 유지된 이미지를 생성하는 **AI 파이프라인 PoC**.

핵심 아이디어: **"개떡같은 요청 → 브랜드 표준 데이터(RAG) → 찰떡같은 프롬프트 → 브랜드 이미지"**

기존 브랜드 이미지들을 학습 데이터로 삼아, 신규 이미지 생성 시 자동으로 브랜드 톤앤매너를 유지시킨다.

---

## 시스템 흐름도

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BRAND CONTENT AGENT                          │
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐   │
│  │  Brand Image │     │   I2T Engine  │     │   ChromaDB (RAG) │   │
│  │   Upload     │────▶│  Vision LLM  │────▶│  Vector Store    │   │
│  │  (기존 자산)  │     │  스타일 DNA   │     │  Style DNA 누적  │   │
│  └──────────────┘     │  추출         │     └────────┬─────────┘   │
│                       └──────────────┘              │              │
│                                                      │ 유사 DNA 검색 │
│  ┌──────────────┐     ┌──────────────┐     ┌────────▼─────────┐   │
│  │  User Input  │     │   Prompt     │     │   RAG Retrieval  │   │
│  │  자연어 요청  │────▶│  Synthesizer │◀────│  Top-K 유사 DNA  │   │
│  │  "산뜻하게"  │     │  최종 프롬프트│     │  코사인 유사도    │   │
│  └──────────────┘     │  합성         │     └──────────────────┘   │
│                       └──────┬───────┘                             │
│                              │ 정교화된 프롬프트                    │
│                       ┌──────▼───────┐                             │
│                       │  T2I Engine  │                             │
│                       │  이미지 생성  │                             │
│                       └──────┬───────┘                             │
│                              │                                     │
│                       ┌──────▼───────┐     ┌──────────────────┐   │
│                       │  Generated   │     │  Reverse Quality │   │
│                       │  Image       │────▶│  Test            │   │
│                       │              │     │  원본 vs 생성 비교 │   │
│                       └──────────────┘     └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4단계 파이프라인

```
Phase 1          Phase 2          Phase 3          Phase 4
─────────        ─────────        ─────────        ─────────
Image to Text    Brand RAG        Text to Image    Quality Test
                                                   (Reverse Loop)

브랜드 이미지    사용자 자연어     정교화된         생성 이미지
   ↓            요청 입력         프롬프트로           ↓
Vision LLM       ↓               T2I 모델        I2T로 재분석
   ↓          ChromaDB           이미지 생성         ↓
스타일 DNA      유사도 검색            ↓          원본과 DNA
추출 & 저장      ↓               결과 이미지      유사도 비교
            프롬프트 합성                          ↓
                                             품질 스코어
                                             Pass / Fail
```

---

## 아키텍처

```
contentAgent/
│
├── backend/                        # FastAPI (Python 3.11)
│   ├── main.py                     # 앱 진입점, CORS 설정
│   │
│   ├── models/
│   │   └── schemas.py              # Pydantic 타입 정의
│   │
│   ├── routers/                    # API 엔드포인트 레이어
│   │   ├── analyze.py              # POST /analyze       ← I2T
│   │   ├── search.py               # POST /search        ← RAG 검색
│   │   ├── prompt.py               # POST /prompt/generate ← 합성
│   │   ├── generate.py             # POST /generate      ← T2I
│   │   └── quality.py              # POST /quality/compare ← 검증
│   │
│   ├── services/                   # 비즈니스 로직 레이어
│   │   ├── vision_service.py       # I2T: 이미지 → 스타일 DNA
│   │   ├── chroma_service.py       # ChromaDB CRUD + 벡터 검색
│   │   ├── prompt_service.py       # RAG 결과 → 프롬프트 합성
│   │   ├── generation_service.py   # T2I: 프롬프트 → 이미지
│   │   └── quality_service.py      # 원본 vs 생성 유사도 평가
│   │
│   ├── chroma_db/                  # 로컬 벡터 DB (gitignore)
│   ├── seed_db.py                  # 테스트용 샘플 데이터 주입
│   └── requirements.txt
│
├── frontend/                       # Next.js 14 (App Router)
│   ├── app/
│   │   ├── layout.tsx              # 전역 레이아웃, 폰트
│   │   ├── page.tsx                # 메인 페이지 (상태 관리 허브)
│   │   └── globals.css             # Liquid Glass 베이스 스타일
│   │
│   ├── components/
│   │   ├── GlassCard.tsx           # 재사용 반투명 카드 컴포넌트
│   │   ├── ImageUploader.tsx       # 드래그&드롭 + 파티클 Morphing
│   │   ├── StyleDNACard.tsx        # DNA 시각화 (색상/무드/키워드)
│   │   ├── PromptSynthesizer.tsx   # RAG 검색 + GSAP 그라데이션 보더
│   │   ├── GeneratedImageCard.tsx  # T2I 결과 + 스캔라인 reveal
│   │   ├── QualityTestPanel.tsx    # 원본/생성 비교 + GSAP 점수 바
│   │   └── AgentTimeline.tsx       # 파이프라인 진행 로그
│   │
│   └── lib/
│       └── api.ts                  # 백엔드 API 클라이언트
│
├── start.sh                        # 백/프론트 동시 기동
├── stop.sh                         # 서버 종료
├── cleanup.sh                      # 설치 패키지 전체 삭제
├── .gitignore
└── ARCHITECTURE.md                 # 이 파일
```

---

## 기술 스택

| 레이어 | 기술 | 역할 |
|--------|------|------|
| Frontend | Next.js 14 (App Router) | UI 프레임워크 |
| Frontend | Tailwind CSS | Liquid Glass 스타일링 |
| Frontend | Framer Motion | 파티클 Morphing, 스태거 애니메이션 |
| Frontend | GSAP | 그라데이션 보더 회전, 점수 바 |
| Backend | FastAPI (Python 3.11) | REST API 서버 |
| Backend | ChromaDB | 로컬 벡터 DB (코사인 유사도) |
| Backend | all-MiniLM-L6-v2 | 텍스트 임베딩 모델 (ChromaDB 내장) |
| Backend | Pillow | T2I mock 이미지 생성 |
| AI (예정) | Gemini Flash | I2T Vision 분석 + 프롬프트 합성 |
| AI (예정) | Nano Banana 2 | T2I 이미지 생성 |

---

## API 엔드포인트

```
POST /analyze
  body: multipart/form-data { file: Image }
  → 이미지 분석 후 StyleDNA 추출 & ChromaDB 저장

POST /search
  body: { query: str, top_k: int }
  → 자연어 쿼리로 유사 StyleDNA 벡터 검색

POST /prompt/generate
  body: { user_input: str, top_k: int }
  → RAG 검색 + 최종 프롬프트 합성

POST /generate
  body: { synthesized_prompt: str, style_dna?: StyleDNA }
  → T2I 이미지 생성 (base64 PNG 반환)

POST /quality/compare
  body: { original_image_id: str, generated_image_base64: str }
  → 원본 vs 생성 이미지 브랜드 일치도 평가

GET /health
  → 서버 상태 확인

GET /docs
  → Swagger UI (개발 환경)
```

---

## StyleDNA 데이터 구조

```json
{
  "color_palette": ["#F8C8D4", "#A8D8B9", "#FFF9F0"],
  "mood": "fresh and airy",
  "composition": "rule of thirds",
  "lighting": "soft natural daylight",
  "style_keywords": ["pastel", "minimal", "spring", "clean"],
  "raw_description": "Light pastel tones with soft natural lighting..."
}
```

ChromaDB에는 이 DNA를 텍스트로 직렬화한 뒤 `all-MiniLM-L6-v2`로 임베딩하여 저장.
검색 시 사용자 자연어도 동일 모델로 임베딩 후 코사인 유사도로 Top-K 반환.

---

## 실행

```bash
./start.sh    # 백엔드(8000) + 프론트엔드(3000) 동시 기동
./stop.sh     # 서버 종료
./cleanup.sh  # 설치 패키지 전체 삭제
```

---

## Mock → Real LLM 교체 포인트

| 파일 | 함수 | 교체 내용 |
|------|------|-----------|
| `services/vision_service.py` | `extract_style_dna()` | Gemini Flash Vision API |
| `services/prompt_service.py` | `synthesize_prompt()` | Gemini Flash Text API |
| `services/generation_service.py` | `generate_mock_image()` | Nano Banana 2 / DALL-E / SD API |
| `services/quality_service.py` | `compare_quality()` | Gemini Flash Vision 비교 |

---

## 확장 로드맵

```
현재 (PoC)                향후 확장 가능
──────────                ─────────────────────────────────────
정적 이미지 I2T    →      동영상 프레임 추출 (Veo)
단일 프롬프트      →      멀티모달 프롬프트 체인
수동 업로드        →      브랜드 에셋 서버 자동 크롤링 & 인덱싱
로컬 ChromaDB     →      클라우드 벡터 DB (Pinecone / Weaviate)
Mock T2I          →      파인튜닝된 브랜드 전용 T2I 모델
단순 비교          →      CLIP 기반 브랜드 일치도 정량 평가
```
