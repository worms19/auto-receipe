import { requireNativeModule } from 'expo-modules-core';

const AudioExtractorModule = requireNativeModule('AudioExtractor');

export async function extractAudio(videoUri: string, outputUri: string): Promise<string> {
  return AudioExtractorModule.extractAudio(videoUri, outputUri);
}
