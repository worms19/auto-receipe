const INSTAGRAM_URL_REGEX = /^https?:\/\/(?:www\.)?instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/;

export function isValidInstagramUrl(url: string): boolean {
  return INSTAGRAM_URL_REGEX.test(url.trim());
}

export function extractShortcode(url: string): string | null {
  const match = url.trim().match(INSTAGRAM_URL_REGEX);
  return match ? match[1] : null;
}
