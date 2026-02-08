# Roadmap: WeChef

## Overview

WeChef transforms Instagram cooking videos into structured recipes. This roadmap delivers the app in five phases: first building the UI shell with local storage (mock data), then the processing pipeline structure, followed by real API integrations (stable Whisper/Claude before fragile Instagram/FFmpeg), share extension integration, and finally polish. Each phase delivers a verifiable capability that the next phase builds upon.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & UI Shell** - Working app skeleton with recipe list/detail, local storage, mock data
- [x] **Phase 2: Processing Pipeline** - Pipeline orchestration with progress UI, mocked API calls
- [x] **Phase 3: API Integrations** - Real transcription (Whisper) and recipe structuring (Claude)
- [ ] **Phase 3.1: Local Whisper Server** - Local whisper.cpp server to replace OpenAI API (INSERTED)
- [ ] **Phase 4: Video Extraction** - Instagram download, audio extraction, thumbnail capture
- [ ] **Phase 5: Share Extension** - iOS share sheet integration for complete user flow

## Phase Details

### Phase 1: Foundation & UI Shell
**Goal**: User can browse, view, save, and delete recipes from a working app (using mock data)
**Depends on**: Nothing (first phase)
**Requirements**: DISP-01, DISP-02, DISP-03, STOR-01, STOR-02, STOR-03, STOR-04, COLL-01, COLL-02
**Success Criteria** (what must be TRUE):
  1. User can view a scrollable list of saved recipes with titles and thumbnails
  2. User can tap a recipe to see full detail view with ingredients, steps, photo, and original URL link
  3. User can save a recipe and it persists after app restart
  4. User can delete a recipe from the collection
  5. Recipes are viewable offline after saving
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md - Project setup, NativeWind config, SQLite database layer
- [x] 01-02-PLAN.md - Recipe list/detail UI, delete functionality, mock data

### Phase 2: Processing Pipeline
**Goal**: User sees processing status while app extracts recipe (pipeline structure with mock APIs)
**Depends on**: Phase 1
**Requirements**: PROC-03
**Success Criteria** (what must be TRUE):
  1. User can enter an Instagram URL manually and trigger processing
  2. User sees real-time progress indicator during processing (downloading, extracting, transcribing, structuring)
  3. User is notified when processing completes or fails
  4. Mock recipe is saved to collection after processing completes
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md - Pipeline foundation with Zustand store, mock APIs, URL input, progress indicator
- [x] 02-02-PLAN.md - Processing modal integration with home screen, recipe saving

### Phase 3: API Integrations
**Goal**: App transcribes audio and structures recipes using real APIs (Whisper and Claude)
**Depends on**: Phase 2
**Requirements**: PROC-01, PROC-02
**Success Criteria** (what must be TRUE):
  1. Audio file is transcribed to text via Whisper API
  2. Transcript is structured into recipe format (ingredients list, numbered steps) via Claude API
  3. Structured recipe is saved with correct data (not mock data)
  4. Processing handles API errors gracefully with user feedback
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md - API foundation (errors, config) and Whisper transcription service
- [ ] 03-02-PLAN.md - Claude structuring service and pipeline integration

### Phase 3.1: Local Whisper Server (INSERTED)
**Goal**: Local whisper.cpp transcription server replaces OpenAI Whisper API, eliminating API fees
**Depends on**: Phase 3
**Requirements**: PROC-01 (transcription -- local implementation)
**Success Criteria** (what must be TRUE):
  1. whisper.cpp server runs locally and accepts audio files via OpenAI-compatible `/v1/audio/transcriptions` endpoint
  2. App's whisper.ts points to local server instead of api.openai.com
  3. Audio file is transcribed to text via local Whisper model
  4. Transcription quality is acceptable for recipe content
**Plans**: 1 plan

Plans:
- [ ] 03.1-01-PLAN.md -- App code changes, startup script, and end-to-end verification

### Phase 4: Video Extraction
**Goal**: App downloads Instagram video, extracts audio, and captures thumbnail
**Depends on**: Phase 3
**Requirements**: EXTR-01, EXTR-02, EXTR-03
**Success Criteria** (what must be TRUE):
  1. App downloads video from valid Instagram URL
  2. Audio track is extracted from downloaded video
  3. Thumbnail image is captured from video
  4. Temporary video file is deleted after processing (never persisted)
  5. Extraction handles Instagram URL variations and failures gracefully
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Share Extension
**Goal**: User can share Instagram URL directly from iOS to app and receive structured recipe
**Depends on**: Phase 4
**Requirements**: INPUT-01, INPUT-02
**Success Criteria** (what must be TRUE):
  1. App appears in iOS share sheet when user shares Instagram URL
  2. Shared URL is validated as Instagram video link
  3. App opens and begins processing automatically after share
  4. Complete flow works: share from Instagram -> processing -> recipe saved to collection
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 3.1 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & UI Shell | 2/2 | Complete | 2026-02-01 |
| 2. Processing Pipeline | 2/2 | Complete | 2026-02-01 |
| 3. API Integrations | 2/2 | Complete | 2026-02-01 |
| 3.1. Local Whisper Server | 0/1 | Not started | - |
| 4. Video Extraction | 0/2 | Not started | - |
| 5. Share Extension | 0/1 | Not started | - |

---
*Roadmap created: 2026-02-01*
*Coverage: 17/17 v1 requirements mapped*
