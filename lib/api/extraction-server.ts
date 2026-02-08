/**
 * Client for the local NestJS extraction server.
 * Sends an Instagram URL and receives a structured recipe + thumbnail.
 */

const EXTRACTION_URL = 'http://127.0.0.1:3000/extract';

export interface ExtractionResponse {
  title: string;
  ingredients: string[];
  steps: string[];
  thumbnail: string; // base64 data URI
}

/**
 * Calls the local extraction server to process a video URL.
 * The server handles: Cobalt -> download -> ffmpeg -> whisper -> Claude.
 *
 * @param url - Instagram reel/post URL
 * @returns Structured recipe with title, ingredients, steps, and base64 thumbnail
 */
export async function extractViaServer(url: string): Promise<ExtractionResponse> {
  const response = await fetch(EXTRACTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Extraction server error (${response.status}): ${body}`);
  }

  return response.json();
}
