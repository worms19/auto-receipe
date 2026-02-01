# Architecture Patterns

**Domain:** Recipe extraction from Instagram videos (iOS)
**Researched:** 2026-02-01
**Confidence:** MEDIUM (core patterns verified with official docs; FFmpeg ecosystem in flux post-retirement)

## Recommended Architecture

```
+------------------+     +------------------+     +------------------+
|   Share Sheet    |     |   Main App       |     |   External APIs  |
|   (iOS Share     |---->|   (Expo Router)  |---->|   (Transcription |
|    Extension)    |     |                  |     |    + AI)         |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+------------------+     +------------------+     +------------------+
|   App Group      |     |   Processing     |     |   Response       |
|   Container      |     |   Pipeline       |     |   Parser         |
|   (Shared Files) |     |   (Foreground)   |     |                  |
+------------------+     +------------------+     +------------------+
                                 |
                                 v
                         +------------------+
                         |   Local Storage  |
                         |   (expo-sqlite)  |
                         +------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Share Extension** | Receives Instagram URL from iOS share sheet, validates URL, hands off to main app | Main App (via deep link + app group) |
| **URL Receiver Screen** | Displays processing status, initiates pipeline | Processing Pipeline, Navigation |
| **Processing Pipeline** | Orchestrates: download -> extract audio -> transcribe -> structure | Video Service, Audio Service, Transcription API, AI API |
| **Video Download Service** | Downloads video from Instagram URL to local filesystem | expo-file-system, Instagram (or third-party API) |
| **Audio Extraction Service** | Extracts audio track from video file using FFmpeg | ffmpeg-kit (community fork), expo-file-system |
| **Transcription Service** | Sends audio to transcription API (Whisper or similar) | External API, expo-file-system |
| **AI Structuring Service** | Sends transcript to AI API for recipe extraction | External API (Claude/OpenAI) |
| **Recipe Store** | Persists recipes locally, provides query interface | expo-sqlite, React components |
| **Recipe List Screen** | Displays saved recipes in scrollable list | Recipe Store, Navigation |
| **Recipe Detail Screen** | Shows full recipe with ingredients, steps, photo, source URL | Recipe Store |

### Data Flow

```
1. USER SHARES URL
   Instagram App -> iOS Share Sheet -> Share Extension

2. SHARE EXTENSION HANDOFF
   Share Extension captures URL
   -> Stores URL in App Group container (optional)
   -> Calls openHostApp('process?url=${encodedUrl}')
   -> Extension closes

3. MAIN APP RECEIVES DEEP LINK
   Expo Router intercepts deep link
   -> Routes to /process screen with URL param
   -> Displays "Processing..." UI

4. PROCESSING PIPELINE (Sequential, Foreground)
   a) Download Video
      URL -> Video Download Service -> video.mp4 in Paths.cache

   b) Extract Audio
      video.mp4 -> FFmpeg Service -> audio.m4a in Paths.cache

   c) Transcribe
      audio.m4a -> Transcription API -> transcript text

   d) Structure Recipe
      transcript -> AI API -> structured JSON
      {
        title: string,
        ingredients: string[],
        steps: string[],
        servings?: string,
        prepTime?: string,
        cookTime?: string,
        notes?: string
      }

   e) Save Recipe
      Structured recipe + metadata -> Recipe Store -> SQLite

   f) Cleanup
      Delete video.mp4 and audio.m4a from cache

5. NAVIGATION TO RESULT
   Processing complete -> Navigate to Recipe Detail screen

6. BROWSING RECIPES
   Recipe List screen -> Query Recipe Store -> Display list
   User taps -> Navigate to Recipe Detail screen
