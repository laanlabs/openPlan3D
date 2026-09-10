import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';

function checkSlabs(scene: any, elevation: number, thickness = .05) {
  const slabs = scene.meshes.filter((mesh: any) => {
    const ys = mesh.vertices.map((p: number[]) => p[1]);
    return mesh.material === 'floor' && Math.abs(Math.min(...ys) - (elevation - thickness)) < 1e-5 && Math.abs(Math.max(...ys) - elevation) < 1e-5;
  });
  expect(slabs).toHaveLength(2); // two enclosed rooms, no bounding rectangle
  const root = new Group(), material = new MeshBasicMaterial({ side: DoubleSide });
  for (const mesh of slabs) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(mesh.vertices.flat(), 3));
    geometry.setIndex(mesh.faces.flat()); root.add(new Mesh(geometry, material));
  }
  root.updateMatrixWorld(true);
  const hits = (x: number, z: number) => new Raycaster(new Vector3(x, elevation + .1, z), new Vector3(0, -1, 0), 0, .2).intersectObject(root, true).length;
  expect(hits(1, 4)).toBeGreaterThan(0);
  expect(hits(4, 1)).toBeGreaterThan(0);
  expect(hits(9, 1)).toBeGreaterThan(0);
  expect(hits(4, 4)).toBe(0); // L-shaped recess
  expect(hits(7, 1)).toBe(0); // gap between disconnected rooms
  root.traverse(node => { if (node instanceof Mesh) node.geometry.dispose(); }); material.dispose();
}

test('nested rooms export one slab at each point on active and stacked floors', async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    const fill=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,x,y,maxWidth) {
      if (this.canvas.getAttribute('aria-label')==='Floor plan editor canvas' && text.startsWith('Nested room ')) {
        const p=new DOMPoint(x,y).matrixTransform(this.getTransform()), b=this.canvas.getBoundingClientRect();
        const anchors=(window as any).__nestedAnchors ??= {};
        anchors[text.split(' (')[0]]={x:b.x+p.x*b.width/this.canvas.width,y:b.y+p.y*b.height/this.canvas.height};
      }
      if (maxWidth===undefined) return fill.call(this,text,x,y);
      return fill.call(this,text,x,y,maxWidth);
    };
    const encode=HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL=function(...args) {
      const result=encode.apply(this,args);
      if ((window as any).__capturePDF && this.width>500) (window as any).__pdfImage=result;
      return result;
    };
  });
  const project = JSON.parse(await readFile(resolve('tests/fixtures/room-slabs.openplan.json'), 'utf8'));
  for (const floor of project.floors) {
    floor.rooms = [];
    floor.walls = [0,100,200].flatMap((inset,ring) => {
      const points = [[inset,inset],[600-inset,inset],[600-inset,600-inset],[inset,600-inset]];
      return points.map(([x,y],i) => ({id:`${floor.id}-${ring}-${i}`,start:{x,y},
        end:{x:points[(i+1)%4][0],y:points[(i+1)%4][1]},thickness:20,height:280,color:'#94a3b8'}));
    });
    floor.rooms = [0,1,2].map(ring=>({id:`saved-${floor.id}-${ring}`,name:`Nested room ${ring}`,
      walls:[0,1,2,3].map(i=>`${floor.id}-${ring}-${i}`),floorTexture:'tile',area:999}));
  }
  await page.goto('/editor');
  await page.getByRole('button', {name:'Export',exact:true}).click();
  const chooser=page.waitForEvent('filechooser');
  await page.getByRole('button', {name:'Import JSON',exact:true}).click();
  await (await chooser).setFiles({name:'nested.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
  await page.getByRole('button',{name:'Area Summary',exact:true}).click();
  const summary=page.getByRole('dialog',{name:'Area Summary',exact:true});
  for (const value of ['36.0 m²','20.0 m²','12.0 m²','4.0 m²','Nested room 0']) await expect(summary).toContainText(value);
  await expect(summary).not.toContainText('999');
  await page.getByRole('button',{name:'Close area summary',exact:true}).click();
  await page.getByTitle('Zoom to Fit (F)',{exact:true}).first().click();
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  const anchors=()=>page.evaluate(()=>(window as any).__nestedAnchors as Record<string,{x:number;y:number}>);
  let positions=await anchors();
  for (let i=0;i<3;i++) {
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    positions=await anchors();
    const anchor=positions[`Nested room ${i}`];
    for(let j=0;j<i;j++) expect(Math.hypot(anchor.x-positions[`Nested room ${j}`].x,anchor.y-positions[`Nested room ${j}`].y)).toBeGreaterThan(15);
    await page.mouse.dblclick(anchor.x,anchor.y);
    const nameEditor=page.getByRole('textbox',{name:'Room name',exact:true});
    await expect(nameEditor).toHaveValue(`Nested room ${i}`);
    await nameEditor.press('Escape');
    await expect(nameEditor).not.toBeVisible();
  }
  positions=await anchors();
  const start=positions['Nested room 0'];
  await page.mouse.move(start.x,start.y);await page.mouse.down();
  await page.mouse.move(start.x+40,start.y+15,{steps:5});await page.mouse.up();
  await expect.poll(async()=>Math.abs((await anchors())['Nested room 0'].x-start.x-40)).toBeLessThan(2);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await expect.poll(async()=>Math.abs((await anchors())['Nested room 0'].x-start.x)).toBeLessThan(2);
  for (const format of ['PNG','SVG','PDF']) {
    await page.evaluate(capture=>(window as any).__capturePDF=capture,format==='PDF');
    await page.getByRole('button',{name:'Export',exact:true}).click();
    const download=page.waitForEvent('download');
    await page.getByRole('button',{name:format==='PNG'?'Export 2D as PNG':`Export as ${format}`,exact:true}).click();
    const bytes=await readFile((await (await download).path())!);
    if (format==='SVG') expect(bytes.toString()).toContain('fill-rule="evenodd"');
    if (format==='PDF') expect(bytes.subarray(0,5).toString()).toBe('%PDF-');
    const url=format==='PDF' ? await page.evaluate(()=>(window as any).__pdfImage as string)
      : `data:image/${format==='SVG'?'svg+xml':'png'};base64,${bytes.toString('base64')}`;
    const counts=await page.evaluate(async url=> {
      const image=new Image();
      await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=reject;image.src=url;});
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0);
      const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      // Each palette color painted exactly once at 40% over white.
      return [[191,219,254],[253,230,138],[187,247,208]].map(color=> {
        const target=color.map(c=>Math.round(c*.4+255*.6));let count=0;
        for(let i=0;i<data.length;i+=4) if(target.every((c,j)=>Math.abs(data[i+j]-c)<=1)) count++;
        return count;
      });
    },url);
    for (const count of counts) expect(count,`${format} unblended room color`).toBeGreaterThan(100);
  }
  await page.getByRole('button', {name:'3D',exact:true}).click();
  await page.waitForLoadState('networkidle');
  const hint=page.getByRole('button',{name:'Got it',exact:true});
  if (await hint.isVisible()) await hint.click();
  for (const stacked of [false,true]) {
    if (stacked) await page.getByRole('button',{name:'Show All Floors Stacked',exact:true}).click();
    const pending=page.waitForEvent('download');
    await page.getByRole('button',{name:'Export Blender Scene',exact:true}).click();
    const scene=JSON.parse(await readFile((await (await pending).path())!,'utf8'));
    for (const elevation of stacked ? [0,4] : [0]) {
      const slabs=scene.meshes.filter((m:any)=>m.material==='floor' &&
        Math.abs(Math.max(...m.vertices.map((p:number[])=>p[1]))-elevation)<1e-5 &&
        Math.abs(Math.min(...m.vertices.map((p:number[])=>p[1]))-elevation+.05)<1e-5);
      expect(slabs).toHaveLength(3);
      const material=new MeshBasicMaterial({side:DoubleSide});
      const meshes=slabs.map((m:any)=> {
        const g=new BufferGeometry(); g.setAttribute('position',new Float32BufferAttribute(m.vertices.flat(),3));
        g.setIndex(m.faces.flat()); return new Mesh(g,material);
      });
      for (const p of [.5,1.5,2.5]) {
        const ray=new Raycaster(new Vector3(p,elevation+.1,p),new Vector3(0,-1,0),0,.2);
        expect(meshes.filter((m:Mesh)=>ray.intersectObject(m).length>0)).toHaveLength(1);
      }
      meshes.forEach((m:Mesh)=>m.geometry.dispose()); material.dispose();
    }
  }
});

