# Phase 3.1: Local Whisper Server - Research

**Researched:** 2026-02-08
**Domain:** Local speech-to-text server (whisper.cpp), React Native client integration
**Confidence:** HIGH

## Summary

whisper.cpp includes a built-in HTTP server (`whisper-server`) that exposes a transcription endpoint compatible with OpenAI's API. The server's default endpoint is `/inference`, but the `--inference-path` flag can remap it to `/v1/audio/transcriptions` for drop-in OpenAI compatibility. The server returns `{"text": "..."}` JSON by default, matching the OpenAI response format the app already parses.

The Homebrew formula (`whisper-cpp`) explicitly disables the server binary (`-DWHISPER_BUILD_SERVER=OFF`), so we must build from source. Building from source on macOS Apple Silicon is straightforward with cmake and produces both `whisper-cli` and `whisper-server` binaries with Metal GPU acceleration enabled by default. The `--convert` flag on the server calls system `ffmpeg` as a subprocess to convert any input audio (including .m4a/AAC) to 16kHz mono WAV before processing -- this is independent of the `WHISPER_FFMPEG` cmake flag (which is Linux-only library linking).

The app change is minimal: point the endpoint URL from `https://api.openai.com/v1/audio/transcriptions` to `http://127.0.0.1:8080/v1/audio/transcriptions`, remove the Authorization header (not needed locally), and keep everything else the same. On iOS Simulator, `localhost`/`127.0.0.1` connects directly to the host Mac. For physical devices, use the Mac's LAN IP address.

**Primary recommendation:** Build whisper.cpp from source with `WHISPER_BUILD_SERVER=ON`, use the `small.en` model for best speed/quality balance for English recipe content, run with `--convert` flag and system ffmpeg for .m4a support.

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| whisper.cpp | 1.8.3 (latest) | Local Whisper inference engine | C/C++ port of OpenAI Whisper, Metal GPU support on Apple Silicon, actively maintained |
| whisper-server | (built from whisper.cpp) | HTTP server with OpenAI-compatible API | Built-in server example, supports `--inference-path` for exact OpenAI endpoint compatibility |
| ffmpeg | 7.x (Homebrew) | Audio format conversion (.m4a to WAV) | Required by whisper-server `--convert` flag, called as subprocess |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| cmake | 4.x (Homebrew) | Build system for whisper.cpp | Required to compile from source |
| Hugging Face models | - | Pre-converted GGML model files | Download once, reuse across restarts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Building from source | Homebrew `whisper-cpp` | Homebrew disables server binary; would need CLI-only workflow without HTTP API |
| whisper.cpp server | faster-whisper (Python) | Python-based, needs venv/pip, heavier runtime; whisper.cpp is simpler for this use case |
| whisper.cpp server | LocalAI | Full LLM server, overkill for just transcription; complex setup |
| whisper.cpp server | pfrankov/whisper-server (macOS menu bar) | Interesting but less configurable, separate project with own update cycle |

**Installation:**
```bash
# Prerequisites
brew install cmake ffmpeg

# Clone and build whisper.cpp with server
git clone https://github.com/ggml-org/whisper.cpp.git
cd whisper.cpp
cmake -B build -DWHISPER_BUILD_SERVER=ON
cmake --build build -j --config Release

# Download model (small.en recommended for English recipes)
sh ./models/download-ggml-model.sh small.en
# Model saved to: models/ggml-small.en.bin (488 MB)
```

## Architecture Patterns

### Server Startup Command
```bash
# Run whisper-server with OpenAI-compatible endpoint
./build/bin/whisper-server \
  --model models/ggml-small.en.bin \
  --host 127.0.0.1 \
  --port 8080 \
  --inference-path "/v1/audio/transcriptions" \
  --convert \
  --threads 4 \
  --print-progress
```

