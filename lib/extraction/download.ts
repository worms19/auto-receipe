import {
  downloadAsync,
  cacheDirectory,
  makeDirectoryAsync,
  getInfoAsync,
} from 'expo-file-system/legacy';
import { CobaltResponse } from './types';

const COBALT_API = 'http://127.0.0.1:9000';
const VIDEO_CACHE_DIR = `${cacheDirectory}wechef-videos/`;

export async function resolveInstagramUrl(instagramUrl: string): Promise<string> {
  const response = await fetch(`${COBALT_API}/`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: instagramUrl,
      videoQuality: '720',
    }),
  });

  if (!response.ok) {
    throw new Error(`Cobalt server error (${response.status}). Is Cobalt running? Start with: ./scripts/cobalt-server.sh`);
  }

  const data: CobaltResponse = await response.json();

  if (data.status === 'error') {
    const code = data.error?.code ?? 'unknown';
    throw new Error(`Could not download video: ${code}`);
  }

  if (data.status === 'tunnel' || data.status === 'redirect') {
    if (!data.url) throw new Error('Cobalt returned no video URL');
    return data.url;
  }

  if (data.status === 'picker' && data.picker?.length) {
    const video = data.picker.find(item => item.type === 'video');
    if (video) return video.url;
    if (data.picker[0]?.url) return data.picker[0].url;
  }

  throw new Error('Could not resolve video URL from Instagram');
}

export async function downloadVideo(directUrl: string): Promise<string> {
  const dirInfo = await getInfoAsync(VIDEO_CACHE_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(VIDEO_CACHE_DIR, { intermediates: true });
  }

  const filename = `video-${Date.now()}.mp4`;
  const fileUri = `${VIDEO_CACHE_DIR}${filename}`;

  const result = await downloadAsync(directUrl, fileUri);

  if (result.status !== 200) {
    throw new Error(`Video download failed with status ${result.status}`);
  }

  return result.uri;
}
