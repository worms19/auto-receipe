# Domain Pitfalls: WeChef

**Domain:** Instagram recipe video extraction iOS app
**Researched:** 2026-02-01
**Overall Confidence:** MEDIUM (multiple sources cross-referenced, some areas LOW confidence)

---

## Critical Pitfalls

Mistakes that cause rewrites, App Store rejection, or fundamental product failure.

---

### Pitfall 1: Instagram Video Download Breaks Constantly

**What goes wrong:** Instagram video download functionality stops working every 2-4 weeks. URLs change format, authentication requirements shift, and rate limiting gets more aggressive.

**Why it happens:** Instagram actively fights scrapers. They update `doc_ids` every 2-4 weeks, evolve blocking systems weekly, and use multiple detection layers: IP quality detection, TLS fingerprinting, rate limiting, and behavioral analysis.

**Consequences:**
- App becomes non-functional without warning
- Users see "video unavailable" errors
- Manual maintenance burden every few weeks
- Potential for complete breakage during review periods

**Prevention:**
1. **Abstract the download layer** - Build a clean interface so you can swap implementations without touching app logic
2. **Use multiple fallback methods** - Primary method + at least one backup approach
3. **Server-side extraction** - Move video fetching to a backend you control, allowing updates without app releases
4. **Monitor proactively** - Automated tests that run daily to detect breaks before users do
5. **Cache aggressively** - If a video was successfully extracted once, keep the audio/transcript

**Detection (warning signs):**
- `403 Forbidden` errors appearing in logs
- "Rate limit reached" messages
- Extraction success rate dropping below 90%
- New error types appearing: "unable to extract uploader id" or "unable to extract video url"

**Phase mapping:** Address in Phase 1 (core infrastructure). Don't proceed to transcription until download is robust.

**Confidence:** HIGH - Multiple GitHub issues and scraping guides confirm this pattern.

