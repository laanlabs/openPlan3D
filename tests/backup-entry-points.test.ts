import { mockStorage, rawRecords } from './fixtures/indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { get } from 'svelte/store';
import type { Project } from '$lib/models/types';
import { isLibraryBackup, LibraryBackupFileError, prepareLibraryRestore } from '$lib/services/libraryRestore';
import { libraryBackup } from '$lib/services/localDatabase';
import { createLocalStore, localStore } from '$lib/services/datastore';
import { openProject } from '$lib/services/projectOpening';
import { prepareProjectPackage } from '$lib/services/projectPackage';
import { currentProject, loadProject } from '$lib/stores/project';
import { initAutoSave, markClean, saveState } from '$lib/stores/saveStatus';
import { isRoomPlanJson } from '$lib/utils/roomplanValidation';
import { readProject } from '$lib/utils/projectValidation';
import { projectServiceMessage } from '$lib/i18n/projectServiceMessages';
import { roomProject } from './fixtures/project';

vi.mock('$lib/stores/versionHistory', () => ({ saveSnapshot: vi.fn() }));

// Both files were written by the release that was live on 2026-09-29 (d68cadf): a two-floor plan
// drawn from scratch (walls, a door, an opening, a sliding door, windows, named rooms, text
// labels, stairs up and down, a measurement and a dimension), saved with Download JSON, and then
// Download library backup after duplicating it twice (a copy and a copy of the copy).
const projectFile = readFileSync('tests/fixtures/sketch-two-floors.openplan.json', 'utf8');
const libraryFile = readFileSync('tests/fixtures/sketch-library-backup.json', 'utf8');

beforeEach(() => { mockStorage(); });

function contents(project: Project) {
  return project.floors.map(floor => ({
    name: floor.name, walls: floor.walls.length, doors: floor.doors.map(door => door.type), windows: floor.windows.length,
    rooms: floor.rooms.map(room => room.name), text: floor.textAnnotations.map(label => label.text),
    stairs: floor.stairs.map(stair => stair.direction), measurements: floor.measurements.length,
    dimensions: floor.annotations.map(dimension => dimension.label),
  }));
}

describe('Restore library backup', () => {
  it('restores one project saved with Download JSON instead of calling it a damaged library', async () => {
    const preview = prepareLibraryRestore(projectFile, 'Our house - shell(1).json');
    expect(preview.projectCount).toBe(1);
    expect(preview.entries).toEqual([{ id: 'fts6gdcm', name: 'Our house - shell', restorable: true, versions: 0, warnings: [] }]);
    expect(preview.warnings).toEqual([]);
    const { projects } = await preview.restore();
    expect(projects.map(project => project.name)).toEqual(['Our house - shell (Restored copy)']);
    const restored = (await createLocalStore().load(projects[0].id))!;
    expect(restored.id).not.toBe('fts6gdcm');
    expect(restored.floors).toEqual(readProject(JSON.parse(projectFile)).floors);
    expect(contents(restored)).toEqual([
      { name: 'Ground Floor', walls: 5, doors: ['single', 'opening', 'sliding'], windows: 3, rooms: ['Living room', 'Kitchen'],
        text: ['Check ceiling height', 'Fireplace ~ 1.5 m'], stairs: ['up'], measurements: 1, dimensions: ['approx 6 m'] },
      { name: 'Floor 1', walls: 4, doors: [], windows: 1, rooms: [], text: ['Bedroom 2'], stairs: ['down'], measurements: 0, dimensions: [] },
    ]);
  });

  it('keeps a project file it cannot open as recovery data, with the reason', async () => {
    const damaged = JSON.parse(projectFile);
    damaged.floors[0].walls[0].start = null;
    const raw = JSON.stringify(damaged);
    const preview = prepareLibraryRestore(raw, 'damaged.json');
    expect(preview.projectCount).toBe(0);
    expect(preview.entries[0]).toMatchObject({ id: 'fts6gdcm', restorable: false, warnings: ['Invalid project: floors[0].walls[0].start must be an object.'] });
    expect(preview.recoveryArchives).toBe(1);
    await preview.restore();
    const archived = Object.values(JSON.parse(await libraryBackup()).recovery).map(entry => JSON.parse(entry as string));
    expect(archived[0].projects.fts6gdcm).toBe(raw);
  });

  it.each([
    ['an iPhone or sibling-planner interchange file', { openplanPrepared: true, openplanHandoffVersion: 1, walls: [] }],
    ['a raw RoomPlan scan', { walls: [{ identifier: 'w', dimensions: [4, 2.5, 0] }] }],
  ])('points %s to Import JSON', (_kind, file) => {
    let message = '';
    try { prepareLibraryRestore(JSON.stringify(file)); } catch (error) { message = (error as Error).message; }
    expect(message).toBe('This is a RoomPlan scan or an interchange JSON file, not a backup. Open it with Import JSON in the editor. No projects were restored.');
    expect(projectServiceMessage(message, 'pt')).toBe('Este é um escaneamento RoomPlan ou um JSON de intercâmbio, não um backup. Abra-o com Importar JSON no editor. Nenhum projeto foi restaurado.');
  });

  it('still restores the September library backup with every copy, its version and the previews', async () => {
    const preview = prepareLibraryRestore(libraryFile, 'openplan3d-library-backup.json');
    expect(preview.entries.map(entry => [entry.name, entry.restorable, entry.versions]).sort((a, b) => a[0] < b[0] ? -1 : 1)).toEqual([
      ['Our house - shell', true, 1], ['Our house - shell (Copy)', true, 0], ['Our house - shell (Copy) (Copy)', true, 0],
    ]);
    const { projects } = await preview.restore(), store = createLocalStore();
    expect(projects.map(project => project.name).sort()).toEqual([
      'Our house - shell (Copy) (Copy) (Restored copy)', 'Our house - shell (Copy) (Restored copy)', 'Our house - shell (Restored copy)',
    ]);
    for (const { id } of projects) {
      const restored = (await store.load(id))!;
      expect(restored.floors).toEqual(readProject(JSON.parse(projectFile)).floors);
      expect(await store.getThumbnail(id)).toBe('data:image/jpeg;base64,/9j/4AAQSkZJRg==');
    }
  });
});