```

## Patterns to Follow

### Pattern 1: Share Extension with Deep Link Handoff

**What:** Use `expo-share-intent` for simple URL reception that redirects to main app via deep link. Avoid custom share extension UI (expo-share-extension) unless you need Pinterest-style in-extension interaction.

**Why:** expo-share-intent is lighter, easier to maintain, and sufficient for URL-only workflows. The main app handles all processing, avoiding share extension memory limits (120MB) and compatibility issues.

**Configuration (app.json):**
```json
{
  "expo": {
    "scheme": "wechef",
    "plugins": [
      [
        "expo-share-intent",
        {
          "iosActivationRules": {
            "NSExtensionActivationSupportsWebURLWithMaxCount": 1
          }
        }
      ]
    ]
  }
}
```

**Usage:**
```typescript
// app/_layout.tsx
import { useShareIntent } from 'expo-share-intent';

export default function RootLayout() {
  const { shareIntent } = useShareIntent();

  useEffect(() => {
    if (shareIntent?.url) {
      router.push(`/process?url=${encodeURIComponent(shareIntent.url)}`);
    }
  }, [shareIntent]);

  return <Stack />;
}
```

**Confidence:** HIGH (verified with official expo-share-intent docs)

### Pattern 2: Foreground Processing Pipeline

**What:** Run the entire video->audio->transcript->recipe pipeline in the foreground while user waits. Do NOT attempt background processing for this workflow.

**Why:**
- iOS background tasks have 15+ minute minimum intervals and no guaranteed execution timing
- Video/audio processing can exceed background task time limits
- User expects immediate feedback when sharing a URL
- Processing typically takes 30-90 seconds total, acceptable for foreground wait

**Implementation:**
```typescript
// services/pipeline.ts
export async function processInstagramUrl(url: string): Promise<Recipe> {
  // Each step updates UI via state or callbacks
  const videoPath = await downloadVideo(url);
  const audioPath = await extractAudio(videoPath);
  const transcript = await transcribeAudio(audioPath);
  const recipe = await structureRecipe(transcript, url);

  // Cleanup temp files
  await cleanupTempFiles([videoPath, audioPath]);

  return recipe;
}
```

**Confidence:** HIGH (background task limitations verified with Expo docs)

### Pattern 3: Service Layer Abstraction

**What:** Wrap each external dependency (FFmpeg, transcription API, AI API) in a service module with clean interface.

**Why:**
- FFmpeg ecosystem is unstable (kit retired, community forks emerging)
- Transcription providers may change (Whisper, Deepgram, AssemblyAI)
- AI providers may change (Claude, OpenAI, local models)
- Abstraction allows swapping implementations without changing pipeline

**Structure:**
```
src/
  services/
    video/
      index.ts         # Public interface
      instagram.ts     # Instagram-specific download logic
      download.ts      # Generic download utilities
    audio/
      index.ts         # Public interface
      ffmpeg.ts        # FFmpeg wrapper (swappable)
    transcription/
      index.ts         # Public interface
      whisper.ts       # Whisper API implementation
    ai/
      index.ts         # Public interface
      claude.ts        # Claude API implementation
      prompts.ts       # Recipe extraction prompts
    storage/
      index.ts         # Public interface
      sqlite.ts        # SQLite implementation
      schema.ts        # Database schema
```

**Confidence:** HIGH (standard software architecture pattern)

### Pattern 4: SQLite with expo-sqlite for Local Storage

**What:** Use expo-sqlite with the modern async API for recipe persistence. Use typed queries for type safety.

**Why:**
- expo-sqlite is Expo-native, no config plugin needed
- Supports complex queries (search, filter, sort)
- Better performance than AsyncStorage for structured data
- TypeScript support with generics

**Schema:**
```typescript
// services/storage/schema.ts
export const initDatabase = async (db: SQLiteDatabase) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      ingredients TEXT NOT NULL,  -- JSON array
      steps TEXT NOT NULL,        -- JSON array
      source_url TEXT,
      thumbnail_path TEXT,
      servings TEXT,
      prep_time TEXT,
      cook_time TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_recipes_created_at
    ON recipes(created_at DESC);
  `);
};

// Usage with types
interface RecipeRow {
  id: string;
  title: string;
  ingredients: string;  // JSON string
  steps: string;        // JSON string
  source_url: string | null;
  // ...
}

const recipes = await db.getAllAsync<RecipeRow>(
  'SELECT * FROM recipes ORDER BY created_at DESC'
);
```

