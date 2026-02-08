# Phase 4: Video Extraction - Research

**Researched:** 2026-02-08
**Domain:** Instagram video download, audio/video processing on iOS, React Native/Expo
**Confidence:** MEDIUM (multiple viable approaches; Instagram download landscape is fragile)

## Summary

Phase 4 replaces the mock `mockDownload()` and `mockExtract()` functions in the pipeline store with real implementations that: (1) download video from an Instagram URL, (2) extract the audio track as `.m4a`, and (3) capture a thumbnail image from the video. The extracted audio URI is then passed to the existing `transcribeAudio()` function which uploads it to the whisper-server.

The critical challenge is Instagram video download. Instagram has no public API for video download, and all approaches rely on third-party services or scraping. The recommended approach is **self-hosted Cobalt** -- an open-source media downloader with a clean JSON API that supports Instagram reels and posts without authentication for public content. It runs as a Docker container on the development Mac alongside the whisper-server.

For audio extraction, the recommended approach is a **local Expo native module using AVAssetExportSession** (iOS AVFoundation). This is a lightweight, first-party iOS API that extracts audio as `.m4a` without requiring ffmpeg-kit (which is archived/deprecated). It requires transitioning from Expo Go to a dev client build. For thumbnail extraction, **expo-video-thumbnails** works in Expo Go and provides a simple `getThumbnailAsync()` API.

**Primary recommendation:** Self-hosted Cobalt for Instagram download + local Expo native module with AVAssetExportSession for audio extraction + expo-video-thumbnails for thumbnails. This requires transitioning to a dev client build.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cobalt (self-hosted) | 10.x (Docker) | Instagram video URL resolution | Open-source, clean JSON API, supports Instagram reels/posts, no auth needed for public content, self-hostable |
| expo-file-system (legacy) | ~19.0.21 (already installed) | Download video file, manage temp files | Already in use, provides downloadAsync with progress callbacks |
| expo-video-thumbnails | ~8.0.x (SDK 54) | Capture thumbnail frame from video | Official Expo SDK package, works in Expo Go, simple API |
| Local Expo Module (AVFoundation) | n/a (custom) | Extract audio track from video as .m4a | Uses iOS-native AVAssetExportSession, no third-party dependency, produces .m4a which whisper-server accepts |
| expo-dev-client | ~5.0.x (SDK 54) | Run custom native modules | Required for local Expo module with native Swift code |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-build-properties | ~0.14.x | Configure iOS deployment target | If native module requires specific iOS version |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Self-hosted Cobalt | RapidAPI Instagram downloader | RapidAPI costs money, third-party dependency, services frequently break. Cobalt is free, open-source, self-hosted |
| Self-hosted Cobalt | yt-dlp (server-side) | yt-dlp requires Instagram login/cookies for most content, more complex setup, Python dependency |
| Local Expo Module (AVFoundation) | ffmpeg-kit-react-native | ffmpeg-kit is archived (Jun 2025), community forks have uncertain maintenance, much larger binary size (~15-30MB) for a single operation |
| Local Expo Module (AVFoundation) | @spreen/ffmpeg-kit-react-native | iOS-only fork, but still archived upstream, adds significant app size. AVFoundation is zero-dependency |
| expo-video-thumbnails | Local Expo Module (AVAssetImageGenerator) | Unnecessary complexity -- expo-video-thumbnails already does exactly this |

**Installation:**
```bash
# Expo packages
npx expo install expo-video-thumbnails expo-dev-client

# Create local native module for audio extraction
npx create-expo-module@latest --local
# (name it something like "audio-extractor")

# Cobalt (Docker on dev Mac, alongside whisper-server)
mkdir -p ~/cobalt && cd ~/cobalt
# Create docker-compose.yml (see Architecture Patterns section)
docker compose up -d
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
  pipeline/
    store.ts              # Updated: replace mockDownload/mockExtract with real calls
    mock-api.ts           # Keep for reference, no longer imported by store
    types.ts              # Unchanged
  api/
    whisper.ts            # Unchanged (already accepts audioUri)
    claude.ts             # Unchanged
    config.ts             # Unchanged
    errors.ts             # Unchanged
  extraction/
    download.ts           # NEW: Cobalt API client + expo-file-system download
    audio.ts              # NEW: Wrapper around native AVFoundation module
    thumbnail.ts          # NEW: expo-video-thumbnails wrapper
    url-validator.ts      # NEW: Instagram URL parsing and validation
    types.ts              # NEW: Extraction types (DownloadResult, ExtractionResult)
modules/
  audio-extractor/        # NEW: Local Expo native module
    ios/
      AudioExtractorModule.swift  # AVAssetExportSession implementation
    src/
      index.ts            # TypeScript API
    expo-module.config.json
scripts/
  cobalt-server.sh        # NEW: Convenience script (like whisper-server.sh)
```

