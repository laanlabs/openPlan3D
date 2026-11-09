import { expect, test } from '@playwright/test';

// Dragging a canvas edge handle resizes furniture through its scale, so the Properties
// dimensions must report the resized size, and typing a size must land on that exact size.
test('Properties width follows an edge-handle resize and typed sizes stay exact afterwards', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenWelcome', 'true');
    localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall', 'first-furniture', 'first-3d', 'first-export', 'first-door']));
    // Record where the sofa caption is painted: its x is the sofa's center, whatever the panels do to the canvas.
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
      if (text === 'Sofa' && this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') {
        const p = new DOMPoint(x, y).matrixTransform(this.getTransform()), b = this.canvas.getBoundingClientRect();
        (window as any).__sofa = { x: b.x + p.x * b.width / this.canvas.width, y: b.y + p.y * b.height / this.canvas.height };
      }
      if (maxWidth === undefined) return fill.call(this, text, x, y);
      return fill.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto('/editor');
  // Snapping off keeps the sofa centered exactly where it is clicked.
  const snapping = page.getByRole('button', { name: 'Snap to Grid', exact: true });
  await snapping.click();
  await expect(snapping).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Objects', exact: true }).click();
  await page.getByRole('button', { name: /^Sofa(?: Sofa)?(?: 200×90cm)?$/ }).first().click();
  await page.getByRole('button', { name: 'Zoom to 100%', exact: true }).click();
  const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  const box = (await canvas.boundingBox())!;
  const center = { x: box.width * .5, y: box.height * .5 };
  await canvas.click({ position: center });
  await canvas.press('Escape');
  await canvas.click({ position: center });

  const width = page.getByRole('spinbutton', { name: 'Width (cm)', exact: true });
  const depth = page.getByRole('spinbutton', { name: 'Depth (cm)', exact: true });
  await expect(width).toHaveValue('200');

  // The sofa is 200 cm wide, so its right edge handle sits 100 cm right of center; read the zoom
  // from the status bar to turn centimetres into pixels.
  const zoom = Number((await page.getByText(/^Zoom: \d+%$/).innerText()).match(/\d+/)![0]) / 100;
  // Let the opened panel finish resizing the canvas before reading the painted position.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const caption = await page.evaluate(() => (window as any).__sofa as { x: number; y: number });
  // The caption is painted 48 cm below the sofa's center (45 cm half-depth plus its margin).
  const grab = { x: caption.x + 100 * zoom, y: caption.y - 48 * zoom };
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(grab.x + 60 * zoom, grab.y, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => Math.abs(Number(await width.inputValue()) - 260)).toBeLessThan(2);
  await expect(depth).toHaveValue('90');

  // Typing a width now stores the base size that yields the typed value after the scale.
  await width.fill('300'); await width.press('Tab');
  await expect(width).toHaveValue('300');
  await expect(depth).toHaveValue('90');

  await page.getByRole('button', { name: 'Reset to defaults', exact: true }).click();
  await expect(width).toHaveValue('200');
  await expect(depth).toHaveValue('90');
});
