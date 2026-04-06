import uuid
import os
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from models.schemas import AnalyzeResponse
from services.vision_service import extract_style_dna
from services.chroma_service import store_style_dna

router = APIRouter(prefix="/analyze", tags=["analyze"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 10
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

EXT_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


@router.post("", response_model=AnalyzeResponse)
async def analyze_image(
    file: UploadFile = File(...),
    collection_name: str = Form("default"),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 파일 형식: {file.content_type}")

    image_bytes = await file.read()
    if len(image_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"파일 크기는 {MAX_SIZE_MB}MB 이하여야 합니다.")

    image_id = str(uuid.uuid4())

    # Save image to uploads/
    ext = EXT_MAP.get(file.content_type, ".jpg")
    save_path = UPLOAD_DIR / f"{image_id}{ext}"
    save_path.write_bytes(image_bytes)
    image_url = f"/uploads/{image_id}{ext}"

    style_dna = await extract_style_dna(image_bytes, file.filename)
    store_style_dna(image_id, file.filename, style_dna, collection_name, image_url=image_url)

    return AnalyzeResponse(
        image_id=image_id,
        filename=file.filename,
        style_dna=style_dna,
        stored=True,
    )
