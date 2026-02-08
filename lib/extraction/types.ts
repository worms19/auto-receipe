export interface ExtractionResult {
  audioUri: string;
  thumbnailUri: string;
}

export interface CobaltResponse {
  status: 'tunnel' | 'redirect' | 'picker' | 'error';
  url?: string;
  filename?: string;
  error?: { code: string; context?: Record<string, unknown> };
  picker?: Array<{ type: string; url: string; thumb?: string }>;
}