test('room slabs preserve recesses and separate rooms across active-floor switches', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/editor');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await chooser).setFiles(resolve('tests/fixtures/room-slabs.openplan.json'));
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const thickness = page.getByRole('spinbutton', { name: 'Slab Floor 1 slab thickness (cm)', exact: true });
  await expect(thickness).toHaveValue('5');
  await thickness.fill('32.5'); await thickness.press('Tab');
  await thickness.fill('0'); await thickness.press('Tab');
  await expect(thickness).toHaveValue('32.5');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const saved = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  const savedPath = (await (await saved).path())!;
  expect(JSON.parse(await readFile(savedPath, 'utf8')).floors[1].slabThickness).toBe(32.5);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const reload = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await (await reload).setFiles({ name: 'slabs.json', mimeType: 'application/json', buffer: await readFile(savedPath) });
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await page.waitForLoadState('networkidle');
  const hint = page.getByRole('button', { name: 'Got it', exact: true });
  if (await hint.isVisible()) await hint.click();
  async function exported() {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Blender Scene', exact: true }).click();
    return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  }
  checkSlabs(await exported(), 0);
  await page.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
  const stacked = await exported(); checkSlabs(stacked, 0); checkSlabs(stacked, 4, .325);
  await testInfo.attach('room-slabs-stacked.json', { body: JSON.stringify(stacked), contentType: 'application/json' });
  await page.getByRole('combobox', { name: 'Current floor', exact: true }).selectOption('slab-floor-1');
  const switched = await exported(); checkSlabs(switched, 0); checkSlabs(switched, 4, .325);
  await testInfo.attach('custom-slab-thickness', { body: await page.screenshot(), contentType: 'image/png' });
  expect(errors).toEqual([]);
});
