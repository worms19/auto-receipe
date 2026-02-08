# Phase 5: Share Extension - Research

**Researched:** 2026-02-08
**Domain:** iOS Share Extension with React Native / Expo
**Confidence:** HIGH

## Summary

Implementing an iOS Share Extension for a React Native + Expo app is a well-understood problem with multiple mature community solutions. The WeChef app needs to appear in the iOS share sheet so users can share Instagram reel URLs directly into the app for processing. The project already has a `wechef://` URL scheme configured, uses expo-router for navigation, and has a Zustand-based pipeline store that handles the `POST /extract` call to the NestJS server. The Share Extension's job is minimal: receive the URL and hand it off to the main app.

Two strong Expo config plugin packages exist: **expo-share-intent** (simpler, URL-to-main-app redirect) and **expo-share-extension** (full custom React Native UI in the share sheet). Since WeChef does not need a custom UI in the share sheet -- the goal is simply to receive a URL, validate it, and begin processing -- **expo-share-intent** is the recommended choice. It provides a hook-based API (`useShareIntent`) that integrates directly with expo-router and Zustand, requires minimal native code understanding, and supports SDK 54.

**Primary recommendation:** Use `expo-share-intent` v5.x with expo-router integration. The share extension receives the Instagram URL, passes it to the main app via deep link, and the existing `usePipelineStore.startProcessing(url)` handles everything else.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-share-intent | ^5.1.1 | iOS Share Extension config plugin + native module | Actively maintained, SDK 54 compatible, simple hook API, handles native target creation automatically |
| expo-linking | ^8.0.11 | Deep link URL handling (already installed) | Already in the project, used by expo-share-intent under the hood |
| patch-package | latest | Required post-install patching for expo-share-intent | Still a hard requirement as of v5.x -- the xcode patch fixes a prebuild config issue |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-router | ~6.0.23 | Navigation + deep link routing (already installed) | Already in project -- share intent integrates via `+native-intent.tsx` file |
| zustand | ^5.0.11 | Pipeline state management (already installed) | Already in project -- `usePipelineStore.startProcessing(url)` is the entry point |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-share-intent | expo-share-extension | expo-share-extension provides a full custom React Native UI inside the share sheet (like Pinterest). More powerful but heavier, requires separate metro config entry point (`index.share.js`), and a separate JS bundle. Overkill for WeChef which just needs to receive a URL. |
| expo-share-intent | expo-config-plugin-ios-share-extension | Simpler than expo-share-extension but stale (last release >1 year ago), limited to URL only, no hook API. |
| expo-share-intent | Custom config plugin | Maximum control but significant native iOS/Swift knowledge required. No reason to hand-roll this. |

**Installation:**
```bash
npx expo install expo-share-intent
npm install --save-dev patch-package
```

Then copy the xcode patch from the expo-share-intent example project to `./patches/` and add the postinstall script:
```json
{
  "scripts": {
    "postinstall": "patch-package"
  }
}
```

## Architecture Patterns

### How iOS Share Extensions Work (Conceptual)

An iOS Share Extension is a **separate binary target** bundled inside your app. When a user taps "Share" in another app and selects your app, iOS launches this mini extension process (NOT your main app). The extension has strict constraints:

- **120 MB memory limit** (vs unlimited for main app)
- **Separate process** -- cannot directly access main app state
- **Communication** happens via App Groups (shared NSUserDefaults/file storage) or by opening the main app via URL scheme

### expo-share-intent Architecture

```
Instagram App                       iOS System
+------------------+               +--------------------+
| User taps Share  | ------------> | System Share Sheet  |
| (or Copy Link)   |               | Shows "WeChef"     |
+------------------+               +--------------------+
                                          |
                                          v
                              +-----------------------+
                              | WeChef Share Extension|
                              | (Native Swift target) |
                              | Receives URL          |
                              | Opens main app via    |
                              | deep link scheme      |
                              +-----------------------+
                                          |
                                          v
                              +-----------------------+
                              | WeChef Main App       |
                              | wechef://share?url=.. |
                              | +native-intent.tsx    |
                              | routes to home screen |
                              | useShareIntent() hook |
                              | triggers processing   |
                              +-----------------------+
```

### Recommended Project Structure (Changes Only)
```
app/
├── +native-intent.ts     # NEW: intercepts share deep links, routes to correct screen
├── _layout.tsx            # MODIFIED: wrap with ShareIntentProvider or use hook
├── (tabs)/
│   └── index.tsx          # MODIFIED: handle incoming share intent, auto-process
patches/
└── expo-share-intent+*.patch  # NEW: required xcode patch
```

