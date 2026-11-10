import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { savedProjects } from './storage';

// An iPhone plan whose editor collapsed the north wall to a point (see tests/roomplan-collapsed-walls.test.ts).
// Shares of it were refused until October 2026; the editor now opens it without that wall or the window on it.
test('a shared iPhone plan with a collapsed wall opens and saves without that wall', async ({ page }) => {
  const body = await readFile('tests/fixtures/handoff-collapsed-wall.json', 'utf8');
  const capture = JSON.parse(body);
  await page.route('https://firebasestorage.googleapis.com/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body }));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor?import=AB2C');
  await expect(page.getByRole('application')).toContainText('3 walls');
  await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has('import')).toBe(false);
  const [project] = Object.values(await savedProjects(page)) as any[];
  expect(project.floors.flatMap((floor: any) => floor.walls.map((wall: any) => wall.id)).sort())
    .toEqual(capture.walls.filter((wall: any) => wall.dimensions[0] > 0).map((wall: any) => wall.identifier).sort());
  expect(project.floors.flatMap((floor: any) => floor.windows)).toEqual([]);
  expect(project.floors.flatMap((floor: any) => floor.doors.map((door: any) => door.id))).toEqual([capture.doors[0].identifier]);
  expect(errors).toEqual([]);
});