### Pattern 1: Cobalt API Client for Instagram Download
**What:** Call self-hosted Cobalt API to resolve Instagram URL to a direct video download URL, then download using expo-file-system.
**When to use:** Every time user submits an Instagram URL.
**Example:**
```typescript
// Source: Cobalt API docs (github.com/imputnet/cobalt/blob/main/docs/api.md)

// Step 1: Resolve Instagram URL to direct download URL via Cobalt
const COBALT_API = __DEV__
  ? 'http://127.0.0.1:9000'
  : 'http://127.0.0.1:9000'; // Same for now -- personal use

interface CobaltResponse {
  status: 'tunnel' | 'redirect' | 'picker' | 'error';
  url?: string;
  filename?: string;
  error?: { code: string; context?: Record<string, unknown> };
  picker?: Array<{ type: string; url: string; thumb?: string }>;
}

async function resolveInstagramUrl(instagramUrl: string): Promise<string> {
  const response = await fetch(`${COBALT_API}/`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: instagramUrl,
      videoQuality: '720',  // Don't need max quality for audio extraction
    }),
  });

  const data: CobaltResponse = await response.json();

  if (data.status === 'error') {
    throw new Error(`Cobalt error: ${data.error?.code}`);
  }

  if (data.status === 'tunnel' || data.status === 'redirect') {
    return data.url!;
  }

  if (data.status === 'picker' && data.picker?.length) {
    // For carousel posts, take the first video
    const video = data.picker.find(item => item.type === 'video');
    if (video) return video.url;
  }

  throw new Error('Could not resolve video URL');
}

// Step 2: Download video to cache using expo-file-system
import {
  downloadAsync,
  cacheDirectory,
  makeDirectoryAsync,
  getInfoAsync,
  deleteAsync,
} from 'expo-file-system/legacy';

async function downloadVideo(videoUrl: string): Promise<string> {
  const dir = `${cacheDirectory}wechef-videos/`;
  const dirInfo = await getInfoAsync(dir);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(dir, { intermediates: true });
  }

  const filename = `video-${Date.now()}.mp4`;
  const fileUri = `${dir}${filename}`;

  const result = await downloadAsync(videoUrl, fileUri);
  return result.uri;
}
```

### Pattern 2: Native Audio Extraction via AVAssetExportSession
**What:** Local Expo module wrapping iOS AVAssetExportSession to extract audio as .m4a.
**When to use:** After video is downloaded to local cache.
**Example:**
```swift
// Source: Apple AVFoundation docs + DeveloperMemos tutorial
// File: modules/audio-extractor/ios/AudioExtractorModule.swift

import ExpoModulesCore
import AVFoundation

public class AudioExtractorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioExtractor")

    AsyncFunction("extractAudio") { (videoUri: String, outputUri: String, promise: Promise) in
      guard let videoURL = URL(string: videoUri) else {
        promise.reject("INVALID_URL", "Invalid video URI")
        return
      }

      let outputURL = URL(string: outputUri)!
      let asset = AVAsset(url: videoURL)

      guard let exportSession = AVAssetExportSession(
        asset: asset,
        presetName: AVAssetExportPresetAppleM4A
      ) else {
        promise.reject("EXPORT_FAILED", "Cannot create export session")
        return
      }

      exportSession.outputFileType = .m4a
      exportSession.outputURL = outputURL

      exportSession.exportAsynchronously {
        switch exportSession.status {
        case .completed:
          promise.resolve(outputURL.absoluteString)
        case .failed:
          promise.reject(
            "EXPORT_FAILED",
            exportSession.error?.localizedDescription ?? "Audio extraction failed"
          )
        default:
          promise.reject("EXPORT_FAILED", "Audio extraction failed with status: \(exportSession.status.rawValue)")
        }
      }
    }
  }
}
```

