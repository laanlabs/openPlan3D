import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { benchmarkProject } from '../fixtures/render-benchmark';

test('PDF room schedule paginates and preserves long names', async ({ page }, testInfo) => {
 const project=benchmarkProject('large'), floor=project.floors[0], extra=project.floors[1];
 for (const wall of extra.walls) { wall.start.x+=2200;wall.end.x+=2200; }
 floor.walls.push(...extra.walls);floor.rooms.push(...extra.rooms);
 floor.furniture=[];floor.doors=[];floor.windows=[];
 floor.rooms.forEach((room,i)=>{room.name=`Suite ${String(i+1).padStart(2,'0')} - Meeting and collaboration space with storage and accessible circulation`;});
 project.name='PDF schedule validation';project.floors=[floor];
 await page.goto('/editor');
 await page.getByRole('button',{name:'Export',exact:true}).click();
 const chooser=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'Import JSON',exact:true}).click();
 await (await chooser).setFiles({name:'schedule.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.waitForLoadState('networkidle');
 await page.getByRole('button',{name:'Export',exact:true}).click();
 const pending=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export as PDF',exact:true}).click();
 const pdf=await readFile((await (await pending).path())!);
 const content=pdf.toString('latin1');
 expect((content.match(/\/Type \/Page\b/g)??[]).length).toBeGreaterThanOrEqual(4);
 for(let i=1;i<=32;i++) expect(content).toContain(`Suite ${String(i).padStart(2,'0')}`);
 expect((content.match(/\(Room Schedule\)/g)??[]).length).toBeGreaterThanOrEqual(3);
 expect(content).toContain('(TOTAL)');
 await testInfo.attach('paginated-room-schedule.pdf',{body:pdf,contentType:'application/pdf'});
});
