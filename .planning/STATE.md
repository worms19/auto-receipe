# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Turn messy spoken recipe videos into structured, readable recipes you can actually cook from.
**Current focus:** Phase 4 - Video Extraction

## Current Position

Phase: 4 of 5 (Video Extraction)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-02-08 - Completed 04-01 extraction infrastructure
Progress: [█████████░] 90%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: ~5 min
- Total execution time: ~0.6 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan | Status |
|-------|-------|-------|----------|--------|
| 01-foundation-ui-shell | 2 | ~20 min | ~10 min | Complete |
| 02-processing-pipeline | 2 | ~10 min | ~5 min | Complete |
| 03-api-integrations | 2 | ~8 min | ~4 min | Complete |
| 03.1-local-whisper-server | 1 | ~2 min | ~2 min | Complete |
| 04-video-extraction | 1 | ~8 min | ~8 min | In progress |

**Recent Trend:**
- Last 7 plans: ~5 min avg
- Trend: stable

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
- Local Expo module with podspec and package.json for autolinking (not plugins array)
- AVAssetExportPresetAppleM4A for audio extraction (produces .m4a compatible with Whisper)
- Cobalt Docker container on port 9000 for Instagram URL resolution

### Pending Todos

None.

### Blockers/Concerns

- Pre-existing lightningcss code signing issue prevents Metro bundler from starting. Xcode builds succeed but the app cannot be launched in simulator until this is resolved. This affects NativeWind/CSS processing, not the extraction module.

## Session Continuity

Last session: 2026-02-08
Stopped at: Completed 04-01, ready for 04-02 (pipeline integration)
Resume file: .planning/phases/04-video-extraction/04-02-PLAN.md
