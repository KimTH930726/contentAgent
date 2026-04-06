#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "========================================="
echo "  Brand Content Agent — Local Dev"
echo "========================================="

# ── 포트 정리 ──────────────────────────────
for port in 8000 3000; do
  pid=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "포트 $port 사용 중인 프로세스 종료 (PID: $pid)"
    kill "$pid" 2>/dev/null || true
    sleep 1
  fi
done

# ── 백엔드 ─────────────────────────────────
echo ""
echo "[1/3] 백엔드 venv 확인..."
if [ ! -d "$BACKEND/.venv" ]; then
  echo "  .venv 없음 → python3.11 venv 생성 + 패키지 설치 중..."
  python3.11 -m venv "$BACKEND/.venv"
  "$BACKEND/.venv/bin/pip" install -r "$BACKEND/requirements.txt" --quiet
  echo "  설치 완료"
else
  echo "  .venv 존재 → 스킵"
fi

echo "[2/3] 샘플 DB 데이터 시드..."
cd "$BACKEND"
.venv/bin/python seed_db.py

echo "[3/3] 백엔드 서버 시작 (포트 8000)..."
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!
sleep 2

# 백엔드 헬스 체크
if curl -s http://127.0.0.1:8000/health > /dev/null 2>&1; then
  echo "  ✓ 백엔드 실행 중 → http://localhost:8000"
  echo "  ✓ API 문서    → http://localhost:8000/docs"
else
  echo "  ✗ 백엔드 시작 실패. 로그 확인 필요."
  exit 1
fi

# ── 프론트엔드 ─────────────────────────────
cd "$FRONTEND"
if [ ! -d "node_modules" ]; then
  echo ""
  echo "node_modules 없음 → npm install 중..."
  npm install --silent
fi

echo ""
echo "프론트엔드 서버 시작 (포트 3000)..."
npm run dev &
FRONTEND_PID=$!
sleep 3

echo ""
echo "========================================="
echo "  실행 완료"
echo "  프론트엔드 → http://localhost:3000"
echo "  백엔드 API  → http://localhost:8000/docs"
echo "========================================="
echo ""
echo "종료하려면 Ctrl+C"

# Ctrl+C 시 두 프로세스 모두 종료
trap "echo ''; echo '서버 종료 중...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
