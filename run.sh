#!/bin/bash
set -e

# Get the directory of the script, so it can be run from anywhere.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PID_FILE="$SCRIPT_DIR/.run.pids"

# --- First-time setup -------------------------------------------------------

if [ ! -d "$SCRIPT_DIR/backend/node_modules" ]; then
  echo "Installing backend dependencies..."
  (cd "$SCRIPT_DIR/backend" && npm install)
fi

if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$SCRIPT_DIR/frontend" && npm install)
fi

if [ ! -f "$SCRIPT_DIR/backend/dev.db" ]; then
  echo "Setting up database..."
  (cd "$SCRIPT_DIR/backend" && npx prisma migrate dev)
fi

if [ ! -d "$SCRIPT_DIR/frontend/dist-standalone" ]; then
  echo "Building standalone offline app (one-time)..."
  (cd "$SCRIPT_DIR/frontend" && npm run build:standalone)
fi

# --- Start servers -----------------------------------------------------------

echo "Starting backend server..."
cd "$SCRIPT_DIR/backend"
npm run dev &
BACKEND_PID=$!

echo "Starting frontend server..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo "$BACKEND_PID $FRONTEND_PID" > "$PID_FILE"

echo "Backend and frontend servers are running."
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both, or run ./stop.sh from another terminal."

# Show the LAN address so the app can be opened from a phone on the same Wi-Fi.
# macOS: ipconfig getifaddr; Linux: hostname -I / ip route.
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [ -z "$LAN_IP" ]; then
  LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
fi
if [ -z "$LAN_IP" ]; then
  LAN_IP="$(ip route get 1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") print $(i+1)}' || true)"
fi

if [ -n "$LAN_IP" ]; then
  echo ""
  echo "On your phone (same Wi-Fi), open: http://$LAN_IP:5173"
  echo "(If your OS asks to allow incoming connections for node, click Allow.)"

  echo ""
  echo "Standalone offline app (install once, then works without this server):"
  echo "  http://$LAN_IP:3001/standalone"
fi

# Kill everything in this script's process group (covers npm's child
# processes like tsx/vite too) on Ctrl+C, termination, or normal exit.
cleanup() {
  rm -f "$PID_FILE"
  kill 0
}
trap cleanup SIGINT SIGTERM EXIT

wait
