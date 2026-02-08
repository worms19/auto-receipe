import {
  cacheDirectory,
  makeDirectoryAsync,
  getInfoAsync,
} from 'expo-file-system/legacy';
import { extractAudio } from '../../modules/audio-extractor/src';

const AUDIO_CACHE_DIR = `${cacheDirectory}wechef-audio/`;

export async function extractAudioTrack(videoUri: string): Promise<string> {
  const dirInfo = await getInfoAsync(AUDIO_CACHE_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(AUDIO_CACHE_DIR, { intermediates: true });
  }

  const filename = `audio-${Date.now()}.m4a`;
  const outputUri = `${AUDIO_CACHE_DIR}${filename}`;

  return extractAudio(videoUri, outputUri);
}
