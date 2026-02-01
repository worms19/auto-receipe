# Project Research Summary

**Project:** WeChef - Instagram Recipe Extraction App
**Domain:** Mobile productivity app (recipe extraction from video)
**Researched:** 2026-02-01
**Confidence:** MEDIUM-HIGH

## Executive Summary

WeChef is a personal iOS app that extracts structured recipes from Instagram cooking videos. Users share an Instagram video URL via iOS share sheet, the app downloads the video, extracts audio, transcribes speech using Whisper API, and structures the recipe using Claude AI with guaranteed JSON schema compliance. The result is a clean, searchable recipe stored locally in SQLite.

The recommended approach uses React Native with Expo SDK 52, expo-share-intent for URL capture, a third-party service (RapidAPI) for Instagram video download, FFmpeg for audio extraction, OpenAI Whisper for transcription ($0.006/min), and Claude Haiku 4.5 for recipe structuring ($0.002 per recipe). Total cost per recipe is approximately $0.01. The architecture is local-first with foreground processing to avoid iOS background task limitations.

Three critical risks demand attention: (1) FFmpeg's ecosystem is unstable following the June 2025 retirement of ffmpeg-kit-react-native, requiring use of community forks; (2) Instagram actively fights video scrapers with changes every 2-4 weeks, necessitating abstracted download layers with multiple fallbacks; (3) Apple App Store may reject the app under Guideline 5.2.3 for third-party content download, requiring careful framing as "recipe extraction" with no video persistence. Mitigation strategies include service layer abstraction for swappable implementations, server-side extraction options, and architectural constraints that ensure videos are never saved.

## Key Findings

### Recommended Stack

