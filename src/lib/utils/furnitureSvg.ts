import { drawFurnitureIcon } from './furnitureIcons';
const xml = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));

/** SVG adapter for the drawing commands used by the shared furniture icon registry. */
export function furnitureSvg(catalogId: string, width: number, depth: number, color: string): string {
  const elements: string[] = [];
  let path = '';
  const context = {
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic',
    beginPath() { path=''; }, closePath() { path+='Z '; },
    moveTo(x:number,y:number) { path+=`M ${x} ${y} `; },
    lineTo(x:number,y:number) { path+=`${path?'L':'M'} ${x} ${y} `; },
    quadraticCurveTo(cx:number,cy:number,x:number,y:number) { path+=`Q ${cx} ${cy} ${x} ${y} `; },
    fill() { elements.push(`<path d="${path}" fill="${xml(this.fillStyle)}"/>`); },
    stroke() { elements.push(`<path d="${path}" fill="none" stroke="${xml(this.strokeStyle)}" stroke-width="${this.lineWidth}"/>`); },
    fillRect(x:number,y:number,w:number,h:number) { elements.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${xml(this.fillStyle)}"/>`); },
    strokeRect(x:number,y:number,w:number,h:number) { elements.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${xml(this.strokeStyle)}" stroke-width="${this.lineWidth}"/>`); },
    fillText(text:string,x:number,y:number) {
      const anchor=this.textAlign==='center'?'middle':['right','end'].includes(this.textAlign)?'end':'start';
      const baseline=this.textBaseline==='middle'?'central':this.textBaseline==='top'?'text-before-edge':this.textBaseline==='bottom'?'text-after-edge':'alphabetic';
      elements.push(`<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="${baseline}" style="font:${xml(this.font)}" fill="${xml(this.fillStyle)}">${xml(text)}</text>`);
    },
    arc(x:number,y:number,r:number,start:number,end:number,ccw=false) { this.ellipse(x,y,r,r,0,start,end,ccw); },
    ellipse(x:number,y:number,rx:number,ry:number,rotation:number,start:number,end:number,ccw=false) {
      const tau=Math.PI*2;
      let sweep=end-start;
      if (!ccw && sweep>=tau) sweep=tau;
      else if (ccw && sweep<=-tau) sweep=-tau;
      else if (ccw) { sweep%=tau; if(sweep>0)sweep-=tau; }
      else { sweep%=tau;if(sweep<0)sweep+=tau; }
      const point=(angle:number)=>({x:x+rx*Math.cos(angle)*Math.cos(rotation)-ry*Math.sin(angle)*Math.sin(rotation),y:y+rx*Math.cos(angle)*Math.sin(rotation)+ry*Math.sin(angle)*Math.cos(rotation)});
      const a=point(start);path+=`${path?'L':'M'} ${a.x} ${a.y} `;
      const steps=Math.ceil(Math.abs(sweep)/Math.PI);
      for(let i=1;i<=steps;i++) { const b=point(start+sweep*i/steps);path+=`A ${rx} ${ry} ${rotation*180/Math.PI} 0 ${ccw?0:1} ${b.x} ${b.y} `; }
    },
  };
  const adapter=new Proxy(context,{get(target,key,receiver){if(!(key in target))throw new Error(`Unsupported furniture SVG command: ${String(key)}`);return Reflect.get(target,key,receiver);}});
  drawFurnitureIcon(adapter as unknown as CanvasRenderingContext2D,catalogId,width,depth,color,color);
  return elements.join('\n');
}
