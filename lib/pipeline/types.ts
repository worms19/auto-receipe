export type PipelineStage =
  | 'idle'
  | 'downloading'
  | 'extracting'
  | 'transcribing'
  | 'structuring'
  | 'complete'
  | 'error';

export interface PipelineState {
  stage: PipelineStage;
  progress: number; // 0-1 for overall pipeline progress
  error: string | null;
  sourceUrl: string | null;
}

export const STAGE_LABELS: Record<PipelineStage, string> = {
  idle: 'Ready',
  downloading: 'Processing video...',
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
