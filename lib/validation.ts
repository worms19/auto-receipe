const INSTAGRAM_URL_PATTERNS = [
  /^https?:\/\/(www\.)?(instagram\.com)\/(reel|p|tv)\/[\w-]+/i,
  /^https?:\/\/(www\.)?(instagr\.am)\/(reel|p|tv)\/[\w-]+/i,
];

export function isInstagramUrl(url: string): boolean {
  return INSTAGRAM_URL_PATTERNS.some((pattern) => pattern.test(url.trim()));
}

export function extractInstagramUrl(text: string): string | null {
  const urlMatch = text.match(
    /https?:\/\/(www\.)?(instagram\.com|instagr\.am)\/(reel|p|tv)\/[\w-]+[^\s]*/i
  );
  return urlMatch ? urlMatch[0] : null;
}
