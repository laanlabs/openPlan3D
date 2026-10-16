import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { activateMeasurementTool, selectedTool, placingFurnitureId, placingStair, placingColumn,
  placingEntourageId, calibrationMode, elevationPickMode, panMode, canvasZoom, canvasMinimumZoom } from '$lib/stores/project';
import { handleGlobalShortcut } from '$lib/utils/shortcuts';
import { manualSave } from '$lib/stores/saveStatus';

vi.mock('$lib/stores/saveStatus', () => ({ manualSave: vi.fn().mockResolvedValue(true) }));
function keyEvent(key: string, extra = {}) {
  return { key, preventDefault: vi.fn(), target: { tagName: 'CANVAS' }, ...extra } as unknown as KeyboardEvent;
}
beforeEach(() => { selectedTool.set('select'); vi.mocked(manualSave).mockClear(); });
afterEach(() => vi.unstubAllGlobals());

it('leaves modal keystrokes alone even when a background canvas is the event target', () => {
  vi.stubGlobal('document', { querySelector: () => ({ open: true }) });
  selectedTool.set('wall');
  for (const key of ['Delete', 'Backspace', 'Escape', 'Tab', 'v', 'm', 'n', 'r', '+', '-']) {
    const event = keyEvent(key);
    expect(handleGlobalShortcut(event)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(get(selectedTool)).toBe('wall');
  }
  expect(get(canvasZoom)).toBe(1);
  expect(handleGlobalShortcut(keyEvent('s', { ctrlKey: true }))).toBe(false);
  expect(manualSave).not.toHaveBeenCalled();
});

it('resumes editor shortcuts after the modal closes', () => {
  let open = true;
  vi.stubGlobal('document', { querySelector: () => open ? {} : null });
  handleGlobalShortcut(keyEvent('w'));
  expect(get(selectedTool)).toBe('select');
  open = false;
  expect(handleGlobalShortcut(keyEvent('w'))).toBe(true);
  expect(get(selectedTool)).toBe('wall');
});

it.each(['measure', 'annotate'] as const)('activates %s and disarms conflicting placement modes', tool => {
  placingFurnitureId.set('chair'); placingStair.set(true); placingColumn.set(true);
  placingEntourageId.set('tree'); calibrationMode.set(true); elevationPickMode.set(true); panMode.set(true);
  activateMeasurementTool(tool);
  expect(get(selectedTool)).toBe(tool);
  expect(get(placingFurnitureId)).toBeNull();
  expect(get(placingEntourageId)).toBeNull();
  for (const store of [placingStair, placingColumn, calibrationMode, elevationPickMode, panMode]) expect(get(store)).toBe(false);
});

it('uses the same selection for N/M, toggles off, and exits with Escape', () => {
  expect(handleGlobalShortcut(keyEvent('N'))).toBe(true);
  expect(get(selectedTool)).toBe('annotate');
  handleGlobalShortcut(keyEvent('m'));
  expect(get(selectedTool)).toBe('measure');
  handleGlobalShortcut(keyEvent('m'));
  expect(get(selectedTool)).toBe('select');
  handleGlobalShortcut(keyEvent('n'));
  handleGlobalShortcut(keyEvent('Escape'));
  expect(get(selectedTool)).toBe('select');
});

it('does not activate measurement tools while typing or using modified shortcuts', () => {
  for (const extra of [{ target: { tagName: 'INPUT' } }, { metaKey: true }, { ctrlKey: true }, { altKey: true }]) {
    expect(handleGlobalShortcut(keyEvent('n', extra))).toBe(false);
    expect(get(selectedTool)).toBe('select');
  }
});

it('routes Cmd/Ctrl+S through the same save status and error handling as the Save button', () => {
  handleGlobalShortcut(keyEvent('s', { metaKey: true }));
  handleGlobalShortcut(keyEvent('s', { ctrlKey: true }));
  expect(manualSave).toHaveBeenCalledTimes(2);
});

it.each([
  { tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' },
  { tagName: 'SPAN', isContentEditable: true },
])('leaves field editing to the browser but keeps save available: %j', target => {
  for (const modifier of ['metaKey', 'ctrlKey']) {
    for (const key of ['z', 'y', 'a', 'c', 'v', ' ', 'Backspace']) {
      const event = keyEvent(key, { target, [modifier]: true });
      expect(handleGlobalShortcut(event)).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
    expect(handleGlobalShortcut(keyEvent('s', { target, [modifier]: true }))).toBe(true);
  }
  expect(manualSave).toHaveBeenCalledTimes(2);
});

it('zooms the plan with + / − (also = / _ and numpad keys) like the toolbar, within the zoom limits', () => {
  canvasZoom.set(1); canvasMinimumZoom.set(0.1);
  for (const key of ['+', '=', 'Add']) {
    const event = keyEvent(key, { shiftKey: key === '+' });
    expect(handleGlobalShortcut(event)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
  }
  expect(get(canvasZoom)).toBeCloseTo(1.25 ** 3);
  for (const key of ['-', '_', 'Subtract']) expect(handleGlobalShortcut(keyEvent(key, { shiftKey: key === '_' }))).toBe(true);
  expect(get(canvasZoom)).toBeCloseTo(1);
  canvasZoom.set(9);
  for (let i = 0; i < 3; i++) handleGlobalShortcut(keyEvent('+'));
  expect(get(canvasZoom)).toBe(10);
  canvasZoom.set(0.12);
  for (let i = 0; i < 3; i++) handleGlobalShortcut(keyEvent('-'));
  expect(get(canvasZoom)).toBe(0.1);
  expect(get(selectedTool)).toBe('select');
  canvasZoom.set(1);
});

it('leaves Ctrl/Cmd+plus/minus to the browser and ignores zoom keys while typing', () => {
  canvasZoom.set(1);
  for (const extra of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { target: { tagName: 'INPUT' } }, { target: { tagName: 'SPAN', isContentEditable: true } }]) {
    for (const key of ['+', '=', '-', '_']) {
      const event = keyEvent(key, extra);
      expect(handleGlobalShortcut(event)).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
  }
  expect(get(canvasZoom)).toBe(1);
});

it('leaves activation and Tab on focused controls to the browser', () => {
  const closest = vi.fn().mockReturnValue({ tagName: 'BUTTON' });
  for (const key of [' ', 'Enter', 'Tab']) {
    const event = keyEvent(key, { target: { closest } });
    expect(handleGlobalShortcut(event)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  }
  expect(closest).toHaveBeenCalled();
});
