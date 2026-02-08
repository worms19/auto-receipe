/**
 * Thumbnail persistence utility.
 * Saves base64 data URI thumbnails to the app's document directory.
 */
import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';

const THUMBNAIL_DIR = `${documentDirectory}thumbnails/`;

/**
 * Saves a base64 data URI thumbnail to the local filesystem.
 *
 * @param base64DataUri - Data URI (e.g. "data:image/jpeg;base64,...")
 * @returns Local file URI for the saved thumbnail
 */
export async function saveThumbnail(base64DataUri: string): Promise<string> {
  // Ensure thumbnails directory exists
  const dirInfo = await getInfoAsync(THUMBNAIL_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(THUMBNAIL_DIR, { intermediates: true });
  }

  // Strip data URI prefix to get raw base64
  const base64 = base64DataUri.replace(/^data:image\/\w+;base64,/, '');

  // Generate unique filename
  const filename = `thumb-${Date.now()}.jpg`;
  const fileUri = `${THUMBNAIL_DIR}${filename}`;

  await writeAsStringAsync(fileUri, base64, {
    encoding: EncodingType.Base64,
  });

  return fileUri;
}
