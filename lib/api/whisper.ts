/**
 * OpenAI Whisper audio transcription service.
 * Uses expo-file-system/legacy for multipart upload (required for Android).
 */
import {
  uploadAsync,
  FileSystemUploadType,
} from 'expo-file-system/legacy';
import { TranscriptionError } from './errors';

const WHISPER_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

/**
 * Options for audio transcription.
 */
export interface TranscriptionOptions {
  /** ISO-639-1 language code (e.g., 'en', 'es', 'fr') */
  language?: string;
  /** Context hint for better accuracy */
  prompt?: string;
}

/**
 * Transcribes audio file to text using OpenAI Whisper API.
 *
 * Uses FileSystem.uploadAsync with MULTIPART upload type,
 * which is required for Android compatibility.
 *
 * @param audioUri - Local file URI to the audio file
 * @param apiKey - OpenAI API key
 * @param options - Optional transcription parameters
 * @returns Transcribed text
 * @throws TranscriptionError on API failure
 *
 * @example
 * ```typescript
 * const text = await transcribeAudio(
 *   'file:///path/to/audio.m4a',
 *   'sk-...',
 *   { language: 'en' }
 * );
 * ```
 */
export async function transcribeAudio(
  audioUri: string,
  apiKey: string,
  options: TranscriptionOptions = {}
): Promise<string> {
  const parameters: Record<string, string> = {
    model: 'whisper-1',
  };

  if (options.language) {
    parameters.language = options.language;
  }
  if (options.prompt) {
    parameters.prompt = options.prompt;
  }

  try {
    const response = await uploadAsync(
      WHISPER_ENDPOINT,
      audioUri,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        httpMethod: 'POST',
        uploadType: FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: 'audio/m4a',
        parameters,
      }
    );

    // Success
    if (response.status === 200) {
      const result = JSON.parse(response.body);
      return result.text;
    }

    // Handle specific error codes
    if (response.status === 429) {
      throw new TranscriptionError('Rate limit exceeded. Please try again later.', 429);
    }
    if (response.status === 413) {
      throw new TranscriptionError('Audio file too large (max 25MB)', 413);
    }
    if (response.status === 401) {
      throw new TranscriptionError('Invalid API key', 401);
    }

    // Generic error with response body
    throw new TranscriptionError(
      `Transcription failed: ${response.body}`,
      response.status
    );
  } catch (error) {
    // Re-throw TranscriptionError as-is
    if (error instanceof TranscriptionError) {
      throw error;
    }

    // Wrap unknown errors
    throw new TranscriptionError(
      error instanceof Error ? error.message : 'Unknown transcription error'
    );
  }
}