### Pattern 1: Share Intent Hook in Root Layout
**What:** Use `useShareIntent` in the root layout or home screen to detect incoming shared URLs
**When to use:** When the app has a single processing entry point (like WeChef)
**Example:**
```typescript
// app/(tabs)/index.tsx (modified)
import { useShareIntent } from "expo-share-intent";
import { useEffect } from "react";

export default function RecipeList() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    resetOnBackground: true,
  });

  const { startProcessing } = usePipelineStore();

  useEffect(() => {
    if (hasShareIntent && shareIntent?.webUrl) {
      // Instagram URL received from share sheet
      handleProcess(shareIntent.webUrl);
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent]);

  // ... rest of component
}
```

### Pattern 2: Native Intent File for Deep Link Routing
**What:** Create `app/+native-intent.ts` to intercept the share extension's deep link and route it
**When to use:** With expo-router to properly handle the incoming URL before router processes it
**Example:**
```typescript
// app/+native-intent.ts
import { getShareExtensionKey } from "expo-share-intent";

export async function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}) {
  // Check if this is a share intent deep link
  if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
    // Redirect to the home screen where useShareIntent will pick it up
    return "/";
  }
  return path;
}
```

### Pattern 3: URL Validation Before Processing
**What:** Validate the shared URL is an Instagram reel/post before processing
**When to use:** Always -- users might share non-Instagram URLs
**Example:**
```typescript
// lib/validation.ts
const INSTAGRAM_URL_REGEX = /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(reel|p|tv)\/[\w-]+/i;

export function isInstagramUrl(url: string): boolean {
  return INSTAGRAM_URL_REGEX.test(url);
}
```

### Anti-Patterns to Avoid
- **Running full React Native in the Share Extension:** expo-share-intent avoids this by using a lightweight native Swift extension that just grabs the URL and opens the main app. Do NOT use expo-share-extension to render React Native UI in the extension unless you need it -- it uses more memory and adds complexity.
- **Storing shared data in AsyncStorage from the extension:** AsyncStorage is not shared between the extension and main app by default. Use App Groups or deep link URL params instead.
- **Forgetting to rebuild after config changes:** Share extension is a native target -- any changes to activation rules or App Group config require `npx expo prebuild --clean` and a new dev client build.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| iOS Share Extension target creation | Custom Xcode target + Swift code + Info.plist | expo-share-intent config plugin | Requires provisioning profiles, entitlements, App Groups, proper bundle IDs -- all auto-handled |
| Deep link URL parsing | Manual URL string parsing | expo-router + `+native-intent.ts` | expo-router already handles URL scheme routing; +native-intent handles edge cases |
| Share sheet activation rules | Manual Info.plist NSExtensionActivationRule editing | expo-share-intent plugin config in app.json | Plugin generates correct plist entries from simple JSON config |
| Extension-to-app communication | Custom App Groups + NSUserDefaults bridge | expo-share-intent's built-in mechanism | The library handles the entire flow: receive content -> store -> open app -> provide via hook |

**Key insight:** The native iOS Share Extension setup involves creating a new Xcode target with its own bundle ID, provisioning profile, entitlements, Info.plist, and Swift view controller. The config plugin automates ALL of this during `expo prebuild`. Hand-rolling means maintaining Swift code, understanding the extension lifecycle, and managing two build targets manually.

## Common Pitfalls

### Pitfall 1: Share Extension Not Appearing in Share Sheet
**What goes wrong:** App does not show up as an option in the iOS share sheet
**Why it happens:** Multiple causes: (1) NSExtensionActivationRule not configured for the correct content type, (2) dev client not rebuilt after adding the plugin, (3) iOS caches share extension availability
**How to avoid:** Ensure `iosActivationRules` in app.json includes `NSExtensionActivationSupportsWebURLWithMaxCount` AND `NSExtensionActivationSupportsText` (Instagram sometimes shares URLs as plain text). After any config change, run `npx expo prebuild --clean && npx expo run:ios`.
**Warning signs:** Other apps' share extensions appear but WeChef doesn't

### Pitfall 2: Instagram Shares URL as Text, Not URL
**What goes wrong:** When a user shares an Instagram reel link, the share sheet might classify it as "text" rather than "URL" depending on the source (copied link vs direct share)
**Why it happens:** Instagram's share button behavior varies. Copying a link and sharing from clipboard passes text. The direct share button may pass a URL type.
**How to avoid:** Configure activation rules to accept BOTH text and web URLs. Validate the received text with the Instagram URL regex regardless of how it arrives.
**Warning signs:** Share extension works from Safari but not from Instagram

