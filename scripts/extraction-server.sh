#!/usr/bin/env bash
# Start the WeChef NestJS extraction server for local development.
# Prerequisites: Node.js, npm, ffmpeg
# Also requires cobalt-server and whisper-server running.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../server"

# Verify ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
  echo "Error: ffmpeg not found. Install with: brew install ffmpeg"
  exit 1
fi

# Verify server directory exists
if [ ! -f "$SERVER_DIR/package.json" ]; then
  echo "Error: server/package.json not found"
  exit 1
fi

# Install deps if needed
if [ ! -d "$SERVER_DIR/node_modules" ]; then
  echo "Installing server dependencies..."
  (cd "$SERVER_DIR" && npm install)
fi

echo "Starting extraction server on http://127.0.0.1:3000..."
echo "Make sure cobalt-server (:9000) and whisper-server (:8080) are running."
echo ""

cd "$SERVER_DIR" && exec npx nest start --watch
