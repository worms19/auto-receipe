import { deleteAsync } from 'expo-file-system/legacy';
import { ExtractionResult } from './types';
import { isValidInstagramUrl } from './url-validator';
import { resolveInstagramUrl, downloadVideo } from './download';
import { extractAudioTrack } from './audio';
import { extractThumbnail } from './thumbnail';

export async function extractFromInstagramUrl(
  instagramUrl: string
): Promise<ExtractionResult> {
  if (!isValidInstagramUrl(instagramUrl)) {
    throw new Error(
      'Invalid Instagram URL. Please share a link to an Instagram reel or post.'
    );
  }

  const directUrl = await resolveInstagramUrl(instagramUrl);
  const videoUri = await downloadVideo(directUrl);

  try {
    const audioUri = await extractAudioTrack(videoUri);
    const thumbnailUri = await extractThumbnail(videoUri);

    return { audioUri, thumbnailUri };
  } finally {
    try {
      await deleteAsync(videoUri, { idempotent: true });
    } catch {
      // Best-effort cleanup
    }
  }
}