**Confidence:** HIGH (verified with official Expo SQLite docs)

### Pattern 5: Expo Router File-Based Navigation

**What:** Use Expo Router's file-based routing with a simple tab + stack structure.

**Structure:**
```
app/
  _layout.tsx           # Root layout with SQLiteProvider
  (tabs)/
    _layout.tsx         # Tab navigator
    index.tsx           # Recipe list (home tab)
    settings.tsx        # Settings tab
  recipe/
    [id].tsx            # Recipe detail screen
  process.tsx           # Processing screen (receives URL param)
```

**Why:**
- File-based routing reduces boilerplate
- Deep linking works automatically
- Type-safe navigation with typed routes
- Consistent with Expo best practices

**Confidence:** HIGH (verified with official Expo Router docs)

## Anti-Patterns to Avoid

### Anti-Pattern 1: Background Processing for User-Initiated Actions

**What:** Attempting to use BackgroundTask or background fetch for the video processing pipeline.

**Why bad:**
- iOS/Android background tasks are for periodic maintenance, not user-initiated work
- Minimum 15-minute interval on Android
- No guaranteed execution timing
- Tasks can be killed if battery low
- User has no feedback on progress

**Instead:** Process in foreground with progress UI. If processing takes too long, consider:
- Showing estimated time
- Allowing user to navigate away with notification when complete
- Breaking into smaller cacheable steps

### Anti-Pattern 2: Custom Share Extension View

**What:** Using expo-share-extension to build a custom UI inside the share extension.

**Why bad for this use case:**
- Share extensions limited to 120MB memory
- Requires separate React Native bundle
- Text/TextInput have font scaling issues
- expo-updates not supported
- More complex debugging

**Instead:** Use expo-share-intent for simple URL capture and immediate redirect to main app.

### Anti-Pattern 3: Storing Large Files in SQLite

**What:** Storing video files, audio files, or large images as BLOBs in SQLite.

**Why bad:**
- Bloats database file
- Slow queries
- No streaming support
- Inefficient memory usage

**Instead:**
- Store files in Paths.document directory
- Store file path references in SQLite
- Use Paths.cache for temporary processing files

### Anti-Pattern 4: Monolithic Processing Function

**What:** Single function that does download + extract + transcribe + structure without clear boundaries.

**Why bad:**
- Hard to test individual steps
- Can't swap implementations
- Hard to add progress reporting
- Difficult to retry failed steps

**Instead:** Pipeline of discrete services with clear interfaces (Pattern 3).

### Anti-Pattern 5: Direct Instagram API Access

**What:** Trying to directly access Instagram's private API or scrape their web pages.

**Why bad:**
- Violates Instagram ToS
- APIs change frequently without notice
- Risk of IP bans
- Legal liability

**Instead:**
- Use third-party services with Instagram support (RapidAPI, Apify)
- Accept that video URLs may require API key/subscription
- Build fallback for when download fails
- Consider user manually providing video file as alternative input

## Build Order Implications

Based on component dependencies, recommended build order:

### Phase 1: Foundation
1. **Expo Router shell** - Basic navigation structure
2. **SQLite setup** - Database initialization, schema, basic CRUD
3. **Recipe list UI** - Display placeholder data, test navigation
4. **Recipe detail UI** - Display recipe format

*Rationale:* Get the app skeleton working with mock data first. This validates the UI flow before adding complexity.

### Phase 2: Core Pipeline (Mock APIs)
5. **Processing screen UI** - Progress indicators, error states
6. **Pipeline orchestration** - Service interfaces, mock implementations
7. **File management** - expo-file-system integration for temp files

*Rationale:* Build pipeline structure with mocks. Test the flow end-to-end before integrating real APIs.

### Phase 3: Real Integrations
8. **Transcription API integration** - Real Whisper API calls
9. **AI structuring integration** - Real Claude/OpenAI calls
10. **Video download service** - Third-party API or direct download
11. **Audio extraction** - FFmpeg integration (community fork)

*Rationale:* Each API integration has its own complexity. Tackle one at a time with the pipeline structure already proven.

