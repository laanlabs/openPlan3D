import { test, expect, devices } from '@playwright/test';
import { observeGPU } from './gpu';

// Touch orbit, pan and pinch run through Chromium's touch input. A context lost while drawing shadows
// (the Pixel 10's PowerVR driver) repaints once restored, and a repeated loss turns shadows off on the device.
const { defaultBrowserType: _, ...phone } = devices['Pixel 7'];
test.use(phone);
test.skip(({ browserName }) => browserName !== 'chromium', 'Touch input and mobile emulation use Chromium.');

test('3D view survives touch orbit, pan and pinch on a phone and repaints a restored context without shadows', async ({ page }) => {
  test.slow();
  await observeGPU(page);
  // A loss an hour ago makes this one a repeat, however long the viewer has been drawing.
  const lastLoss = Date.now() - 60 * 60 * 1000;
  await page.addInitScript(at => localStorage.setItem('o3d_shadows_off', JSON.stringify({ lastLoss: at })), lastLoss);
  await page.addInitScript(() => localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door'])));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: '3D', exact: true }).first().click();
  const canvas = page.getByRole('region', { name: '3D floor plan viewer', exact: true }).locator('canvas').last();
  await expect(canvas).toHaveAttribute('data-rendered', 'true', { timeout: 60_000 });

  const draws = () => canvas.evaluate((node: HTMLCanvasElement) => (window as any).__gpuAudit.find((entry: any) => entry.canvas === node).draws as number);
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: [number, number][]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([px, py], id) => ({ x: px, y: py, id })) });
  const before = await draws();
  await touch('touchStart', [[x, y]]);
  for (let i = 1; i <= 10; i++) await touch('touchMove', [[x + i * 6, y + i * 2]]);
  await touch('touchEnd', []);
  for (const spread of [1, -1]) {
    await touch('touchStart', [[x - 60, y], [x + 60, y]]);
    for (let i = 1; i <= 10; i++) await touch('touchMove', [[x - 60 - spread * i * 4, y + i * 3], [x + 60 + spread * i * 4, y + i * 3]]);
    await touch('touchEnd', []);
  }
  await expect.poll(draws).toBeGreaterThan(before);
  // Let the orbit damping settle so the viewer is idle before its context goes.
  let settled = -1;
  await expect.poll(async () => { const previous = settled; settled = await draws(); return settled === previous; },
    { intervals: [1000], timeout: 20_000 }).toBe(true);

  const lost = await canvas.evaluate(async (node: HTMLCanvasElement) => {
    const gl = (node.getContext('webgl2') || node.getContext('webgl'))!;
    const extension = gl.getExtension('WEBGL_lose_context')!;
    const audit = (window as any).__gpuAudit.find((entry: any) => entry.canvas === node);
    await new Promise<void>(resolve => { node.addEventListener('webglcontextlost', () => resolve(), { once: true }); extension.loseContext(); });
    // Restoring is allowed only once the lost event has finished dispatching.
    await new Promise(resolve => setTimeout(resolve, 100));
    const draws = audit.draws;
    extension.restoreContext();
    return draws as number;
  });
  // Nothing else asks for a frame: only the restore wakes the idle viewer.
  await expect.poll(draws).toBeGreaterThan(lost);
  const remembered = JSON.parse(await page.evaluate(() => localStorage.getItem('o3d_shadows_off')) ?? '{}');
  expect(remembered.offUntil).toBeGreaterThan(Date.now());
  expect(errors).toEqual([]);
});
