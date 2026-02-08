---
phase: 04-video-extraction
plan: 01
subsystem: extraction
tags: [native-module, audio, video, cobalt, instagram]
dependency_graph:
  requires: [expo-dev-client, expo-video-thumbnails, expo-file-system, expo-modules-core]
  provides: [extraction-services, native-audio-extraction, cobalt-client, url-validation]
  affects: [pipeline-store, ios-build]
tech_stack:
  added: [expo-dev-client, expo-video-thumbnails, AVFoundation, Cobalt]
  patterns: [native-expo-module, cache-directory-management, try-finally-cleanup]
key_files:
  created:
    - modules/audio-extractor/expo-module.config.json
    - modules/audio-extractor/ios/AudioExtractorModule.swift
    - modules/audio-extractor/ios/AudioExtractor.podspec
    - modules/audio-extractor/src/index.ts
    - modules/audio-extractor/package.json
    - lib/extraction/types.ts
    - lib/extraction/url-validator.ts
    - lib/extraction/download.ts
    - lib/extraction/audio.ts
    - lib/extraction/thumbnail.ts
    - lib/extraction/extract.ts
    - scripts/cobalt-server.sh
  modified:
    - package.json
    - package-lock.json
decisions:
  - Local Expo module with podspec and package.json for autolinking (not plugins array)
  - AVAssetExportPresetAppleM4A for audio extraction (produces .m4a compatible with Whisper)
  - Cobalt Docker container on port 9000 for Instagram URL resolution
  - Video files cleaned up in finally block (never persisted)
  - Thumbnails saved to documentDirectory for persistence
metrics:
  duration: ~8 min
  completed: 2026-02-08
---

# Phase 4 Plan 1: Extraction Infrastructure Summary

Dev client transition with native AVFoundation audio extraction module plus complete extraction service layer (URL validation, Cobalt download, audio extraction, thumbnail capture, orchestrator)

## Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Dev client transition and native audio module | 026fb7e | modules/audio-extractor/*, package.json |
| 2 | Extraction services and Cobalt script | 0c8f3ee | lib/extraction/*, scripts/cobalt-server.sh |

## What Was Built

### Task 1: Dev Client Transition and Native Audio Module

- Installed `expo-dev-client` (~6.0.20) and `expo-video-thumbnails` (~10.0.8)
- Created local Expo native module at `modules/audio-extractor/` with:
  - Swift module using AVFoundation's `AVAssetExportSession` with `AVAssetExportPresetAppleM4A`
  - TypeScript wrapper exposing `extractAudio(videoUri, outputUri)` function
  - Podspec and package.json for Expo autolinking
- Ran `expo prebuild --platform ios` to generate native Xcode project
- Ran `pod install` which successfully installed AudioExtractor (1.0.0) pod
- Xcode build succeeded (0 errors, 2 warnings)

### Task 2: Extraction Services

- **types.ts**: `ExtractionResult` and `CobaltResponse` interfaces
- **url-validator.ts**: Instagram URL regex validation and shortcode extraction (handles /p/, /reel/, /reels/, /tv/ paths)
- **download.ts**: Cobalt API client (`resolveInstagramUrl`) and video download to cache (`downloadVideo`)
- **audio.ts**: Wrapper around native module for audio track extraction to cache directory
- **thumbnail.ts**: Video frame capture using `expo-video-thumbnails` with persistence to documentDirectory
- **extract.ts**: Orchestrator that validates URL, resolves via Cobalt, downloads video, extracts audio + thumbnail, cleans up video in finally block
- **scripts/cobalt-server.sh**: Docker convenience script with start/stop/status commands

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added podspec and package.json for native module autolinking**
- **Found during:** Task 1, Step 3
- **Issue:** The `modules/audio-extractor/` module was discovered by Expo autolinking search but not resolved for iOS without a podspec. Adding to plugins array in app.json also failed.
- **Fix:** Created `ios/AudioExtractor.podspec` and `package.json` in the module directory. Re-ran `pod install` which successfully installed AudioExtractor (1.0.0).
- **Files created:** modules/audio-extractor/ios/AudioExtractor.podspec, modules/audio-extractor/package.json
- **Commit:** 026fb7e

**2. [Rule 3 - Blocking] Reverted app.json plugins entry**
- **Found during:** Task 1, Step 3
- **Issue:** Adding `./modules/audio-extractor` to app.json plugins array caused PluginError (config plugins are different from native modules). Expo local modules are auto-linked via expo-module.config.json, not the plugins array.
- **Fix:** Removed the plugins entry, kept the original plugins array.
- **Files modified:** app.json (reverted to original)
- **Commit:** 026fb7e

## Notes

- The Xcode build succeeds but Metro bundler fails to start due to a pre-existing lightningcss code signing issue (`library load disallowed by system policy`). This is unrelated to the audio extractor module and affects NativeWind/CSS processing. The native module itself compiles correctly.
- The app now requires dev client (`npx expo run:ios`) instead of Expo Go.
- Docker Desktop is required for Cobalt (Instagram URL resolution). See `scripts/cobalt-server.sh`.

## Self-Check: PASSED

All 12 created files verified present. Both commits (026fb7e, 0c8f3ee) verified in git log. cobalt-server.sh confirmed executable. npx tsc --noEmit passes with zero errors.