### Key Server Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--model` | `models/ggml-base.en.bin` | Path to GGML model file |
| `--host` | `127.0.0.1` | Bind address |
| `--port` | `8080` | Server port |
| `--inference-path` | `/inference` | Endpoint path (set to `/v1/audio/transcriptions` for OpenAI compat) |
| `--convert` | `false` | Enable ffmpeg conversion of input audio (CRITICAL for .m4a support) |
| `--threads` | `4` | Number of CPU threads for inference |
| `--print-progress` | `false` | Show transcription progress in terminal |
| `-l, --language` | `en` | Language code or `auto` for auto-detect |
| `--no-timestamps` | `false` | Disable timestamps in output |

### App Code Change Pattern

The change to `whisper.ts` is minimal:

```typescript
// BEFORE (OpenAI cloud)
const WHISPER_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

// AFTER (local whisper-server)
const WHISPER_ENDPOINT = 'http://127.0.0.1:8080/v1/audio/transcriptions';
// For physical device testing, use Mac's LAN IP:
// const WHISPER_ENDPOINT = 'http://192.168.x.x:8080/v1/audio/transcriptions';
```

The `uploadAsync` call mostly stays the same. Key differences:
1. **Remove Authorization header** -- local server does not require auth
2. **Keep `model` parameter** -- whisper-server ignores it (uses the model loaded at startup) but it won't cause errors
3. **Keep `fieldName: 'file'`** -- whisper-server expects the file in a field named `file`
4. **Keep `mimeType: 'audio/m4a'`** -- ffmpeg handles conversion when `--convert` is enabled

### Response Format Compatibility

whisper-server returns the same JSON format as OpenAI:
```json
{"text": "First, preheat the oven to 350 degrees..."}
```

The app already parses `result.text` from the response body, so no parsing changes needed.

### Anti-Patterns to Avoid
- **Running Homebrew whisper-cpp as server:** Homebrew build has `WHISPER_BUILD_SERVER=OFF`. Don't try to find a server binary in Homebrew's install.
- **Omitting --convert flag:** Without `--convert`, whisper-server only accepts 16-bit WAV files. The app sends .m4a files, so `--convert` is mandatory.
- **Using WHISPER_FFMPEG cmake flag on macOS:** The `WHISPER_FFMPEG` cmake option is for linking ffmpeg libraries at compile time and is documented as Linux-only. The `--convert` server flag uses system ffmpeg as a subprocess and works on any platform with ffmpeg installed.
- **Binding to 0.0.0.0 in development:** Only bind to `127.0.0.1` unless testing on physical device. Binding to `0.0.0.0` exposes the server to the entire network.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio format conversion | Custom m4a-to-wav converter | whisper-server `--convert` flag + system ffmpeg | ffmpeg handles all edge cases (sample rate, channels, codecs) |
| OpenAI API compatibility | Custom HTTP wrapper around whisper-cli | whisper-server `--inference-path` | Built-in feature, returns correct JSON format |
| Model downloading | Manual curl commands | `download-ggml-model.sh` script | Handles correct URLs, checksums, model naming |

**Key insight:** whisper.cpp's built-in server with `--inference-path` and `--convert` flags handles the two hardest integration problems (API compatibility and audio format support) out of the box.

## Common Pitfalls

### Pitfall 1: Homebrew whisper-cpp Has No Server Binary
**What goes wrong:** Developer installs via `brew install whisper-cpp`, can't find `whisper-server` binary.
**Why it happens:** Homebrew formula sets `-DWHISPER_BUILD_SERVER=OFF` explicitly.
**How to avoid:** Build from source with `-DWHISPER_BUILD_SERVER=ON`.
**Warning signs:** `which whisper-server` returns nothing after Homebrew install.

### Pitfall 2: Missing ffmpeg for .m4a Files
**What goes wrong:** Server returns error or empty transcription when receiving .m4a audio.
**Why it happens:** whisper.cpp natively only supports 16-bit WAV. Without `--convert` and system ffmpeg, .m4a files are not processed.
**How to avoid:** Install ffmpeg via Homebrew (`brew install ffmpeg`), always start server with `--convert` flag.
**Warning signs:** Server logs show conversion errors or file format warnings.

