#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# ConversaHub — One-Click Dev Startup Script
# Starts the FastAPI backend AND Next.js frontend simultaneously.
# Kill with Ctrl+C — both servers will stop.
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
VENV="$ROOT/.venv"

# ── Colors ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
TEAL='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo -e "${TEAL}${BOLD}"
echo "  ██████╗ ██████╗ ███╗   ██╗██╗   ██╗███████╗██████╗ ███████╗ █████╗ "
echo " ██╔════╝██╔═══██╗████╗  ██║██║   ██║██╔════╝██╔══██╗██╔════╝██╔══██╗"
echo " ██║     ██║   ██║██╔██╗ ██║██║   ██║█████╗  ██████╔╝███████╗███████║"
echo " ██║     ██║   ██║██║╚██╗██║╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██╔══██║"
echo " ╚██████╗╚██████╔╝██║ ╚████║ ╚████╔╝ ███████╗██║  ██║███████║██║  ██║"
echo "  ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝"
echo "                    Enterprise Conversational AI Platform"
echo -e "${NC}"
echo ""

# ── Pre-flight checks ────────────────────────────────────────────────────────
echo -e "${BOLD}[1/4] Running pre-flight checks...${NC}"

# Check virtual environment
if [ ! -d "$VENV" ]; then
  echo -e "${YELLOW}  ⚠ Virtual environment not found at $VENV${NC}"
  echo -e "  Creating one now..."
  python3 -m venv "$VENV"
  echo -e "${GREEN}  ✓ Virtual environment created${NC}"
else
  echo -e "${GREEN}  ✓ Python virtual environment found${NC}"
fi

# Check Node modules
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo -e "${YELLOW}  ⚠ Frontend node_modules not found. Installing...${NC}"
  (cd "$FRONTEND" && npm install --silent)
  echo -e "${GREEN}  ✓ Frontend dependencies installed${NC}"
else
  echo -e "${GREEN}  ✓ Frontend node_modules found${NC}"
fi

# Install backend deps
echo -e "${BOLD}[2/4] Installing backend Python dependencies...${NC}"
"$VENV/bin/pip" install -q -r "$BACKEND/requirements.txt"
echo -e "${GREEN}  ✓ Backend dependencies ready${NC}"

# Check for API key
echo -e "${BOLD}[3/4] Checking environment...${NC}"
if [ -f "$BACKEND/.env" ] && grep -q "GEMINI_API_KEY=." "$BACKEND/.env" 2>/dev/null; then
  echo -e "${GREEN}  ✓ GEMINI_API_KEY found — Real AI mode enabled${NC}"
else
  echo -e "${YELLOW}  ⚠ No GEMINI_API_KEY set — Using MockLLM (still fully functional)${NC}"
  echo -e "    To enable real AI: add GEMINI_API_KEY=your_key to backend/.env"
fi

echo ""
echo -e "${BOLD}[4/4] Clearing ports and starting servers...${NC}"

# ── Kill anything already holding port 8000 or 3000 ─────────────────────────
for PORT in 8000 3000; do
  PIDS=$(lsof -ti TCP:$PORT 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo -e "${YELLOW}  ⚠ Port $PORT in use — stopping old process(es): $PIDS${NC}"
    echo "$PIDS" | xargs kill -9 2>/dev/null
    sleep 0.5
  fi
done
echo -e "${GREEN}  ✓ Ports 8000 and 3000 are free${NC}"

echo ""
echo -e "${TEAL}  ● Backend API  → http://localhost:8000${NC}"
echo -e "${TEAL}  ● API Docs     → http://localhost:8000/api/v1/docs${NC}"
echo -e "${TEAL}  ● Frontend App → http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}  Press Ctrl+C to stop both servers${NC}"
echo ""
echo "─────────────────────────────────────────────────"

# ── Start backend in background ──────────────────────────────────────────────
(
  cd "$BACKEND"
  echo -e "${GREEN}[Backend] Starting FastAPI server...${NC}"
  "$VENV/bin/uvicorn" app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --log-level warning \
    --env-file .env
) &
BACKEND_PID=$!

# Wait for backend to boot
sleep 3

# ── Start frontend ───────────────────────────────────────────────────────────
(
  cd "$FRONTEND"
  echo -e "${GREEN}[Frontend] Starting Next.js dev server...${NC}"
  npm run dev --silent
) &
FRONTEND_PID=$!

# ── Trap Ctrl+C to kill both ─────────────────────────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down ConversaHub...${NC}"
  kill "$BACKEND_PID" 2>/dev/null
  kill "$FRONTEND_PID" 2>/dev/null
  echo -e "${GREEN}  ✓ Both servers stopped. Goodbye!${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# Keep script alive
wait
