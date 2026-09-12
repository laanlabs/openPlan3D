export interface StoredSnapshot {
  timestamp: number;
  description: string;
  data: string;
}
const object = (value: any) => value && typeof value === 'object' && !Array.isArray(value);
const unreadable = () => { throw new Error('Version history could not be read. Download a backup before clearing damaged versions.'); };
const EXPANDED_LIMIT = 128 * 1024 * 1024;
function checkExpandedSize(size: number) {
  if (size > EXPANDED_LIMIT) throw new Error('These attachments would make saved versions too large to reopen. Export a backup, then use smaller files or remove unused attachments.');
}

/** Version 1 was an array. Version 2 shares immutable attachment bytes between
 * saved versions. Hydrated callers still receive complete, standalone projects. */
export function readSnapshotStorage(raw: string | null): unknown[] {
  if (raw === null) return [];
  let value: any;
  try { value = JSON.parse(raw); } catch { return unreadable(); }
  if (Array.isArray(value)) return value;
  if (!object(value) || value.format !== 'openplan3d-history' || value.version !== 2 ||
      !Array.isArray(value.snapshots) || value.snapshots.length > 1000 || !object(value.assets) || Object.values(value.assets).some(v => typeof v !== 'string')) return unreadable();
  let expandedSize = 0;
  return value.snapshots.map((entry: any) => {
    if (!object(entry) || !object(entry.snapshot)) return unreadable();
    if (!Object.hasOwn(entry, 'assetRefs')) return entry.snapshot;
    try {
      if (!object(entry.assetRefs) || Object.keys(entry.assetRefs).length > 512 || typeof entry.snapshot.data !== 'string') return unreadable();
      expandedSize += entry.snapshot.data.length;
      checkExpandedSize(expandedSize);
      let separator = 1;
      for (const [name, ref] of Object.entries(entry.assetRefs)) {
        if (typeof ref !== 'string' || !Object.hasOwn(value.assets, ref)) return unreadable();
        expandedSize += JSON.stringify(value.assets[ref]).length + JSON.stringify(name).length + separator;
        separator = 2;
        checkExpandedSize(expandedSize);
      }
      const project = JSON.parse(entry.snapshot.data);
      if (!object(project.projectPackage) || !object(project.projectPackage.assets) || Object.keys(project.projectPackage.assets).length) return unreadable();
      project.projectPackage.assets = Object.fromEntries(Object.entries(entry.assetRefs).map(([name, ref]) => {
        if (typeof ref !== 'string' || !Object.hasOwn(value.assets, ref)) return unreadable();
        return [name, value.assets[ref]];
      }));
      return { ...entry.snapshot, data: JSON.stringify(project) };
    } catch { return unreadable(); }
  });
}

export function writeSnapshotStorage(snapshots: StoredSnapshot[]): string {
  const assets: Record<string, string> = Object.create(null), ids = new Map<string, string>();
  const entries = snapshots.map(snapshot => {
    try {
      const project = JSON.parse(snapshot.data), source = project?.projectPackage?.assets;
      if (!object(source) || !Object.keys(source).length || Object.values(source).some(v => typeof v !== 'string')) return { snapshot };
      const assetRefs = Object.fromEntries(Object.entries(source).map(([name, data]) => {
        const bytes = data as string;
        let id = ids.get(bytes);
        if (id === undefined) { id = `a${ids.size}`; ids.set(bytes, id); assets[id] = bytes; }
        return [name, id];
      }));
      project.projectPackage.assets = {};
      return { snapshot: { ...snapshot, data: JSON.stringify(project) }, assetRefs };
    } catch { return { snapshot }; } // Damaged project bytes remain recoverable verbatim.
  });
  if (ids.size) checkExpandedSize(snapshots.reduce((size, snapshot) => size + snapshot.data.length, 0));
  return JSON.stringify(ids.size ? { format: 'openplan3d-history', version: 2, snapshots: entries, assets } : snapshots);
}
