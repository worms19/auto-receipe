import { create } from 'zustand';
import { PipelineState, PipelineStage } from './types';
import { extractViaServer } from '@/lib/api/extraction-server';
import { saveThumbnail } from '@/lib/api/thumbnail';
import { structureRecipe } from '@/lib/api/claude';
import { getAnthropicKey } from '@/lib/api/config';
import { NewRecipe } from '@/lib/types';

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
    // Reset to initial state and start processing
    set({ ...initialState, sourceUrl: url, stage: 'downloading' });

    try {
      // Stage 1: Server-side extraction (cobalt + download + ffmpeg + whisper)
      const { transcript, thumbnail } = await extractViaServer(url);
      set({ stage: 'structuring', progress: 0.7 });

      // Stage 2: Save thumbnail locally
      const thumbnailUri = await saveThumbnail(thumbnail);

      // Stage 3: Structure with Claude
      const anthropicKey = await getAnthropicKey();
      const recipe = await structureRecipe(transcript, anthropicKey);
      set({ stage: 'complete', progress: 1 });

      return { ...recipe, sourceUrl: url, thumbnailUrl: thumbnailUri };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Processing failed';
      set({ stage: 'error', error: message });
      return null;
    }
  },

  reset: () => set(initialState),
}));