**Sources:**
- [Scrapfly: How to Scrape Instagram in 2026](https://scrapfly.io/blog/posts/how-to-scrape-instagram)
- [yt-dlp Instagram Issues](https://github.com/yt-dlp/yt-dlp/issues/11151)

---

### Pitfall 2: App Store Rejection for Third-Party Content Download

**What goes wrong:** Apple rejects the app under Guideline 5.2.3 (Legal), stating apps that download content from third-party sources without authorization are not permitted.

**Why it happens:** Apple explicitly prohibits apps that "allow saving or downloading media without authorization from third-party sources" - even when using official APIs. Instagram videos belong to their creators; downloading them without explicit permission violates Apple's IP guidelines.

**Consequences:**
- Complete App Store rejection
- Potential ban from future submissions
- Wasted development time if discovered late
- Legal exposure from Instagram/Meta

**Prevention:**
1. **Frame as "personal recipe extraction" not "video download"** - The app extracts recipes from videos the user is already viewing, not a general-purpose downloader
2. **Never save the original video** - Extract audio, transcribe, delete source. The user gets structured recipe data, not video files
3. **Process entirely on-device** - No server storing Instagram content
4. **Target personal use only** - No sharing features for extracted content, no library of videos
5. **Consider TestFlight/side-loading only** - If App Store is not critical, avoid the review entirely

**Detection (warning signs):**
- Any feature that saves, exports, or displays Instagram media
- Marketing language mentioning "download" or "save"
- Features that look like a media library

**Phase mapping:** Critical constraint from Day 1. Architecture must ensure video content is never persisted.

**Confidence:** HIGH - Apple Developer Forums explicitly confirm this rejection pattern.

**Sources:**
- [Apple App Store Rejection for Video Download](https://devcommunity.x.com/t/app-store-rejection-for-video-download-using-official-x-apis-need-guidance-approval-clarification/254281)
- [Instagram repost app rejected](https://developer.apple.com/forums/thread/657506)

---

### Pitfall 3: iOS Share Extension Memory Limit Crashes

**What goes wrong:** The share extension crashes immediately or during processing, showing `EXC_RESOURCE RESOURCE_TYPE_MEMORY (limit=120 MB)`.

**Why it happens:** iOS share extensions have a hard 120MB memory limit. Loading React Native + Expo + processing media easily exceeds this. The limit is disabled on Simulator, so crashes only appear on real devices.

**Consequences:**
- App appears broken to users (instant crash when sharing)
- Difficult to debug (works in Simulator, fails on device)
- May pass initial testing but fail on older/smaller devices
- Can't be fixed without architectural changes

**Prevention:**
1. **Use Hermes engine** - Reduces memory from ~92MB to ~50MB
2. **Minimal share extension UI** - Don't load your full app in the extension
3. **Redirect to main app quickly** - Share extension captures URL, hands off to main app for processing
4. **Avoid processing media in extension** - Don't load images, don't process video, just capture the URL
5. **Test on real devices with memory pressure** - Test on older devices (iPhone 8, SE)

**Detection (warning signs):**
- Works in Simulator, crashes on device
- Crashes on iPhone SE but works on iPhone 15 Pro
- Memory profiler shows >80MB in share extension

**Phase mapping:** Address in Phase 1 (Share Extension setup). Architecture decision: extension captures URL only, main app does all processing.

**Confidence:** HIGH - Well-documented iOS limitation with specific numbers.

**Sources:**
- [iOS Share Extension Memory Limits](https://blog.kulman.sk/dealing-with-memory-limits-in-app-extensions/)
- [React Native Share Extension Memory Issues](https://medium.com/kraaft-co/how-i-reached-the-limits-of-react-native-by-implementing-an-ios-share-extension-4f312b534f22)

---

### Pitfall 4: AI Recipe Structuring Hallucinations

**What goes wrong:** The LLM confidently outputs incorrect recipe data: wrong quantities, invented ingredients not mentioned in the video, missing steps, or unsafe combinations.

**Why it happens:** LLMs are trained to produce plausible outputs, not accurate ones. Recipe content looks similar across many recipes (flour, eggs, sugar appear everywhere), making hallucination likely. The model has no mechanism to say "I'm not sure."

**Consequences:**
- User follows recipe with wrong measurements, food fails
- Safety issues: wrong temperatures, missing allergen warnings
- User loses trust in app after one bad recipe
- No way to automatically detect hallucinations

**Prevention:**
1. **Confidence scoring** - LLM outputs confidence per field; low-confidence items flagged for user review
2. **Structured output with schema enforcement** - Use JSON schema validation (Zod) to catch malformed outputs
3. **Self-healing prompts** - If schema validation fails, re-prompt with error context
4. **User review step** - Always show extracted recipe for user confirmation before saving
5. **Reference the transcript** - Show original transcript alongside structured recipe so user can verify
6. **Conservative extraction** - Better to say "unclear" than to guess

**Detection (warning signs):**
- Recipe has ingredients not mentioned in transcript
- Quantities are suspiciously round (1 cup, 2 tbsp) when speaker used specific amounts
- Steps are generic ("cook until done") when speaker gave specific times
- Recipe matches common template recipes rather than spoken content

**Phase mapping:** Address in Phase 3 (AI Structuring). Build in validation and user review from the start.

**Confidence:** MEDIUM - Well-documented general LLM problem; specific recipe examples are extrapolated.

**Sources:**
- [We Cannot Trust AI to Create Recipes](https://blog.cheftalk.ai/we-cannot-trust-ai-to-create-recipes/)
- [Duke: It's 2026, Why Are LLMs Still Hallucinating?](https://blogs.library.duke.edu/blog/2026/01/05/its-2026-why-are-llms-still-hallucinating/)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded user experience.

---

### Pitfall 5: Kitchen Audio Transcription Failures

**What goes wrong:** Transcription accuracy drops from 95%+ to below 80% due to kitchen noise: sizzling, running water, exhaust fans, clanking pots, music in background.

**Why it happens:** Instagram cooking videos are recorded in real kitchens with ambient noise, not professional studios. ASR models perform well on clean audio but degrade significantly with background noise.

**Consequences:**
- Missing or garbled ingredients (user adds wrong amount)
- Steps out of order or incomplete
- Numbers misheard ("two" vs "to", "four" vs "for")
- Foreign ingredient names mangled

**Prevention:**
1. **Use noise-robust model** - Whisper large-v3 handles noise better than smaller variants; AssemblyAI and Deepgram also excel at noisy environments
2. **Don't pre-process with noise reduction** - Counterintuitively, noise reduction can hurt ASR accuracy (the "noise reduction paradox")
3. **Preserve audio quality** - Extract at highest bitrate available, don't compress
4. **Fallback to user correction** - Show transcript for user to edit obvious errors
5. **Context helps** - If transcription includes "flower" in a recipe context, suggest "flour"

**Detection (warning signs):**
- Transcripts with many `[inaudible]` or `[unclear]` markers
- Numbers appearing as words ("one hundred" instead of quantities)
- Ingredient names that don't exist

**Phase mapping:** Address in Phase 2 (Transcription). Choose model carefully, build in user editing.

**Confidence:** HIGH - Well-documented ASR limitation with specific accuracy numbers.

**Sources:**
- [GoTranscript: AI Transcription Accuracy Benchmarks 2026](https://gotranscript.com/en/blog/ai-transcription-accuracy-benchmarks-2026)
- [Deepgram: The Noise Reduction Paradox](https://deepgram.com/learn/the-noise-reduction-paradox-why-it-may-hurt-speech-to-text-accuracy)

---

### Pitfall 6: Expo Share Extension Config Plugin Gotchas

**What goes wrong:** Build fails, extension crashes, or features don't work due to subtle Expo config plugin requirements.

**Why it happens:** Share extensions are separate iOS targets with their own bundle IDs, entitlements, and restrictions. Many standard React Native patterns don't work.

**Consequences:**
- Builds fail on EAS but work locally
- Extension works in dev but crashes in production
- Firebase/analytics don't work in extension
- Credentials management becomes complex

**Prevention:**
1. **Exclude expo-updates** - Causes crashes in share extension; excluded by default in expo-share-extension 1.5.0+
2. **Fix font scaling** - Use `allowFontScaling={false}` or import Text/TextInput from expo-share-extension
3. **Separate Firebase config** - Create dedicated GoogleService-Info.plist for share extension bundle ID (`com.yourapp.ShareExtension`)
4. **Add privacy manifest** - For image/video types, add `NSPrivacyAccessedAPITypes` to app.json
5. **Clean up shared files** - Images/videos in app group container aren't auto-deleted; call `clearAppGroupContainer()`
6. **Fix Xcode node path** - If using yarn, copy `.xcode.env` contents to `.xcode.env.local`
7. **Use `npx expo prebuild --clean`** - When config changes don't take effect

**Detection (warning signs):**
- `EXC_BAD_ACCESS` crashes in extension
- "Cannot find native module" errors
- Extension works in Simulator but not on device
- Build works locally but fails on EAS

**Phase mapping:** Address in Phase 1 (Share Extension setup). Follow expo-share-extension docs exactly.

**Confidence:** HIGH - Documented in expo-share-extension README and GitHub issues.

**Sources:**
- [expo-share-extension GitHub](https://github.com/MaxAst/expo-share-extension)
- [Expo Troubleshooting](https://docs.expo.dev/build-reference/troubleshooting/)

---

### Pitfall 7: Measurement Unit Parsing Errors

**What goes wrong:** Recipe extraction produces incorrect or inconsistent measurements: "3-4 cups" becomes "6-4 cups" when scaled, volume units confused with weight units, metric/imperial mixing.

**Why it happens:** Cooking measurements are notoriously ambiguous. A "cup" of flour weighs different amounts depending on how it's measured. Speakers use casual language ("a good amount", "some"). AI doesn't understand that density varies by ingredient.

**Consequences:**
- Recipes produce wrong amounts of food
- Baking recipes fail (chemistry is precise)
- Users in different regions get wrong units
- Scaling recipes produces nonsense values

**Prevention:**
1. **Preserve original language** - Keep "2-3 tablespoons" as-is, don't try to normalize
2. **Show confidence on quantities** - Flag any measurements the AI is uncertain about
3. **Don't auto-convert units** - If speaker said "cups," store cups; conversion is lossy
4. **Handle ranges explicitly** - Parse "2-3 cups" as a range object, not two separate numbers
5. **Validate against common sense** - 50 cups of flour is probably wrong; flag for review

**Detection (warning signs):**
- Quantities with unusual precision (1.333 cups)
- Mixed unit systems in same recipe
- Quantities that don't match recipe yield (1 tbsp sugar for a cake)

**Phase mapping:** Address in Phase 3 (AI Structuring). Build measurement validation into schema.

**Confidence:** MEDIUM - General recipe parsing challenge; specific failures extrapolated.

**Sources:**
- [BC Open Textbooks: Converting Recipes](https://opentextbc.ca/basickitchenandfoodservicemanagement/chapter/convert-and-adjust-recipes-and-formulas/)

---

### Pitfall 8: LLM Structured Output Schema Failures

**What goes wrong:** LLM returns malformed JSON, misses required fields, renames properties, or includes unexpected fields. Validation throws errors, breaking the pipeline.

**Why it happens:** LLMs generate "most likely" token sequences, not schema-compliant outputs. Complex nested schemas increase failure probability. Generation interrupted by token limits produces invalid partial output.

**Consequences:**
- Pipeline crashes on unexpected output format
- Silent data corruption if validation is loose
- User sees error message instead of recipe
- Difficult to reproduce (non-deterministic failures)

**Prevention:**
1. **Use structured output mode** - OpenAI and Anthropic support schema-enforced outputs
2. **Validate with Zod at runtime** - Parse and validate all LLM outputs
3. **Self-healing retry** - On validation failure, re-prompt with error message for model to correct
4. **Set temperature=0** - Minimize randomness for structured tasks
5. **Keep schema simple** - Flat structures fail less than deeply nested ones
6. **Handle partial outputs** - If generation is interrupted, fail gracefully

**Detection (warning signs):**
- JSON parse errors in logs
- Zod validation errors
- Different field names than expected ("ingredients" vs "ingredient_list")
- Missing required fields

**Phase mapping:** Address in Phase 3 (AI Structuring). Schema enforcement from day one.

**Confidence:** HIGH - Well-documented LLM limitation with known solutions.

**Sources:**
- [Agenta: Guide to Structured Outputs](https://agenta.ai/blog/the-guide-to-structured-outputs-and-function-calling-with-llms)
- [AI SDK: Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable without major refactoring.

---

### Pitfall 9: Instagram URL Format Variations

**What goes wrong:** App fails to recognize valid Instagram URLs because URL formats vary: `/reel/`, `/reels/`, `/p/`, with or without query parameters, with or without `www.`, mobile vs desktop URLs.

**Why it happens:** Instagram has multiple URL patterns that have evolved over time. Users share links from different contexts (DMs, stories, web browser).

**Prevention:**
1. **Test all URL patterns** - `/reel/ABC123/`, `/reels/ABC123/`, `/p/ABC123/`, with query strings
2. **Normalize URLs early** - Strip tracking parameters, normalize to canonical form
3. **Regex with variants** - Pattern should match `instagram.com/(reel|reels|p)/[A-Za-z0-9_-]+`
4. **Handle share sheet edge cases** - Sometimes share sheet passes URL, sometimes page title + URL

**Phase mapping:** Address in Phase 1 (Share Extension). Part of initial URL handling.

**Confidence:** HIGH - Observable from testing different share scenarios.

---

### Pitfall 10: Rate Limiting on Transcription APIs

**What goes wrong:** Whisper API or other transcription service rate limits hit, causing requests to fail or queue excessively.

**Why it happens:** Users might share multiple videos in quick succession. Free tier limits are strict.

**Prevention:**
1. **Queue with backoff** - Don't fire concurrent requests; queue and process sequentially
2. **On-device as primary** - Use local Whisper for most cases; API as fallback
3. **Show progress** - User knows it's processing, not stuck
4. **Cache results** - Same video URL = same transcript, no need to re-process

**Phase mapping:** Address in Phase 2 (Transcription). Consider on-device first.

**Confidence:** MEDIUM - Depends on chosen transcription approach.

---

### Pitfall 11: Missing Transcript for Visual-Only Content

**What goes wrong:** Many recipe videos have no voiceover - just background music and on-screen text. Transcription returns music lyrics or nothing useful.

**Why it happens:** Certain video styles (trending on Instagram) use text overlays instead of speech. The app assumes audio contains recipe information.

**Prevention:**
1. **Detect speech presence** - Check if transcription contains recipe keywords
2. **OCR fallback** - For visual-heavy videos, extract on-screen text
3. **Graceful failure** - "This video doesn't appear to have spoken recipe instructions"
4. **User input option** - Allow manual recipe entry if extraction fails

**Phase mapping:** Address in Phase 2/3. Build detection logic, consider OCR as enhancement.

**Confidence:** MEDIUM - Observable pattern in Instagram recipe content.

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|----------------|------------|
| 1 | Share Extension | Memory limit crashes | Minimal extension UI, redirect to main app |
| 1 | URL Handling | Instagram URL format variations | Comprehensive regex, normalize early |
| 1 | Video Extraction | Instagram blocks requests | Abstract layer, server-side option, multiple fallbacks |
| 2 | Transcription | Kitchen noise accuracy | Use Whisper large-v3 or similar noise-robust model |
| 2 | Transcription | Visual-only content | Detect speech absence, consider OCR |
| 3 | AI Structuring | Hallucinations | Confidence scoring, user review step |
| 3 | AI Structuring | Schema validation failures | Zod validation, self-healing retry |
| 3 | AI Structuring | Measurement parsing | Preserve original language, validate quantities |
| 4 | App Store | Rejection for content download | Frame as recipe extraction, never save video |
| 4 | Distribution | Ongoing maintenance burden | Server-side extraction, monitoring |

---

## Anti-Patterns to Avoid

### 1. "Full App in Share Extension"
**Don't:** Load your entire React Native app in the share extension.
**Do:** Minimal UI that captures URL and hands off to main app.

### 2. "Persist Video Content"
**Don't:** Save downloaded video files or show video player.
**Do:** Extract audio, transcribe, delete source. Only persist recipe data.

### 3. "Trust LLM Output Blindly"
**Don't:** Save LLM-generated recipe without validation.
**Do:** Validate schema, show user for confirmation, flag uncertain fields.

### 4. "Hardcode Instagram URL Pattern"
**Don't:** Assume one URL format works forever.
**Do:** Abstract extraction layer, handle format variations, monitor for changes.

### 5. "Assume Clean Audio"
**Don't:** Expect studio-quality audio from cooking videos.
**Do:** Choose noise-robust transcription, build in user correction.

---

## Sources Summary

### HIGH Confidence (Official/Multiple Sources)
- [Apple Developer Forums - Share Extension Memory](https://developer.apple.com/forums/thread/73148)
- [expo-share-extension GitHub](https://github.com/MaxAst/expo-share-extension)
- [OpenAI Whisper](https://github.com/openai/whisper)
- [Scrapfly Instagram Scraping Guide](https://scrapfly.io/blog/posts/how-to-scrape-instagram)
- [Expo Documentation - Troubleshooting](https://docs.expo.dev/build-reference/troubleshooting/)

### MEDIUM Confidence (Single Source or Extrapolated)
- [ChefTalk: We Cannot Trust AI to Create Recipes](https://blog.cheftalk.ai/we-cannot-trust-ai-to-create-recipes/)
- [GoTranscript: AI Transcription Accuracy 2026](https://gotranscript.com/en/blog/ai-transcription-accuracy-benchmarks-2026)
- [Deepgram: Noise Reduction Paradox](https://deepgram.com/learn/the-noise-reduction-paradox-why-it-may-hurt-speech-to-text-accuracy)

### LOW Confidence (Requires Validation)
- App Store rejection specifics for recipe extraction apps (no direct examples found)
- Instagram URL format change frequency (based on general scraping reports)