```typescript
// File: modules/audio-extractor/src/index.ts
import { requireNativeModule } from 'expo-modules-core';

const AudioExtractorModule = requireNativeModule('AudioExtractor');

export async function extractAudio(videoUri: string, outputUri: string): Promise<string> {
  return AudioExtractorModule.extractAudio(videoUri, outputUri);
}
```

### Pattern 3: Thumbnail Extraction
**What:** Use expo-video-thumbnails to capture a frame from the downloaded video.
**When to use:** After video is downloaded, before or in parallel with audio extraction.
**Example:**
```typescript
// Source: Expo docs (docs.expo.dev/versions/latest/sdk/video-thumbnails/)
import * as VideoThumbnails from 'expo-video-thumbnails';

async function extractThumbnail(videoUri: string): Promise<string> {
  const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
    time: 1000,     // 1 second into the video
    quality: 0.7,   // Good quality, reasonable file size
  });
  return uri; // Returns cache URI for the thumbnail image
}
```

### Pattern 4: Instagram URL Validation
**What:** Validate and normalize Instagram URLs before processing.
**When to use:** Before calling Cobalt API.
**Example:**
```typescript
// Instagram URL formats:
// https://www.instagram.com/p/ABC123/           (post)
// https://www.instagram.com/reel/ABC123/        (reel)
// https://www.instagram.com/reels/ABC123/       (reels alternate)
// https://instagram.com/p/ABC123/               (no www)
// https://www.instagram.com/username/reel/ABC123/  (with username)
// https://www.instagram.com/stories/username/123/  (story -- may not work)

const INSTAGRAM_URL_REGEX = /^https?:\/\/(?:www\.)?instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/;

export function isValidInstagramUrl(url: string): boolean {
  return INSTAGRAM_URL_REGEX.test(url);
}

export function extractShortcode(url: string): string | null {
  const match = url.match(INSTAGRAM_URL_REGEX);
  return match ? match[1] : null;
}
```

