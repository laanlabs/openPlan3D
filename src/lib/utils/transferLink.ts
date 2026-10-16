/**
 * Transfer links into the sibling planners, with no server in between. Same codec as
 * openlandscape3d-cloud, openkitchen3d-cloud and opencatio3d-cloud `src/lib/io/transfer.ts`:
 *
 *   <origin>/#/import/v1/<payload>
 *   <payload> = base64url (no padding) of raw DEFLATE (RFC 1951; the browser's 'deflate-raw',
 *               Apple's COMPRESSION_ZLIB) of the compact, key-sorted prepared RoomPlan JSON.
 *
 * The plan travels in the URL fragment, which never reaches a server. OpenLandscape3D and
 * OpenCatio3D reject payloads over MAX_TRANSFER_PAYLOAD_CHARS, so a link is refused at the same
 * size for every planner; larger plans go as a file (interchange.ts). UI code should map
 * `TransferLinkError.reason` to a localized message.
 */
import { sortedJson } from './interchange';

/** app.openkitchen3d.com is not live yet (404 as of 2026-10-15); switch here when it is. */
export const OPENKITCHEN3D_WEB_ORIGIN = 'https://openkitchen3d-cloud.web.app';

export const SIBLING_PLANNERS = [
  { id: 'openlandscape3d', name: 'OpenLandscape3D', origin: 'https://app.openlandscape3d.com' },
  { id: 'openkitchen3d', name: 'OpenKitchen3D', origin: OPENKITCHEN3D_WEB_ORIGIN },
  { id: 'opencatio3d', name: 'OpenCatio3D', origin: 'https://app.opencatio3d.com' },
] as const;
export type SiblingPlannerId = typeof SIBLING_PLANNERS[number]['id'];

export const TRANSFER_VERSION = 'v1';
/** Longest payload the siblings accept (characters, before decoding): about 192 KB compressed. */
export const MAX_TRANSFER_PAYLOAD_CHARS = 262144;
/** Most inflated bytes accepted; raw DEFLATE reaches ~1000:1, so this bounds a "deflate bomb". */
export const MAX_TRANSFER_INFLATED_BYTES = 16 * 1024 * 1024;

export class TransferLinkError extends Error {
  constructor(message: string, readonly reason: 'too-large' | 'unsupported') {
    super(message);
    this.name = 'TransferLinkError';
  }
}

const unsupported = () => new TransferLinkError('This browser cannot build transfer links: CompressionStream is unavailable. Export the JSON file instead.', 'unsupported');
const tooLarge = (detail: string) => new TransferLinkError(`${detail} Export the JSON file instead.`, 'too-large');

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const response = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw')));
  return new Uint8Array(await response.arrayBuffer());
}

/** Inflates chunk by chunk and stops as soon as the output passes `limit` bytes. */
async function inflate(bytes: Uint8Array, limit: number): Promise<Uint8Array> {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => {});
      throw tooLarge('This link is too large to open.');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) { out.set(chunk, at); at += chunk.byteLength; }
  return out;
}

/** Compact key-sorted JSON → UTF-8 → raw DEFLATE → base64url without padding. */
export async function encodeTransferPayload(json: unknown): Promise<string> {
  if (typeof CompressionStream === 'undefined') throw unsupported();
  return toBase64Url(await deflate(new TextEncoder().encode(sortedJson(json))));
}

/** The inverse, with the siblings' size caps, for tests and symmetry. */
export async function decodeTransferPayload(payload: string, limit = MAX_TRANSFER_INFLATED_BYTES): Promise<unknown> {
  if (typeof DecompressionStream === 'undefined') throw unsupported();
  if (payload.length > MAX_TRANSFER_PAYLOAD_CHARS) throw tooLarge('This link is too large to open.');
  const bytes = await inflate(fromBase64Url(decodeURIComponent(payload.trim())), limit);
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** `<origin>/#/import/v1/<payload>` for one planner; TransferLinkError when the plan is too large for a link. */
export async function siblingImportUrl(appId: SiblingPlannerId, json: unknown): Promise<string> {
  const planner = SIBLING_PLANNERS.find(p => p.id === appId);
  if (!planner) throw new Error(`Unknown planner: ${appId}`);
  const payload = await encodeTransferPayload(json);
  if (payload.length > MAX_TRANSFER_PAYLOAD_CHARS) {
    throw tooLarge(`This plan is too large for a ${planner.name} link (${payload.length} of ${MAX_TRANSFER_PAYLOAD_CHARS} characters).`);
  }
  return `${planner.origin}/#/import/${TRANSFER_VERSION}/${payload}`;
}