describe('Import JSON and Import a Plan', () => {
  // What the editor's Import JSON and the welcome's Import a Plan hand to openProject.
  const reader = (raw: string) => () => {
    const data = JSON.parse(raw);
    if (isLibraryBackup(data)) throw new LibraryBackupFileError();
    if (isRoomPlanJson(data)) throw new Error('A scan is converted first; not part of these cases.');
    return data;
  };
  let stop: () => void;
  beforeEach(async () => {
    loadProject(roomProject()); markClean();
    await localStore.save(get(currentProject)!);
    stop = initAutoSave();
  });
  afterEach(() => { stop(); markClean(); });

  it.each([
    ['the September library backup', true, libraryFile],
    ['a backup from the localStorage releases', true, readFileSync('tests/fixtures/legacy-library-backup.json', 'utf8')],
    ['a project saved with Download JSON', false, projectFile],
    ['an interchange file', false, JSON.stringify({ openplanPrepared: true, walls: [] })],
    ['an empty object', false, '{}'],
    ['a list', false, '[]'],
    ['an object of plain text', false, JSON.stringify({ name: 'House' })],
  ])('treats %s as a library backup: %s', (_kind, expected, raw) => {
    expect(isLibraryBackup(JSON.parse(raw))).toBe(expected);
  });

  it('hands a library backup back for Restore without saving or replacing the open plan', async () => {
    const before = get(currentProject), records = await rawRecords();
    await expect(openProject(reader(libraryFile), 'import')).rejects.toBeInstanceOf(LibraryBackupFileError);
    expect(get(currentProject)).toBe(before);
    expect(await rawRecords()).toEqual(records);
    expect(get(saveState)).toBe('saved');
  });

  it('still opens the September project file as a new project with everything on both floors', async () => {
    const opened = (await openProject(reader(projectFile), 'import'))!;
    expect(opened.name).toBe('Our house - shell');
    expect((await createLocalStore().load(opened.id))!.floors).toEqual(readProject(JSON.parse(projectFile)).floors);
  });

  it('explains where a library backup goes if no restore can open here', () => {
    const message = `${new LibraryBackupFileError().message} No project was imported.`;
    expect(projectServiceMessage(message, 'pt')).toBe('Este arquivo é um backup da biblioteca. Use Restaurar backup da biblioteca na página Projetos para adicionar os projetos dele. Nenhum projeto foi importado.');
  });
});

describe('Import project package', () => {
  it.each([
    ['a project saved with Download JSON', projectFile],
    ['a library backup', libraryFile],
    ['a project file saved again by a text editor with a byte order mark', `﻿${projectFile}`],
  ])('says where %s opens instead of “Unsupported ZIP layout”', async (_kind, raw) => {
    let message = '';
    try { await prepareProjectPackage(new File([raw], 'Our house - shell.json', { type: 'application/json' })); }
    catch (error) { message = (error as Error).message; }
    expect(message).toBe('Invalid project package: This is a JSON file, not a project package. Open it with Restore library backup on the Projects page or with Import JSON in the editor.');
    expect(projectServiceMessage(message, 'pt')).toBe('Pacote de projeto inválido: Este é um arquivo JSON, não um pacote de projeto. Abra-o com Restaurar backup da biblioteca na página Projetos ou com Importar JSON no editor.');
  });
});