### Phase 4: Share Extension
12. **expo-share-intent setup** - Config plugin, URL scheme
13. **Deep link handling** - Route shared URLs to processing
14. **End-to-end testing** - Full flow from share sheet

*Rationale:* Share extension adds native complexity. Save for after core pipeline works standalone.

### Phase 5: Polish
15. **Error handling** - Graceful failures, retry logic
16. **Offline support** - Handle network errors
17. **Thumbnail extraction** - Capture frame from video for recipe card
18. **Search/filter** - Query improvements

## Share Extension Architecture (Detailed)

### expo-share-intent vs expo-share-extension

| Aspect | expo-share-intent | expo-share-extension |
|--------|------------------|---------------------|
| **Use case** | URL/text capture, redirect to app | Custom UI in share sheet |
| **Platforms** | iOS + Android | iOS only |
| **Memory limit** | N/A (redirects immediately) | 120MB |
| **Bundle** | Main app only | Separate RN bundle |
| **Complexity** | Low | High |
| **Font issues** | None | Text/TextInput broken |
| **For WeChef** | Recommended | Overkill |

### How expo-share-intent Works

1. User shares Instagram URL to WeChef via iOS share sheet
2. Share extension (auto-configured by plugin) captures URL
3. Extension immediately redirects via deep link: `wechef://share?url=...`
4. Main app receives deep link via Expo Linking
5. `useShareIntent()` hook provides the shared content
6. App navigates to processing screen

**Key Config:**
```json
{
  "expo": {
    "scheme": "wechef",
    "ios": {
      "bundleIdentifier": "com.yourname.wechef"
    },
    "plugins": [
      [
        "expo-share-intent",
        {
          "iosActivationRules": {
            "NSExtensionActivationSupportsWebURLWithMaxCount": 1,
            "NSExtensionActivationSupportsText": false
          },
          "androidIntentFilters": ["text/*"]
        }
      ]
    ]
  }
}
```

**Confidence:** HIGH for expo-share-intent approach (verified with GitHub docs)

## Local Storage Architecture

### Why expo-sqlite over AsyncStorage

| Aspect | expo-sqlite | AsyncStorage |
|--------|-------------|--------------|
| **Query capability** | Full SQL | Key lookup only |
| **Structured data** | Native tables | JSON strings |
| **Performance (100+ items)** | Excellent | Degrades |
| **Indexing** | Native indexes | None |
| **Migrations** | SQL migrations | Manual |
| **For recipes** | Recommended | Not suitable |

### Database Design

```sql
-- Single table for MVP, normalize later if needed
CREATE TABLE recipes (
  id TEXT PRIMARY KEY,           -- UUID
  title TEXT NOT NULL,
  ingredients TEXT NOT NULL,     -- JSON array of strings
  steps TEXT NOT NULL,           -- JSON array of strings
  source_url TEXT,               -- Original Instagram URL
  thumbnail_path TEXT,           -- Local file path
  servings TEXT,
  prep_time TEXT,
  cook_time TEXT,
  notes TEXT,
  raw_transcript TEXT,           -- Keep for debugging/reprocessing
  created_at INTEGER NOT NULL,   -- Unix timestamp
  updated_at INTEGER NOT NULL
);

-- Index for list view ordering
CREATE INDEX idx_recipes_created ON recipes(created_at DESC);

-- Index for search (basic)
CREATE INDEX idx_recipes_title ON recipes(title);
```

### React Integration Pattern

```typescript
// app/_layout.tsx
import { SQLiteProvider } from 'expo-sqlite';

export default function RootLayout() {
  return (
    <SQLiteProvider
      databaseName="wechef.db"
      onInit={initDatabase}
    >
      <Stack />
    </SQLiteProvider>
  );
}

// In components
import { useSQLiteContext } from 'expo-sqlite';

function RecipeList() {
  const db = useSQLiteContext();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    const rows = await db.getAllAsync<RecipeRow>(
      'SELECT * FROM recipes ORDER BY created_at DESC'
    );
    setRecipes(rows.map(parseRecipeRow));
  };
}
```

**Confidence:** HIGH (verified with official Expo SQLite docs)

