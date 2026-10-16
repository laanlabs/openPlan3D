import { expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import ts from 'typescript';
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

it('translates the project rename and description history entries', () => {
  expect(undoMessage('Renamed project', 'pt')).toBe('Projeto renomeado');
  expect(undoMessage('Changed project description', 'pt')).toBe('Descrição do projeto alterada');
  expect(undoMessage('Renamed project', 'en')).toBe('Renamed project');
});

it('translates the scan, door-join and custom model history entries', () => {
  const recorded = ['Added RoomPlan scan', 'Joined doors', 'Imported custom model', 'Placed custom model', 'Removed custom model'];
  expect(recorded.map(value => undoMessage(value, 'pt'))).toEqual([
    'Escaneamento RoomPlan adicionado', 'Portas unidas', 'Modelo personalizado importado',
    'Modelo personalizado posicionado', 'Modelo personalizado removido',
  ]);
  expect(recorded.map(value => undoMessage(value, 'en'))).toEqual(recorded);
});

/** Every fixed description the editor records, read from the script code that calls the history entry points. */
function recordedDescriptions(): string[] {
  // Argument holding the description; only the store calls its private mutate/snapshot/merge helpers.
  const exported: Record<string, number> = { endUndoGroup: 0, beginDrag: 0, commitItemDetails: 2 };
  const store: Record<string, number> = { ...exported, mutate: 1, snapshot: 0, applyRoomPlanMerge: 1 };
  const found = new Set(['Edit', 'Group action']); // snapshot() and endUndoGroup() without a description
  const literals = (node?: ts.Expression): string[] => !node ? []
    : ts.isStringLiteralLike(node) ? [node.text]
    : ts.isConditionalExpression(node) ? [...literals(node.whenTrue), ...literals(node.whenFalse)]
    : ts.isParenthesizedExpression(node) ? literals(node.expression) : [];
  const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(`${dir}/${entry.name}`) : /\.(ts|svelte)$/.test(entry.name) ? [`${dir}/${entry.name}`] : []);
  for (const file of files('src')) {
    const positions = file === 'src/lib/stores/project.ts' ? store : exported;
    let source = readFileSync(file, 'utf8');
    if (!new RegExp(`\\b(${Object.keys(positions).join('|')})\\(`).test(source)) continue;
    if (file.endsWith('.svelte')) source = [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && Object.hasOwn(positions, node.expression.text)) {
        for (const text of literals(node.arguments[positions[node.expression.text]])) found.add(text);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  return [...found];
}

it('has a Portuguese entry for every fixed description the editor records', () => {
  const descriptions = recordedDescriptions();
  expect(descriptions.length).toBeGreaterThan(40);
  expect(descriptions).toEqual(expect.arrayContaining(['Joined doors', 'Added RoomPlan scan', 'Placed custom model', 'Moved door (elevation)']));
  expect(descriptions.filter(value => undoMessage(value, 'pt') === value)).toEqual([]);
  expect(descriptions.filter(value => undoMessage(value, 'en') !== value)).toEqual([]);
});