The stack is built on React Native 0.77+ with Expo SDK 52, TypeScript, and NativeWind v5 for styling (matching user's "shadcn" requirement via React Native Reusables). expo-sqlite provides local recipe storage with Drizzle ORM for type-safe queries. expo-share-intent handles iOS share sheet integration with a simple redirect pattern to avoid share extension memory limits.

**Core technologies:**
- **React Native 0.77+ / Expo SDK 52**: Platform foundation with New Architecture enabled by default
- **NativeWind v5 + React Native Reusables**: shadcn-style components for React Native
- **expo-sqlite + Drizzle ORM**: Local-first structured recipe storage
- **Community FFmpeg fork**: Audio extraction (ffmpeg-kit-react-native retired, using jdarshan5/ffmpeg-kit-react-native or @sheehanmunim/react-native-ffmpeg)
- **OpenAI Whisper API**: Speech-to-text transcription at $0.006/min
- **Claude Haiku 4.5**: Recipe structuring with guaranteed schema compliance at $1/$5 per 1M tokens
- **expo-share-intent**: iOS share sheet URL capture with deep link handoff
- **RapidAPI Instagram Downloader**: Third-party video download service (Instagram has no official API)

**Version confidence:** HIGH for Expo/React Native/SQLite/Whisper/Claude; LOW for FFmpeg due to ecosystem instability.

### Expected Features

**Must have (table stakes):**
- Share sheet integration - Core entry point, app is useless without it
- Structured recipe display - Separate ingredients list and steps, not raw transcript
- Recipe list view - Scrollable list with title and thumbnail
- Recipe detail view - Full recipe with photo, ingredients, steps, original URL
- Persistent local storage - Survives app restart
- Delete recipe - Basic CRUD operations
- Offline access - Kitchen has bad WiFi, local-first is expected

**Should have (competitive differentiators):**
- Serving size scaling - Adjust recipe quantities
- Cook mode - Large text, keep screen on, step navigation
- Timer integration - Detect cooking times, offer timers
- Recipe categories/tags - Organization at scale
- Search - Find by name or ingredient (deferred per user requirement)

**Defer (v2+):**
- User accounts / cloud sync - Personal tool, local-first MVP
- Social features - Not a social network
- Recipe discovery - Instagram is for discovery, app is for saving
- Meal planning / grocery lists - Major features, post-MVP
- Multi-platform (iPad/Mac) - iOS first, validate then expand
- TikTok/YouTube support - Instagram first, expand if successful

**Explicit anti-features:**
- Hard-coded categories (flexibility over opinionated structure)
- Aggressive onboarding (users want to save immediately)
- AI-generated recipes (extract existing, don't create new)

### Architecture Approach

The architecture follows a foreground processing pipeline: Share Extension captures URL -> Main app receives deep link -> Sequential pipeline (download video -> extract audio -> transcribe -> structure recipe) -> Save to SQLite -> Navigate to detail view. Processing takes 30-90 seconds with real-time progress UI. No background processing due to iOS limitations (15+ min intervals, no guaranteed timing).

**Major components:**
1. **Share Extension (expo-share-intent)** - Minimal URL capture, redirects to main app to avoid 120MB memory limit
2. **Processing Pipeline** - Orchestrates sequential steps with service abstractions for swappable implementations
3. **Video Download Service** - Instagram-specific wrapper around RapidAPI or similar third-party service
4. **Audio Extraction Service** - FFmpeg wrapper (community fork) for video-to-audio conversion
5. **Transcription Service** - Whisper API integration with noise-robust model selection
6. **AI Structuring Service** - Claude API with structured output mode for guaranteed JSON schema
7. **Recipe Store** - expo-sqlite with typed queries, stores recipes + metadata, file paths for thumbnails

**Key patterns:** Service layer abstraction for unstable dependencies (FFmpeg, Instagram extraction), foreground-only processing, local-first with SQLite, expo-share-intent for lightweight share extension, Expo Router for file-based navigation.

### Critical Pitfalls

1. **Instagram Video Download Breaks Constantly** - Instagram fights scrapers with changes every 2-4 weeks (doc_ids, rate limiting, TLS fingerprinting). Prevention: abstract download layer, multiple fallback methods, server-side extraction option, proactive monitoring, aggressive caching.

2. **App Store Rejection for Third-Party Content Download** - Apple Guideline 5.2.3 prohibits downloading media without authorization. Prevention: frame as "personal recipe extraction" not "video download", never save original video, process on-device, delete source files, no sharing features for extracted media.

3. **iOS Share Extension Memory Limit Crashes** - 120MB hard limit causes crashes (works in Simulator, fails on device). Prevention: use Hermes engine, minimal share extension UI (just URL capture), redirect to main app for all processing, avoid loading media in extension.

4. **AI Recipe Structuring Hallucinations** - LLMs confidently output incorrect data (wrong quantities, invented ingredients, missing steps). Prevention: confidence scoring, structured output with schema enforcement (Zod validation), user review step before saving, show original transcript alongside structured recipe, self-healing prompts on validation failure.

5. **Kitchen Audio Transcription Failures** - Background noise (sizzling, running water, exhaust fans) drops accuracy from 95%+ to below 80%. Prevention: use noise-robust model (Whisper large-v3), don't pre-process with noise reduction (paradoxically hurts ASR), preserve audio quality, build user correction UI, use context for error correction.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation & UI Shell
**Rationale:** Validate UI flow with mock data before adding API complexity. Ensures navigation, storage, and display patterns work before tackling unstable integrations.

**Delivers:** Working app skeleton - recipe list/detail screens, SQLite schema, navigation, mock data

**Addresses:** Recipe list view, recipe detail view, persistent local storage, delete recipe (table stakes features)

**Avoids:** Building complex pipeline before UI is validated

**Stack:** Expo SDK 52, React Native Reusables, expo-sqlite, Drizzle ORM, Expo Router

**Research flag:** LOW - Well-documented patterns, standard Expo setup

### Phase 2: Core Processing Pipeline (Mocked APIs)
**Rationale:** Build pipeline structure and orchestration with mock implementations. Test end-to-end flow including error states and progress UI before real API integration complexity.

**Delivers:** Processing screen with progress indicators, pipeline orchestration, file management (expo-file-system), error handling

**Addresses:** Pipeline structure, user feedback during processing

**Avoids:** Mixing architecture decisions with API integration challenges

**Stack:** expo-file-system/next, pipeline service interfaces

**Research flag:** LOW - Service abstraction is standard pattern

### Phase 3: Real API Integrations
**Rationale:** Each API has unique complexity. Tackle one at a time with proven pipeline structure. Order by stability: transcription (stable API) -> AI structuring (stable API with schema enforcement) -> video download (fragile) -> audio extraction (unstable ecosystem).

**Delivers:** Working transcription, recipe structuring, video download, audio extraction

**Addresses:** Core value proposition - Instagram video to structured recipe

**Avoids:** Pitfall #1 (Instagram fragility), Pitfall #4 (AI hallucinations), Pitfall #5 (audio quality)

**Integrations in order:**
1. Whisper API (stable, well-documented)
2. Claude API with structured outputs (stable, schema-enforced)
3. Instagram download via RapidAPI (fragile, needs abstraction)
4. FFmpeg audio extraction (unstable, use community fork)

**Stack:** OpenAI Whisper API, Claude Haiku 4.5, RapidAPI service, community FFmpeg fork

**Research flag:** HIGH for Instagram download and FFmpeg - both have ecosystem instability requiring phase-specific research for current state

### Phase 4: Share Extension Integration
**Rationale:** Share extension adds native iOS complexity. Save until after core pipeline works standalone. This de-risks native config plugin issues.

**Delivers:** expo-share-intent setup, deep link handling, end-to-end flow from iOS share sheet

**Addresses:** Share sheet integration (table stakes), complete user flow

**Avoids:** Pitfall #3 (share extension memory limit), Pitfall #6 (config plugin gotchas)

**Stack:** expo-share-intent, iOS share extension configuration

**Research flag:** MEDIUM - Config plugin has known gotchas but well-documented in expo-share-intent README

### Phase 5: Polish & Edge Cases
**Rationale:** Handle failures gracefully, improve UX, add nice-to-haves that don't change architecture.

**Delivers:** Error handling/retry logic, offline support, thumbnail extraction, better progress feedback

**Addresses:** Production readiness, edge cases

**Avoids:** Shipping brittle MVP that breaks on first error

**Research flag:** LOW - Standard error handling patterns

### Phase Ordering Rationale

- **Foundation first:** UI/storage working with mocks de-risks later integration work. Can always show what a recipe looks like even if API is broken.
- **Mocked pipeline before real APIs:** Proves architecture and error handling before tackling unstable dependencies (FFmpeg, Instagram).
- **Stable APIs before fragile ones:** Transcription and AI structuring are stable, well-documented. Instagram download and FFmpeg are fragile with ongoing maintenance needs.
- **Share extension last:** Native complexity isolated. Core pipeline can be tested via manual URL entry before adding share sheet.
- **Architecture supports swappability:** Service layer abstraction means FFmpeg can be swapped for alternatives, Instagram download can move server-side, transcription provider can change - all without touching pipeline logic.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Instagram Download):** Ecosystem changes frequently. Need current state of RapidAPI alternatives, latest Instagram scraping patterns, community fork status.
- **Phase 3 (FFmpeg Integration):** Community fork landscape in flux. Need to identify most stable fork, test actual audio extraction, validate Expo compatibility.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Expo + React Native + SQLite are well-documented with official guides.
- **Phase 2 (Pipeline):** Service abstraction is standard software architecture.
- **Phase 5 (Polish):** Error handling patterns are well-established.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | HIGH for Expo/RN/SQLite/Whisper/Claude; LOW for FFmpeg (ecosystem unstable) and Instagram download (fragile) |
| Features | HIGH | Table stakes validated across multiple recipe app competitors; user requirements clear |
| Architecture | HIGH | Foreground processing, local-first, service abstraction are proven patterns; share extension approach verified with official docs |
| Pitfalls | MEDIUM-HIGH | Critical risks (Instagram, FFmpeg, App Store, AI hallucinations) verified with multiple sources; some edge cases extrapolated |

**Overall confidence:** MEDIUM-HIGH

Research is comprehensive for stable components (Expo, React Native, SQLite, transcription/AI APIs). Lower confidence areas (FFmpeg, Instagram download) have clear mitigation strategies (abstraction, fallbacks, monitoring). Architectural decisions are sound and address known pitfalls.

### Gaps to Address

- **FFmpeg community fork selection:** ffmpeg-kit-react-native retired June 2025. Multiple community forks exist (jdarshan5, beedeez, @sheehanmunim). Need to test actual audio extraction with current fork status during Phase 3 planning. Fallback: send video directly to Whisper API (supports video files, extracts audio server-side).

- **Instagram download reliability:** RapidAPI and similar services abstract the scraping complexity but may still break. Need to identify 2-3 fallback services and test with real Instagram URLs during Phase 3. Fallback: allow user to manually download video via third-party app and import file.

- **App Store approval strategy:** No direct evidence of recipe extraction apps being approved/rejected. Apple Guideline 5.2.3 prohibits "downloading media without authorization" but interpretation varies. Mitigation strategy is solid (never persist video, frame as extraction not download) but needs validation. Fallback: TestFlight distribution or side-loading.

- **Transcription accuracy for cooking videos:** Whisper large-v3 is noise-robust but specific accuracy on kitchen audio (sizzling, clanking, music) needs validation with real recipe videos. Build user correction UI from day one to handle inevitable transcription errors.

- **AI prompt engineering for recipes:** Claude structured outputs guarantee schema compliance but prompt quality affects extraction accuracy. Will need iteration with real transcripts to optimize ingredient parsing, step ordering, quantity extraction during Phase 3.

## Sources

### Primary (HIGH confidence)
- [Expo SDK 52 Changelog](https://expo.dev/changelog/2024-11-12-sdk-52) - Platform foundation
- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/) - Local storage
- [Expo FileSystem Documentation](https://docs.expo.dev/versions/latest/sdk/filesystem/) - File downloads
- [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - Recipe structuring
- [OpenAI Pricing](https://platform.openai.com/docs/pricing) - Whisper API costs
- [React Native Reusables](https://reactnativereusables.com/) - UI components
- [expo-share-intent GitHub](https://github.com/achorein/expo-share-intent) - Share extension
- [Expo Local-First Architecture Guide](https://docs.expo.dev/guides/local-first/) - Architecture patterns

### Secondary (MEDIUM confidence)
- [FFmpegKit Retirement Discussion](https://github.com/arthenica/ffmpeg-kit/issues/1099) - Audio extraction challenges
- [Scrapfly: How to Scrape Instagram in 2026](https://scrapfly.io/blog/posts/how-to-scrape-instagram) - Instagram download fragility
- [Apple App Store Rejection for Video Download](https://devcommunity.x.com/t/app-store-rejection-for-video-download-using-official-x-apis-need-guidance-approval-clarification/254281) - App Store risk
- [iOS Share Extension Memory Limits](https://blog.kulman.sk/dealing-with-memory-limits-in-app-extensions/) - Share extension constraints
- [GoTranscript: AI Transcription Accuracy Benchmarks 2026](https://gotranscript.com/en/blog/ai-transcription-accuracy-benchmarks-2026) - Transcription accuracy
- [Deepgram: Noise Reduction Paradox](https://deepgram.com/learn/the-noise-reduction-paradox-why-it-may-hurt-speech-to-text-accuracy) - Audio processing
- Recipe app competitor analysis (Paprika, Mela, Honeydew, Flavorish)

### Tertiary (LOW confidence)
- Community fork status for ffmpeg-kit-react-native (needs validation)
- Instagram URL format change frequency (inferred from scraping reports)
- App Store approval for recipe extraction specifically (no direct examples)

---
*Research completed: 2026-02-01*
*Ready for roadmap: yes*
