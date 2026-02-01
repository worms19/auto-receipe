# Phase 2: Processing Pipeline - Research

**Researched:** 2026-02-01
**Domain:** Async pipeline orchestration with progress UI in React Native/Expo
**Confidence:** HIGH

## Summary

This phase requires building a multi-step processing pipeline that extracts recipes from Instagram URLs. The pipeline has four stages: downloading, extracting, transcribing, and structuring. Users need to see real-time progress through these stages with appropriate status updates.

The recommended approach uses **Zustand** for lightweight state management of the pipeline state, combined with **react-native-reanimated** (already installed) for smooth progress animations. This keeps the solution simple without requiring heavy state machine libraries like XState, which would be overkill for a 4-step mocked pipeline.

The pipeline will use Promise-based mock API calls with artificial delays (setTimeout) to simulate real processing. This establishes the correct architecture that can be swapped for real API calls in Phase 4.

**Primary recommendation:** Use Zustand for pipeline state management with a simple status enum pattern, not XState. Build a custom animated progress component using existing react-native-reanimated.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.0 | Pipeline state management | No middleware needed for async, simple API, 40%+ of React projects use it in 2026 |
| react-native-reanimated | ~4.1.1 | Progress animations | Already installed, runs on UI thread at 120fps, native performance |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | Existing stack is sufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand | XState | XState is overkill for 4-step mocked pipeline; adds complexity without benefit for this scope |
| Zustand | useState/Context | Zustand is cleaner for async operations, provides subscription-based updates |
| Custom progress | react-native-progress | Already have reanimated installed; custom is simpler and more flexible |
| Custom progress | expo-progress | Requires additional dependencies (react-native-redash); adds complexity |

**Installation:**
```bash
npm install zustand --legacy-peer-deps
```

Note: Use `--legacy-peer-deps` flag to match Phase 1 approach for React 19 compatibility.

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── pipeline/
│   ├── store.ts         # Zustand store for pipeline state
│   ├── types.ts         # Pipeline status types
│   └── mock-api.ts      # Mock API functions with delays
├── db.ts                # Existing SQLite operations
├── types.ts             # Existing Recipe types
└── utils.ts             # Existing utilities

components/
├── ProcessingModal.tsx  # Modal showing pipeline progress
├── ProgressIndicator.tsx # Animated progress bar component
└── URLInput.tsx         # Text input for Instagram URL

app/
├── (tabs)/
│   └── index.tsx        # Add URL input + trigger processing
└── ...
```

### Pattern 1: Zustand Async Pipeline Store
**What:** A Zustand store that manages pipeline state with explicit status for each stage
**When to use:** Multi-step async workflows that need UI feedback
**Example:**
```typescript
// lib/pipeline/types.ts
export type PipelineStage = 'idle' | 'downloading' | 'extracting' | 'transcribing' | 'structuring' | 'complete' | 'error';

export interface PipelineState {
  stage: PipelineStage;
  progress: number; // 0-1 for current stage
  error: string | null;
  sourceUrl: string | null;
}

// lib/pipeline/store.ts
import { create } from 'zustand';
import { PipelineState, PipelineStage } from './types';

interface PipelineStore extends PipelineState {
  startProcessing: (url: string) => Promise<void>;
  reset: () => void;
}

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  stage: 'idle',
  progress: 0,
  error: null,
  sourceUrl: null,

  startProcessing: async (url: string) => {
    set({ sourceUrl: url, stage: 'downloading', progress: 0, error: null });

    try {
      // Stage 1: Downloading
      await mockDownload(url);
      set({ stage: 'extracting', progress: 0 });

      // Stage 2: Extracting
      await mockExtract();
      set({ stage: 'transcribing', progress: 0 });

      // Stage 3: Transcribing
      await mockTranscribe();
      set({ stage: 'structuring', progress: 0 });

      // Stage 4: Structuring
      const recipe = await mockStructure();
      set({ stage: 'complete', progress: 1 });

      return recipe;
    } catch (error) {
      set({ stage: 'error', error: error.message });
    }
  },

  reset: () => set({ stage: 'idle', progress: 0, error: null, sourceUrl: null }),
}));
```

### Pattern 2: Mock API with Progress Updates
**What:** Promise-based mock functions that simulate API calls with progress callbacks
**When to use:** Development before real backend exists
**Example:**
```typescript
// lib/pipeline/mock-api.ts
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function mockDownload(url: string): Promise<void> {
  // Simulate 2 second download
  await delay(2000);
}

export async function mockExtract(): Promise<string> {
  // Simulate extracting video frames/audio
  await delay(1500);
  return 'extracted_content';
}

export async function mockTranscribe(): Promise<string> {
  // Simulate transcription
  await delay(2000);
  return 'Here is how to make this delicious pasta...';
}

