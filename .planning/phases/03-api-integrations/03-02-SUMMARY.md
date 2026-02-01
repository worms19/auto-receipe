---
phase: 03-api-integrations
plan: 02
subsystem: api
tags: [anthropic, claude, ai, structured-output, recipe-structuring, tool-choice]

# Dependency graph
requires:
  - phase: 03-01
    provides: "Whisper transcription service, API config, error types"
provides:
  - "Claude recipe structuring service using tool_choice pattern"
  - "Real API integration in pipeline (Whisper + Claude)"
  - "End-to-end AI processing pipeline (mock download/extract -> real transcribe/structure)"
affects: [04-video-processing, 05-polish]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk"]
  patterns: ["tool_choice for structured JSON output", "Zod schema validation"]

key-files:
  created: ["lib/api/claude.ts"]
  modified: ["lib/pipeline/store.ts", "package.json"]

key-decisions:
  - "Used tool_choice pattern instead of output_config for structured output (SDK compatibility)"
  - "Used z.toJSONSchema() from Zod v4 instead of zod-to-json-schema package"
  - "Mock download/extract preserved for Phase 4 to replace"

patterns-established:
  - "tool_choice pattern: Force Claude to return structured JSON via tool call"
  - "Zod validation: Parse tool output through schema for type safety"

# Metrics
duration: ~5min
completed: 2026-02-01
---

# Phase 3 Plan 2: Claude Integration Summary

**Claude recipe structuring with tool_choice pattern for guaranteed JSON output, integrated with Whisper in pipeline**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-01T17:20:00Z
- **Completed:** 2026-02-01T17:25:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 4

## Accomplishments

- Installed @anthropic-ai/sdk for Claude API access
- Created lib/api/claude.ts with structureRecipe using tool_choice pattern for structured JSON
- Integrated real Whisper and Claude APIs into pipeline store
- Pipeline now calls real AI services (transcription and structuring stages)
- Mock download/extract preserved for Phase 4 to replace with real video processing

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Anthropic SDK and create Claude structuring service** - `5603186` (feat)
2. **Task 2: Integrate real APIs into pipeline store** - `8665b0b` (feat)
3. **Task 3: Verify API integration works end-to-end** - checkpoint approved (human verified)

**Plan metadata:** See final commit below (docs: complete plan)

## Files Created/Modified

- `lib/api/claude.ts` - Claude recipe structuring service with tool_choice pattern
- `lib/pipeline/store.ts` - Pipeline wired to real Whisper and Claude APIs
- `package.json` - Added @anthropic-ai/sdk dependency
- `package-lock.json` - Updated lock file

## Decisions Made

1. **tool_choice pattern for structured output**: Used `tools` array with `tool_choice: { type: 'tool', name: 'extract_recipe' }` to force Claude to return structured JSON via tool call. This guarantees valid JSON matching the schema.

2. **z.toJSONSchema() for schema conversion**: Zod v4 has built-in `z.toJSONSchema()` method, eliminating need for separate `zod-to-json-schema` package.

3. **Preserved mock download/extract**: Kept `mockDownload()` and `mockExtract()` in pipeline for now. Phase 4 will replace these with real video downloading and audio extraction.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** See [03-USER-SETUP.md](./03-USER-SETUP.md) for:
- Environment variables: `EXPO_PUBLIC_ANTHROPIC_API_KEY`
- API key source: Anthropic Console -> API Keys -> Create Key

## Next Phase Readiness

**Ready for Phase 4 (Video Processing):**
- Complete API layer in place (Whisper + Claude)
- Pipeline architecture ready for real video download/extract
- Error handling propagates API errors to user

**Blockers:** None

**Note:** Current pipeline will error at transcription stage because `mockExtract()` returns placeholder string, not real audio URI. This is expected - Phase 4 will provide real audio files from video extraction.

---
*Phase: 03-api-integrations*
*Completed: 2026-02-01*
