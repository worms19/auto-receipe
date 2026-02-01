/**
 * Typed API error classes for WeChef API integrations.
 * Provides structured error handling with retry information.
 */

/**
 * Base class for all API errors.
 * Includes status code and retry guidance.
 */
export class APIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Error from OpenAI Whisper transcription API.
 * Retryable on 429 (rate limit) or 503 (service unavailable).
 */
export class TranscriptionError extends APIError {
  constructor(message: string, statusCode?: number) {
    const isRetryable = statusCode === 429 || statusCode === 503;
    super(message, statusCode, isRetryable);
    this.name = 'TranscriptionError';
  }
}

/**
 * Error from Anthropic Claude structuring API.
 * Retryable on 429 (rate limit) or 529 (overloaded).
 */
export class StructuringError extends APIError {
  constructor(message: string, statusCode?: number) {
    const isRetryable = statusCode === 429 || statusCode === 529;
    super(message, statusCode, isRetryable);
    this.name = 'StructuringError';
  }
}
