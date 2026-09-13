/** Wait for the main viewer to render, then encode that canvas only. */
export function captureMain3DPNG(signal?: AbortSignal): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let encoding = false;
    const finish = (blob?: Blob, error?: Error) => {
      clearInterval(poll); clearTimeout(deadline);
      signal?.removeEventListener('abort', aborted);
      if (blob) resolve(blob); else reject(error ?? new Error('3D capture unavailable'));
    };
    const aborted = () => finish(undefined, new Error('3D capture cancelled'));
    const check = () => {
      if (encoding) return;
      const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-plan3d-canvas="true"][data-rendered="true"]');
      if (!canvas || canvas.width <= 10 || canvas.height <= 10) return;
      encoding = true;
      clearInterval(poll);
      clearTimeout(deadline);
      // Encoding can outlast viewer startup on software-rendered/large canvases.
      deadline = setTimeout(() => finish(undefined, new Error('3D encoding timed out')), 30000);
      try {
        const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!context || context.isContextLost()) throw new Error('3D context unavailable');
        canvas.toBlob(blob => finish(blob ?? undefined), 'image/png');
      } catch (error) { finish(undefined, error instanceof Error ? error : new Error('3D capture failed')); }
    };
    const poll = setInterval(check, 50);
    let deadline = setTimeout(() => finish(undefined, new Error('3D capture timed out')), 10000);
    signal?.addEventListener('abort', aborted, { once: true });
    if (signal?.aborted) aborted(); else check();
  });
}
