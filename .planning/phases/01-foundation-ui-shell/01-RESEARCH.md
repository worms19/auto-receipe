# Phase 1: Foundation & UI Shell - Research

**Researched:** 2026-02-01
**Domain:** React Native/Expo project setup, navigation, local storage, UI components
**Confidence:** HIGH

## Summary

Phase 1 establishes the app foundation: project setup with Expo SDK 52, file-based navigation with Expo Router, local persistence with expo-sqlite, and UI components with NativeWind + React Native Reusables. The user should be able to browse, view, save, and delete recipes from mock data.

The standard approach for this phase is to use Expo's managed workflow with TypeScript, set up file-based routing with a tabs + stack pattern, configure NativeWind for Tailwind-style styling, and implement SQLite for structured recipe storage. All technologies are well-documented and stable for SDK 52.

**Primary recommendation:** Initialize with `npx create-expo-app` using TypeScript template, set up NativeWind v4.1.23 with Tailwind 3.4.17 (battle-tested versions), implement expo-sqlite with SQLiteProvider for React integration, and use Expo Router's `(tabs)` directory pattern with dynamic `[id]` routes for recipe details.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo | ^52.0.0 | Development platform | SDK 52 is current stable, New Architecture enabled by default |
| react-native | 0.77+ | Mobile framework | Ships with Expo SDK 52 |
| typescript | 5.x | Type safety | Industry standard, catches errors at compile time |
| expo-router | ^4.0.0 | File-based navigation | Expo-native, deep linking works automatically, wraps React Navigation v7 |

