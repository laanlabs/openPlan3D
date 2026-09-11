import { expect, test, type Page, type Route } from '@playwright/test';
import { createHash } from 'node:crypto';
import { benchmarkProject } from '../fixtures/render-benchmark';
import { savedProjects } from './storage';

async function observeCanvas(page: Page) {
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    const pending = new Set<number>();
    const canvases = new Map<HTMLCanvasElement, number>();
    let fired = 0;
    window.requestAnimationFrame = callback => {
      const id = request(time => { pending.delete(id); fired++; callback(time); });
      pending.add(id); return id;
    };
    window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function(...args) {
      if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') {
        canvases.set(this.canvas, (canvases.get(this.canvas) ?? 0) + 1);
      }
      return clear.apply(this, args);
    };
    (window as any).__canvasAudit = () => ({ pending: pending.size, fired,
      canvases: [...canvases].map(([canvas, draws]) => ({ connected: canvas.isConnected, draws })) });
  });
}
const canvas = (page: Page) => page.locator('canvas[aria-label="Floor plan editor canvas"]');
const audit = (page: Page) => page.evaluate(() => (window as any).__canvasAudit());
const pixels = async (page: Page) => createHash('sha256').update(await canvas(page).evaluate((node: HTMLCanvasElement) => node.toDataURL())).digest('hex');
async function idle(page: Page) {
  await expect(async () => {
    const before = await audit(page);
    expect(before.pending).toBe(0);
    expect(before.canvases.some((entry: any) => entry.connected && entry.draws > 0)).toBe(true);
    await page.waitForTimeout(350);
    expect(await audit(page)).toEqual(before);
  }).toPass({ timeout: 15_000, intervals: [100, 250] });
}
async function importHome(page: Page, project = benchmarkProject('medium')) {
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles({ name: 'idle.openplan.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
  await expect(page.getByRole('button', { name: project.name, exact: true })).toBeVisible();
}
async function changed(page: Page, action: () => Promise<unknown>) {
  const before = await pixels(page);
  await action(); await idle(page);
  expect(await pixels(page)).not.toBe(before);
}

test('2D sleeps between display, camera, tool, geometry and history changes', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await observeCanvas(page); await importHome(page);
  await page.waitForLoadState('networkidle'); await idle(page);
  // Keyboard activation avoids a canvas mousemove accidentally supplying the redraw.
  for (const title of ['Toggle Grid (G)', 'Toggle Rulers', 'Zoom In (+)']) {
    await changed(page, () => page.getByTitle(title, { exact: true }).press('Enter'));
  }
  await changed(page, () => page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter'));
  await page.getByTitle('Layer Visibility', { exact: true }).press('Enter');
  for (const label of ['Room Labels', 'Automatic dimensions']) {
    await changed(page, () => page.getByRole('checkbox', { name: label, exact: true }).press('Space'));
  }
  await page.getByTitle('Layer Visibility', { exact: true }).press('Enter');
  const minimap = page.getByRole('application').locator('canvas').last();
  await changed(page, () => minimap.click({ position: { x: 40, y: 30 } }));
  await page.getByTitle('Toggle Mini-map', { exact: true }).press('Enter'); await idle(page);
  await page.getByTitle('Toggle Mini-map', { exact: true }).press('Enter'); await idle(page);
  expect(await minimap.evaluate((node: HTMLCanvasElement) => node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data.some(value => value !== 0))).toBe(true);
  await page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter'); await idle(page);
  let bounds = (await canvas(page).boundingBox())!;
  const move = (x: number, y: number) => page.mouse.move(bounds.x + bounds.width * x, bounds.y + bounds.height * y);
  await page.getByRole('button', { name: 'Measure Measure distances (M)', exact: true }).press('Enter'); await idle(page);
  await move(0.35, 0.3); await page.mouse.click(bounds.x + bounds.width * 0.35, bounds.y + bounds.height * 0.3);
  await idle(page);
  await changed(page, () => move(0.65, 0.4));
  await page.mouse.click(bounds.x + bounds.width * 0.65, bounds.y + bounds.height * 0.4); await idle(page);
  await canvas(page).press('Escape'); await idle(page);
  await page.getByRole('button', { name: 'Draw Wall W Click to draw, dbl-click to finish', exact: true }).press('Enter');
  await canvas(page).click({ position: { x: bounds.width * 0.25, y: bounds.height * 0.25 } });
  await move(0.4, 0.3); await idle(page);
  await changed(page, () => page.keyboard.down('Shift'));
  await page.keyboard.up('Shift'); await idle(page);
  await changed(page, () => canvas(page).press('3'));
  await canvas(page).press('Escape'); await idle(page);
  await page.getByRole('button', { name: 'Round Column', exact: true }).press('Enter');
  await move(0.4, 0.3); await idle(page);
  await changed(page, () => move(0.6, 0.35));
  await page.mouse.click(bounds.x + bounds.width * 0.6, bounds.y + bounds.height * 0.35);
  await canvas(page).press('Escape'); await idle(page);
  await changed(page, () => page.getByRole('button', { name: 'Undo', exact: true }).press('Enter'));
  await changed(page, () => page.getByRole('button', { name: 'Redo', exact: true }).press('Enter'));
  await page.getByRole('button', { name: 'Save', exact: true }).press('Enter');
  await expect.poll(async () => Object.values(await savedProjects(page)).find(p => p.name === 'Rendering benchmark — medium')?.floors[0].columns.length).toBe(1);
  await changed(page, () => page.getByRole('combobox', { name: 'Current floor' }).selectOption({ label: 'Level 2' }));
  await changed(page, () => page.setViewportSize({ width: 1100, height: 650 }));
  const old = (await audit(page)).canvases[0];
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('region', { name: '3D floor plan viewer' })).toBeVisible();
  await page.getByRole('button', { name: '2D', exact: true }).click(); await idle(page);
  const entries = (await audit(page)).canvases;
  expect(entries[0]).toEqual({ ...old, connected: false });
  expect(entries.at(-1).draws).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('late tracing images wake 2D and cannot replace another floor image', async ({ page }) => {
  await observeCanvas(page);
  const pending = new Map<string, Route>();
  await page.route('**/qa-underlay-*.svg', route => { pending.set(new URL(route.request().url()).pathname, route); });
  const project = benchmarkProject('medium');
  for (const [index, floor] of project.floors.entries()) floor.backgroundImage = {
    dataUrl: `http://127.0.0.1:4188/qa-underlay-${index}.svg`, position: { x: 675, y: 675 },
    scale: 20, opacity: 1, rotation: 0, locked: false,
  };
  await importHome(page, project);
  await expect.poll(() => pending.has('/qa-underlay-0.svg')).toBe(true);
  await page.getByRole('combobox', { name: 'Current floor' }).selectOption({ label: 'Level 2' });
  await expect.poll(() => pending.has('/qa-underlay-1.svg')).toBe(true);
  await idle(page);
  const image = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${color}"/></svg>`;
  await changed(page, () => pending.get('/qa-underlay-1.svg')!.fulfill({ contentType: 'image/svg+xml', body: image('#e31b9d') }));
  const current = await pixels(page);
  await pending.get('/qa-underlay-0.svg')!.fulfill({ contentType: 'image/svg+xml', body: image('#23ed75') });
  await page.waitForLoadState('networkidle'); await idle(page);
  expect(await pixels(page)).toBe(current);
  await changed(page, () => page.getByRole('combobox', { name: 'Current floor' }).selectOption({ label: 'Level 1' }));
});

test('phone-width touch pan and pinch redraw while moving and sleep when stationary', async ({ page }) => {
  await observeCanvas(page); await importHome(page, benchmarkProject('small'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForLoadState('networkidle'); await idle(page);
  // Synthetic touch lists exercise the actual non-passive canvas listeners in
  // all CI engines. Physical iPhone gesture/permission behavior is separate QA.
  const touch = (type: string, points: number[][]) => canvas(page).evaluate((node, { type, points }) => {
    const r = node.getBoundingClientRect();
    const touches = points.map(([x, y], identifier) => ({ identifier, target: node, clientX: r.x + x, clientY: r.y + y }));
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, { touches: { value: touches }, changedTouches: { value: touches } });
    node.dispatchEvent(event);
    return event.defaultPrevented;
  }, { type, points });
  expect(await touch('touchstart', [[100, 250], [240, 250]])).toBe(true);
  await idle(page);
  await changed(page, () => touch('touchmove', [[70, 280], [300, 280]]));
  await changed(page, () => touch('touchmove', [[50, 310], [280, 310]]));
  expect(await touch('touchend', [])).toBe(true);
  await idle(page);
  await changed(page, () => page.setViewportSize({ width: 844, height: 390 }));
});
