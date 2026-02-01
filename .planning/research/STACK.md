# Technology Stack

**Project:** WeChef - Instagram Recipe Extraction App
**Researched:** 2026-02-01
**Platform:** iOS only (React Native + Expo)

---

## Executive Summary

WeChef requires a pipeline: Share Sheet -> Instagram URL -> Video Download -> Audio Extraction -> Transcription -> AI Structuring -> Local Storage. The critical technical challenges are (1) downloading Instagram videos without an official API, and (2) extracting audio from video in React Native, which requires FFmpeg.

**Recommended approach:** Use a third-party Instagram download service (RapidAPI or similar), FFmpeg for audio extraction via community fork, OpenAI Whisper for transcription, Claude API for recipe structuring, and expo-sqlite for local storage.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React Native | 0.77+ | Cross-platform mobile framework | User specified; Expo SDK 52 uses RN 0.77 | HIGH |
| Expo SDK | 52 | Development platform | Managed workflow, OTA updates, simpler builds. SDK 52 is current stable with New Architecture enabled by default | HIGH |
| TypeScript | 5.x | Type safety | Industry standard for RN projects, catches errors at compile time | HIGH |

**Source:** [Expo SDK 52 Changelog](https://expo.dev/changelog/2024-11-12-sdk-52)

### UI Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| NativeWind | v5 (pre-release) | Tailwind CSS for React Native | User specified "shadcn" - NativeWind enables Tailwind classes in RN | HIGH |
| React Native Reusables | latest | shadcn-style components | Best port of shadcn/ui to React Native, uses NativeWind, includes RN Primitives (Radix port) | HIGH |
| React Native Reanimated | 3.x | Animations | Required for smooth UI transitions, included with Expo | HIGH |

**Source:** [React Native Reusables](https://reactnativereusables.com/)

**Important NativeWind caveats:**
- No cascading styles - each element must be styled directly
- No data-* attributes for variants on native - use props/state instead
- Text/TextInput require explicit font sizing

### Database / Local Storage

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| expo-sqlite | ~16.0.10 | Local SQLite database | Persists across app restarts, supports structured recipe data, encryption via SQLCipher, built-in key-value store | HIGH |
| Drizzle ORM | latest | TypeScript ORM | Type-safe queries, migrations, works with expo-sqlite, has Drizzle Studio for debugging | MEDIUM |

**Source:** [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)

**Why NOT AsyncStorage:** Recipes have structured data (ingredients, steps, metadata). SQLite handles queries, relationships, and scales better than key-value storage.

### iOS Share Extension

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| expo-share-intent | latest | Receive shared URLs from other apps | Simpler than expo-share-extension, redirects directly to main app, handles both iOS and Android | HIGH |

**Source:** [expo-share-intent on npm](https://www.npmjs.com/package/expo-share-intent)

**Alternative considered:** expo-share-extension (for custom share view like Pinterest). More complex, requires separate React Native bundle. Use expo-share-intent for MVP - user shares Instagram URL, app opens and processes.

### Video Download (Instagram)

| Technology | Approach | Purpose | Why | Confidence |
|------------|----------|---------|-----|------------|
| RapidAPI Instagram Downloader | API Service | Download Instagram video from URL | No official Instagram API for video download. Third-party APIs scrape/cache videos. Works without auth | MEDIUM |

**Source:** [RapidAPI Instagram Video Downloader](https://rapidapi.com/skdeveloper/api/instagram-video-downloader13)

**CRITICAL CONSIDERATIONS:**

1. **No Official API:** Instagram does not provide an API to download videos. All solutions rely on scraping or unofficial methods.

2. **Legal gray area:** Downloading Instagram videos may violate their Terms of Service. However, for personal use (not redistribution), this is generally tolerated. The app is a personal tool, not a commercial product redistributing content.

3. **Recommended services (in order of preference):**
   - **RapidAPI Instagram Downloader APIs** - Multiple options, pay-per-request, no auth needed
   - **Apify Instagram Downloader** - More robust, higher cost
   - **Self-hosted scraping** - Complex, requires maintenance, Instagram blocks aggressively

4. **Implementation approach:**
   ```typescript
   // Example: Call RapidAPI to get video URL
   const getVideoUrl = async (instagramUrl: string) => {
     const response = await fetch('https://instagram-downloader-api.p.rapidapi.com/download', {
       method: 'POST',
       headers: {
         'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ url: instagramUrl })
     });
     const data = await response.json();
     return data.videoUrl; // Direct MP4 URL
   };
   ```

5. **Fallback strategy:** If API fails, show error with manual copy option (user copies video URL from Instagram, pastes in app).

### File System / Download

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| expo-file-system/next | latest | Download and manage video/audio files | New API with File.downloadFileAsync, handles network downloads to local storage | HIGH |

**Source:** [Expo FileSystem Documentation](https://docs.expo.dev/versions/latest/sdk/filesystem/)

**Usage:**
```typescript
import { Directory, File, Paths } from 'expo-file-system/next';

const downloadVideo = async (videoUrl: string) => {
  const destination = new Directory(Paths.cache, 'videos');
  destination.create();
  const output = await File.downloadFileAsync(videoUrl, destination);
  return output.uri; // Local file path
};
```

### Audio Extraction (FFmpeg)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Community FFmpeg fork | varies | Extract audio from video | ffmpeg-kit-react-native was archived June 2025. Community forks exist but require manual setup | LOW |

**Source:** [FFmpegKit Retirement Discussion](https://github.com/arthenica/ffmpeg-kit/issues/1099)

**CRITICAL WARNING:** The main ffmpeg-kit-react-native package was archived. Options:

1. **Use community fork:** [jdarshan5/ffmpeg-kit-react-native](https://github.com/jdarshan5/ffmpeg-kit-react-native/releases) - Most active fork
2. **Self-host binaries:** Build FFmpeg locally, host on your own server
3. **@sheehanmunim/react-native-ffmpeg:** Claims to be "zero-configuration" with fixes included

**Recommended approach:**
```typescript
import { FFmpegKit } from 'ffmpeg-kit-react-native'; // or community fork

const extractAudio = async (videoPath: string): Promise<string> => {
  const audioPath = videoPath.replace('.mp4', '.m4a');
  const command = `-i ${videoPath} -vn -acodec copy ${audioPath}`;
  await FFmpegKit.execute(command);
  return audioPath;
};
```

**Alternative if FFmpeg fails:** Some transcription APIs (Whisper) accept video files directly and extract audio server-side. This avoids FFmpeg entirely but uploads larger files.

### Speech-to-Text (Transcription)

| Technology | Pricing | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| OpenAI Whisper API | $0.006/min | Transcribe audio to text | Cheapest option, high accuracy, batch processing, 25MB file limit (~30 min audio) | HIGH |

**Source:** [OpenAI Pricing](https://platform.openai.com/docs/pricing) (verified via multiple sources)

**Alternatives considered:**

| Service | Price/min | Notes |
|---------|-----------|-------|
| OpenAI Whisper | $0.006 | Best value, no streaming, batch only |
| OpenAI GPT-4o Mini Transcribe | $0.003 | 50% cheaper, newer model |
| Deepgram Nova-3 | $0.0043 | Real-time streaming, slightly cheaper |
| Google Cloud STT | $0.024 | 4x more expensive |
| AssemblyAI | $0.0065 | Similar to Whisper, better speaker diarization |

**Recommendation:** Start with OpenAI Whisper API. For recipe videos (1-5 minutes), cost is negligible ($0.006-0.03 per recipe). If you need real-time transcription later, evaluate Deepgram.

**Implementation:**
```typescript
const transcribeAudio = async (audioPath: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', {
    uri: audioPath,
    type: 'audio/m4a',
    name: 'audio.m4a'
  });
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: formData
  });

  const data = await response.json();
  return data.text;
};
```

### AI Recipe Structuring

| Technology | Pricing | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Claude API (Haiku 4.5) | $1/$5 per 1M tokens | Structure transcript into recipe | Structured outputs (Nov 2025), guaranteed JSON schema compliance, excellent instruction following | HIGH |

**Source:** [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)

**Why Claude over GPT:**
- **Structured outputs:** Guaranteed schema compliance via constrained decoding (no JSON parsing errors)
- **Cost:** Haiku 4.5 at $1/$5 per 1M tokens is comparable to GPT-4o-mini
- **Recipe extraction:** Anthropic specifically highlighted recipe extraction as a use case

**Pricing estimate per recipe:**
- Average transcript: ~500 words = ~700 tokens input
- Recipe output: ~300 tokens
- Cost per recipe: ~$0.002 (negligible)

**Implementation with structured output:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const recipeSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    prepTime: { type: 'number', description: 'minutes' },
    cookTime: { type: 'number', description: 'minutes' },
    servings: { type: 'number' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          quantity: { type: 'string' },
          unit: { type: 'string' },
          item: { type: 'string' },
          notes: { type: 'string' }
        },
        required: ['item']
      }
    },
    steps: {
      type: 'array',
      items: { type: 'string' }
    },
    tips: { type: 'array', items: { type: 'string' } },
    sourceUrl: { type: 'string' }
  },
  required: ['title', 'ingredients', 'steps']
};

const structureRecipe = async (transcript: string, sourceUrl: string) => {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20241022',
    max_tokens: 2048,
    headers: {
      'anthropic-beta': 'structured-outputs-2025-11-13'
    },
    messages: [{
      role: 'user',
      content: `Extract a structured recipe from this video transcript.
      Source URL: ${sourceUrl}

      Transcript:
      ${transcript}`
    }],
    output_format: {
      type: 'json',
      schema: recipeSchema
    }
  });

  return JSON.parse(response.content[0].text);
};
```

---

## Complete Technology Matrix

| Layer | Technology | Version | Confidence |
|-------|------------|---------|------------|
| Framework | React Native | 0.77+ | HIGH |
| Platform | Expo SDK | 52 | HIGH |
| Language | TypeScript | 5.x | HIGH |
| Styling | NativeWind | v5 | HIGH |
| Components | React Native Reusables | latest | HIGH |
| Database | expo-sqlite | ~16.0.10 | HIGH |
| ORM | Drizzle | latest | MEDIUM |
| Share Extension | expo-share-intent | latest | HIGH |
| Video Download | RapidAPI service | N/A | MEDIUM |
| File System | expo-file-system/next | latest | HIGH |
| Audio Extraction | Community FFmpeg fork | varies | LOW |
| Transcription | OpenAI Whisper API | whisper-1 | HIGH |
| AI Structuring | Claude Haiku 4.5 | haiku-4-5 | HIGH |

---

## Alternatives NOT Recommended

| Category | Rejected | Why Not |
|----------|----------|---------|
| UI | Gluestack UI | Less mature than React Native Reusables, more complex setup |
| UI | NativeCN | Fewer components, less active development |
| Database | AsyncStorage | Not suitable for structured data, no queries |
| Database | WatermelonDB | Overkill for personal app, complex setup |
| Video Download | Self-hosted scraping | Instagram blocks aggressively, requires constant maintenance |
| Audio Extraction | expo-av | Deprecated in SDK 52, removed in SDK 55 |
| Audio Extraction | expo-audio | Cannot extract audio from video, playback/recording only |
| Transcription | Google Cloud STT | 4x more expensive than Whisper |
| Transcription | On-device Whisper | Large model (~1GB), slow on mobile, complex setup |
| AI Structuring | GPT-4o | More expensive, no constrained JSON output guarantee |

---

## Installation Commands

```bash
# Create Expo project with TypeScript
npx create-expo-app WeChef --template expo-template-blank-typescript

# Core dependencies
npx expo install expo-sqlite expo-file-system

# UI (NativeWind + React Native Reusables)
npm install nativewind tailwindcss
npx tailwindcss init
# Follow NativeWind v5 setup: https://www.nativewind.dev/docs/getting-started/installation

# Share extension
npx expo install expo-share-intent

# API clients
npm install @anthropic-ai/sdk openai

# FFmpeg (use community fork - verify latest release)
npm install ffmpeg-kit-react-native
# NOTE: May require additional setup due to archived status

# ORM (optional but recommended)
npm install drizzle-orm
npm install -D drizzle-kit

# Animations
npx expo install react-native-reanimated

# Dev dependencies
npm install -D @types/react @types/react-native
```

---

## Environment Variables Required

```bash
# .env (DO NOT COMMIT)
RAPIDAPI_KEY=your_rapidapi_key          # For Instagram video download
OPENAI_API_KEY=your_openai_key          # For Whisper transcription
ANTHROPIC_API_KEY=your_anthropic_key    # For Claude recipe structuring
```

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| FFmpeg fork instability | HIGH | Test early, have fallback (send video directly to Whisper) |
| Instagram API blocking | MEDIUM | Use multiple RapidAPI services, implement retry logic |
| Expo SDK breaking changes | LOW | Pin versions, test before upgrading |
| API costs exceeding budget | LOW | ~$0.01 per recipe, negligible for personal use |

---

## Sources

### Official Documentation
- [Expo SDK 52 Release](https://expo.dev/changelog/2024-11-12-sdk-52)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)

### Libraries
- [React Native Reusables](https://reactnativereusables.com/)
- [NativeWind](https://www.nativewind.dev/)
- [expo-share-intent](https://github.com/achorein/expo-share-intent)

### Community Resources
- [FFmpegKit Retirement Guide](https://github.com/arthenica/ffmpeg-kit/issues/1099)
- [FFmpegKit Community Fork](https://github.com/jdarshan5/ffmpeg-kit-react-native)
- [Instagram Download via RapidAPI](https://rapidapi.com/skdeveloper/api/instagram-video-downloader13)

### Pricing References
- [OpenAI API Pricing](https://platform.openai.com/docs/pricing) - $0.006/min for Whisper
- [Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing) - $1/$5 per 1M tokens for Haiku 4.5
- [Speech-to-Text Comparison 2025](https://deepgram.com/learn/speech-to-text-api-pricing-breakdown-2025)