**Source:** [Expo SDK 52 Changelog](https://expo.dev/changelog/2024-11-12-sdk-52)

### UI Layer
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nativewind | 4.1.23 | Tailwind CSS for RN | Battle-tested version for SDK 52, enables className-based styling |
| tailwindcss | 3.4.17 | CSS framework | Required by NativeWind, this version combo is proven stable |
| react-native-reusables | latest | shadcn-style components | Best port of shadcn/ui, uses NativeWind, includes primitives |
| react-native-reanimated | ~3.16.1 | Animations | Required for smooth UI, included with Expo |
| expo-image | latest | Image display with caching | Built-in disk caching, prefetch support, blurhash placeholders |

**Source:** [NativeWind Setup Guide 2025](https://dev.to/aramoh3ni/taming-the-beast-a-foolproof-nativewind-react-native-setup-v52-2025-4dd8)

### Storage
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-sqlite | ~16.0.10 | Local SQLite database | Expo-native, supports structured queries, migrations, TypeScript generics |

**Source:** [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-sqlite | AsyncStorage | AsyncStorage is key-value only, no queries, poor for structured recipe data |
| expo-sqlite | Drizzle ORM | Drizzle adds type-safety but more setup complexity; defer to later phase |
| expo-image | react-native-fast-image | expo-image is Expo-native, no config plugin needed, built-in caching |
| NativeWind | StyleSheet | StyleSheet works but loses Tailwind DX, harder to maintain |

**Installation:**
```bash
# Create Expo project with TypeScript
npx create-expo-app WeChef --template expo-template-blank-typescript

# Core dependencies
npx expo install expo-sqlite expo-image

# UI (NativeWind + React Native Reusables)
npm install nativewind@4.1.23 tailwindcss@3.4.17
npx tailwindcss init

# Initialize react-native-reusables (uses CLI)
npx @react-native-reusables/cli@latest init

# Animations (often auto-installed)
npx expo install react-native-reanimated react-native-safe-area-context
```

## Architecture Patterns

### Recommended Project Structure
```
app/
  _layout.tsx           # Root layout with SQLiteProvider, global.css import
  (tabs)/
    _layout.tsx         # Tab navigator configuration
    index.tsx           # Recipe list (home tab)
  recipe/
    [id].tsx            # Recipe detail screen (dynamic route)
components/
  ui/                   # React Native Reusables components
  RecipeCard.tsx        # Recipe list item
  RecipeDetail.tsx      # Full recipe view
lib/
  db.ts                 # Database initialization and helpers
  types.ts              # TypeScript types (Recipe, etc.)
  utils.ts              # Utility functions (cn helper)
global.css              # Tailwind CSS entry point
tailwind.config.js      # Tailwind configuration
metro.config.js         # Metro bundler with NativeWind
babel.config.js         # Babel with NativeWind preset
```

**Source:** [Expo Router Common Patterns](https://docs.expo.dev/router/basics/common-navigation-patterns/)

### Pattern 1: SQLiteProvider with React Context
**What:** Wrap app in SQLiteProvider to access database via useSQLiteContext hook
**When to use:** Always - provides database access throughout component tree

**Example:**
```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/sqlite/
// app/_layout.tsx
import { SQLiteProvider } from 'expo-sqlite';
import '../global.css';

async function initDatabase(db: SQLiteDatabase) {
  const DATABASE_VERSION = 1;
  let { user_version: currentDbVersion } =
    await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');

  if (currentDbVersion >= DATABASE_VERSION) return;

  if (currentDbVersion === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        ingredients TEXT NOT NULL,
        steps TEXT NOT NULL,
        source_url TEXT,
        thumbnail_url TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_recipes_created
      ON recipes(created_at DESC);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="wechef.db" onInit={initDatabase}>
      <Stack />
    </SQLiteProvider>
  );
}
```

### Pattern 2: Tab Navigator with Nested Stack
**What:** Use (tabs) directory for tab navigation, stack for detail screens
**When to use:** List-to-detail navigation pattern

**Example:**
```typescript
// Source: https://docs.expo.dev/router/advanced/tabs/
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#0ea5e9',
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color }) => (
            <Ionicons name="book" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### Pattern 3: Dynamic Route with useLocalSearchParams
**What:** Use [id].tsx for dynamic routes, access params with hook
**When to use:** Recipe detail screen accessed from list

**Example:**
```typescript
// Source: https://docs.expo.dev/router/basics/navigation/
// app/recipe/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    const row = await db.getFirstAsync<RecipeRow>(
      'SELECT * FROM recipes WHERE id = ?', [id]
    );
    if (row) setRecipe(parseRecipeRow(row));
  };

  // render recipe...
}
```

### Pattern 4: expo-image with Caching
**What:** Use expo-image for automatic disk caching and offline availability
**When to use:** Recipe thumbnails in list and detail views

**Example:**
```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/image/
import { Image } from 'expo-image';

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Pressable className="flex-row p-4 border-b border-gray-200">
      <Image
        source={recipe.thumbnailUrl}
        style={{ width: 80, height: 80, borderRadius: 8 }}
        contentFit="cover"
        cachePolicy="disk"  // Persists for offline access
        placeholder={recipe.blurhash}
        transition={200}
      />
      <Text className="flex-1 ml-4 text-lg font-semibold">
        {recipe.title}
      </Text>
    </Pressable>
  );
}
```

### Anti-Patterns to Avoid
- **Storing images as BLOBs in SQLite:** Store file paths or URLs only; SQLite bloats with large binary data
- **Cascading styles assumption:** NativeWind does NOT cascade; apply `text-*` classes directly to Text components
- **Conditional-only styling:** Always provide both light AND dark mode values explicitly
- **Using sync SQLite methods:** Block the JS thread; always prefer async methods (getAllAsync, runAsync)
- **Missing flex-1:** React Native defaults differ from web; add flex-1 to grow containers

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image caching | Custom FileSystem cache | expo-image cachePolicy | Built-in disk cache, prefetch, placeholder support |
| Navigation state | Custom navigation stack | Expo Router | Deep linking, type-safety, file-based routing |
| Database abstraction | Custom SQL helpers | useSQLiteContext + getAllAsync | Type generics, prepared statements, proper async |
| UI components | Custom buttons, cards | React Native Reusables | Accessible, tested, NativeWind-compatible |
| List virtualization | Custom scroll logic | FlatList | Built into React Native, handles memory |
| Safe area handling | Manual padding | SafeAreaProvider | Platform-specific notch/home bar handling |

**Key insight:** Expo SDK 52 and its ecosystem provide production-ready solutions for common mobile app needs. Custom implementations add maintenance burden without meaningful benefit for Phase 1 requirements.

## Common Pitfalls

### Pitfall 1: NativeWind Style Inheritance
**What goes wrong:** Applying `text-red-500` to a View and expecting child Text to inherit the color
**Why it happens:** React Native has no CSS cascade; each component must be styled directly
**How to avoid:** Always apply text styling classes directly to Text components
**Warning signs:** Colors not appearing, styles seemingly ignored

### Pitfall 2: NativeWind Version Mismatch
**What goes wrong:** Cryptic Metro bundler errors, module resolution failures
**Why it happens:** NativeWind v4+ requires specific tailwindcss versions; rapid ecosystem evolution breaks older guides
**How to avoid:** Use proven version combo: nativewind@4.1.23 + tailwindcss@3.4.17
**Warning signs:** "Cannot find module" errors, Metro crash on startup

### Pitfall 3: SQLite Sync Method Blocking
**What goes wrong:** UI freezes during database operations
**Why it happens:** Sync methods (getAllSync, runSync) block the JavaScript thread
**How to avoid:** Always use async methods (getAllAsync, runAsync, getFirstAsync)
**Warning signs:** Janky scrolling, unresponsive UI during saves

### Pitfall 4: Forgetting Database Migration
**What goes wrong:** App crashes on schema changes, data corruption
**Why it happens:** SQLite doesn't auto-migrate; schema changes need explicit handling
**How to avoid:** Use PRAGMA user_version pattern in onInit callback; write incremental migrations
**Warning signs:** SQLITE_ERROR on INSERT, missing columns

### Pitfall 5: Missing global.css Import
**What goes wrong:** All NativeWind styles silently fail
**Why it happens:** Metro must process global.css through NativeWind; import triggers compilation
**How to avoid:** Import `../global.css` in app/_layout.tsx
**Warning signs:** className has no effect, components unstyled

### Pitfall 6: expo-image Not Persisting Offline
**What goes wrong:** Images disappear when offline
**Why it happens:** Default cachePolicy is 'memory' which clears on app restart
**How to avoid:** Set cachePolicy="disk" explicitly for offline-required images
**Warning signs:** Images load online, blank offline

## Code Examples

Verified patterns from official sources:

### NativeWind Configuration Files

```javascript
// Source: https://dev.to/aramoh3ni/taming-the-beast-a-foolproof-nativewind-react-native-setup-v52-2025-4dd8
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

