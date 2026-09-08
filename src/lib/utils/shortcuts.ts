import { selectedTool, activateMeasurementTool, undo, redo, viewMode, selectedElementId, selectedElementIds, removeElement, panMode, beginUndoGroup, endUndoGroup } from '$lib/stores/project';
import { get } from 'svelte/store';
import { manualSave } from '$lib/stores/saveStatus';
import { hasOpenModal } from './modalDialog';

export interface ShortcutContext {
  rotateFurniture?: () => void;
  save?: () => void;
}

export function isEditingField(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return !!element && (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable === true);
}

export function handleGlobalShortcut(e: KeyboardEvent, ctx: ShortcutContext = {}): boolean {
  if (hasOpenModal()) return false;
  const mod = e.metaKey || e.ctrlKey;

  // Save remains available while editing. Text selection, clipboard and undo
  // belong to the focused field, not the plan's selection/history.
  if (mod && e.key === 's') {
    e.preventDefault();
    if (ctx.save) ctx.save();
    else void manualSave();
    return true;
  }
  if (isEditingField(e.target)) return false;

  // Ctrl+Z undo
  if (mod && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
    return true;
  }
  // Ctrl+Y or Ctrl+Shift+Z redo
  if ((mod && e.key === 'y') || (mod && e.key === 'z' && e.shiftKey)) {
    e.preventDefault();
    redo();
    return true;
  }
  if (mod || e.altKey) return false;

  if (e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'n') {
    const tool = e.key.toLowerCase() === 'm' ? 'measure' : 'annotate';
    if (get(selectedTool) === tool) selectedTool.set('select');
    else activateMeasurementTool(tool);
    e.preventDefault();
    return true;
  }

  if (e.key === 'Escape') {
    selectedTool.set('select');
    selectedElementId.set(null);
    selectedElementIds.set(new Set());
    return true;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const multiIds = get(selectedElementIds);
    if (multiIds.size > 0) {
      beginUndoGroup();
      for (const id of multiIds) removeElement(id);
      endUndoGroup();
      selectedElementIds.set(new Set());
      selectedElementId.set(null);
    } else {
      const id = get(selectedElementId);
      if (id) { removeElement(id); selectedElementId.set(null); }
    }
    return true;
  }
  if (e.key === 'w' || e.key === 'W') { selectedTool.set('wall'); panMode.set(false); return true; }
  if (e.key === 'd' || e.key === 'D') { selectedTool.set('door'); panMode.set(false); return true; }
  if (e.key === 'v' || e.key === 'V') { selectedTool.set('select'); panMode.set(false); return true; }
  if (e.key === 'h' || e.key === 'H') { panMode.set(true); return true; }
  if (e.key === 't' || e.key === 'T') { selectedTool.set('text'); panMode.set(false); return true; }
  if (e.key === 'r' || e.key === 'R') {
    if (ctx.rotateFurniture) ctx.rotateFurniture();
    return true;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const m = get(viewMode);
    viewMode.set(m === '2d' ? '3d' : '2d');
    return true;
  }
  if (e.key === 'g' || e.key === 'G') {
    // Handled in canvas component
    return false;
  }
  return false;
}