### Pitfall 3: iOS App Transport Security Blocks HTTP
**What goes wrong:** Network request fails with ATS policy error when app tries to reach `http://127.0.0.1:8080`.
**Why it happens:** iOS blocks non-HTTPS requests by default. In development with Expo Go, this usually works. In dev client builds, it may not.
**How to avoid:** If needed, add to `app.json` under `expo.ios.infoPlist`:
```json
{
  "NSAppTransportSecurity": {
    "NSAllowsLocalNetworking": true
  }
}
```
**Warning signs:** Network error mentioning "App Transport Security" in logs.

### Pitfall 4: Physical Device Can't Reach localhost
**What goes wrong:** Transcription works in Simulator but fails on physical iPhone.
**Why it happens:** `localhost`/`127.0.0.1` on a physical device refers to the device itself, not the Mac running the server.
**How to avoid:** Use the Mac's LAN IP address (e.g., `192.168.1.x`). Ensure both Mac and iPhone are on the same WiFi network. Bind server to `0.0.0.0` for physical device testing.
**Warning signs:** Connection timeout or "connection refused" on device but not simulator.

### Pitfall 5: Wrong Model Path After Build
**What goes wrong:** Server fails to start with "model not found" error.
**Why it happens:** Model download script saves to `models/` relative to whisper.cpp source directory, but server may be run from a different working directory.
**How to avoid:** Use absolute paths for `--model` flag, or copy model to a known location.
**Warning signs:** Server exits immediately with file-not-found error.

### Pitfall 6: Server Processes One Request at a Time
**What goes wrong:** Second transcription request hangs until first completes.
**Why it happens:** whisper-server uses mutex-based serialization -- only one inference runs at a time.
**How to avoid:** This is expected behavior for a development server. Not a problem for single-user local development.
**Warning signs:** Slow response times when sending rapid successive requests.

## Code Examples

### Starting the Server (verified from server README and source code)

```bash
# Source: https://github.com/ggml-org/whisper.cpp/blob/master/examples/server/README.md

# Minimal start (uses defaults: port 8080, host 127.0.0.1)
./build/bin/whisper-server \
  --model models/ggml-small.en.bin \
  --convert

# Full OpenAI-compatible start
./build/bin/whisper-server \
  --model models/ggml-small.en.bin \
  --host 127.0.0.1 \
  --port 8080 \
  --inference-path "/v1/audio/transcriptions" \
  --convert \
  --threads 4 \
  --print-progress
```

### Testing with curl (verified from server README)

```bash
# Source: https://github.com/ggml-org/whisper.cpp/blob/master/examples/server/README.md

curl http://127.0.0.1:8080/v1/audio/transcriptions \
  -H "Content-Type: multipart/form-data" \
  -F file="@/path/to/audio.m4a" \
  -F temperature="0.0" \
  -F response_format="json"

# Expected response:
# {"text": "First, preheat the oven to 350 degrees..."}
```

### Modified whisper.ts (planned change)

```typescript
// Source: Current lib/api/whisper.ts + whisper-server API compatibility

// Environment-aware endpoint selection
const WHISPER_ENDPOINT = __DEV__
  ? 'http://127.0.0.1:8080/v1/audio/transcriptions'
  : 'https://api.openai.com/v1/audio/transcriptions';

export async function transcribeAudio(
  audioUri: string,
  apiKey: string,  // still needed for production OpenAI
  options: TranscriptionOptions = {}
): Promise<string> {
  const isLocal = WHISPER_ENDPOINT.startsWith('http://127.0.0.1');

  const headers: Record<string, string> = {};
  if (!isLocal) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const parameters: Record<string, string> = {
    model: 'whisper-1',  // ignored by local server, required by OpenAI
  };

  if (options.language) parameters.language = options.language;
  if (options.prompt) parameters.prompt = options.prompt;

  const response = await uploadAsync(
    WHISPER_ENDPOINT,
    audioUri,
    {
      headers,
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'audio/m4a',
      parameters,
    }
  );

  if (response.status === 200) {
    const result = JSON.parse(response.body);
    return result.text;
  }

  throw new TranscriptionError(
    `Transcription failed: ${response.body}`,
    response.status
  );
}
```

