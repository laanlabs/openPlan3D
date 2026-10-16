import { expect, it } from 'vitest';
import { TRACING_IMAGE_TYPES, isTracingImageType } from '$lib/utils/tracingImage';

it('accepts only the formats the tracing-image picker takes and ignores every other clipboard image', () => {
  expect(TRACING_IMAGE_TYPES).toEqual(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
  for (const type of TRACING_IMAGE_TYPES) expect(isTracingImageType(type)).toBe(true);
  for (const type of ['image/svg+xml', 'image/bmp', 'image/tiff', 'image/avif', 'image/heic', 'image/x-icon', 'image/', 'text/plain', 'application/octet-stream', ''])
    expect(isTracingImageType(type)).toBe(false);
});
