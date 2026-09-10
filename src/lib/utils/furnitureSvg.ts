import { drawFurnitureIcon } from './furnitureIcons';
import { canvasSymbolSvg } from './canvasSymbolSvg';

export function furnitureSvg(catalogId: string, width: number, depth: number, color: string): string {
  return canvasSymbolSvg(context => drawFurnitureIcon(context,catalogId,width,depth,color,color));
}
