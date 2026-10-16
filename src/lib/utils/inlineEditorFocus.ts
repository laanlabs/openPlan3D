import { hasOpenModal } from './modalDialog';

/**
 * Svelte action for a text field that a click or keypress has just put on screen (the plan's
 * inline label editors, the top bar's project name), so typing goes into the field rather than
 * to the editor's keyboard shortcuts. Placement starts on mousedown, so focus waits a frame for
 * the browser's default mousedown focus to finish; a field dismissed before then cancels it, and
 * an open modal dialog keeps its focus. With `select`, the current text is selected so typing
 * replaces it.
 */
export function focusInlineEditor(node: HTMLInputElement, options: { select?: boolean } = {}) {
  const frame = requestAnimationFrame(() => {
    if (!node.isConnected || hasOpenModal()) return;
    node.focus({ preventScroll: true });
    if (options.select) node.select();
  });
  return { destroy: () => cancelAnimationFrame(frame) };
}
