import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const id = 'qa-elevation-escape';
async function seed(page: Page) {
  const project = JSON.parse(await readFile('tests/fixtures/save-conflicts.openplan.json', 'utf8'));
  project.id = id; project.name = 'QA Elevation Escape';
  await page.addInitScript(project => {
    if (!localStorage.getItem('qaElevationEscapeSeeded')) {
      localStorage.setItem('floorplan_projects', JSON.stringify({ [project.id]: JSON.stringify(project) }));
      localStorage.setItem('hasSeenWelcome', 'true');
      localStorage.setItem('qaElevationEscapeSeeded', 'true');
    }
  }, project);
  await page.goto(`/editor?id=${id}`);
  await page.getByRole('button', { name: 'Save', exact: true }).press('l');
  await page.getByRole('button', { name: '─ Wall 1', exact: true }).click();
}
function observe(page: Page) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== 'http://127.0.0.1:4188') external.push(r.url()); });
  return () => { expect(errors).toEqual([]); expect(external).toEqual([]); };
}
/** Page point on Wall 1's 250 cm high face, in cm along it and up from the floor, as the elevation
 * fits a wall of this length (72/64 px left/right and 36/64 px top/bottom padding). */
async function wallPoint(canvas: Locator, length: number, along: number, up: number) {
  const box = (await canvas.boundingBox())!;
  const scale = Math.min((box.width - 136) / length, (box.height - 100) / 250);
  return {
    x: box.x + 72 + (box.width - 136 - length * scale) / 2 + along * scale,
    y: box.y + 36 + (box.height - 100 + 250 * scale) / 2 - up * scale,
    scale,
  };
}

test('a wall elevation leaves Escape to open menus, panels and focused fields', async ({ page }) => {
  const check = observe(page); await seed(page);
  const elevation = page.getByRole('button', { name: 'Elevation', exact: true }).first();
  const canvas = page.getByLabel('Wall elevation editor canvas', { exact: true });
  const thickness = page.getByRole('spinbutton', { name: 'Thickness (cm)', exact: true });
  await elevation.click();
  await expect(canvas).toBeVisible();
  await expect(elevation).toHaveAttribute('aria-pressed', 'true');
  await expect(thickness).toHaveValue('20');

  // A top-bar menu closes on Escape while focus stays on its trigger; the elevation and
  // the selected wall (the plan canvas must not act on the key) are kept.
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = page.getByRole('button', { name: 'Download JSON', exact: true });
  await expect(download).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(download).toHaveCount(0);
  await expect(canvas).toBeVisible();
  await expect(thickness).toHaveValue('20');

  // The Undo History panel closes from inside and returns focus to its toggle.
  const toggle = page.getByRole('button', { name: 'Toggle Undo History', exact: true });
  const panel = page.getByRole('region', { name: 'Undo History', exact: true });
  await toggle.click();
  await expect(panel.getByRole('button', { name: 'Close history', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await expect(canvas).toBeVisible();

  // A focused field keeps its Escape.
  await thickness.focus();
  await page.keyboard.press('Escape');
  await expect(thickness).toBeFocused();
  await expect(canvas).toBeVisible();
  await expect(elevation).toHaveAttribute('aria-pressed', 'true');

  // With nothing else to close, Escape returns to the plan.
  await toggle.focus();
  await page.keyboard.press('Escape');
  await expect(canvas).toHaveCount(0);
  await expect(elevation).toHaveAttribute('aria-pressed', 'false');
  await expect(thickness).toHaveValue('20');
  check();
});

test('pressing the elevation canvas takes focus from a properties field, so Escape returns to the plan', async ({ page }) => {
  const check = observe(page); await seed(page);
  const elevation = page.getByRole('button', { name: 'Elevation', exact: true }).first();
  const canvas = page.getByLabel('Wall elevation editor canvas', { exact: true });
  const length = page.getByLabel('Length (cm)', { exact: true });
  await elevation.click();
  await expect(canvas).toBeVisible();
  await expect(length).toHaveValue('600.5');

  // Length commits only on blur; pressing bare wall commits it, as clicking elsewhere does.
  await length.fill('500');
  const bare = await wallPoint(canvas, 600.5, 100, 125);
  await page.mouse.click(bare.x, bare.y);
  await expect(canvas).toBeFocused();
  await expect(page.getByText('5 m × 2.5 m', { exact: true })).toBeVisible();
  await expect(length).toHaveValue('500');

  // Select Wall 1's door and edit its width: Escape inside the field stays with the field.
  const door = await wallPoint(canvas, 500, 250, 100);
  await page.mouse.click(door.x, door.y);
  const width = page.getByRole('spinbutton', { name: 'Width (cm)', exact: true });
  await width.fill('100');
  await page.keyboard.press('Escape');
  await expect(width).toBeFocused();
  await expect(canvas).toBeVisible();

  // Dragging the door takes focus back to the canvas, so Escape returns to the plan.
  await page.mouse.move(door.x, door.y); await page.mouse.down();
  await page.mouse.move(door.x + 30 * door.scale, door.y, { steps: 5 }); await page.mouse.up();
  await expect(canvas).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(canvas).toHaveCount(0);
  await expect(elevation).toHaveAttribute('aria-pressed', 'false');
  await expect(width).toHaveValue('100');
  check();
});
