import Drawing from 'dxf-writer';
import type { FurnitureItem } from '$lib/models/types';
import { getCatalogItem, getFurnitureSize } from './furnitureCatalog';
import { drawFurnitureIcon } from './furnitureIcons';
import { canvasSymbolDxf } from './canvasSymbolDxf';
export type { SplineDrawing } from './canvasSymbolDxf';

export function drawFurnitureDxf(drawing: Drawing, item: FurnitureItem) {
  const size=getFurnitureSize(item),color=item.color??getCatalogItem(item.catalogId)?.color??'#888888';
  canvasSymbolDxf(drawing,ctx=>{
    ctx.translate(item.position.x,item.position.y);ctx.rotate(item.rotation*Math.PI/180);
    ctx.scale(Math.sign(item.scale?.x??1)||1,Math.sign(item.scale?.y??1)||1);
    drawFurnitureIcon(ctx,item.catalogId,size.width,size.depth,color,color);
  });
}
