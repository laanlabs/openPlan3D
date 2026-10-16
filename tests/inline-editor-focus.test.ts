import { beforeEach, expect, it, vi } from 'vitest';
import { focusInlineEditor } from '$lib/utils/inlineEditorFocus';

let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  frames = new Map();
  let next = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++next, callback); return next; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
  vi.stubGlobal('document', { querySelector: () => null });
});

function runFrames() {
  for (const [id, callback] of [...frames]) { frames.delete(id); callback(0); }
}

function field(isConnected = true) {
  const node = { isConnected, focus: vi.fn(), select: vi.fn() };
  return { node, input: node as unknown as HTMLInputElement };
}

it('focuses the new field on the next frame, and selects its text when asked so typing replaces it', () => {
  const label = field(), name = field();
  focusInlineEditor(label.input);
  focusInlineEditor(name.input, { select: true });
  // The pointer gesture that opened the field still owns focus until the frame.
  expect(label.node.focus).not.toHaveBeenCalled();
  expect(name.node.focus).not.toHaveBeenCalled();
  runFrames();
  expect(label.node.focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(label.node.select).not.toHaveBeenCalled();
  expect(name.node.focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(name.node.select).toHaveBeenCalledTimes(1);
});

it('drops the pending focus when the field is dismissed before the frame', () => {
  const name = field();
  focusInlineEditor(name.input, { select: true }).destroy();
  runFrames();
  expect(name.node.focus).not.toHaveBeenCalled();
  expect(name.node.select).not.toHaveBeenCalled();
});

it('leaves focus where it is when the field left the page or a modal dialog opened meanwhile', () => {
  const detached = field(false);
  focusInlineEditor(detached.input, { select: true });
  runFrames();
  expect(detached.node.focus).not.toHaveBeenCalled();

  vi.stubGlobal('document', { querySelector: (selector: string) => (selector === 'dialog[open]' ? {} : null) });
  const behindModal = field();
  focusInlineEditor(behindModal.input, { select: true });
  runFrames();
  expect(behindModal.node.focus).not.toHaveBeenCalled();
  expect(behindModal.node.select).not.toHaveBeenCalled();
});
