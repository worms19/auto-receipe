import { create } from 'zustand';
import { PipelineState, PipelineStage } from './types';
import { mockDownload, mockExtract } from './mock-api';
import { transcribeAudio, isLocalWhisper } from '@/lib/api/whisper';
import { structureRecipe } from '@/lib/api/claude';
import { getOpenAIKey, getAnthropicKey } from '@/lib/api/config';
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
      // TODO: Phase 4 will provide real audioUri from video extraction
      const audioUri = await mockExtract();
      set({ stage: 'transcribing', progress: 0.5 });

      // Stage 3: Transcribing - local whisper-server in dev, OpenAI in prod
      let transcript: string;
      if (isLocalWhisper) {
        // Local whisper-server: no API key needed
        transcript = await transcribeAudio(audioUri);
      } else {
        const openaiKey = await getOpenAIKey();
        transcript = await transcribeAudio(audioUri, openaiKey);
      }
      set({ stage: 'structuring', progress: 0.75 });

      // Stage 4: Structuring - NOW REAL
      const anthropicKey = await getAnthropicKey();
      const recipe = await structureRecipe(transcript, anthropicKey);
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
