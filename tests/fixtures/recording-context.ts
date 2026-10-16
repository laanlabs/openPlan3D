/** Advance proportional to length and font size, as in a monospaced font. */
export const advance = (text: string, font: string) => text.length * Number(/([\d.]+)px/.exec(font)![1]) * 0.55;

/**
 * A 2D context that follows the transform and records where each text lands, as the corners of its
 * centred box (the full font size above and below the middle line) in canvas units.
 */
export function recordingContext() {
  let matrix = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const state: Record<string, string> = { font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic' };
  const texts: { text: string; font: string; align: string; baseline: string; corners: { x: number; y: number }[] }[] = [];
  const point = (x: number, y: number) => ({ x: matrix[0] * x + matrix[2] * y + matrix[4], y: matrix[1] * x + matrix[3] * y + matrix[5] });
  const methods = {
    save() { stack.push([...matrix]); },
    restore() { matrix = stack.pop() ?? matrix; },
    translate(x: number, y: number) { const p = point(x, y); matrix = [matrix[0], matrix[1], matrix[2], matrix[3], p.x, p.y]; },
    scale(x: number, y: number) { matrix = [matrix[0] * x, matrix[1] * x, matrix[2] * y, matrix[3] * y, matrix[4], matrix[5]]; },
    rotate(angle: number) {
      const [a, b, c, d] = matrix, cos = Math.cos(angle), sin = Math.sin(angle);
      matrix = [a * cos + c * sin, b * cos + d * sin, c * cos - a * sin, d * cos - b * sin, matrix[4], matrix[5]];
    },
    measureText(text: string) { return { width: advance(text, state.font) }; },
    fillText(text: string, x: number, y: number) {
      const size = Number(/([\d.]+)px/.exec(state.font)![1]), half = advance(text, state.font) / 2;
      texts.push({ text, font: state.font, align: state.textAlign, baseline: state.textBaseline,
        corners: [[-half, -size], [half, -size], [half, size], [-half, size]].map(([dx, dy]) => point(x + dx, y + dy)) });
    },
  };
  const context = new Proxy(methods, {
    get: (target, key) => typeof key === 'string' && key in state ? state[key] : target[key as keyof typeof target] ?? (() => {}),
    set: (_, key, value) => { if (typeof key === 'string' && key in state) state[key] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { context, texts };
}
