#!/bin/bash

# Get the directory of the script, so it can be run from anywhere.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PID_FILE="$SCRIPT_DIR/.run.pids"

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

# Kill everything in this script's process group (covers npm's child
# processes like tsx/vite too) on Ctrl+C, termination, or normal exit.
cleanup() {
  rm -f "$PID_FILE"
  kill 0
}
trap cleanup SIGINT SIGTERM EXIT

wait
