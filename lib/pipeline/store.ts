import { create } from 'zustand';
import { PipelineState, PipelineStage } from './types';
import { extractFromInstagramUrl } from '@/lib/extraction/extract';
import { deleteAsync } from 'expo-file-system/legacy';
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
    set({ ...initialState, sourceUrl: url, stage: 'downloading' });

    try {
      // Stages 1+2: Download video + Extract audio/thumbnail
      const { audioUri, thumbnailUri } = await extractFromInstagramUrl(url);
      set({ stage: 'transcribing', progress: 0.5 });

      // Stage 3: Transcribe audio
      let transcript: string;
      if (isLocalWhisper) {
        transcript = await transcribeAudio(audioUri);
      } else {
        const openaiKey = await getOpenAIKey();
        transcript = await transcribeAudio(audioUri, openaiKey);
      }

      // Clean up audio file after successful transcription
      try {
        await deleteAsync(audioUri, { idempotent: true });
      } catch {
        // Best-effort cleanup
      }

      set({ stage: 'structuring', progress: 0.75 });

      // Stage 4: Structure recipe
      const anthropicKey = await getAnthropicKey();
      const recipe = await structureRecipe(transcript, anthropicKey);
      set({ stage: 'complete', progress: 1 });

      // Return recipe with source URL and thumbnail
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
