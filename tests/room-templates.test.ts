import { expect, it } from 'vitest';
import { get } from 'svelte/store';
import { createDefaultProject, currentProject, undo, redo } from '$lib/stores/project';
import { roomPresets } from '$lib/utils/roomPresets';
import { placeRoomTemplate, roomTemplates } from '$lib/utils/roomTemplates';
import { getFurnitureSize } from '$lib/utils/furnitureCatalog';

it.each(roomTemplates)('$name furniture fits inside the walls without overlapping', template => {
  currentProject.set(createDefaultProject('Template layout'));
  placeRoomTemplate(roomPresets.find(p => p.id === template.presetId)!, { x: 0, y: 0 }, template);
  const floor = get(currentProject)!.floors[0];
  const inset = Math.max(...floor.walls.map(wall => wall.thickness)) / 2;
  const boxes = floor.furniture.map(item => {
    const size = getFurnitureSize(item), angle = item.rotation * Math.PI / 180;
    const halfWidth = (Math.abs(Math.cos(angle)) * size.width + Math.abs(Math.sin(angle)) * size.depth) / 2;
    const halfDepth = (Math.abs(Math.sin(angle)) * size.width + Math.abs(Math.cos(angle)) * size.depth) / 2;
    const box = { left: item.position.x - halfWidth, right: item.position.x + halfWidth,
      top: item.position.y - halfDepth, bottom: item.position.y + halfDepth };
    expect(box.left, item.catalogId).toBeGreaterThanOrEqual(-200 + inset);
    expect(box.right, item.catalogId).toBeLessThanOrEqual(200 - inset);
    expect(box.top, item.catalogId).toBeGreaterThanOrEqual(-150 + inset);
    expect(box.bottom, item.catalogId).toBeLessThanOrEqual(150 - inset);
    return box;
  });
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    expect(overlapX <= 1e-7 || overlapY <= 1e-7, `${floor.furniture[i].catalogId}/${floor.furniture[j].catalogId}`).toBe(true);
  }
});

it('template rotations survive placement and one-step Undo/Redo', () => {
  currentProject.set(createDefaultProject('Rotated template'));
  const before = structuredClone(get(currentProject)!.floors);
  placeRoomTemplate(roomPresets[0], { x: 70, y: 90 }, {
    name: 'Rotated', presetId: roomPresets[0].id,
    furniture: [{ catalogId: 'bookshelf', x: -100, y: 20, rotation: 90 }],
  });
  const placed = structuredClone(get(currentProject)!.floors);
  expect(placed[0].furniture[0]).toMatchObject({ position: { x: -30, y: 110 }, rotation: 90 });
  undo(); expect(get(currentProject)!.floors).toEqual(before);
  redo(); expect(get(currentProject)!.floors).toEqual(placed);
});
