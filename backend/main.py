from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from routers import analyze, search, prompt, generate, quality, db, collections

app = FastAPI(
    title="Brand Style DNA Agent",
    description="이미지 스타일 DNA 추출 및 검색 API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(search.router)
app.include_router(prompt.router)
app.include_router(generate.router)
app.include_router(quality.router)
app.include_router(db.router)
app.include_router(collections.router)

# Serve uploaded images
uploads_dir = Path(__file__).parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}
