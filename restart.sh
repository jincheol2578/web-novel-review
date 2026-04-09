#!/bin/bash
echo "=== ReviewNovel 재시작 스크립트 ==="

# 1. 기존 프로세스 종료
echo "1. 기존 프로세스 종료 중..."
pkill -f "node server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "node.*ReviewNovel" 2>/dev/null
sleep 2
echo "   → 종료완료"

# 2. 백엔드 시작
echo "2. 백엔드 시작 중..."
cd /home/minipc/.openclaw/workspace/ReviewNovel/ReviewNovel/backend
nohup node server.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
sleep 3
echo "   → 백엔드 PID: $BACKEND_PID"

# 3. 백엔드 헬스체크
echo "3. 백엔드 헬스체크..."
curl -s http://localhost:4000/health
echo ""

# 4. 프론트엔드 시작
echo "4. 프론트엔드 시작 중..."
cd /home/minipc/.openclaw/workspace/ReviewNovel/ReviewNovel/frontend
nohup npx vite --port 5173 --host > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 5
echo "   → 프론트엔드 PID: $FRONTEND_PID"

# 5. 프론트엔드 체크
echo "5. 프론트엔드 체크..."
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:5173
echo ""

echo ""
echo "=== 재시작 완료 ==="
echo "Backend:  http://localhost:4000"
echo "Frontend: http://localhost:5173"
