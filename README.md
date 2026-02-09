# WeChef

Turn Instagram cooking videos into structured, readable recipes.

WeChef is a personal iOS app that extracts audio from Instagram reels, transcribes it, and structures it into a clean recipe with ingredients and steps — all processed locally with no API fees.

## How It Works

1. Share an Instagram reel to WeChef via the iOS share sheet
2. The server downloads the video, extracts audio, transcribes it, and structures the recipe
3. Real-time progress updates show each stage via WebSocket
4. The recipe is saved locally with a thumbnail for offline access

## Tech Stack

**App:** React Native, Expo SDK 54, Expo Router, Zustand, NativeWind, SQLite

**Server:** NestJS 11, FFmpeg, Cobalt (video download), whisper.cpp (transcription), Ollama/Mistral (recipe structuring)

**Infra:** Docker Compose, WebSocket (real-time progress)

## Prerequisites

- Node.js 22+
- Docker & Docker Compose
- Xcode (for iOS simulator/device)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) server with `ggml-large-v3-turbo` model
- [Ollama](https://ollama.ai) with Mistral model

## Setup

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Copy environment config
cp .env.example .env
```

## Running

### Backend services

```bash
# Start Docker services (Cobalt + extraction server)
npm run servers:docker

# Start whisper + ollama natively
npm run servers
```

### App

```bash
npm run ios
```

### API endpoints

| Service | URL |
|---|---|
| Extraction server | `http://localhost:3000` |
| Whisper | `http://localhost:8080/v1/audio/transcriptions` |
| Ollama | `http://localhost:11434/api/chat` |

## Project Structure

```
app/                  # Expo Router screens (tabs, recipe detail)
components/           # React Native UI components
lib/
  api/                # API clients (WebSocket extraction, thumbnails)
  pipeline/           # Processing pipeline (Zustand store, types)
  db.ts               # SQLite operations
server/
  src/extraction/     # NestJS extraction module (Cobalt, FFmpeg, Whisper, Claude)
scripts/              # Dev server launcher scripts
docker-compose.yml    # Cobalt + extraction server
```

## License

Private project.
