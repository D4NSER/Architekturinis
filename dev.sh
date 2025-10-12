#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_ROOT="$PROJECT_ROOT/backend"
FRONTEND_ROOT="$PROJECT_ROOT/frontend"

BACKEND_PY="$BACKEND_ROOT/.venv/bin/python"
if [[ ! -x "$BACKEND_PY" ]]; then
  echo "[dev] Nerasta backend virtuali aplinka (.venv)." >&2
  echo "[dev] Paleiskite 'python -m venv backend/.venv && pip install -r backend/requirements.txt'" >&2
  exit 1
fi

if [[ ! -f "$FRONTEND_ROOT/package-lock.json" ]]; then
  echo "[dev] Atrodo, kad front-end priklausomybės neįdiegtos. Vykdykite 'npm install' kataloge frontend/." >&2
  exit 1
fi

cleanup() {
  echo
  echo "[dev] Stabdoma..."
  [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "${FRONTEND_PID:-}" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
}

trap cleanup SIGINT SIGTERM EXIT

( cd "$BACKEND_ROOT" && "$BACKEND_PY" -m uvicorn app.main:app --reload ) &
BACKEND_PID=$!
echo "[dev] FastAPI paleista (PID: $BACKEND_PID) -> http://localhost:8000"

( cd "$FRONTEND_ROOT" && npm start ) &
FRONTEND_PID=$!
echo "[dev] React paleistas (PID: $FRONTEND_PID) -> http://localhost:3000"

echo "[dev] Paspauskite Ctrl+C norėdami baigti."

wait $BACKEND_PID
wait $FRONTEND_PID
