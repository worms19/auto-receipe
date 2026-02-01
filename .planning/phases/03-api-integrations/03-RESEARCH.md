# Phase 3: API Integrations - Research

**Researched:** 2026-02-01
**Domain:** OpenAI Whisper API, Anthropic Claude API, React Native/Expo API Integration
**Confidence:** HIGH

## Summary

This phase requires replacing mock API implementations with real OpenAI Whisper (transcription) and Anthropic Claude (recipe structuring) API calls. The research covered three critical areas: (1) How to call external APIs from React Native/Expo, (2) API key security patterns, and (3) Specific API usage for both OpenAI and Anthropic.

The key finding is that **API keys should NEVER be embedded in the client app**. For a production app, a backend proxy is required. However, for development/MVP purposes, the app can use environment variables with the understanding that keys are exposed in the bundle. The existing pipeline architecture with Zustand store and stage-based processing provides a clean integration point for the real API calls.

Both OpenAI and Anthropic have official JavaScript/TypeScript SDKs that work in React Native with some platform-specific considerations. Whisper requires multipart file upload (expo-file-system's uploadAsync is the proven approach for Android), while Claude's structured outputs feature guarantees valid JSON recipe extraction.

**Primary recommendation:** Create an API service layer in `lib/api/` with separate modules for transcription (Whisper) and structuring (Claude), using expo-file-system for audio uploads and @anthropic-ai/sdk with structured outputs for recipe extraction.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | latest | Claude API client | Official Anthropic SDK with TypeScript support, streaming, structured outputs |
| expo-file-system | ~18.0.x | File upload for Whisper | Required for Android multipart uploads; provides uploadAsync with progress |
| expo-secure-store | ~15.0.x | Secure key storage | Keychain (iOS) / Keystore (Android) encryption for runtime secrets |
| zod | ^3.x | Schema validation | Works with Claude SDK for typed structured outputs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| buffer | ^6.x | ArrayBuffer handling | Required for audio data handling on mobile platforms |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-file-system uploadAsync | openai npm SDK | OpenAI SDK's file handling doesn't work reliably on Android; uploadAsync is proven |
| Direct fetch | axios | Fetch is built-in and sufficient; axios adds bundle size without benefit here |
| expo-secure-store | react-native-keys | expo-secure-store is Expo-native, no native rebuild needed |

**Installation:**
```bash
npx expo install expo-file-system expo-secure-store
npm install @anthropic-ai/sdk zod buffer --legacy-peer-deps
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── api/
│   ├── config.ts        # API configuration, base URLs, timeouts
│   ├── whisper.ts       # OpenAI Whisper transcription service
│   ├── claude.ts        # Anthropic Claude structuring service
│   └── errors.ts        # Shared error types and handling
├── pipeline/
│   ├── store.ts         # Existing Zustand store (modify to use real APIs)
│   ├── types.ts         # Existing types
│   └── mock-api.ts      # Keep for testing/development toggle
└── types.ts             # Existing app types
```

### Pattern 1: API Service Module
**What:** Encapsulate each external API as a dedicated module with clear interface
**When to use:** Any external API integration
**Example:**
```typescript
// lib/api/whisper.ts
// Source: https://community.openai.com/t/sending-blob-to-whisper-api-in-react-native/708672
import * as FileSystem from 'expo-file-system';

const WHISPER_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

export interface TranscriptionResult {
  text: string;
}

export async function transcribeAudio(
  audioUri: string,
  apiKey: string
): Promise<TranscriptionResult> {
  const response = await FileSystem.uploadAsync(
    WHISPER_ENDPOINT,
    audioUri,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'audio/m4a',
      parameters: {
        model: 'whisper-1',
      },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Transcription failed: ${response.body}`);
  }

  return JSON.parse(response.body);
}
```

### Pattern 2: Structured Output with Zod Schema
**What:** Use Claude's structured outputs with Zod for guaranteed recipe format
**When to use:** Any LLM response that needs specific shape
**Example:**
```typescript
// lib/api/claude.ts
// Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const RecipeSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});

export type StructuredRecipe = z.infer<typeof RecipeSchema>;

