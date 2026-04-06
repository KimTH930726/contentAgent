import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from models.schemas import AnalyzeResponse
from services.vision_service import extract_style_dna
from services.chroma_service import store_style_dna

router = APIRouter(prefix="/analyze", tags=["analyze"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 10


@router.post("", response_model=AnalyzeResponse)
async def analyze_image(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 파일 형식입니다: {file.content_type}")

    image_bytes = await file.read()

    if len(image_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"파일 크기는 {MAX_SIZE_MB}MB 이하여야 합니다.")

    image_id = str(uuid.uuid4())
    style_dna = await extract_style_dna(image_bytes, file.filename)
    store_style_dna(image_id, file.filename, style_dna)

    return AnalyzeResponse(
        image_id=image_id,
        filename=file.filename,
        style_dna=style_dna,
        stored=True,
    )
