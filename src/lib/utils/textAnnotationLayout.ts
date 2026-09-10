import type { TextAnnotation } from '$lib/models/types';
export function textAnnotationLines(note: TextAnnotation) {
  const fontSize = Math.max(8, note.fontSize), lines = note.text.split('\n');
  const lineHeight = fontSize * 1.2;
  return { fontSize, lines: lines.map((text, i) => ({ text, y: (i - (lines.length - 1) / 2) * lineHeight })) };
}

export function textAnnotationBounds(note: TextAnnotation, ctx: CanvasRenderingContext2D) {
  const { fontSize, lines } = textAnnotationLines(note);
  ctx.font = `${fontSize}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const angle = note.rotation * Math.PI / 180, cosine = Math.cos(angle), sine = Math.sin(angle);
  const points = lines.flatMap(line => {
    const m = ctx.measureText(line.text);
    const left = -(m.actualBoundingBoxLeft ?? m.width / 2) - 1, right = (m.actualBoundingBoxRight ?? m.width / 2) + 1;
    const top = line.y - (m.actualBoundingBoxAscent ?? fontSize) - 1, bottom = line.y + (m.actualBoundingBoxDescent ?? fontSize) + 1;
    return [left, right].flatMap(x => [top, bottom].map(y => ({ x: note.x + x * cosine - y * sine, y: note.y + x * sine + y * cosine })));
  });
  return { minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
    minY: Math.min(...points.map(p => p.y)), maxY: Math.max(...points.map(p => p.y)) };
}