### Pitfall 3: Forgetting to Rebuild Dev Client
**What goes wrong:** Config plugin changes don't take effect
**Why it happens:** Share extension is a native iOS target. Adding the plugin to app.json only generates native code during prebuild. Without rebuilding the dev client, the old native code (without the share extension) is still running.
**How to avoid:** After initial setup: `npx expo prebuild --clean` then `npx expo run:ios`. This must be done every time activation rules or native config changes.
**Warning signs:** App works normally but share extension features don't appear

### Pitfall 4: 120 MB Memory Limit in Share Extension
**What goes wrong:** Share extension crashes silently
**Why it happens:** iOS enforces a 120 MB memory limit on share extensions. Running a full React Native bundle in the extension can approach or exceed this.
**How to avoid:** expo-share-intent uses a lightweight native Swift extension (NOT React Native in the extension), so this is handled. If using expo-share-extension (full RN in extension), exclude unnecessary Expo modules via `excludedPackages`.
**Warning signs:** Extension opens then immediately closes, or shows "Unable to Load"

### Pitfall 5: patch-package Not Applied
**What goes wrong:** Prebuild fails with `"Cannot read properties of null (reading 'path')"`
**Why it happens:** expo-share-intent v5.x requires an xcode patch applied via patch-package. If the postinstall script is missing or the patch file isn't in `./patches/`, the native config will be incomplete.
**How to avoid:** Follow the installation exactly: install patch-package, copy the patch file from the expo-share-intent example directory, add postinstall script.
**Warning signs:** `npx expo prebuild` throws errors mentioning null path

### Pitfall 6: Share Intent Not Received After App Was Already Running
**What goes wrong:** Share works when app is closed, but not when app is already open in background
**Why it happens:** The deep link might not trigger a re-render if the component is already mounted
**How to avoid:** Use `useShareIntent({ resetOnBackground: true })` option. This ensures the hook properly handles intents received while the app is in the background.
**Warning signs:** Works on first share after app install, fails on subsequent shares

## Code Examples

### Complete app.json Configuration
```json
{
  "expo": {
    "name": "WeChef",
    "slug": "wechef",
    "scheme": "wechef",
    "ios": {
      "bundleIdentifier": "com.wechef.app",
      "supportsTablet": true,
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsLocalNetworking": true
        }
      }
    },
    "plugins": [
      "expo-sqlite",
      "expo-router",
      [
        "expo-share-intent",
        {
          "iosActivationRules": {
            "NSExtensionActivationSupportsWebURLWithMaxCount": 1,
            "NSExtensionActivationSupportsText": true
          }
        }
      ]
    ]
  }
}
```

### +native-intent.ts for expo-router
```typescript
// app/+native-intent.ts
// Source: expo-share-intent docs + expo-router native-intent docs
import { getShareExtensionKey } from "expo-share-intent";

export async function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}) {
  // If this is a share intent, redirect to home where the hook picks it up
  if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
    return "/";
  }
  // Let expo-router handle all other paths normally
  return path;
}
```

### useShareIntent Integration in Home Screen
```typescript
// In app/(tabs)/index.tsx
import { useShareIntent } from "expo-share-intent";
import { useEffect, useRef } from "react";

export default function RecipeList() {
  const db = useSQLiteContext();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    resetOnBackground: true,
  });
  const { stage, startProcessing, reset } = usePipelineStore();
  const [modalVisible, setModalVisible] = useState(false);

  // Handle incoming share intent
  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      const url = shareIntent.webUrl || shareIntent.text;
      if (url && isInstagramUrl(url)) {
        handleProcess(url);
        resetShareIntent();
      }
    }
  }, [hasShareIntent, shareIntent]);

  const handleProcess = async (url: string) => {
    setModalVisible(true);
    const recipe = await startProcessing(url);
    if (recipe) {
      await saveRecipe(db, recipe);
    }
  };

  // ... rest of component unchanged
}
```

