import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { Matrix4, Vector3 } from 'three';
import { createHash } from 'node:crypto';

test.use({ viewport: { width: 844, height: 480 } });

async function openWalkthrough(page: Page) {
  // CI-only control of RAF timestamps and observation of WebGL's view uniform.
  // No camera references, application internals or production debug hooks.
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    const normal = new Set<number>(), queued = new Map<number, FrameRequestCallback>();
    let manual = false, now = 0, next = -1;
    const audit: any = {
      view: null,
      ready: () => normal.size === 0,
      start: () => { if (normal.size) throw new Error('Wait for orbit to settle'); manual = true; },
      step: (delta: number, frames: number) => {
        for (let frame = 0; frame < frames; frame++) {
          now += delta;
          const callbacks = [...queued];
          for (const [id, callback] of callbacks) {
            if (!queued.delete(id)) continue;
            callback(now);
          }
        }
        return audit.view;
      },
    };
    (window as any).__walkAudit = audit;
    window.requestAnimationFrame = callback => {
      if (manual) { const id = next--; queued.set(id, callback); return id; }
      const id = request(time => { normal.delete(id); callback(time); });
      normal.add(id); return id;
    };
    window.cancelAnimationFrame = id => {
      if (id < 0) queued.delete(id);
      else { normal.delete(id); cancel(id); }
    };
    const seen = new WeakSet(), getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: any[]) {
      const gl = (getContext as any).apply(this, args);
      if (!gl || !String(args[0]).startsWith('webgl') || seen.has(gl)) return gl;
      seen.add(gl);
      const uniforms = new Map(), locate = gl.getUniformLocation.bind(gl), matrix = gl.uniformMatrix4fv.bind(gl);
      gl.getUniformLocation = (program: WebGLProgram, name: string) => {
        const location = locate(program, name); if (location) uniforms.set(location, name); return location;
      };
      gl.uniformMatrix4fv = (location: WebGLUniformLocation, transpose: boolean, values: Float32Array, ...rest: any[]) => {
        if (uniforms.get(location) === 'viewMatrix') audit.view = Array.from(values);
        return matrix(location, transpose, values, ...rest);
      };
      return gl;
    } as typeof getContext;
    HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new DOMException('Denied', 'NotAllowedError'));
  });
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/top-down-framing.openplan.json'));
  await page.getByRole('button', { name: '3D', exact: true }).click();
  const hint = page.getByRole('button', { name: 'Got it', exact: true });
  if (await hint.isVisible()) await hint.click();
  await page.waitForLoadState('networkidle');
  await expect.poll(() => page.evaluate(() => (window as any).__walkAudit.ready())).toBe(true);
  await page.evaluate(() => (window as any).__walkAudit.start());
}

const step = (page: Page, delta = 1000 / 60, frames = 24): Promise<number[]> =>
  page.evaluate(({ delta, frames }) => (window as any).__walkAudit.step(delta, frames), { delta, frames });
const position = (view: number[]) => new Vector3().setFromMatrixPosition(new Matrix4().fromArray(view).invert());
const pixels = async (page: Page) => createHash('sha256').update(await page.getByRole('region', { name: '3D floor plan viewer' })
  .locator('canvas').last().evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).digest('hex');
async function enter(page: Page) {
  const exit = page.getByRole('button', { name: 'Exit Walkthrough Mode', exact: true });
  if (await exit.isVisible()) await exit.click();
  await page.getByRole('button', { name: 'Enter Walkthrough Mode', exact: true }).click();
  await expect(page.getByText('Walkthrough Controls', { exact: true })).toBeVisible();
  const view = await step(page, 0, 1);
  expect(view).toHaveLength(16);
  return view;
}

test('walkthrough renders the same movement and look at 30, 60 and 120 Hz', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await openWalkthrough(page);
  const views: number[][] = [];
  for (const hz of [30, 60, 120]) {
    const initial = await enter(page), before = await pixels(page);
    await page.keyboard.down('ArrowUp'); await page.keyboard.down('a');
    let view: number[];
    try { view = await step(page, 1000 / hz, hz * 0.4); }
    finally { await page.keyboard.up('ArrowUp'); await page.keyboard.up('a'); }
    expect(position(view).distanceTo(position(initial))).toBeGreaterThan(20);
    expect(await pixels(page)).not.toBe(before);
    views.push(view);
  }
  for (const view of views.slice(1)) view.forEach((value, index) => expect(value).toBeCloseTo(views[0][index], 4));
  expect(errors).toEqual([]);
});

test('walkthrough clears held input on pause and exit and lets fields handle arrows', async ({ page }) => {
  test.setTimeout(120_000);
  await openWalkthrough(page);
  await enter(page);
  for (const event of ['blur', 'visibilitychange']) {
    await page.keyboard.down('ArrowUp'); await page.keyboard.down('ShiftRight'); await page.keyboard.down('a');
    const before = await step(page);
    await page.evaluate(event => (event === 'blur' ? window : document).dispatchEvent(new Event(event)), event);
    // Playwright marks another down on an already-held key as an OS repeat.
    await page.keyboard.down('ArrowUp'); await page.keyboard.down('a');
    await step(page, 60_000, 1);
    expect(await step(page)).toEqual(before);
    await page.keyboard.up('ArrowUp'); await page.keyboard.up('ShiftRight'); await page.keyboard.up('a');
  }
  const field = page.getByRole('slider', { name: /Eye Height/ });
  const beforeField = position(await step(page));
  await field.focus();
  const height = Number(await field.inputValue());
  await page.keyboard.press('ArrowUp');
  await expect(field).toHaveValue(String(height + 1));
  const afterField = position(await step(page));
  expect(afterField.x).toBeCloseTo(beforeField.x, 4);
  expect(afterField.z).toBeCloseTo(beforeField.z, 4);
  expect(afterField.y - beforeField.y).toBeCloseTo(1, 4);

  // Releasing Shift outside walkthrough used to leave sprint enabled next time.
  await page.getByRole('button', { name: 'Exit Walkthrough Mode', exact: true }).focus();
  await page.keyboard.down('ShiftRight');
  await page.getByRole('button', { name: 'Exit Walkthrough Mode', exact: true }).click();
  await page.keyboard.up('ShiftRight');
  const initial = position(await enter(page));
  await page.keyboard.down('ArrowUp');
  const walked = position(await step(page));
  await page.keyboard.up('ArrowUp');
  expect(walked.distanceTo(initial)).toBeCloseTo(24.146525, 3);
});
