#!/bin/bash
echo "서버 종료 중..."

for port in 8000 3000; do
  pid=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null && echo "  ✓ 포트 $port 종료 (PID: $pid)"
  else
    echo "  - 포트 $port: 실행 중 아님"
  fi
done

echo "완료."
