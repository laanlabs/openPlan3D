import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const width of [1440,390]) {
  test(`floor-below stairs retain shapes without framing invisible objects at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width,height: 900 });
    await page.addInitScript(() => {
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function(x,y,w,h) {
        if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') (window as any).__ghostLabels = [];
        return clear.call(this,x,y,w,h);
      };
      const fill = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text,x,y,maxWidth) {
        if (/^(UP|DN)( \([lu]-shaped\))?$/.test(text) && this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') {
          const t = this.getTransform(), p = new DOMPoint(x,y).matrixTransform(t), b = this.canvas.getBoundingClientRect();
          ((window as any).__ghostLabels ??= []).push({ text,alpha: this.globalAlpha,x: b.x+p.x*b.width/this.canvas.width,y: b.y+p.y*b.height/this.canvas.height });
        }
        if (maxWidth === undefined) return fill.call(this,text,x,y);
        return fill.call(this,text,x,y,maxWidth);
      };
    });
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8'));
    const lower = plan.floors[0];
    for (const key of ['walls','doors','windows','rooms','furniture']) lower[key] = [];
    lower.stairs = ['straight','l-shaped','u-shaped','spiral'].map((stairType,i) => ({ id: `s${i}`,position: { x: 9000+i*500,y: -8000 },width: 180,depth: 300,rotation: 15,riserCount: 14,stairType,direction: i%2 ? 'down' : 'up' }));
    const upper = { ...structuredClone(lower), id: 'upper',name: 'Upper Floor',level: 1,stairs: [] };
    lower.textAnnotations = [{ id: 'invisible',text: 'Not in the reference layer',x: 2_000_000,y: 0,fontSize: 20,rotation: 0,color: '#cc22cc' }];
    plan.floors.push(upper); plan.activeFloorId = upper.id;
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export',exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON',exact: true }).click();
    await (await chooser).setFiles({ name: 'stairs-below.json',mimeType: 'application/json',buffer: Buffer.from(JSON.stringify(plan)) });
    const labels = () => page.evaluate(() => (window as any).__ghostLabels);
    await expect.poll(() => page.evaluate(() => {
      const labels = (window as any).__ghostLabels, b = document.querySelector('[aria-label="Floor plan editor canvas"]')!.getBoundingClientRect();
      return labels?.length === 4 && labels.every((p: any) => p.x > b.left+24 && p.x < b.right-24 && p.y > b.top+24 && p.y < b.bottom-24);
    })).toBe(true);
    const painted = await labels();
    expect(painted.map((p: any) => p.text)).toEqual(['UP','DN (l-shaped)','UP (u-shaped)','DN']);
    expect(painted.every((p: any) => p.alpha > 0 && p.alpha < .6)).toBe(true);
    await expect.poll(async () => parseFloat((await page.getByRole('button', { name: 'Zoom to 100%',exact: true }).textContent())!)).toBeGreaterThan(5);
    const tip = page.getByRole('button', { name: 'Got it',exact: true });
    await expect(tip).toBeHidden({ timeout: 15_000 });
    await page.mouse.click(painted[0].x,painted[0].y);
    await expect(page.getByText('Stair Properties', { exact: true })).toHaveCount(0);
    await testInfo.attach(`stair-ghost-${width}`, { body: await page.screenshot(),contentType: 'image/png' });
    await page.getByTitle('Layer Visibility', { exact: true }).press('Enter');
    await page.getByRole('checkbox', { name: 'Floor Below (Ground Floor)',exact: true }).uncheck();
    await page.getByTitle('Layer Visibility', { exact: true }).press('Enter');
    await expect.poll(async () => (await labels())?.length).toBe(0);
    await page.getByTitle('Zoom to Fit (F)', { exact: true }).first().press('Enter');
    await expect(page.getByRole('button', { name: 'Zoom to 100%',exact: true })).toHaveText('100%');
    await page.getByRole('button', { name: 'Export',exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download JSON',exact: true }).click();
    const saved = JSON.parse(await readFile((await (await pending).path())!,'utf8'));
    expect(saved.floors[0].stairs).toEqual(lower.stairs);
    expect(saved.floors[0].textAnnotations).toEqual(lower.textAnnotations);
    expect(saved.floors[1].stairs).toEqual([]);
  });
}
