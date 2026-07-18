#!/usr/bin/env bash

# Exit on absolute failures
set -e

echo "============================================="
echo "   CEX MONOREPO PRODUCTION LAUNCHER"
echo "============================================="

# 1. Build all workspaces cleanly
echo "Compiling all workspaces cleanly..."
npx pnpm build

# 2. Kill any existing processes on ports 3000 (backend) and 4173 (frontend preview)
echo "Checking for active services on ports 3000 or 4173..."
if command -v lsof >/dev/null 2>&1; then
  PID_3000=$(lsof -t -i:3000 || true)
  if [ -n "$PID_3000" ]; then
    echo "Killing existing process on port 3000 (PIDs: $PID_3000)..."
    kill -9 $PID_3000 2>/dev/null || true
  fi
  PID_4173=$(lsof -t -i:4173 || true)
  if [ -n "$PID_4173" ]; then
    echo "Killing existing process on port 4173 (PIDs: $PID_4173)..."
    kill -9 $PID_4173 2>/dev/null || true
  fi
else
  # Fallback using fuser
  if command -v fuser >/dev/null 2>&1; then
    fuser -k 3000/tcp >/dev/null 2>&1 || true
    fuser -k 4173/tcp >/dev/null 2>&1 || true
  fi
fi

# 3. Boot production tasks in the background with environment isolation
echo "Starting Production Backend service..."
NODE_ENV=production npx pnpm --filter @cex/backend start > backend-prod.log 2>&1 &
BACKEND_PID=$!

echo "Starting Production Engine service..."
NODE_ENV=production npx pnpm --filter @cex/engine start > engine-prod.log 2>&1 &
ENGINE_PID=$!

echo "Starting Production Frontend service (Vite Preview)..."
npx pnpm --filter @cex/frontend preview --host 127.0.0.1 --port 4173 > frontend-prod.log 2>&1 &
FRONTEND_PID=$!

# Function to clean up background processes on script exit
cleanup() {
  echo ""
  echo "Shutting down all production services..."
  kill $BACKEND_PID $ENGINE_PID $FRONTEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# 4. Poll backend health check
echo "Waiting for Production Backend to become healthy at http://localhost:3000/api/v1/health..."
MAX_ATTEMPTS=30
ATTEMPT=1
HEALTHY=0

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  if curl -s -f http://localhost:3000/api/v1/health >/dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  sleep 1
  ATTEMPT=$((ATTEMPT + 1))
done

if [ $HEALTHY -eq 1 ]; then
  echo "--------------------------------------------------------"
  echo "Production Services Started Successfully!"
  echo " - Backend & WebSocket: http://localhost:3000"
  echo " - Matching Engine: Active"
  echo " - Frontend (Production Build): http://localhost:4173"
  echo "--------------------------------------------------------"
  echo "Opening browser to production dashboard..."
  
  if command -v xdg-open > /dev/null 2>&1; then
    xdg-open http://localhost:4173 > /dev/null 2>&1 &
  elif command -v sensible-browser > /dev/null 2>&1; then
    sensible-browser http://localhost:4173 > /dev/null 2>&1 &
  else
    echo "Please open your browser at http://localhost:4173"
  fi
else
  echo "ERROR: Production Backend failed to start or pass health check after 30 seconds."
  echo "Please check backend environment variables or check logs manually."
  cleanup
fi

# Keep script running to show logs/errors if needed, or simply wait
echo "Press Ctrl+C to terminate all services."
wait
