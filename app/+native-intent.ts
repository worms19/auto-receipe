import { getShareExtensionKey } from "expo-share-intent";

export async function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}) {
  if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
    return "/";
  }
  return path;
}