```javascript
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

```css
/* global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Recipe CRUD Operations

```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/sqlite/
// lib/db.ts
import { useSQLiteContext } from 'expo-sqlite';

interface RecipeRow {
  id: string;
  title: string;
  ingredients: string;  // JSON string
  steps: string;        // JSON string
  source_url: string | null;
  thumbnail_url: string | null;
  created_at: number;
  updated_at: number;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  steps: string[];
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function parseRecipeRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    ingredients: JSON.parse(row.ingredients),
    steps: JSON.parse(row.steps),
    sourceUrl: row.source_url,
    thumbnailUrl: row.thumbnail_url,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Get all recipes ordered by creation date
export async function getAllRecipes(db: SQLiteDatabase): Promise<Recipe[]> {
  const rows = await db.getAllAsync<RecipeRow>(
    'SELECT * FROM recipes ORDER BY created_at DESC'
  );
  return rows.map(parseRecipeRow);
}

// Get single recipe by ID
export async function getRecipeById(db: SQLiteDatabase, id: string): Promise<Recipe | null> {
  const row = await db.getFirstAsync<RecipeRow>(
    'SELECT * FROM recipes WHERE id = ?', [id]
  );
  return row ? parseRecipeRow(row) : null;
}

// Save new recipe
export async function saveRecipe(db: SQLiteDatabase, recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO recipes (id, title, ingredients, steps, source_url, thumbnail_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      recipe.title,
      JSON.stringify(recipe.ingredients),
      JSON.stringify(recipe.steps),
      recipe.sourceUrl,
      recipe.thumbnailUrl,
      now,
      now
    ]
  );

  return id;
}

// Delete recipe
export async function deleteRecipe(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
}
```

### Navigation with Link Component

```typescript
// Source: https://docs.expo.dev/router/basics/navigation/
// app/(tabs)/index.tsx
import { Link } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { getAllRecipes, Recipe } from '@/lib/db';

export default function RecipeList() {
  const db = useSQLiteContext();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    const data = await getAllRecipes(db);
    setRecipes(data);
  };

  const renderItem = ({ item }: { item: Recipe }) => (
    <Link href={`/recipe/${item.id}`} asChild>
      <Pressable className="flex-row p-4 border-b border-gray-200">
        {item.thumbnailUrl && (
          <Image
            source={item.thumbnailUrl}
            style={{ width: 80, height: 80, borderRadius: 8 }}
            contentFit="cover"
            cachePolicy="disk"
          />
        )}
        <View className="flex-1 ml-4 justify-center">
          <Text className="text-lg font-semibold text-gray-900">
            {item.title}
          </Text>
          <Text className="text-sm text-gray-500">
            {item.ingredients.length} ingredients
          </Text>
        </View>
      </Pressable>
    </Link>
  );

  return (
    <FlatList
      data={recipes}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ flexGrow: 1 }}
    />
  );
}
```

### Opening External URL (Instagram)

```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/linking/
import * as Linking from 'expo-linking';
import { Pressable, Text } from 'react-native';

function SourceLink({ url }: { url: string }) {
  const handlePress = async () => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  return (
    <Pressable onPress={handlePress} className="py-2">
      <Text className="text-blue-600 underline">View original on Instagram</Text>
    </Pressable>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| expo-sqlite legacy API | expo-sqlite async API | SDK 52 | Legacy removed; use SQLiteProvider + async methods |
| React Navigation manual setup | Expo Router file-based | SDK 49+ | File-based routing now standard |
| StyleSheet.create | NativeWind className | NativeWind v4 | Tailwind DX in React Native |
| custom image caching | expo-image cachePolicy | SDK 52+ | Built-in caching, no extra library needed |
| expo-av for video | expo-video | SDK 52+ | expo-av deprecated for video playback |

**Deprecated/outdated:**
- `expo-sqlite/legacy`: Removed in SDK 52; use main expo-sqlite export
- `expo-barcode-scanner`: Removed in SDK 52; use expo-camera
- JSC (JavaScriptCore): No longer supported in Expo Go; Hermes is required
- React Navigation v6 patterns: SDK 52 uses v7 with automatic type inference

## Open Questions

Things that couldn't be fully resolved:

1. **React Native Reusables CLI vs Manual Setup**
   - What we know: CLI exists (`npx @react-native-reusables/cli@latest init`), adds components
   - What's unclear: Exact dependencies installed, NativeWind version required, component selection process
   - Recommendation: Run CLI init first, document what it installs, manually add components as needed

2. **Mock Data Strategy**
   - What we know: Phase 1 uses mock data, not real Instagram URLs
   - What's unclear: Best approach for mock thumbnails (local assets vs placeholder URLs)
   - Recommendation: Use https://picsum.photos for placeholder images; easily swapped for real URLs later

3. **NativeWind v5 vs v4**
   - What we know: Project research mentions v5 but v5 is pre-release; v4.1.23 is proven stable
   - What's unclear: Whether v5 has breaking changes from v4
   - Recommendation: Start with v4.1.23 (battle-tested); upgrade to v5 when stable release available

## Sources

### Primary (HIGH confidence)
- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/) - SQLiteProvider, async API, migrations
- [Expo Router Navigation](https://docs.expo.dev/router/basics/navigation/) - Link, useLocalSearchParams, router.push
- [Expo Router Tabs](https://docs.expo.dev/router/advanced/tabs/) - Tab navigator setup, icons
- [Expo Router Stack](https://docs.expo.dev/router/advanced/stack/) - Stack options, nested navigation
- [expo-image Documentation](https://docs.expo.dev/versions/latest/sdk/image/) - cachePolicy, prefetch, contentFit
- [Expo SDK 52 Changelog](https://expo.dev/changelog/2024-11-12-sdk-52) - Breaking changes, new defaults

### Secondary (MEDIUM confidence)
- [NativeWind SDK 52 Setup Guide](https://dev.to/aramoh3ni/taming-the-beast-a-foolproof-nativewind-react-native-setup-v52-2025-4dd8) - Verified version combo, config files
- [NativeWind v5 Troubleshooting](https://www.nativewind.dev/v5/getting-started/troubleshooting) - Common issues, verifyInstallation

### Tertiary (LOW confidence)
- [React Native Reusables](https://reactnativereusables.com/) - CLI documentation incomplete in fetch; verify during implementation
- WebSearch results for NativeWind common mistakes - patterns consistent across sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified with official docs or proven community guides
- Architecture: HIGH - Patterns from official Expo Router and SQLite documentation
- Pitfalls: MEDIUM - Combination of official troubleshooting docs and community reports

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable ecosystem, SDK 52 is current)