### Pattern 5: Cobalt Server Setup Script
**What:** Docker convenience script for running Cobalt locally.
**When to use:** Development environment setup.
**Example:**
```yaml
# ~/cobalt/docker-compose.yml
services:
  cobalt:
    image: ghcr.io/imputnet/cobalt:10
    restart: unless-stopped
    ports:
      - "127.0.0.1:9000:9000/tcp"
    environment:
      API_URL: "http://127.0.0.1:9000/"
    # Optional: for private Instagram content
    # volumes:
    #   - ./cookies.json:/cookies.json

  watchtower:
    image: ghcr.io/containrrr/watchtower
    restart: unless-stopped
    command: --cleanup --interval 900 cobalt
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

### Anti-Patterns to Avoid
- **Scraping Instagram directly:** Instagram aggressively blocks scrapers, changes page structure frequently, and requires authentication. Use a maintained tool like Cobalt instead.
- **Storing video files permanently:** Videos are large and only needed for extraction. Always delete after extracting audio and thumbnail.
- **Using ffmpeg-kit for just audio extraction:** The library is archived, adds 15-30MB to app size, and you only need one operation. AVAssetExportSession is built into iOS.
- **Calling Cobalt public API (api.cobalt.tools):** The public instance uses bot protection and explicitly says it is "not intended to be used in other projects without explicit permission." Self-host instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Instagram video URL resolution | Custom scraper/parser for Instagram | Self-hosted Cobalt API | Instagram changes constantly, Cobalt community maintains compatibility |
| Audio extraction from video | Custom AVAudioEngine processing | AVAssetExportSession (via Expo module) | One-liner API, handles all codecs, produces .m4a directly |
| Video thumbnail capture | Manual frame extraction with AVAssetImageGenerator | expo-video-thumbnails | Already packaged for Expo, simple API, works in Expo Go |
| Instagram URL validation | Complex parser for all edge cases | Simple regex for /p/, /reel/, /reels/, /tv/ paths | Cover 95% of cases, let Cobalt handle the rest |
| Temp file cleanup | Custom GC / background cleanup | Simple try/finally with deleteAsync | Files are created and deleted in the same pipeline call |

**Key insight:** The extraction pipeline has three distinct steps (resolve URL, download, extract). Each step has a standard tool. The temptation is to combine steps or build custom solutions -- resist this and use the dedicated tool for each step.

## Common Pitfalls

### Pitfall 1: Expo Go Cannot Run Native Modules
**What goes wrong:** The local Expo module for audio extraction uses native Swift code. Expo Go does not support custom native modules.
**Why it happens:** Expo Go ships with a fixed set of native modules. Custom native code requires a dev client build.
**How to avoid:** Install `expo-dev-client`, run `npx expo prebuild`, and build with `npx expo run:ios`. This is a one-time transition.
**Warning signs:** "This module cannot be used in Expo Go" error at runtime.

### Pitfall 2: Cobalt Returns Different Response Types
**What goes wrong:** Developer only handles `tunnel` response, but Instagram carousel posts return `picker` response with multiple items.
**Why it happens:** Cobalt has 4 response types: `tunnel`, `redirect`, `picker`, `error`. Each requires different handling.
**How to avoid:** Handle all 4 status types explicitly. For `picker`, find the first video item.
**Warning signs:** "Cannot read property 'url' of undefined" errors on certain Instagram URLs.

### Pitfall 3: Video File Not Cleaned Up on Error
**What goes wrong:** If audio extraction fails, the downloaded video stays in the cache directory, consuming storage.
**Why it happens:** No try/finally around the extraction step.
**How to avoid:** Wrap extraction in try/finally that always calls `deleteAsync(videoUri)`.
**Warning signs:** Growing app cache size on device.

### Pitfall 4: Wrong Audio Format for Whisper
**What goes wrong:** Whisper-server rejects the audio file or produces garbled transcription.
**Why it happens:** Sending a format that the whisper-server `--convert` flag cannot handle, or wrong mimeType in upload.
**How to avoid:** AVAssetExportSession with `AVAssetExportPresetAppleM4A` produces `.m4a` files. The existing whisper.ts already sends with `mimeType: 'audio/m4a'`. The whisper-server `--convert` flag uses ffmpeg to convert to WAV internally. This chain is already validated.
**Warning signs:** 400/415 errors from whisper-server.

### Pitfall 5: Network Requests to Localhost Blocked on iOS
**What goes wrong:** Cobalt API call to `http://127.0.0.1:9000` fails due to App Transport Security.
**Why it happens:** iOS blocks non-HTTPS requests by default.
**How to avoid:** The app.json already has `NSAllowsLocalNetworking: true` which permits localhost HTTP connections (added in Phase 3.1 for whisper-server). This covers Cobalt too.
**Warning signs:** ATS policy error in console.

### Pitfall 6: Instagram Stories Not Supported
**What goes wrong:** User tries to share a story URL, Cobalt cannot download it.
**Why it happens:** Instagram stories are ephemeral and often require authentication even for public accounts.
**How to avoid:** Validate URL patterns and show a clear error message for unsupported URL types (stories). Focus on reels and posts.
**Warning signs:** Cobalt returns error for story URLs.

### Pitfall 7: expo-video-thumbnails Cache Bloat
**What goes wrong:** Thumbnails are generated to cache but the app creates many entries over time.
**Why it happens:** `getThumbnailAsync()` saves each thumbnail to cache and returns a cache URI. If the component re-renders, it may create duplicate cache entries.
**How to avoid:** Save the thumbnail to a permanent location (documentDirectory) with a predictable filename tied to the recipe, then delete the cache version. The `thumbnailUrl` field on the Recipe already exists for this.
**Warning signs:** Increasing app storage usage.

## Code Examples

