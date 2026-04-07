# Brand Content Agent — 전체 파이프라인 설명

## 개요

브랜드 이미지 컬렉션을 학습시켜 브랜드 고유의 스타일로 새 이미지를 생성하는 AI 에이전트.
크게 4단계로 구성: **이미지 저장 → 검색 → 생성 → 검증**

---

## 전체 흐름도

```
[브랜드 이미지 업로드]
        │
        ▼
┌───────────────────┐
│  1. I2T 분석       │  이미지 → StyleDNA 추출 (Vision LLM)
│  vision_service   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  2. 벡터 DB 저장   │  StyleDNA → 텍스트 → 384차원 벡터
│  chroma_service   │
└────────┬──────────┘
         │
    [사용자 요구사항 입력]
         │
         ▼
┌───────────────────┐
│  3. RAG 검색       │  쿼리 → 유사 DNA top-K 검색
│  chroma_service   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  4. 프롬프트 합성  │  top-K DNA + 요구사항 → T2I 프롬프트
│  prompt_service   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  5. 이미지 생성    │  프롬프트 + 레퍼런스 이미지 → T2I 모델
│  generation_svc   │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  6. 품질 검증      │  원본 vs 생성 이미지 브랜드 일치도 평가
│  quality_service  │
└───────────────────┘
```

---

## 1단계 — 이미지 저장 (I2T + 벡터 DB)

### 1-1. 업로드 & 파일 저장

사용자가 브랜드 이미지를 업로드하면:

```
POST /analyze
  ├── 파일 저장: backend/uploads/{uuid}.jpg
  └── image_url: "/uploads/{uuid}.jpg"  ← ChromaDB 메타데이터에 기록
```

### 1-2. Vision LLM으로 StyleDNA 추출

> **현재: Mock (랜덤값)**
> **실제: Gemini 1.5 Flash Vision** — 이미지를 직접 보고 분석

이미지에서 아래 6가지 속성을 추출:

```python
StyleDNA {
    color_palette:    ["#1A1A2E", "#16213E", "#E94560", ...]  # 주요 색상 HEX
    mood:             "dark and dramatic"                      # 전체 분위기
    lighting:         "soft diffused"                          # 조명 유형
    composition:      "rule of thirds"                         # 구도
    style_keywords:   ["minimalist", "monochrome", ...]        # 스타일 태그
    raw_description:  "스타벅스 제품이 어두운 배경에..."         # 자유 설명
}
```

### 1-3. ChromaDB 벡터 저장

StyleDNA를 하나의 텍스트 문장으로 직렬화한 뒤 임베딩:

```
"mood: dark and dramatic | composition: rule of thirds |
 lighting: soft diffused | colors: #1A1A2E, #16213E, #E94560 |
 style: minimalist, monochrome | [raw_description]"
        │
        ▼  all-MiniLM-L6-v2 (384차원, 코사인 유사도)
        │
[0.023, -0.441, 0.187, ... ]  ← 384개 숫자
```

**ChromaDB에 저장되는 구조:**

```
┌─────────────────────────────────────────────────────┐
│ id:        "550e8400-e29b-41d4-a716-446655440000"   │
│ document:  "mood: dark and dramatic | ..."  ← 임베딩용 │
│ vector:    [0.023, -0.441, 0.187, ...]      ← 384차원 │
│ metadata:  {                                         │
│   filename:         "starbucks_1.jpg"               │
│   collection_name:  "스타벅스"                        │
│   image_url:        "/uploads/550e...jpg"           │
│   style_dna_json:   "{ ... }"  ← 전체 DNA (복원용)   │
│ }                                                    │
└─────────────────────────────────────────────────────┘
```

> **이미지 자체는 벡터로 저장되지 않는다.**
> 이미지 설명 텍스트가 벡터로 변환되고, 원본 이미지 파일은 `uploads/`에 별도 보관.
> 따라서 Vision LLM 분석 품질이 검색 정확도 전체를 결정한다.

---

## 2단계 — 스타일 검색 (RAG)

### 검색 흐름

```
사용자 입력: "산뜻하고 봄 느낌으로"
        │
        ▼
[한국어 → 영어 번역]
  LLM 있으면: Gemini Flash → "fresh, spring, airy, pastel, floral"
  없으면:     Rule-based 사전 → "fresh, airy, clean, spring, pastel"
        │
        ▼
[동일 임베딩 모델로 쿼리 벡터화]
  "fresh, spring, airy, pastel, floral"
  → [0.041, -0.229, 0.334, ...]
        │
        ▼
[ChromaDB 코사인 유사도 검색]
  컬렉션 필터: collection_name = "스타벅스"  (브랜드 격리)
  반환: top-K개 (기본 5개)
        │
        ▼
[유사도 점수 변환]
  score = 1 - cosine_distance  (0~1, 높을수록 유사)
```

