/** Read the deployed version without reusing size/mtime cache validators. */
export async function hasDeploymentUpdate(currentVersion: string, url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      // `no-cache` alone can reuse a stale body after an incorrect 304. Build
      // artifacts may have identical mtimes and sizes across deployments.
      cache: 'no-store',
      headers: { pragma: 'no-cache', 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const data: unknown = await response.json();
    return typeof data === 'object' && data !== null && 'version' in data &&
      typeof data.version === 'string' && data.version.trim().length > 0 &&
      data.version !== currentVersion;
  } catch {
    // Offline, unavailable and malformed responses are not evidence of an update.
    return false;
  }
}