### Complete Extraction Pipeline Integration
```typescript
// Source: Integration of Cobalt API + AVFoundation module + expo-video-thumbnails
// File: lib/extraction/extract.ts

import {
  cacheDirectory,
  makeDirectoryAsync,
  getInfoAsync,
  deleteAsync,
  downloadAsync,
  documentDirectory,
  copyAsync,
} from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { extractAudio } from '../../modules/audio-extractor';
import { resolveInstagramUrl } from './download';
import { isValidInstagramUrl } from './url-validator';

export interface ExtractionResult {
  audioUri: string;      // Cache URI to extracted .m4a audio
  thumbnailUri: string;  // Document directory URI to thumbnail image
}

const VIDEO_CACHE_DIR = `${cacheDirectory}wechef-videos/`;
const AUDIO_CACHE_DIR = `${cacheDirectory}wechef-audio/`;
const THUMBNAIL_DIR = `${documentDirectory}thumbnails/`;

async function ensureDir(dir: string) {
  const info = await getInfoAsync(dir);
  if (!info.exists) {
    await makeDirectoryAsync(dir, { intermediates: true });
  }
}

export async function extractFromInstagramUrl(
  instagramUrl: string
): Promise<ExtractionResult> {
  if (!isValidInstagramUrl(instagramUrl)) {
    throw new Error('Invalid Instagram URL');
  }

  await ensureDir(VIDEO_CACHE_DIR);
  await ensureDir(AUDIO_CACHE_DIR);
  await ensureDir(THUMBNAIL_DIR);

  // Step 1: Resolve Instagram URL to direct video URL via Cobalt
  const directUrl = await resolveInstagramUrl(instagramUrl);

  // Step 2: Download video to cache
  const timestamp = Date.now();
  const videoUri = `${VIDEO_CACHE_DIR}video-${timestamp}.mp4`;
  await downloadAsync(directUrl, videoUri);

  try {
    // Step 3: Extract audio (native module)
    const audioUri = `${AUDIO_CACHE_DIR}audio-${timestamp}.m4a`;
    await extractAudio(videoUri, audioUri);

    // Step 4: Extract thumbnail
    const thumbResult = await VideoThumbnails.getThumbnailAsync(videoUri, {
      time: 1000,
      quality: 0.7,
    });

    // Move thumbnail to persistent storage
    const thumbnailUri = `${THUMBNAIL_DIR}thumb-${timestamp}.jpg`;
    await copyAsync({ from: thumbResult.uri, to: thumbnailUri });

    return { audioUri, thumbnailUri };
  } finally {
    // Always clean up the video file
    try {
      await deleteAsync(videoUri, { idempotent: true });
    } catch {
      // Best-effort cleanup
    }
  }
}
```

