import { expect, it } from 'vitest';
import { undoMessage } from '../src/lib/i18n/undoMessages';
import { get } from 'svelte/store';
import { addDoor, addWindow, addColumn, currentProject, loadProject, undoHistoryStore } from '../src/lib/stores/project';
import { roomProject } from './fixtures/project';

it('translates exact built-in undo descriptions and preserves unknown text', () => {
  expect(undoMessage('Added floor', 'pt')).toBe('Pavimento adicionado');
  expect(undoMessage('Added floor', 'en')).toBe('Added floor');
  for (const value of ['Added floor {name}', 'My <room> action', 'Moved furniture: Custom chair', 'Edit\nprivate note']) {
    expect(undoMessage(value, 'pt')).toBe(value);
    expect(undoMessage(value, 'en')).toBe(value);
  }
});

it('localizes generated opening and column actions without modifying history or the project', () => {
  loadProject(roomProject());
  const wall = get(currentProject)!.floors[0].walls[0].id;
  addDoor(wall, 0.3, 'opening');
  addWindow(wall, 0.7, 'fixed');
  addColumn({ x: 100, y: 100 }, 'square');
  const history = JSON.stringify(get(undoHistoryStore));
  const project = JSON.stringify(get(currentProject));
  const descriptions = get(undoHistoryStore).entries.map(entry => entry.description);
  expect(descriptions).toEqual(['Added opening door', 'Added fixed window', 'Added square column']);
  expect(descriptions.map(value => undoMessage(value, 'pt'))).toEqual([
    'Porta adicionada: Vão de passagem', 'Janela adicionada: Fixa', 'Coluna adicionada: Quadrada',
  ]);
  expect(descriptions.map(value => undoMessage(value, 'en'))).toEqual(descriptions);
  for (const unknown of ['Added custom door', 'Added square column {name}', 'Added fixed window\nprivate note']) {
    expect(undoMessage(unknown, 'pt')).toBe(unknown);
  }
  expect(JSON.stringify(get(undoHistoryStore))).toBe(history);
  expect(JSON.stringify(get(currentProject))).toBe(project);
});
