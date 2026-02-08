#!/usr/bin/env bash
# Start local whisper.cpp server for WeChef development.
# Prerequisites: brew install cmake ffmpeg
# First-time setup:
#   git clone https://github.com/ggml-org/whisper.cpp.git ~/whisper.cpp
#   cd ~/whisper.cpp && cmake -B build -DWHISPER_BUILD_SERVER=ON
#   cmake --build build -j --config Release
#   sh ./models/download-ggml-model.sh small.en

set -euo pipefail

WHISPER_DIR="${WHISPER_DIR:-$HOME/whisper.cpp}"
MODEL="${WHISPER_MODEL:-$WHISPER_DIR/models/ggml-small.en.bin}"
PORT="${WHISPER_PORT:-8080}"
THREADS="${WHISPER_THREADS:-4}"

# Verify whisper-server binary exists
if [ ! -f "$WHISPER_DIR/build/bin/whisper-server" ]; then
  echo "Error: whisper-server not found at $WHISPER_DIR/build/bin/whisper-server"
  echo ""
  echo "Build it with:"
  echo "  git clone https://github.com/ggml-org/whisper.cpp.git $WHISPER_DIR"
  echo "  cd $WHISPER_DIR && cmake -B build -DWHISPER_BUILD_SERVER=ON"
  echo "  cmake --build build -j --config Release"
  exit 1
fi

# Verify model exists
if [ ! -f "$MODEL" ]; then
  echo "Error: Model not found at $MODEL"
  echo ""
  echo "Download it with:"
  echo "  cd $WHISPER_DIR && sh ./models/download-ggml-model.sh small.en"
  exit 1
fi

# Verify ffmpeg is installed (required for --convert flag)
if ! command -v ffmpeg &> /dev/null; then
  echo "Error: ffmpeg not found. Install with: brew install ffmpeg"
  exit 1
fi

echo "Starting whisper-server on port $PORT..."
echo "Model: $MODEL"
echo "Threads: $THREADS"
echo ""

exec "$WHISPER_DIR/build/bin/whisper-server" \
  --model "$MODEL" \
  --host 127.0.0.1 \
  --port "$PORT" \
  --inference-path "/v1/audio/transcriptions" \
  --convert \
  --threads "$THREADS" \
  --print-progress