## Model Selection Guide

### Model Sizes and Performance (from whisper.cpp README + Hugging Face)

| Model | Params | Disk (GGML) | Memory | Relative Speed | English Quality |
|-------|--------|-------------|--------|----------------|-----------------|
| tiny.en | 39M | 78 MB | ~273 MB | ~10x | Lowest -- frequent errors |
| base.en | 74M | 148 MB | ~388 MB | ~7x | Low -- usable but rough |
| small.en | 244M | 488 MB | ~852 MB | ~4x | Good -- solid for clear speech |
| medium.en | 769M | 1.53 GB | ~2.1 GB | ~2x | High -- near human-level |
| large-v3 | 1.5B | 3.1 GB | ~3.9 GB | ~1x | Highest -- best available |
| large-v3-turbo | 809M | 1.62 GB | ~2.5 GB | ~1.5x | High -- fast large model |

### Quantized Model Options (smaller disk/memory, slight quality loss)

| Model | Disk | Notes |
|-------|------|-------|
| ggml-small.en-q5_1.bin | 190 MB | Good tradeoff for small model |
| ggml-small.en-q8_0.bin | 264 MB | Near-lossless quantization |
| ggml-medium.en-q5_0.bin | 539 MB | If medium quality needed with less disk |

### Recommendation for Recipe Transcription

**Use `small.en` (ggml-small.en.bin, 488 MB)**

Rationale:
- Recipe narration is typically clear, well-paced English speech -- not challenging audio
- `small.en` provides good accuracy for clear speech at ~4x realtime speed on Apple Silicon
- `.en` suffix means English-only model, which performs better for English than multilingual equivalent
- 488 MB disk / ~852 MB memory is comfortable on any modern Mac
- If quality proves insufficient, upgrade to `medium.en` (1.53 GB) without any code changes
- `tiny` and `base` are too error-prone for ingredient names and cooking terms

### Available Models on Hugging Face

Download URL pattern: `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/{filename}`

Or use the built-in script:
```bash
cd whisper.cpp
sh ./models/download-ggml-model.sh small.en
# Downloads to: models/ggml-small.en.bin
```

## Network Configuration for React Native / Expo

### iOS Simulator (primary development target)
- `localhost` and `127.0.0.1` both work -- simulator runs as a macOS process
- No special network configuration needed
- Server can bind to `127.0.0.1` (most secure)

### Physical iPhone (optional testing)
- Must use Mac's LAN IP (e.g., `http://192.168.1.100:8080`)
- Both devices must be on same WiFi network
- Server must bind to `0.0.0.0` (all interfaces)
- May need `NSAllowsLocalNetworking` in Info.plist

### App Transport Security
- Expo Go in development mode generally allows HTTP localhost
- For dev client builds, may need in `app.json`:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsLocalNetworking": true
        }
      }
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Python Whisper | whisper.cpp (C/C++) | 2023 | 10x+ faster, no Python runtime needed |
| CPU-only inference | Metal GPU acceleration | whisper.cpp has had Metal since early 2024 | Significant speedup on Apple Silicon |
| Custom HTTP wrappers | `--inference-path` flag | PR #2270 (2024) | Built-in OpenAI API compatibility |
| WAV-only input | `--convert` flag (system ffmpeg) | Built into server | Accept any audio format |
| Single model size | Quantized models (q5, q8) | 2024 | 2-3x smaller models with minimal quality loss |
| large-v2 as best | large-v3-turbo | Late 2024 | Faster than large-v3 with similar quality |

