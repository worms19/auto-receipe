# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Turn messy spoken recipe videos into structured, readable recipes you can actually cook from.
**Current focus:** All phases complete — v1 milestone done

## Current Position

Phase: 5 of 5 (Share Extension)
Plan: 1 of 1 in current phase
Status: Complete
Last activity: 2026-02-08 - Completed Phase 5 (Share Extension)
Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: ~5 min
- Total execution time: ~0.8 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan | Status |
|-------|-------|-------|----------|--------|
| 01-foundation-ui-shell | 2 | ~20 min | ~10 min | Complete |
| 02-processing-pipeline | 2 | ~10 min | ~5 min | Complete |
| 03-api-integrations | 2 | ~8 min | ~4 min | Complete |
| 03.1-local-whisper-server | 1 | ~2 min | ~2 min | Complete |
| 04-video-extraction | 2 | ~15 min | ~7 min | Complete |
| 05-share-extension | 1 | ~5 min | ~5 min | Complete |

**Recent Trend:**
- Last 9 plans: ~5 min avg
- Trend: stable
- All phases complete

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Used Expo SDK 54 (latest) instead of SDK 52 from research
- Used --legacy-peer-deps for clsx/tailwind-merge due to React version conflict
- Installed expo-crypto for UUID generation (crypto.randomUUID not available in RN)
- Installed react-native-worklets for reanimated v4.x compatibility
- Used Zustand for pipeline state instead of XState (simpler for 4-stage pipeline)
- Stage-level progress mapping (0.25, 0.5, 0.75, 0.9, 1) instead of sub-stage progress
- Downgraded react-native-worklets to 0.5.1 for Expo 54 compatibility
- Modal blocks dismissal during processing, auto-saves recipe on completion
- Used expo-file-system/legacy for uploadAsync (v19 deprecated legacy methods)
- Retryable errors indicated via boolean flag on error class
- Used tool_choice pattern for Claude structured output (SDK compatibility)
- Used z.toJSONSchema() from Zod v4 instead of zod-to-json-schema package
- Local whisper.cpp server instead of OpenAI Whisper API to avoid fees
- __DEV__ global for endpoint switching (React Native built-in)
- isLocalWhisper derived from endpoint URL prefix, not __DEV__ directly
- Server-side NestJS architecture for video extraction (replaces client-side native module approach)
- Ollama/Mistral for recipe structuring instead of Claude API (local, free)
- ffmpeg on server for audio extraction instead of native AVAssetExportSession
- Cobalt + Whisper + Ollama all accessed from server, app just calls POST /extract
- Thumbnail sent as base64 in JSON response (shortcut, noted for improvement)
- expo-share-intent v5.x for iOS Share Extension (lightweight native extension, no RN in share sheet)
- Both URL and text activation rules for Instagram share compatibility
- patch-package required for expo-share-intent xcode fix

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-08
Stopped at: All v1 phases complete (Phases 1-5)
Resume file: None