### 검색 결과 예시

```
#1  354236_289509_141.jpg  score: 0.82  ← 가장 유사
    mood: vibrant and energetic
    image_url: /uploads/uuid1.jpg

#2  images.jpeg             score: 0.71
    mood: fresh and natural
    image_url: /uploads/uuid2.jpg

#3  images(1).jpeg          score: 0.64
    mood: warm and cozy
    image_url: /uploads/uuid3.jpg
```

---

## 3단계 — 프롬프트 합성

top-K 검색 결과 + 사용자 요구사항을 합쳐 T2I 프롬프트 생성.

### 합성 우선순위

```
1순위: Gemini Flash LLM  (GOOGLE_API_KEY 있을 때)
         ↓ 실패 또는 키 없으면
2순위: Rule-based 합성 (항상 동작하는 fallback)
```

### Rule-based 합성 구조

```
[scene hint from raw_description],    ← 씬 설명 (1순위 이미지 기반)
[번역된 사용자 요구사항],              ← 요구사항
[mood] aesthetic,                      ← 무드 (충돌 시 1순위 기준)
[style_keywords],                      ← 스타일 태그 상위 6개
[lighting] lighting,                   ← 조명 (1순위)
[composition] composition,             ← 구도 (1순위)
color palette: [색상 영어 이름],        ← HEX → "pale soft green" 변환
[photography type],                    ← 조명/무드 기반 자동 선택
sharp focus, ultra detailed, 8k resolution
--neg [mood별 네거티브 + 기본 네거티브]
```

### T2I 모델로 전달되는 것

```
┌────────────────────────────────────────────┐
│ synthesized_prompt: "..."  ← 텍스트 프롬프트 │
│                                            │
│ reference_image_urls: [                    │
│   "/uploads/uuid1.jpg",   ← RAG top-1     │
│   "/uploads/uuid2.jpg",   ← RAG top-2     │
│   "/uploads/uuid3.jpg",   ← RAG top-3     │
│ ]                                          │
└────────────────────────────────────────────┘
```

> 전체 컬렉션 이미지를 다 보내지 않고 **RAG가 선별한 top-K만** 전달.
> 10장 컬렉션이라도 실제로는 가장 관련성 높은 3장만 모델에 전달됨.

---

## 4단계 — 이미지 생성 (T2I)

> **현재: Mock** — 색상 팔레트 기반 bokeh 그라데이션 이미지 반환
> **실제: 외부 T2I 모델 API 호출**

### 실제 모델별 레퍼런스 이미지 활용 방식

| 모델 | 텍스트 프롬프트 | 레퍼런스 이미지 |
|------|--------------|---------------|
| **Midjourney** | `/imagine [prompt]` | `--sref url1 url2` |
| **Stable Diffusion** | `prompt=...` | `init_image=url, strength=0.6` |
| **Gemini Imagen** | `prompt=...` | `reference_images=[...]` |
| **DALL-E 3** | `prompt=...` | 직접 지원 없음 (설명으로 대체) |

---

## 5단계 — Reverse Quality Test (검증)

> **현재: Mock** — 랜덤 점수 반환
> **실제: Vision LLM이 두 이미지를 직접 비교**

### 검증 개념

```
원본 브랜드 이미지    생성된 이미지
       │                   │
       └──── Vision LLM ───┘
                  │
        브랜드 일치도 평가
```

### 평가 항목

| 항목 | 설명 | 가중치 |
|------|------|--------|
| **Color Match** | 색상 팔레트 유사도 | 40% |
| **Style Match** | 무드/분위기 일치도 | 40% |
| **Composition Match** | 구도 유사성 | 20% |
| **Overall** | 가중 평균 | — |

### 판정 기준

```
Overall ≥ 0.80  →  PASS      브랜드 일관성 우수
Overall ≥ 0.65  →  MARGINAL  개선 여지 있음
Overall < 0.65  →  FAIL      재생성 권고
```

### 실제 구현 시 Vision LLM 호출 예시

