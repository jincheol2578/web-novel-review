#!/bin/bash
set -e
cd /home/minipc/.openclaw/workspace/ReviewNovel/ReviewNovel

echo "=== Server Check ==="
HEALTH=$(curl -s http://localhost:4000/health 2>&1) || true
echo "$HEALTH"

if [ "$HEALTH" = "" ] || [[ "$HEALTH" == *"Server Down"* ]]; then
  echo "Server is down, starting..."
  # Kill any existing process on port 4000
  lsof -ti:4000 | xargs kill -9 2>/dev/null || true
  sleep 1
  node backend/server.js &
  sleep 3
  echo "Server started, testing health..."
  HEALTH=$(curl -s http://localhost:4000/health 2>&1) || true
  echo "$HEALTH"
fi

echo ""
echo "=== Ranking API Test ==="
curl -s http://localhost:4000/api/ranking | python3 -m json.tool 2>/dev/null || curl -s http://localhost:4000/api/ranking

echo ""
echo "=== Done ==="
