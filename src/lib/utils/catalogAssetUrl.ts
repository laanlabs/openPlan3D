import urls from 'virtual:catalog-assets';
import { asset } from '$app/paths';
import type { AssetPath } from '$app/types';

/** Production URLs contain a content hash; unchanged assets survive app releases in cache. */
export function catalogAssetUrl(path: string): string {
  const url = urls[path] ?? path;
  // The catalog plugin gives root-relative paths (dev, server and client builds); a complete URL passes through.
  return url.startsWith('/') ? asset(url.slice(1) as AssetPath) : url;
}
