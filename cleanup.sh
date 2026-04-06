#!/bin/bash
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "========================================="
echo "  Brand Content Agent — Cleanup"
echo "========================================="
echo ""
echo "다음 항목을 삭제합니다:"
echo "  - backend/.venv"
echo "  - backend/chroma_db"
echo "  - backend/__pycache__ 및 *.pyc"
echo "  - frontend/node_modules"
echo "  - frontend/.next"
echo ""
read -r -p "계속하시겠습니까? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "취소됨."
  exit 0
fi

echo ""

remove() {
  if [ -e "$1" ]; then
    rm -rf "$1"
    echo "  ✓ 삭제: $1"
  else
    echo "  - 없음: $1"
  fi
}

# 포트 정리
for port in 8000 3000; do
  pid=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null && echo "  ✓ 포트 $port 프로세스 종료"
  fi
done

remove "$ROOT/backend/.venv"
remove "$ROOT/backend/chroma_db"
remove "$ROOT/backend/.python-version"

# __pycache__ 재귀 삭제
find "$ROOT/backend" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null && echo "  ✓ __pycache__ 정리"
find "$ROOT/backend" -name "*.pyc" -delete 2>/dev/null

remove "$ROOT/frontend/node_modules"
remove "$ROOT/frontend/.next"

echo ""
echo "정리 완료."
echo "다시 실행하려면: ./start.sh"
