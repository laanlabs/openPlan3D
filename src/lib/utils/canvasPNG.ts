/** Encode a PNG with explicit failure and a bounded callback wait. */
export function canvasPNG(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('PNG encoding timed out')), 30000);
    try {
      canvas.toBlob(blob => {
        clearTimeout(timeout);
        if (blob) resolve(blob); else reject(new Error('PNG encoding failed'));
      }, 'image/png');
    } catch (error) { clearTimeout(timeout); reject(error); }
  });
}
