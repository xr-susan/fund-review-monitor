#!/usr/bin/env bash
set -euo pipefail

echo "Starting Fund Review Monitor..."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required."
  exit 1
fi

npm run install:all

echo "Starting backend at http://localhost:5000"
npm run dev:backend &
BACKEND_PID=$!

echo "Starting frontend at http://localhost:3001"
npm run dev:frontend &
FRONTEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait
