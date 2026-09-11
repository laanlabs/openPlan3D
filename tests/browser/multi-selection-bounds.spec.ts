import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
for (const width of [1440, 390]) {
  const kind = 'l-shaped';
  test(`group bounds and drag include entourage while respecting locks at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      localStorage.setItem('o3d_tips_seen', JSON.stringify(['first-wall','first-furniture','first-3d','first-export','first-door']));
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function(x,y,w,h) {
        if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas') (window as any).__stairRects = [];
        return clear.call(this,x,y,w,h);
      };
      const stroke = CanvasRenderingContext2D.prototype.strokeRect;
      CanvasRenderingContext2D.prototype.strokeRect = function(x,y,w,h) {
        if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas' && this.strokeStyle === '#8b5cf6') {
          const t = this.getTransform(), a = new DOMPoint(x,y).matrixTransform(t), z = new DOMPoint(x+w,y+h).matrixTransform(t), b = this.canvas.getBoundingClientRect();
          (window as any).__groupBox = { left:b.x+a.x*b.width/this.canvas.width,top:b.y+a.y*b.height/this.canvas.height,right:b.x+z.x*b.width/this.canvas.width,bottom:b.y+z.y*b.height/this.canvas.height };
        }
        return stroke.call(this,x,y,w,h);
      };
      const fill = CanvasRenderingContext2D.prototype.fillRect;
      CanvasRenderingContext2D.prototype.fillRect = function(x,y,w,h) {
        if (this.canvas.getAttribute('aria-label') === 'Floor plan editor canvas' && /^#(?:e5e7eb|bfdbfe)80$|^rgba\((?:229,\s*231,\s*235|191,\s*219,\s*254),/.test(String(this.fillStyle))) {
          const t = this.getTransform(), box = this.canvas.getBoundingClientRect();
          const pts = [[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([a,b]) => new DOMPoint(a,b).matrixTransform(t));
          const points = pts.map(p => ({ x: box.x+p.x*box.width/this.canvas.width, y: box.y+p.y*box.height/this.canvas.height }));
          ((window as any).__stairRects ??= []).push(points);
        }
        return fill.call(this,x,y,w,h);
      };
    });
    const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json','utf8'));
    const floor = plan.floors[0];
    for (const key of ['walls','doors','windows','rooms','furniture']) floor[key] = [];
    floor.stairs = [{ id: 's', position: { x: 9000, y: -8000 }, width: 100, depth: 900, rotation: 0, stairType: kind, riserCount: 14, direction: 'up' }];
    floor.columns = [{ id:'column',position:{x:8700,y:-8000},diameter:100,height:300,shape:'square',rotation:45,color:'#cc22cc' }];
    floor.furniture = [{id:'locked-furniture',catalogId:'unknown',position:{x:8750,y:-7800},width:100,depth:100,rotation:0,locked:true,color:'#cc22cc'}];
    floor.entourage = [{id:'person',defId:'person',position:{x:8600,y:-7800},width:100,rotation:35},
      {id:'locked',defId:'person',position:{x:8500,y:-7900},width:100,rotation:0,locked:true}];
    await page.goto('/editor');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
    await (await chooser).setFiles({ name: 'stairs.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
    await expect.poll(() => page.evaluate(() => {
      const rects = (window as any).__stairRects, b = document.querySelector('[aria-label="Floor plan editor canvas"]')!.getBoundingClientRect();
      return { count: rects?.length, inside: rects?.flat().every((p: any) => p.x > b.left+24 && p.x < b.right-24 && p.y > b.top+24 && p.y < b.bottom-24) };
    })).toEqual({ count: 3, inside: true });
    let target = await page.evaluate(() => {
      const r = (window as any).__stairRects[2];
      return { x: (r[0].x+r[2].x)/2, y: (r[0].y+r[2].y)/2 };
    });
    const canvas = await page.getByLabel('Floor plan editor canvas', {exact:true}).boundingBox();
    await page.mouse.move(canvas!.x+25,canvas!.y+25); await page.mouse.down();
    await page.mouse.move(canvas!.x+canvas!.width-25,canvas!.y+canvas!.height-25,{steps:5}); await page.mouse.up();
    await expect(page.getByText('5 selected',{exact:true}).first()).toBeVisible();
    await page.getByRole('button', { name:'Save',exact:true }).press('ControlOrMeta+a');
    await expect.poll(() => page.evaluate(() => !!(window as any).__groupBox)).toBe(true);
    // Selecting an item can open the phone Properties sheet over the old view.
    // Fit the group into the remaining canvas before driving its visible handle.
    await page.getByRole('button', { name: 'Fit selection', exact: true }).click();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const regions = await page.evaluate(() => (window as any).__stairRects);
    target = { x:(regions[2][0].x+regions[2][2].x)/2,y:(regions[2][0].y+regions[2][2].y)/2 };
    const box = await page.evaluate(() => (window as any).__groupBox);
    for (const p of regions.flat()) {
      expect(p.x).toBeGreaterThan(box.left); expect(p.x).toBeLessThan(box.right);
      expect(p.y).toBeGreaterThan(box.top); expect(p.y).toBeLessThan(box.bottom);
    }
    expect(await page.evaluate(p => document.elementFromPoint(p.x, p.y)?.getAttribute('aria-label'), target)).toBe('Floor plan editor canvas');
    await page.mouse.move(target.x,target.y); await page.mouse.down();
    await page.mouse.move(target.x+40,target.y+30,{steps:5}); await page.mouse.up();
    async function exported() {
      await page.getByRole('button', { name:'Export',exact:true }).click();
      const pending = page.waitForEvent('download');
      await page.getByRole('button', { name:'Download JSON',exact:true }).click();
      return JSON.parse(await readFile((await (await pending).path())!,'utf8')).floors[0];
    }
    const moved = await exported();
    const dx = moved.stairs[0].position.x-floor.stairs[0].position.x;
    const dy = moved.stairs[0].position.y-floor.stairs[0].position.y;
    expect(Math.hypot(dx,dy)).toBeGreaterThan(0);
    expect(moved.columns[0].position.x-floor.columns[0].position.x).toBeCloseTo(dx);
    expect(moved.columns[0].position.y-floor.columns[0].position.y).toBeCloseTo(dy);
    expect(moved.entourage[0].position.x-floor.entourage[0].position.x).toBeCloseTo(dx);
    expect(moved.entourage[0].position.y-floor.entourage[0].position.y).toBeCloseTo(dy);
    expect(moved.entourage[1]).toEqual(floor.entourage[1]);
    expect(moved.furniture[0].position).toEqual(floor.furniture[0].position);
    await page.getByRole('button', { name:'Undo',exact:true }).click();
    const undone = await exported();
    expect(undone.stairs).toEqual(floor.stairs); expect(undone.columns).toEqual(floor.columns);
    expect(undone.entourage).toEqual(floor.entourage);
    await page.getByTitle('Zoom to Fit (F)', { exact:true }).first().press('Enter');
    await expect.poll(() => page.evaluate(() => {
      const g = (window as any).__groupBox, b = document.querySelector('[aria-label="Floor plan editor canvas"]')!.getBoundingClientRect();
      return g && g.left > b.left && g.right < b.right && g.top > b.top && g.bottom < b.bottom;
    })).toBe(true);
    await testInfo.attach(`multi-bounds-${width}`, { body:await page.screenshot(),contentType:'image/png' });
  });
}
