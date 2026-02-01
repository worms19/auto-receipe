import { create } from 'zustand';
import { PipelineState, PipelineStage } from './types';
import {
  mockDownload,
  mockExtract,
  mockTranscribe,
  mockStructure,
} from './mock-api';
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
    // Reset to initial state and start downloading
    set({ ...initialState, sourceUrl: url, stage: 'downloading' });

    try {
      // Stage 1: Downloading (~2s)
      await mockDownload(url);
      set({ stage: 'extracting', progress: 0.25 });

      // Stage 2: Extracting (~1.5s)
      await mockExtract();
      set({ stage: 'transcribing', progress: 0.5 });

      // Stage 3: Transcribing (~2s)
      const transcript = await mockTranscribe();
      set({ stage: 'structuring', progress: 0.75 });

      // Stage 4: Structuring (~1.5s)
      const recipe = await mockStructure(transcript);
      set({ stage: 'complete', progress: 1 });

      // Set sourceUrl on the recipe
      return { ...recipe, sourceUrl: url };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Processing failed';
      set({ stage: 'error', error: message });
      return null;
    }
  },

  reset: () => set(initialState),
}));