### Instagram URL Validation
```typescript
// lib/validation.ts
const INSTAGRAM_URL_PATTERNS = [
  /^https?:\/\/(www\.)?(instagram\.com)\/(reel|p|tv)\/[\w-]+/i,
  /^https?:\/\/(www\.)?(instagr\.am)\/(reel|p|tv)\/[\w-]+/i,
];

export function isInstagramUrl(url: string): boolean {
  return INSTAGRAM_URL_PATTERNS.some(pattern => pattern.test(url.trim()));
}

export function extractInstagramUrl(text: string): string | null {
  // Handle case where URL is embedded in surrounding text
  const urlMatch = text.match(
    /https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(reel|p|tv)\/[\w-]+[^\s]*/i
  );
  return urlMatch ? urlMatch[0] : null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-native-share-menu + manual Xcode config | expo-share-intent / expo-share-extension config plugins | 2024 (SDK 50+) | No manual Xcode work needed; prebuild handles everything |
| Custom Swift ShareViewController | expo-share-intent native module | 2024 | No Swift code to write or maintain |
| NSUserDefaults + App Groups manual setup | expo-share-intent built-in communication | 2024 | Plugin manages App Groups automatically |
| TRUEPREDICATE activation rule (rejected by App Store) | Specific NSExtensionActivationRule dictionary | Always | Must use specific rules for App Store submission |

**Deprecated/outdated:**
- `react-native-share-extension` (npm): Last updated years ago, incompatible with modern Expo/RN
- `expo-config-plugin-ios-share-extension` (timedtext): Stale, last release >1 year ago
- Using `TRUEPREDICATE` as NSExtensionActivationRule: Apple rejects this in App Store review; must specify exact content types

## Open Questions

1. **Instagram's Share Sheet Behavior**
   - What we know: Instagram has its own share UI. Users can "Copy Link" then share from clipboard, or use "Share to..." which may use the system share sheet. Both paths produce a URL like `https://www.instagram.com/reel/ABC123/`.
   - What's unclear: Whether Instagram's "Share to..." button always uses the system UIActivityViewController (which would show our share extension) or sometimes uses a custom implementation that bypasses it.
   - Recommendation: Support both flows -- (1) share extension for system share sheet, (2) keep the existing URL paste input in the app as a fallback. Test the actual Instagram app behavior on a real device.

2. **patch-package Long-term Viability**
   - What we know: expo-share-intent v5.x requires patch-package for an xcode config fix
   - What's unclear: Whether this requirement will be removed in future versions
   - Recommendation: Accept the dependency for now; it's a well-known pattern in the Expo ecosystem. Monitor expo-share-intent releases for when this is resolved.

3. **Server Accessibility from Share Extension Context**
   - What we know: The NestJS server runs on localhost:3000. The main app can reach it because NSAllowsLocalNetworking is true.
   - What's unclear: Whether the share extension (if it ever needs to make network calls) can also reach localhost.
   - Recommendation: Not an issue with expo-share-intent since the extension just passes the URL to the main app and the main app makes the server call. But worth noting if the architecture ever changes.

## Sources

### Primary (HIGH confidence)
- [expo-share-intent GitHub](https://github.com/achorein/expo-share-intent) - Installation, configuration, hook API, SDK 54 compatibility
- [expo-share-extension GitHub](https://github.com/MaxAst/expo-share-extension) - Alternative approach with custom UI, SDK 54 compatibility table
- [Expo iOS App Extensions docs](https://docs.expo.dev/build-reference/app-extensions/) - Official Expo guidance on app extensions
- [React Native App Extensions docs](https://reactnative.dev/docs/app-extensions) - Memory limits (120 MB for share extensions)
- [Expo Router +native-intent demo](https://github.com/EvanBacon/expo-router-native-intent-demo) - Official pattern for handling native intents in expo-router

### Secondary (MEDIUM confidence)
- [expo-share-intent npm](https://www.npmjs.com/package/expo-share-intent) - v5.1.1, ~9,800 weekly downloads, last published ~1 month ago
- [expo-share-extension npm](https://www.npmjs.com/package/expo-share-extension) - v5.0.4, last published ~2 days ago
- [Apple App Extension Programming Guide](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/Share.html) - Official Apple docs on share extensions

### Tertiary (LOW confidence)
- Instagram share sheet behavior specifics (varies by Instagram version, not officially documented)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - expo-share-intent is well-documented, actively maintained, and explicitly supports SDK 54. Verified via GitHub README and npm.
- Architecture: HIGH - The hook-based pattern (`useShareIntent`) integrates cleanly with the existing expo-router + Zustand architecture. Pattern verified via official examples.
- Pitfalls: HIGH - Memory limits documented by React Native officially. patch-package requirement documented by expo-share-intent. Activation rules well-documented by Apple. Share-as-text vs share-as-URL behavior verified across multiple sources.
- Instagram-specific behavior: MEDIUM - URL formats are well-known but exact share sheet behavior depends on Instagram app version.

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days -- ecosystem is stable, expo-share-intent recently updated)
