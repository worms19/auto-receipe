/**
 * API configuration utilities for WeChef.
 * Handles secure key storage and retrieval.
 */
import * as SecureStore from 'expo-secure-store';

const OPENAI_KEY_STORAGE = 'openai_api_key';
const ANTHROPIC_KEY_STORAGE = 'anthropic_api_key';

/**
 * Retrieves OpenAI API key.
 * Checks SecureStore first (production), falls back to env var (development).
 * @throws Error if no key is configured
 */
export async function getOpenAIKey(): Promise<string> {
  // Try SecureStore first (for keys set via settings)
  const storedKey = await SecureStore.getItemAsync(OPENAI_KEY_STORAGE);
  if (storedKey) return storedKey;

  // Development fallback: environment variable
  const envKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (envKey) return envKey;

  throw new Error(
    'OpenAI API key not configured. ' +
      'Set EXPO_PUBLIC_OPENAI_API_KEY in .env or configure in app settings.'
  );
}

/**
 * Retrieves Anthropic API key.
 * Checks SecureStore first (production), falls back to env var (development).
 * @throws Error if no key is configured
 */
export async function getAnthropicKey(): Promise<string> {
  // Try SecureStore first (for keys set via settings)
  const storedKey = await SecureStore.getItemAsync(ANTHROPIC_KEY_STORAGE);
  if (storedKey) return storedKey;

  // Development fallback: environment variable
  const envKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (envKey) return envKey;

  throw new Error(
    'Anthropic API key not configured. ' +
      'Set EXPO_PUBLIC_ANTHROPIC_API_KEY in .env or configure in app settings.'
  );
}

/**
 * Stores OpenAI API key in secure storage.
 * For use by future settings screen.
 */
export async function setOpenAIKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(OPENAI_KEY_STORAGE, key);
}

/**
 * Stores Anthropic API key in secure storage.
 * For use by future settings screen.
 */
export async function setAnthropicKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(ANTHROPIC_KEY_STORAGE, key);
}
