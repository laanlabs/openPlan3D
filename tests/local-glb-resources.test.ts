import { expect, it } from 'vitest';
import { validateLocalGLBResources } from '$lib/utils/localGLBResources';

function png(width = 16, height = 8) {
  const bytes = new Uint8Array(24), view = new DataView(bytes.buffer);
  view.setUint32(0, 0x89504e47); view.setUint32(4, 0x0d0a1a0a); view.setUint32(12, 0x49484452);
  view.setUint32(16, width); view.setUint32(20, height); return bytes;
}
function model(width = 16, height = 8) {
  return { document: {
    buffers: [{ byteLength: 24 }], bufferViews: [{ buffer: 0, byteLength: 24 }],
    images: [{ bufferView: 0, mimeType: 'image/png' }],
  } as Record<string, any>, binary: png(width, height) };
}

it('reports embedded image dimensions and byte ranges without decoding', () => {
  expect(validateLocalGLBResources(model())).toEqual({ ranges: [{ offset: 0, length: 24 }],
    imageHeaders: [{ width: 16, height: 8, mime: 'image/png' }], pixels: 128 });
});

it('rejects remote, relative, data and blob URLs even alongside valid embedded resources', () => {
  for (const uri of ['https://example.com/texture.png', '../image.png', 'data:image/png;base64,AAAA', 'blob:other', '']) {
    for (const key of ['buffers', 'images']) {
      const candidate = model(); candidate.document[key][0].uri = uri;
      expect(() => validateLocalGLBResources(candidate)).toThrow('Embed all');
    }
  }
});

it('checks exact binary length including at most three zero padding bytes', () => {
  const candidate = model(); candidate.document.buffers[0].byteLength = 21;
  candidate.document.bufferViews[0].byteLength = 21; candidate.document.images = [];
  candidate.binary.fill(0, 21);
  expect(() => validateLocalGLBResources(candidate)).not.toThrow();
  candidate.binary[23] = 1;
  expect(() => validateLocalGLBResources(candidate)).toThrow('padding');
  candidate.document.buffers[0].byteLength = 20;
  expect(() => validateLocalGLBResources(candidate)).toThrow('buffer length');
});

it('rejects out-of-bounds views, noninteger offsets and invalid strides', () => {
  for (const patch of [{ byteOffset: 25 }, { byteLength: 25 }, { byteOffset: -1 },
    { byteOffset: 0.5 }, { buffer: 1 }, { byteLength: Number.MAX_SAFE_INTEGER },
    { byteStride: 3 }, { byteStride: 256 }, { extensions: { EXT_meshopt_compression: {} } }]) {
    const candidate = model(); Object.assign(candidate.document.bufferViews[0], patch);
    expect(() => validateLocalGLBResources(candidate)).toThrow('Invalid GLB resources:');
  }
});

it('bounds individual and cumulative image allocations and checks declared MIME', () => {
  expect(() => validateLocalGLBResources(model(4097, 1))).toThrow('4096');
  expect(() => validateLocalGLBResources(model(0, 1))).toThrow('4096');
  const candidate = model(4096, 4096);
  candidate.document.images.push({ ...candidate.document.images[0] });
  expect(validateLocalGLBResources(candidate).pixels).toBe(32 * 1024 * 1024);
  candidate.document.images.push({ ...candidate.document.images[0] });
  expect(() => validateLocalGLBResources(candidate)).toThrow('pixel budget');
  const wrongMime = model(); wrongMime.document.images[0].mimeType = 'image/jpeg';
  expect(() => validateLocalGLBResources(wrongMime)).toThrow('JPG or PNG');
});

it('rejects malformed tables and missing resources while allowing a resource-free document', () => {
  expect(validateLocalGLBResources({ document: {} }).pixels).toBe(0);
  for (const document of [{ buffers: [null] }, { buffers: [{}, {}] }, { bufferViews: {} },
    { images: Array.from({ length: 33 }, () => ({})) }, { images: [{}] }]) {
    expect(() => validateLocalGLBResources({ document })).toThrow('Invalid GLB resources:');
  }
});