## FFmpeg Integration Considerations

### Current State (Post-Retirement)

FFmpegKit officially retired January 2025. Options for audio extraction:

| Option | Status | Expo Compatible | Notes |
|--------|--------|-----------------|-------|
| ffmpeg-kit-react-native (original) | Retired | Yes (with config plugin) | Binaries removed from repos |
| @config-plugins/ffmpeg-kit-react-native | Active | Yes | Points to community forks |
| jdarshan5/ffmpeg-kit-react-native | Community fork | Yes | Maintaining binaries |
| beedeez/ffmpreg-kit-react-native | Community fork | Yes | Active development |
| @sheehanmunim/react-native-ffmpeg | Wrapper | Yes | Claims zero-config |
| expo-ffmpeg-kit | Expo wrapper | Yes | Version 0.1.42 |

### Recommended Approach

1. Try `@sheehanmunim/react-native-ffmpeg` first (claims easiest setup)
2. Fall back to `@config-plugins/ffmpeg-kit-react-native` with community fork
3. Isolate FFmpeg behind service interface for easy swapping

### Audio Extraction Command

```typescript
const extractAudio = async (videoPath: string): Promise<string> => {
  const audioPath = `${Paths.cache}/audio_${Date.now()}.m4a`;

  // -i: input file
  // -vn: no video
  // -acodec copy: copy audio without re-encoding (fast)
  const command = `-i ${videoPath} -vn -acodec copy ${audioPath}`;

  await FFmpegKit.execute(command);
  return audioPath;
};
```

**Confidence:** LOW (FFmpeg ecosystem unstable; may need phase-specific research)

## Scalability Considerations

| Concern | Personal Use (1 user) | Notes |
|---------|----------------------|-------|
| **Storage** | SQLite fine for 1000s of recipes | Single user, no sync needed |
| **Processing** | Foreground acceptable | User waits 30-90 seconds |
| **API costs** | Per-recipe pricing | Transcription + AI per recipe |
| **Video storage** | Don't store videos | Process and delete |
| **Thumbnails** | Store locally | Small files, 10-50KB each |

For a personal app, scalability is not a primary concern. Focus on reliability and user experience.

## Sources

### HIGH Confidence (Official Documentation)
- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo FileSystem Documentation](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Expo BackgroundTask Documentation](https://docs.expo.dev/versions/latest/sdk/background-task/)
- [Expo Router Introduction](https://docs.expo.dev/router/introduction/)
- [Expo Local-First Architecture Guide](https://docs.expo.dev/guides/local-first/)

### MEDIUM Confidence (GitHub/NPM Documentation)
- [expo-share-intent GitHub](https://github.com/achorein/expo-share-intent)
- [expo-share-extension GitHub](https://github.com/MaxAst/expo-share-extension)
- [React Native App Extensions](https://reactnative.dev/docs/app-extensions)

### LOW Confidence (Community/WebSearch)
- [FFmpegKit Retirement Announcement](https://tanersener.medium.com/saying-goodbye-to-ffmpegkit-33ae939767e1)
- [Using FFmpegKit After Retirement](https://dev.to/utkarsh4517/using-ffmpegkit-locally-in-react-native-after-retirement-3a9p)
- [React Native Background Tasks 2026](https://dev.to/eira-wexford/run-react-native-background-tasks-2026-for-optimal-performance-d26)
- Various Instagram download API services on RapidAPI/Apify

## Open Questions for Phase-Specific Research

1. **Instagram Video Download:** Which third-party service is most reliable? Does direct URL extraction still work? Need to test actual Instagram URLs.

2. **FFmpeg Fork Stability:** Which community fork is most actively maintained? Need to test actual audio extraction with chosen fork.

3. **Transcription API Selection:** Whisper API vs alternatives (Deepgram, AssemblyAI)? Cost and accuracy comparison needed.

4. **AI Prompt Engineering:** What prompt structure yields best recipe extraction? Needs iteration with real transcripts.

5. **Thumbnail Extraction:** Extract from video (FFmpeg) or request from Instagram API? Trade-offs unclear.
