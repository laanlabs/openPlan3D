import { describe, expect, it } from 'vitest';
import { validateLocalGLB } from '../src/lib/renderLab/glb';
function glb(json: object) {
  const text = JSON.stringify(json); const bytes = new TextEncoder().encode(text.padEnd(Math.ceil(text.length / 4) * 4, ' '));
  const buffer = new ArrayBuffer(20 + bytes.length); const v = new DataView(buffer);
  [0x46546c67, 2, buffer.byteLength, bytes.length, 0x4e4f534a].forEach((n, i) => v.setUint32(i * 4, n, true));
  new Uint8Array(buffer, 20).set(bytes); return buffer;
}
describe('local render GLB preflight', () => {
  it('accepts embedded geometry and image data', () => expect(() => validateLocalGLB(glb({ asset: { version: '2.0' }, images: [{ bufferView: 0 }], buffers: [{ byteLength: 0 }] }))).not.toThrow());
  it('rejects remote textures before loader requests them', () => expect(() => validateLocalGLB(glb({ images: [{ uri: 'https://example.org/private.jpg' }] }))).toThrow('self-contained'));
  it('rejects relative external buffers', () => expect(() => validateLocalGLB(glb({ buffers: [{ uri: '../scan.bin' }] }))).toThrow('self-contained'));
  it('rejects truncated files', () => expect(() => validateLocalGLB(glb({}).slice(0, -1))).toThrow('valid'));
  it('rejects a vertex count over the preview budget', () => expect(() => validateLocalGLB(glb({ meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], accessors: [{ count: 2_000_001 }] }))).toThrow('two million'));
  it('rejects empty input with a useful error', () => expect(() => validateLocalGLB(new ArrayBuffer(0))).toThrow('complete'));
});