export async function structureRecipe(
  transcript: string,
  apiKey: string
): Promise<StructuredRecipe> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    system: `You extract recipes from cooking video transcripts.
Extract the recipe title, all ingredients with quantities, and numbered cooking steps.
Be precise with measurements and include all steps mentioned.`,
    messages: [
      {
        role: 'user',
        content: `Extract the recipe from this transcript:\n\n${transcript}`,
      },
    ],
    output_config: { format: zodOutputFormat(RecipeSchema) },
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text);
}
```

### Pattern 3: Error Handling with Typed Errors
**What:** Create typed error classes for different failure modes
**When to use:** API integration where different errors need different handling
**Example:**
```typescript
// lib/api/errors.ts
export class APIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class TranscriptionError extends APIError {
  constructor(message: string, statusCode?: number) {
    super(message, statusCode, statusCode === 429 || statusCode === 503);
    this.name = 'TranscriptionError';
  }
}

export class StructuringError extends APIError {
  constructor(message: string, statusCode?: number) {
    super(message, statusCode, statusCode === 429 || statusCode === 529);
    this.name = 'StructuringError';
  }
}
```

### Anti-Patterns to Avoid
- **Embedding API keys in code:** Keys in source code are extracted from bundles; use env vars at minimum, backend proxy for production
- **Not setting timeouts:** API calls can hang; always configure reasonable timeouts (30s for transcription, 60s for structuring)
- **Ignoring stop_reason:** Claude may refuse requests or hit max_tokens; always check response.stop_reason
- **Catching all errors silently:** Different errors need different handling (retry vs. fail)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio file upload | Manual FormData construction | expo-file-system uploadAsync | Platform differences (Android vs iOS) are handled; multipart boundary issues solved |
| JSON parsing from LLM | String parsing with regex | Claude structured outputs | Guaranteed valid JSON; no parsing errors; schema validation built-in |
| Secure storage | AsyncStorage for keys | expo-secure-store | AsyncStorage is unencrypted; SecureStore uses Keychain/Keystore |
| Retry logic | Custom retry loops | Simple exponential backoff utility | Edge cases (max retries, jitter) are easy to miss |

**Key insight:** React Native API integration has platform-specific gotchas (especially Android file uploads) that are solved by established patterns. The OpenAI and Anthropic SDKs handle most complexity, but file upload for Whisper specifically requires expo-file-system on Android.

## Common Pitfalls

### Pitfall 1: OpenAI SDK File Upload on Android
**What goes wrong:** Using `openai.audio.transcriptions.create()` with file objects fails on Android
**Why it happens:** React Native's Blob/File implementation differs from Node.js; the SDK expects Node.js fs streams
**How to avoid:** Use expo-file-system's uploadAsync for Android, which handles multipart upload correctly
**Warning signs:** Works on iOS simulator/web but fails on Android device/emulator

### Pitfall 2: API Keys in EXPO_PUBLIC_ Variables
**What goes wrong:** Keys prefixed with EXPO_PUBLIC_ are bundled into the app and extractable
**Why it happens:** Expo inlines these values at build time; they're visible in the JS bundle
**How to avoid:** For MVP, accept the risk with usage limits on API keys; for production, use a backend proxy
**Warning signs:** API keys appearing in network requests from your app

### Pitfall 3: Not Handling Claude Refusals
**What goes wrong:** App crashes or shows raw error when Claude refuses a request
**Why it happens:** Claude may return stop_reason: "refusal" if content violates policies
**How to avoid:** Always check response.stop_reason; handle "refusal" and "max_tokens" gracefully
**Warning signs:** Occasional failures with safety-related content or long transcripts

### Pitfall 4: Audio Format Mismatch
**What goes wrong:** Whisper returns error 400 for audio files
**Why it happens:** Wrong MIME type specified or unsupported format from recording
**How to avoid:** Ensure expo-av records in supported format (m4a); specify correct mimeType in upload
**Warning signs:** "Invalid file format" or "Could not process audio" errors

### Pitfall 5: File Size Exceeds 25MB Limit
**What goes wrong:** Long recordings exceed Whisper's 25MB limit
**Why it happens:** High-quality audio recordings of long videos can exceed the limit
**How to avoid:** Compress audio before upload; consider chunking very long audio
**Warning signs:** Videos over ~30 minutes may exceed limit depending on quality

## Code Examples

Verified patterns from official sources:

### Whisper Transcription with Error Handling
```typescript
// Source: Community patterns + Expo docs
import * as FileSystem from 'expo-file-system';
import { TranscriptionError } from './errors';