export async function mockStructure(): Promise<NewRecipe> {
  // Simulate AI structuring
  await delay(1500);
  return {
    title: 'Creamy Garlic Tuscan Shrimp',
    ingredients: [
      '1 lb large shrimp, peeled and deveined',
      '2 tbsp butter',
      '4 cloves garlic, minced',
      // ... more ingredients
    ],
    steps: [
      'Season shrimp with salt and pepper',
      'Melt butter in a large skillet over medium-high heat',
      // ... more steps
    ],
    sourceUrl: 'https://instagram.com/p/example',
    thumbnailUrl: null,
  };
}
```

### Pattern 3: Animated Progress Bar with Reanimated
**What:** Smooth animated progress bar using shared values
**When to use:** Any progress indication in React Native
**Example:**
```typescript
// components/ProgressIndicator.tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { View } from 'react-native';

interface ProgressIndicatorProps {
  progress: number; // 0-1
  stage: string;
}

export function ProgressIndicator({ progress, stage }: ProgressIndicatorProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(progress * 100, { duration: 300 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <Animated.View
        className="h-full bg-blue-500 rounded-full"
        style={animatedStyle}
      />
    </View>
  );
}
```

### Anti-Patterns to Avoid
- **XState for simple pipelines:** State machines add overhead; simple status enum is clearer for 4 stages
- **Context for async state:** Context triggers re-renders on all consumers; Zustand is more efficient
- **Polling for progress:** Use direct state updates from async functions, not polling intervals
- **Blocking UI during processing:** Show modal/overlay but keep app responsive with async operations

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State management | Custom useState chains | Zustand | Handles async naturally, provides subscriptions |
| Progress animations | Manual View width updates | react-native-reanimated | Runs on UI thread, smooth 60-120fps |
| URL validation | Regex patterns | expo-linking parseURL | Handles edge cases, consistent with platform |
| UUID generation | Math.random | expo-crypto (already using) | Cryptographically secure |

**Key insight:** The pipeline orchestration itself should be custom (it's the core logic), but state management and animations should use established libraries.

## Common Pitfalls

### Pitfall 1: Blocking UI Thread with Heavy Operations
**What goes wrong:** App freezes during "processing" even with mocked delays
**Why it happens:** Synchronous operations or improper async handling
**How to avoid:** All mock APIs must be properly async with await; use InteractionManager.runAfterInteractions() for any heavy setup
**Warning signs:** UI janky during stage transitions, animations stuttering

### Pitfall 2: State Updates After Component Unmount
**What goes wrong:** "Can't perform state update on unmounted component" warnings
**Why it happens:** Async operation completes after user navigates away
**How to avoid:** Zustand handles this gracefully (updates store, not component); ensure modal has proper cleanup
**Warning signs:** Console warnings about unmounted components

### Pitfall 3: Progress Bar Not Animating
**What goes wrong:** Progress jumps instead of animating smoothly
**Why it happens:** Using regular View instead of Animated.View, or not using shared values
**How to avoid:** Always use useSharedValue + useAnimatedStyle for reanimated; never set width directly from state
**Warning signs:** Jerky progress updates, immediate jumps between values

### Pitfall 4: Error State Not Clearing
**What goes wrong:** Error persists across multiple processing attempts
**Why it happens:** Not resetting error state at start of new processing
**How to avoid:** Clear error at the start of startProcessing: `set({ error: null })`
**Warning signs:** Old error messages showing after retry

### Pitfall 5: Zustand React 19 Peer Dependency Warning
**What goes wrong:** npm install fails or shows peer dependency warnings
**Why it happens:** Zustand may not explicitly declare React 19 support yet
**How to avoid:** Use `--legacy-peer-deps` flag as established in Phase 1
**Warning signs:** npm ERESOLVE errors during install

## Code Examples

Verified patterns from official sources:

### Complete Pipeline Store Implementation
```typescript
// lib/pipeline/store.ts
// Source: Zustand official docs pattern + project conventions
import { create } from 'zustand';
import { PipelineState, PipelineStage } from './types';
import { mockDownload, mockExtract, mockTranscribe, mockStructure } from './mock-api';
import { NewRecipe } from '../types';

interface PipelineStore extends PipelineState {
  startProcessing: (url: string) => Promise<NewRecipe | null>;
  reset: () => void;
}

const initialState: PipelineState = {
  stage: 'idle',
  progress: 0,
  error: null,
  sourceUrl: null,
};

export const usePipelineStore = create<PipelineStore>((set) => ({
  ...initialState,

  startProcessing: async (url: string) => {
    set({ ...initialState, sourceUrl: url, stage: 'downloading' });

    try {
      await mockDownload(url);
      set({ stage: 'extracting', progress: 0 });

      await mockExtract();
      set({ stage: 'transcribing', progress: 0 });

      const transcript = await mockTranscribe();
      set({ stage: 'structuring', progress: 0 });

      const recipe = await mockStructure(transcript);
      set({ stage: 'complete', progress: 1 });

      return recipe;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Processing failed';
      set({ stage: 'error', error: message });
      return null;
    }
  },

  reset: () => set(initialState),
}));
```

### Stage Display Mapping
```typescript
// lib/pipeline/types.ts
export const STAGE_LABELS: Record<PipelineStage, string> = {
  idle: 'Ready',
  downloading: 'Downloading video...',
  extracting: 'Extracting content...',
  transcribing: 'Transcribing audio...',
  structuring: 'Creating recipe...',
  complete: 'Done!',
  error: 'Error',
};

export const STAGE_PROGRESS: Record<PipelineStage, number> = {
  idle: 0,
  downloading: 0.25,
  extracting: 0.5,
  transcribing: 0.75,
  structuring: 0.9,
  complete: 1,
  error: 0,
};
```

### Processing Modal Component
```typescript
// components/ProcessingModal.tsx
// Pattern: Modal with Zustand subscription
import { Modal, View, Text, Pressable } from 'react-native';
import { usePipelineStore } from '@/lib/pipeline/store';
import { STAGE_LABELS, STAGE_PROGRESS } from '@/lib/pipeline/types';
import { ProgressIndicator } from './ProgressIndicator';

interface ProcessingModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProcessingModal({ visible, onClose }: ProcessingModalProps) {
  const { stage, error } = usePipelineStore();
  const progress = STAGE_PROGRESS[stage];
  const label = STAGE_LABELS[stage];

  const isComplete = stage === 'complete';
  const isError = stage === 'error';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white rounded-2xl p-6 mx-6 w-80">
          <Text className="text-lg font-semibold text-center mb-4">
            {label}
          </Text>

          <ProgressIndicator progress={progress} stage={stage} />

          {isError && (
            <Text className="text-red-500 text-center mt-4">{error}</Text>
          )}

          {(isComplete || isError) && (
            <Pressable
              onPress={onClose}
              className="mt-6 bg-blue-500 rounded-lg py-3"
            >
              <Text className="text-white text-center font-semibold">
                {isComplete ? 'View Recipe' : 'Try Again'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redux for all state | Zustand for client state, React Query for server | 2024-2025 | 40%+ adoption for Zustand |
| Context + useReducer | Zustand for shared async state | 2024 | Simpler API, better performance |
| XState for all workflows | XState only for complex state machines | 2025 | Right-sizing state management |
| Animated API from RN | react-native-reanimated 4.x | 2025 | UI thread animations, 120fps |

**Deprecated/outdated:**
- **Redux without RTK:** Hand-written Redux is down to ~10% of new projects
- **ProgressBarAndroid:** Deprecated in RN, use community components or custom
- **Reanimated 2.x patterns:** v4 requires New Architecture (Fabric); this project uses 4.1.1

## Open Questions

Things that couldn't be fully resolved:

1. **Progress within each stage**
   - What we know: Can show stage-level progress (0.25, 0.5, 0.75, 1)
   - What's unclear: Whether to simulate sub-progress within each stage (e.g., download 10%, 20%, etc.)
   - Recommendation: Start with stage-level only; add sub-progress if UX testing suggests it's needed

2. **Error retry strategy**
   - What we know: Can reset and retry from beginning
   - What's unclear: Whether to support retry from failed stage
   - Recommendation: For mock APIs, simple reset is sufficient; revisit in Phase 4 with real APIs

3. **Background processing**
   - What we know: iOS/Android have BGTaskScheduler/WorkManager for background work
   - What's unclear: Whether processing should continue if app backgrounded
   - Recommendation: Keep foreground-only for Phase 2 (mock APIs are fast); address in Phase 4

## Sources

### Primary (HIGH confidence)
- Zustand GitHub README - Async actions pattern, TypeScript usage
- React Native Reanimated docs - v4.x setup, useSharedValue, useAnimatedStyle
- Project package.json - Existing dependencies and versions

### Secondary (MEDIUM confidence)
- [State Management Nx React Native/Expo Apps](https://nx.dev/blog/state-management-nx-react-native-expo-apps-with-tanstack-query-and-redux) - 2026 state management trends
- [Zustand TypeScript patterns](https://refine.dev/blog/zustand-react-state/) - Loading state patterns
- [React Native School - Animated Progress Bar](https://www.reactnativeschool.com/animated-progress-bar-with-reanimated-2/) - Reanimated progress pattern
- [State Management in 2026: Redux, Context API, and Modern Patterns](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) - Industry trends

### Tertiary (LOW confidence)
- Medium articles on XState integration - Useful but overkill for this phase
- NPM download trends for Zustand vs alternatives - General direction only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zustand is well-documented, reanimated already installed and working
- Architecture: HIGH - Patterns directly from official docs and established community practice
- Pitfalls: MEDIUM - Based on common issues across multiple sources, not specific to this exact stack version

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable patterns)
