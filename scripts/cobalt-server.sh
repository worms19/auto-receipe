#!/usr/bin/env bash
# Start self-hosted Cobalt server for WeChef development.
# Prerequisites: Docker Desktop installed and running
#
# Cobalt resolves Instagram URLs to direct video download links.
# API runs on http://127.0.0.1:9000
#
# Usage:
#   ./scripts/cobalt-server.sh          # Start Cobalt
#   ./scripts/cobalt-server.sh stop     # Stop Cobalt
#   ./scripts/cobalt-server.sh status   # Check if running

set -euo pipefail

COBALT_PORT="${COBALT_PORT:-9000}"

# Check Docker is available
if ! command -v docker &> /dev/null; then
  echo "Error: Docker not found. Install Docker Desktop from:"
  echo "  https://www.docker.com/products/docker-desktop/"
  exit 1
fi

# Check Docker daemon is running
if ! docker info &> /dev/null 2>&1; then
  echo "Error: Docker daemon is not running. Start Docker Desktop first."
  exit 1
fi

CONTAINER_NAME="wechef-cobalt"

case "${1:-start}" in
  stop)
    echo "Stopping Cobalt..."
    docker stop "$CONTAINER_NAME" 2>/dev/null && echo "Stopped." || echo "Not running."
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    ;;
  status)
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
      echo "Cobalt is running on http://127.0.0.1:${COBALT_PORT}"
    else
      echo "Cobalt is not running."
    fi
    ;;
  start|"")
    # Stop existing container if any
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true

    echo "Starting Cobalt on port ${COBALT_PORT}..."
    docker run -d \
      --name "$CONTAINER_NAME" \
      --restart unless-stopped \
      -p "127.0.0.1:${COBALT_PORT}:9000/tcp" \
      -e "API_URL=http://127.0.0.1:${COBALT_PORT}/" \
      ghcr.io/imputnet/cobalt:10

    echo ""
    echo "Cobalt is running at http://127.0.0.1:${COBALT_PORT}"
    ;;
  *)
    echo "Usage: $0 [start|stop|status]"
    exit 1
    ;;
esac