const WHISPER_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
const TIMEOUT_MS = 60000; // 60 seconds for transcription

export interface TranscriptionOptions {
  language?: string; // ISO-639-1 code
  prompt?: string;   // Context hint
}

export async function transcribeAudio(
  audioUri: string,
  apiKey: string,
  options: TranscriptionOptions = {}
): Promise<string> {
  const parameters: Record<string, string> = {
    model: 'whisper-1',
  };

  if (options.language) parameters.language = options.language;
  if (options.prompt) parameters.prompt = options.prompt;

  try {
    const response = await FileSystem.uploadAsync(
      WHISPER_ENDPOINT,
      audioUri,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: 'audio/m4a',
        parameters,
      }
    );

    if (response.status === 200) {
      const result = JSON.parse(response.body);
      return result.text;
    }

    // Handle specific error codes
    if (response.status === 429) {
      throw new TranscriptionError('Rate limit exceeded', 429);
    }
    if (response.status === 413) {
      throw new TranscriptionError('Audio file too large (max 25MB)', 413);
    }

    throw new TranscriptionError(
      `Transcription failed: ${response.body}`,
      response.status
    );
  } catch (error) {
    if (error instanceof TranscriptionError) throw error;
    throw new TranscriptionError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
```

### Claude Recipe Structuring with Structured Outputs
```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { StructuringError } from './errors';
import { NewRecipe } from '@/lib/types';

const RecipeSchema = z.object({
  title: z.string().describe('The name of the dish'),
  ingredients: z.array(z.string()).describe('List of ingredients with quantities'),
  steps: z.array(z.string()).describe('Numbered cooking steps in order'),
});

const SYSTEM_PROMPT = `You are a culinary expert that extracts recipes from cooking video transcripts.

Your task:
1. Identify the dish name from the transcript
2. Extract ALL ingredients mentioned, with specific quantities where stated
3. Extract cooking steps in the correct order
4. If quantities aren't specified, make reasonable estimates based on context

Be thorough - don't miss any ingredients or steps mentioned in the transcript.`;

export async function structureRecipe(
  transcript: string,
  apiKey: string
): Promise<NewRecipe> {
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract the recipe from this cooking video transcript:\n\n${transcript}`,
        },
      ],
      output_config: { format: zodOutputFormat(RecipeSchema) },
    });

    // Check for issues
    if (response.stop_reason === 'refusal') {
      throw new StructuringError('Claude refused to process this content');
    }
    if (response.stop_reason === 'max_tokens') {
      throw new StructuringError('Response truncated - transcript may be too long');
    }

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new StructuringError('Unexpected response format');
    }

    const recipe = JSON.parse(content.text);

    return {
      title: recipe.title,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      sourceUrl: null,
      thumbnailUrl: null,
    };
  } catch (error) {
    if (error instanceof StructuringError) throw error;
    if (error instanceof Anthropic.APIError) {
      throw new StructuringError(error.message, error.status);
    }
    throw new StructuringError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
```

### API Configuration Module
```typescript
// lib/api/config.ts
import * as SecureStore from 'expo-secure-store';

const OPENAI_KEY_STORAGE = 'openai_api_key';
const ANTHROPIC_KEY_STORAGE = 'anthropic_api_key';

// For development: fall back to env vars
// For production: require secure store
export async function getOpenAIKey(): Promise<string> {
  const storedKey = await SecureStore.getItemAsync(OPENAI_KEY_STORAGE);
  if (storedKey) return storedKey;

  // Development fallback
  const envKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (envKey) return envKey;

  throw new Error('OpenAI API key not configured');
}

export async function getAnthropicKey(): Promise<string> {
  const storedKey = await SecureStore.getItemAsync(ANTHROPIC_KEY_STORAGE);
  if (storedKey) return storedKey;

  // Development fallback
  const envKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (envKey) return envKey;

  throw new Error('Anthropic API key not configured');
}

export async function setOpenAIKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(OPENAI_KEY_STORAGE, key);
}

export async function setAnthropicKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(ANTHROPIC_KEY_STORAGE, key);
}
```

### Updated Pipeline Store Integration
```typescript
// lib/pipeline/store.ts - modification example
import { transcribeAudio } from '@/lib/api/whisper';
import { structureRecipe } from '@/lib/api/claude';
import { getOpenAIKey, getAnthropicKey } from '@/lib/api/config';

// In startProcessing:
// Replace mockTranscribe() with:
const openaiKey = await getOpenAIKey();
const transcript = await transcribeAudio(audioUri, openaiKey);

// Replace mockStructure() with:
const anthropicKey = await getAnthropicKey();
const recipe = await structureRecipe(transcript, anthropicKey);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| whisper-1 only | gpt-4o-transcribe, gpt-4o-mini-transcribe | 2025 | Better accuracy, speaker diarization support |
| JSON mode prompting | Structured outputs (output_config.format) | Late 2025 | Guaranteed valid JSON, no parsing errors |
| output_format param | output_config.format param | Early 2026 | API migration (old still works) |
| Manual JSON schema | Zod/Pydantic helpers in SDKs | 2025 | Type-safe schemas, automatic transformation |

**Deprecated/outdated:**
- **output_format parameter:** Moved to output_config.format; old param works but use new format
- **Beta headers for structured outputs:** No longer required as of GA release
- **claude-3-* models for structured outputs:** Only Claude 4.5 family supports guaranteed structured outputs

## Open Questions

Things that couldn't be fully resolved:

1. **Audio extraction from video**
   - What we know: Phase 2 has "extracting" stage that returns mock data
   - What's unclear: How video URLs will be processed to extract audio (download + ffmpeg? expo-av?)
   - Recommendation: This is Phase 2's domain; assume audioUri is provided to transcription

2. **Rate limiting strategy**
   - What we know: Both APIs have rate limits; 429 responses indicate throttling
   - What's unclear: Exact limits for the user's API tier; whether queuing is needed
   - Recommendation: Implement simple retry with exponential backoff (3 attempts, 1s/2s/4s delays)

3. **Optimal Claude model selection**
   - What we know: Sonnet 4.5 is recommended for "balanced performance"; Haiku 4.5 is fastest/cheapest
   - What's unclear: Quality difference for recipe extraction specifically
   - Recommendation: Start with claude-sonnet-4-5-20250929; can downgrade to Haiku if cost is concern

## Sources

### Primary (HIGH confidence)
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) - Installation, usage, streaming
- [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - JSON schema, Zod integration
- [Claude Messages API](https://platform.claude.com/docs/en/api/messages) - Request/response format, models
- [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) - File upload, multipart
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) - Secure key storage
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/) - EXPO_PUBLIC_ usage

### Secondary (MEDIUM confidence)
- [OpenAI Community: Whisper in React Native](https://community.openai.com/t/sending-blob-to-whisper-api-in-react-native/708672) - FileSystem.uploadAsync pattern verified by multiple users
- [OpenAI Audio API](https://platform.openai.com/docs/api-reference/audio/) - File formats, size limits (25MB)
- [designdebt.club: OpenAI audio in React Native](https://designdebt.club/openai-audio-transcription-and-synthesis-in-react-native/) - Platform differences (Android vs Web)

### Tertiary (LOW confidence)
- Various Medium articles on React Native architecture patterns - General guidance only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDKs and Expo packages, well documented
- Architecture: HIGH - Patterns verified from official sources and community consensus
- Pitfalls: HIGH - Documented issues from official forums and community reports
- Whisper Android pattern: MEDIUM - Community-verified but not officially documented by OpenAI

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - APIs are stable but check for SDK updates)