### Updated Pipeline Store Integration
```typescript
// Source: Current lib/pipeline/store.ts with extraction integration
// Key change: replace mockDownload + mockExtract with real extraction

// import { mockDownload, mockExtract } from './mock-api';  // REMOVE
import { extractFromInstagramUrl } from '@/lib/extraction/extract';

// In startProcessing:
// Stage 1+2: Download + Extract (combined since extraction includes download)
set({ stage: 'downloading', progress: 0.1 });
const { audioUri, thumbnailUri } = await extractFromInstagramUrl(url);
set({ stage: 'transcribing', progress: 0.5 });

// Stage 3: Transcribe (unchanged)
const transcript = await transcribeAudio(audioUri);

// Clean up audio file after transcription
await deleteAsync(audioUri, { idempotent: true });

// ... rest unchanged, but include thumbnailUri in recipe
return { ...recipe, sourceUrl: url, thumbnailUrl: thumbnailUri };
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ffmpeg-kit-react-native for audio extraction | AVAssetExportSession via Expo native module | June 2025 (ffmpeg-kit archived) | Native iOS API, zero dependency, smaller binary |
| Instagram scraping with Puppeteer/Selenium | Self-hosted Cobalt API | 2024-2025 | Maintained by community, handles Instagram changes, clean API |
| Expo Go for all development | Dev client builds for native modules | Expo SDK 50+ (mature pattern) | Required for custom native code, enables AVFoundation access |
| react-native-ffmpeg | ffmpeg-kit-react-native -> also archived | 2023 -> June 2025 | Both are now archived; native APIs preferred for simple operations |

**Deprecated/outdated:**
- **ffmpeg-kit-react-native:** Archived June 2025. Community forks exist (@spreen, @apescoding) but have uncertain long-term maintenance.
- **Instagram Basic Display API:** Reached end-of-life December 4, 2024. Was never useful for video download anyway.
- **react-native-ffmpeg:** Superseded by ffmpeg-kit, which is also now archived.

## Open Questions

1. **Cobalt reliability for Instagram**
   - What we know: Cobalt supports Instagram reels and posts, and public content does not require cookies/auth.
   - What's unclear: How frequently does Instagram block Cobalt? Does it need cookies for certain content? How fast is the URL resolution?
   - Recommendation: Test with real Instagram reel URLs during implementation. Add cookies.json if needed.

2. **Dev client transition complexity**
   - What we know: The app currently uses Expo Go. Dev client requires `npx expo prebuild` and `npx expo run:ios`. Xcode must be installed.
   - What's unclear: Will existing packages (nativewind, expo-sqlite, etc.) work without issues after prebuild?
   - Recommendation: Do the dev client transition as the first task of this phase. Run the existing app in dev client before adding native module.

3. **Progress reporting during extraction**
   - What we know: AVAssetExportSession has a `progress` property (0.0-1.0) that can be polled. expo-file-system `createDownloadResumable` provides download progress callbacks.
   - What's unclear: Is the progress granular enough to be useful in the UI?
   - Recommendation: Start without progress sub-steps (just show "downloading" and "extracting" stages). Add granular progress later if needed.

4. **Video quality/size tradeoffs**
   - What we know: We request 720p from Cobalt. Instagram reels are typically 720p-1080p, ~10-60s duration, ~5-30MB.
   - What's unclear: Does lower quality video affect audio extraction quality?
   - Recommendation: Request 720p (sufficient for audio, smaller download). Audio quality is independent of video resolution since audio tracks are stored separately in the container.

## Sources

### Primary (HIGH confidence)
- [Expo Video Thumbnails docs](https://docs.expo.dev/versions/latest/sdk/video-thumbnails/) - SDK 54 compatible, works in Expo Go
- [Expo FileSystem legacy docs](https://docs.expo.dev/versions/latest/sdk/filesystem-legacy/) - downloadAsync, cacheDirectory, deleteAsync APIs
- [Expo Native Module tutorial](https://docs.expo.dev/modules/native-module-tutorial/) - Local module creation with --local flag
- [Expo custom native code guide](https://docs.expo.dev/workflow/customizing/) - Dev client requirement for native modules
- [AVAssetExportSession docs](https://developer.apple.com/documentation/avfoundation/avassetexportsession) - AVAssetExportPresetAppleM4A preset
- [Cobalt API documentation](https://github.com/imputnet/cobalt/blob/main/docs/api.md) - POST / endpoint, response formats, rate limiting

### Secondary (MEDIUM confidence)
- [Cobalt Docker setup](https://github.com/imputnet/cobalt/blob/main/docs/run-an-instance.md) - Self-hosting instructions
- [DeveloperMemos: Ripping Audio from Video in Swift](https://developermemos.com/posts/rip-audio-from-video-swift/) - AVAssetExportSession code example
- [Whisper supported formats](https://github.com/openai/whisper/discussions/41) - m4a is supported, format has minimal impact on transcription quality

### Tertiary (LOW confidence)
- [ffmpeg-kit retirement](https://tanersener.medium.com/saying-goodbye-to-ffmpegkit-33ae939767e1) - Archived June 2025, community forks available but uncertain
- [Cobalt Instagram cookie requirements](https://github.com/imputnet/cobalt/issues/435) - Public content works without cookies; needs validation with real URLs
- Various RapidAPI Instagram downloader listings - Reliability unverified, costs money

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Cobalt is actively maintained but Instagram download is inherently fragile; AVFoundation is HIGH confidence
- Architecture: HIGH - Pattern is well-established (resolve URL -> download -> extract -> cleanup)
- Pitfalls: HIGH - Based on direct documentation and known iOS/Expo constraints
- Instagram download: MEDIUM - Cobalt works for public content but Instagram may change behavior

**Key constraints from codebase analysis:**
- App currently runs in Expo Go (no ios/ directory, no eas.json)
- whisper.ts expects `mimeType: 'audio/m4a'` -- audio extraction MUST produce .m4a
- whisper-server uses `--convert` flag -- accepts .m4a and converts internally via ffmpeg
- app.json already has `NSAllowsLocalNetworking: true` -- localhost HTTP requests (for Cobalt at port 9000) will work
- Recipe type has `thumbnailUrl: string | null` field ready for use

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (Instagram download landscape changes frequently; Cobalt and Expo docs are stable)