**Deprecated/outdated:**
- **`make` build system:** whisper.cpp has moved to cmake as primary build system
- **`WHISPER_FFMPEG` on macOS:** This cmake flag links ffmpeg libraries at compile time and is documented for Linux only. Use `--convert` server flag instead which calls system ffmpeg as subprocess

## Open Questions

1. **Exact transcription quality for recipe content**
   - What we know: `small.en` handles clear English well
   - What's unclear: How well it handles cooking-specific terminology (e.g., "julienne", "deglaze", "mise en place", ingredient names)
   - Recommendation: Test with a real recipe video recording; if quality is poor, try `medium.en`

2. **Server startup time**
   - What we know: Model must be loaded into memory at startup
   - What's unclear: How long `small.en` takes to load on Apple Silicon (likely 1-3 seconds)
   - Recommendation: Start server before running the app; could add a health check endpoint

3. **expo-file-system/legacy uploadAsync reliability with local HTTP**
   - What we know: uploadAsync works with HTTPS endpoints (OpenAI); HTTP localhost should work in simulator
   - What's unclear: Any edge cases with HTTP multipart uploads to local server via this specific Expo API
   - Recommendation: Test early in implementation; fallback would be using fetch + FormData if issues arise

## Sources

### Primary (HIGH confidence)
- [whisper.cpp GitHub repo](https://github.com/ggml-org/whisper.cpp) - main project, README, build instructions
- [whisper.cpp server README](https://github.com/ggml-org/whisper.cpp/blob/master/examples/server/README.md) - CLI flags, endpoints, defaults
- [whisper.cpp server source code (server.cpp)](https://raw.githubusercontent.com/ggml-org/whisper.cpp/master/examples/server/server.cpp) - verified --convert uses system ffmpeg subprocess, verified response format
- [Hugging Face model repo](https://huggingface.co/ggerganov/whisper.cpp/tree/main) - complete model file list with sizes
- [Homebrew whisper-cpp formula](https://formulae.brew.sh/formula/whisper-cpp) - confirmed version 1.8.3, confirmed server build disabled
- [Homebrew formula source](https://github.com/Homebrew/homebrew-core/blob/HEAD/Formula/w/whisper-cpp.rb) - confirmed `-DWHISPER_BUILD_SERVER=OFF`
- [PR #2270 --inference-path](https://github.com/ggml-org/whisper.cpp/pull/2270) - adds OpenAI client SDK compatibility
- [DeepWiki whisper.cpp HTTP server](https://deepwiki.com/ggml-org/whisper.cpp/3.2-http-server) - detailed server architecture docs

### Secondary (MEDIUM confidence)
- [Voice Mode whisper.cpp docs](https://voice-mode.readthedocs.io/en/stable/whisper.cpp/) - server configuration, verified against primary sources
- [OpenAI Whisper model comparison](https://github.com/openai/whisper) - model sizes, parameters, WER references
- [Expo file-system legacy docs](https://docs.expo.dev/versions/latest/sdk/filesystem-legacy/) - uploadAsync API
- [Apple Developer Forums - iOS simulator localhost](https://developer.apple.com/forums/thread/762849) - confirmed localhost works in simulator

### Tertiary (LOW confidence)
- [whisper-api.com model comparison](https://whisper-api.com/blog/models/) - relative speed/quality metrics (third-party, not official benchmarks)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified whisper.cpp server exists, confirmed build flags, verified response format from source code
- Architecture: HIGH - verified CLI flags from README, verified response format and ffmpeg behavior from server.cpp source
- Model selection: MEDIUM - model sizes verified from Hugging Face; quality claims based on general consensus, not recipe-specific testing
- Pitfalls: HIGH - Homebrew server exclusion confirmed from formula source; ffmpeg requirement confirmed from server.cpp source
- App integration: MEDIUM - endpoint change is straightforward but expo uploadAsync with local HTTP server not personally verified

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (whisper.cpp is actively developed but API is stable)
