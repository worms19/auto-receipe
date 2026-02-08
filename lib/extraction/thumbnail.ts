import * as VideoThumbnails from 'expo-video-thumbnails';
import {
  documentDirectory,
  makeDirectoryAsync,
  getInfoAsync,
  copyAsync,
} from 'expo-file-system/legacy';

const THUMBNAIL_DIR = `${documentDirectory}thumbnails/`;

export async function extractThumbnail(videoUri: string): Promise<string> {
  const dirInfo = await getInfoAsync(THUMBNAIL_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(THUMBNAIL_DIR, { intermediates: true });
  }

  const { uri: cacheUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
    time: 1000,
    quality: 0.7,
  });

  const filename = `thumb-${Date.now()}.jpg`;
  const persistentUri = `${THUMBNAIL_DIR}${filename}`;
  await copyAsync({ from: cacheUri, to: persistentUri });

  return persistentUri;
}
