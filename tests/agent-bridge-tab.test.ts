import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { answerAgentRequest, GESTURE_WAIT_MS } from '$lib/services/agentBridge';
import { localStore } from '$lib/services/datastore';
import {
  applyExternalProject, beginUndoGroup, currentProject, endUndoGroup, loadProject, moveFurniture, undo, undoHistoryStore,
  updateProjectName,
} from '$lib/stores/project';
import { initAutoSave, markClean, saveState } from '$lib/stores/saveStatus';
import { roomProject } from './fixtures/project';

vi.mock('$app/environment', () => ({ dev: true, browser: false, building: false, version: 'test' }));
vi.mock('$lib/stores/versionHistory', () => ({ saveSnapshot: vi.fn() }));

let stop: () => void;
let storage: Map<string, string>;

function planWithSofa() {
  const project = roomProject();
  project.floors[0].furniture = [{ id: 'sofa-1', catalogId: 'sofa', position: { x: 100, y: 100 }, rotation: 0, scale: { x: 1, y: 1, z: 1 } }];
  return project;
}
const open = () => get(currentProject)!;
const sofa = () => open().floors[0].furniture[0].position.x;
const wallColor = () => open().floors[0].walls[0].color;
const history = () => get(undoHistoryStore).entries.map(e => e.description);
const paintWall = { kind: 'apply', args: { ops: [{ op: 'update', id: 'a-0', set: { color: '#ff0000' } }], description: 'Agent painted a wall' } };

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  loadProject(planWithSofa());
  markClean();
  await localStore.save(open());
  stop = initAutoSave();
});
afterEach(() => { stop(); markClean(); vi.useRealTimers(); });

describe('replace_project with open: true', () => {
  it('saves unsaved edits to the current plan before opening the other one', async () => {
    const previousId = open().id;
    updateProjectName('Unsaved edits');
    const other = roomProject();
    other.name = 'Agent plan';
    const result = await answerAgentRequest({ kind: 'replace', args: { project: other, open: true } });
    expect(result).toEqual({ opened: other.id });
    expect((await localStore.load(previousId))!.name).toBe('Unsaved edits');
    expect(open().id).toBe(other.id);
    expect((await localStore.load(other.id))!.name).toBe('Agent plan');
    expect(get(saveState)).toBe('saved');
  });

  it('keeps the current plan open when it cannot be saved', async () => {
    updateProjectName('Cannot lose this');
    const before = open();
    vi.spyOn(localStore, 'save').mockRejectedValue(new DOMException('Full', 'QuotaExceededError'));
    await expect(answerAgentRequest({ kind: 'replace', args: { project: roomProject(), open: true } }))
      .rejects.toThrow('Your current plan could not be saved');
    expect(open()).toBe(before);
  });

  it('opens a project id the library already holds as a copy, leaving the stored plan alone', async () => {
    const stored = roomProject();
    stored.name = 'Stored plan';
    await localStore.save(stored);
    const incoming = structuredClone(stored);
    incoming.name = 'Agent version';
    incoming.floors[0].walls = [];
    const result: any = await answerAgentRequest({ kind: 'replace', args: { project: incoming, open: true } });
    expect(result.copyOf).toBe(stored.id);
    expect(result.opened).not.toBe(stored.id);
    expect(open().id).toBe(result.opened);
    const kept = (await localStore.load(stored.id))!;
    expect(kept.name).toBe('Stored plan');
    expect(kept.floors[0].walls).toHaveLength(4);
  });
});

describe('agent edits during a gesture', () => {
  it('wait for the drag to finish and become their own Undo step', async () => {
    beginUndoGroup(); // pointerdown on the sofa
    moveFurniture('sofa-1', { x: 150, y: 100 });
    const pending = answerAgentRequest(paintWall);
    await Promise.resolve();
    expect(wallColor()).toBe('#eeeeee'); // not applied mid-drag
    moveFurniture('sofa-1', { x: 200, y: 100 });
    endUndoGroup('Moved furniture'); // pointerup
    expect(await pending).toEqual({ applied: true, changed: ['a-0'] });
    expect(sofa()).toBe(200);
    expect(wallColor()).toBe('#ff0000');
    expect(history().slice(-2)).toEqual(['Moved furniture', 'Agent painted a wall']);
    undo();
    expect(wallColor()).toBe('#eeeeee');
    expect(sofa()).toBe(200);
    undo();
    expect(sofa()).toBe(100);
  });

  it('are refused, changing nothing, when the gesture outlasts the wait', async () => {
    beginUndoGroup();
    moveFurniture('sofa-1', { x: 150, y: 100 });
    const pending = answerAgentRequest(paintWall);
    const refused = expect(pending).rejects.toThrow('in the middle of an edit');
    vi.advanceTimersByTime(GESTURE_WAIT_MS);
    await refused;
    endUndoGroup('Moved furniture');
    expect(wallColor()).toBe('#eeeeee');
    expect(history()).toEqual(['Moved furniture']);
  });

  it('are refused when another project was opened while they waited', async () => {
    beginUndoGroup();
    const pending = answerAgentRequest(paintWall);
    loadProject(roomProject());
    await expect(pending).rejects.toThrow('opened another project');
  });

  it('apply at once when no gesture is in progress', async () => {
    expect(await answerAgentRequest(paintWall)).toEqual({ applied: true, changed: ['a-0'] });
    expect(history()).toEqual(['Agent painted a wall']);
  });

  it('cannot be applied directly inside an undo group', () => {
    const next = structuredClone(open());
    next.name = 'Inside a drag';
    beginUndoGroup();
    expect(() => applyExternalProject(next)).toThrow('undo group');
    endUndoGroup();
  });
});