```python
model.generate_content([
    "두 이미지의 브랜드 스타일 일치도를 0~1로 평가해주세요."
    "Color, Style, Composition 각각 점수를 JSON으로 반환하세요.",
    original_image,
    generated_image,
])
```

---

## 6단계 — 품질 피드백 루프 (Quality Feedback Loop)

품질 검증 결과가 단순 표시에 그치지 않고, **이후 RAG 검색과 프롬프트 재합성에 반영**되는 선순환 구조.

### Lv1 — 품질 이력 기반 RAG 가중치 조정

```
[품질 검증 완료]
       │
       ▼
[Lv1: 사용된 이미지 품질 이력 업데이트]
  used_image_ids의 각 image_id에 대해:
    quality_scores = [...최근 10개 점수]  ← 새 점수 append
    avg_quality_score = 평균              ← ChromaDB 메타데이터 업데이트
       │
       ▼
[다음 RAG 검색 시 가중 점수 적용]
  weighted = cosine_score × (1 + 0.4 × (avg_quality - 0.5))

  예시:
    avg_quality 0.85 (좋음) → cosine 0.70 → weighted 0.77  ↑ 상위
    avg_quality 0.30 (나쁨) → cosine 0.70 → weighted 0.63  ↓ 하위
```

- 품질 점수가 높은 이미지일수록 RAG 결과 상위에 노출
- 반복 사용으로 데이터 쌓일수록 검색 품질이 자동 향상
- 점수 이력은 최근 10개만 유지 (슬라이딩 윈도우)

### Lv2 — FAIL/MARGINAL 시 자동 제외 추천

```
[품질 판정: FAIL or MARGINAL]
       │
       ▼
[Lv2: 최저 품질 기여 이미지 탐지]
  used_image_ids 중 avg_quality_score가 가장 낮은 ID 식별
  최약 차원(color/style/composition) 분석 → improvement_tip 생성
       │
       ▼
[프론트엔드 노란 배너 표시]
  "품질 개선 추천 | 자동 분석"
  improvement_tip: "색상 일치도가 낮습니다. X 이미지를 제외하고 재합성을 시도하세요."
  [추천 적용 후 프롬프트 재합성 →] 버튼
       │
       ▼
[사용자가 버튼 클릭]
  → PromptSynthesizer에서 해당 이미지 자동 "제외" 표시
  → "N개 제외하고 프롬프트 재합성 →" 버튼으로 새 프롬프트 생성
  → 새 이미지 생성 → 새 품질 검증 → 반복
```

### 전체 피드백 루프 구조

```
업로드 → 분석 → 검색 → 프롬프트 합성 → 생성 → [품질 검증]
                  ↑                                      │
                  │         Lv1: avg_quality 업데이트     │
                  └──────────────── (RAG 가중치 반영) ────┘
                                                         │
                                    Lv2: FAIL/MARGINAL   │
                  ┌────────────────────────────────────── ┘
                  ↓
           [제외 추천 → 재합성 → 재생성 → 재검증]
```

---

## Mock vs 실제 구현 현황

| 컴포넌트 | 현재 상태 | 실제 구현 시 |
|---------|----------|------------|
| **Vision I2T** | Mock (랜덤 DNA) | Gemini 1.5 Flash Vision |
| **한국어 번역** | Rule-based 사전 / Gemini Flash | Gemini Flash (키 있으면 자동) |
| **프롬프트 합성** | Rule-based / Gemini Flash | Gemini Flash (키 있으면 자동) |
| **T2I 생성** | Mock (bokeh 그라데이션) | Midjourney / SD / Imagen |
| **품질 검증** | Mock (랜덤 점수) | Gemini Vision 비교 분석 |
| **이미지 저장** | 실제 구현 완료 | — |
| **벡터 DB 저장/검색** | 실제 구현 완료 | — |
| **컬렉션 격리** | 실제 구현 완료 | — |
| **Lv1 품질 이력 가중치** | 실제 구현 완료 | — |
| **Lv2 제외 추천 + 재합성** | 실제 구현 완료 | — |

---

## 환경 변수 설정

```bash
# backend/.env
GOOGLE_API_KEY=your_key_here   # 설정 시 번역/프롬프트 합성이 Gemini로 자동 전환
GEMINI_MODEL=gemini-1.5-flash  # 기본값
```

> `GOOGLE_API_KEY` 설정만으로 번역 + 프롬프트 합성 2단계가 즉시 LLM으로 전환됨.
> Vision I2T와 품질 검증은 별도로 `vision_service.py`, `quality_service.py` 수정 필요.
