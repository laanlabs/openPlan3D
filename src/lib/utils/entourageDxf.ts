import Drawing, {type TagsManager} from 'dxf-writer';
import {SVGPathData} from 'svg-pathdata';
import type {EntourageItem} from '$lib/models/types';
import {getEntourageDef} from './entourageCatalog';
import {canvasSymbolDxf} from './canvasSymbolDxf';

/** Catalog vector paths retain their exact curves in editable CAD linework. */
export function drawEntourageDxf(drawing:Drawing,item:EntourageItem) {
 const def=getEntourageDef(item.defId);if(!def || item.opacity===0)return;
 const layer=drawing.activeLayer!,firstShape=layer.shapes.length;
 canvasSymbolDxf(drawing,ctx=>{
  ctx.translate(item.position.x,item.position.y);ctx.rotate(item.rotation*Math.PI/180);
  ctx.scale(item.width/100,item.width/100);ctx.translate(-50,-50*def.aspect);
  for(const path of def.paths){
   ctx.beginPath();
   for(const c of new SVGPathData(path).toAbs().normalizeHVZ().normalizeST().annotateArcs().commands){
    switch(c.type){
     case SVGPathData.MOVE_TO:ctx.moveTo(c.x,c.y);break;
     case SVGPathData.LINE_TO:ctx.lineTo(c.x,c.y);break;
     case SVGPathData.CLOSE_PATH:ctx.closePath();break;
     case SVGPathData.QUAD_TO:ctx.quadraticCurveTo(c.x1,c.y1,c.x,c.y);break;
     case SVGPathData.CURVE_TO:ctx.bezierCurveTo(c.x1,c.y1,c.x2,c.y2,c.x,c.y);break;
     case SVGPathData.ARC:ctx.ellipse(c.cX!,c.cY!,c.rX,c.rY,c.xRot*Math.PI/180,c.phi1!*Math.PI/180,c.phi2!*Math.PI/180,c.sweepFlag===0);break;
     default:throw new Error('Unsupported entourage path command');
    }
   }
   ctx.stroke();
  }
 });
 if(item.opacity!==undefined && item.opacity<1){
  const transparency=0x02000000 | Math.round(Math.max(0,item.opacity)*255);
  for(const shape of layer.shapes.slice(firstShape) as unknown as {tags(manager:TagsManager):void}[]){
   const tags=shape.tags;
   shape.tags=manager=>{
    const output=Object.create(manager) as typeof manager;
    output.push=(code,value)=>{manager.push(code,value);if(code===100 && value==='AcDbEntity')manager.push(440,transparency);};
    tags.call(shape,output);
   };
  }
 }
}
