import { expect, it, vi } from 'vitest';
import { popupOwnsEscape, reconcileNativeClose } from '$lib/utils/modalDialog';

function closed(state: { isConnected: boolean; open: boolean }) {
  const dialog = { ...state, showModal: vi.fn() };
  return { dialog, event: { currentTarget: dialog } as unknown as Event };
}

it('shows a dialog again when the browser forces it closed while its operation runs', () => {
  const { dialog, event } = closed({ isConnected: true, open: false }), onclose = vi.fn();
  reconcileNativeClose(event, true, onclose);
  expect(dialog.showModal).toHaveBeenCalledOnce();
  expect(onclose).not.toHaveBeenCalled();
});

it('reports a forced close of an idle dialog so its owner can open it again', () => {
  const { dialog, event } = closed({ isConnected: true, open: false }), onclose = vi.fn();
  reconcileNativeClose(event, false, onclose);
  expect(onclose).toHaveBeenCalledOnce();
  expect(dialog.showModal).not.toHaveBeenCalled();
});

it('ignores the close that unmounting fires and a dialog that is open again', () => {
  for (const state of [{ isConnected: false, open: false }, { isConnected: true, open: true }]) {
    const { dialog, event } = closed(state), onclose = vi.fn();
    reconcileNativeClose(event, true, onclose);
    reconcileNativeClose(event, false, onclose);
    expect(dialog.showModal).not.toHaveBeenCalled();
    expect(onclose).not.toHaveBeenCalled();
  }
});

it('leaves Escape to an open menu wherever focus is, and to a panel only from inside it', () => {
  let menuOpen = false;
  vi.stubGlobal('document', { querySelector: (selector: string) => selector === '[data-popup="menu"]' && menuOpen ? {} : null });
  const inPanel = { closest: (selector: string) => selector === '[data-popup]' ? {} : null } as unknown as EventTarget;
  const outside = { closest: () => null } as unknown as EventTarget;
  expect(popupOwnsEscape(outside)).toBe(false);
  expect(popupOwnsEscape(null)).toBe(false);
  expect(popupOwnsEscape(inPanel)).toBe(true);
  menuOpen = true;
  expect(popupOwnsEscape(outside)).toBe(true);
  expect(popupOwnsEscape(null)).toBe(true);
});

it('never claims Escape without a document', () => {
  expect(popupOwnsEscape({ closest: () => ({}) } as unknown as EventTarget)).toBe(false);
});
