import { create } from 'zustand';
import { PipelineState, PipelineStage } from './types';
import { extractViaServer } from '@/lib/api/extraction-server';
import { saveThumbnail } from '@/lib/api/thumbnail';
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
    set({ ...initialState, sourceUrl: url, stage: 'downloading' });

    try {
      // Server handles everything: cobalt + download + ffmpeg + whisper + Claude
      const { title, ingredients, steps, thumbnail } = await extractViaServer(url);
      set({ stage: 'structuring', progress: 0.9 });

      // Save thumbnail locally
      const thumbnailUri = await saveThumbnail(thumbnail);
      set({ stage: 'complete', progress: 1 });

      return { title, ingredients, steps, sourceUrl: url, thumbnailUrl: thumbnailUri };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Processing failed';
      set({ stage: 'error', error: message });
      return null;
    }
  },

  reset: () => set(initialState),
}));
