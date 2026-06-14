#!/bin/bash

# Get the directory of the script, so it can be run from anywhere.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PID_FILE="$SCRIPT_DIR/.run.pids"

if [ -f "$PID_FILE" ]; then
  PIDS=$(cat "$PID_FILE")
  echo "Stopping processes: $PIDS"
  # Kill each process group so npm's child processes (tsx/vite) die too.
  for pid in $PIDS; do
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null
  done
  rm -f "$PID_FILE"
else
  echo "No PID file found, falling back to killing by process name..."
fi

# Belt-and-suspenders: catch anything left behind by name/port.
pkill -f "tsx watch src/index.ts" 2>/dev/null
pkill -f "vite" 2>/dev/null

echo "Done."
