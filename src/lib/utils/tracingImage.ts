/** Tracing-image formats the picker and the paste handler accept: what a project package carries (PNG, JPEG, GIF) plus WebP. */
export const TRACING_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/** Other clipboard images (SVG, BMP, TIFF, AVIF, …) are ignored without a notice. */
export function isTracingImageType(type: string): boolean {
  return TRACING_IMAGE_TYPES.includes(type);
}
