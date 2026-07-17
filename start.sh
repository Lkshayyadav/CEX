#!/usr/bin/env bash

# Exit on absolute failures
set -e

echo "============================================="
echo "   CEX MONOREPO SYSTEM BOOTSTRAPPER"
echo "============================================="

# 1. Kill any existing processes on port 3000 and 5173
echo "Checking for active services on ports 3000 or 5173..."
if command -v lsof >/dev/null 2>&1; then
  PID_3000=$(lsof -t -i:3000)
  if [ -n "$PID_3000" ]; then
    echo "Killing existing process on port 3000 (PIDs: $PID_3000)..."
    kill -9 $PID_3000 2>/dev/null || true
  fi
  PID_5173=$(lsof -t -i:5173)
  if [ -n "$PID_5173" ]; then
    echo "Killing existing process on port 5173 (PIDs: $PID_5173)..."
    kill -9 $PID_5173 2>/dev/null || true
  fi
else
  # Fallback using fuser
  if command -v fuser >/dev/null 2>&1; then
    fuser -k 3000/tcp >/dev/null 2>&1 || true
    fuser -k 5173/tcp >/dev/null 2>&1 || true
  fi
fi

# Ensure Postgres and Redis are running
echo "Checking infrastructure services..."
if ! command -v redis-cli >/dev/null 2>&1 || ! redis-cli ping >/dev/null 2>&1; then
  echo "WARNING: Redis does not seem to be running on localhost:6379."
  echo "Please ensure Redis is started before running this script."
fi

# Check Postgres status
if command -v pg_isready >/dev/null 2>&1; then
  if ! pg_isready >/dev/null 2>&1; then
    echo "WARNING: PostgreSQL is not responding on standard ports."
  fi
fi

# 2. Boot processes in the background
echo "Starting Backend service..."
npx pnpm --filter @cex/backend dev > /dev/null 2>&1 &
BACKEND_PID=$!

echo "Starting Engine service..."
npx pnpm --filter @cex/engine dev > /dev/null 2>&1 &
ENGINE_PID=$!

echo "Starting Frontend service..."
npx pnpm --filter @cex/frontend dev > /dev/null 2>&1 &
FRONTEND_PID=$!

# Function to clean up background processes on script exit
cleanup() {
  echo ""
  echo "Shutting down all services..."
  kill $BACKEND_PID $ENGINE_PID $FRONTEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# 3. Poll backend health check
echo "Waiting for Backend to become healthy at http://localhost:3000/api/v1/health..."
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
  echo "Service Started: CEX Backend & WebSocket server are running."
  echo "Service Started: Matching Engine is active."
  echo "Service Started: Frontend developer server is ready at http://localhost:5173"
  echo "Opening browser to dashboard..."
  
  if command -v xdg-open > /dev/null 2>&1; then
    xdg-open http://localhost:5173 > /dev/null 2>&1 &
  elif command -v sensible-browser > /dev/null 2>&1; then
    sensible-browser http://localhost:5173 > /dev/null 2>&1 &
  else
    echo "Please open your browser at http://localhost:5173"
  fi
else
  echo "ERROR: Backend failed to start or pass health check after 30 seconds."
  echo "Please check backend environment variables or check logs manually."
  cleanup
fi

# Keep script running to show logs/errors if needed, or simply wait
echo "Press Ctrl+C to terminate all services."
wait
