import type { CustomEntourageDef } from '$lib/models/types';

const cache=new Map<string,{source:string;image:HTMLImageElement}>();
export function getEntourageImage(def:CustomEntourageDef,onLoad?:()=>void):HTMLImageElement {
  let entry=cache.get(def.id);
  if (!entry || entry.source!==def.dataUrl) {
    const image=new Image();image.onload=()=>onLoad?.();image.src=def.dataUrl;
    entry={source:def.dataUrl,image};cache.set(def.id,entry);
  }
  return entry.image;
}

/** Wait for the exact saved image; failed/pending assets must not silently export placeholders. */
export function prepareEntourageImage(def:CustomEntourageDef):Promise<HTMLImageElement> {
  return new Promise((resolve,reject)=>{
    const image=getEntourageImage(def);
    if(image.complete){if(image.naturalWidth>0)resolve(image);else reject(new Error('Entourage image could not be loaded'));return;}
    const cleanup=()=>{clearTimeout(timeout);image.removeEventListener('load',loaded);image.removeEventListener('error',failed);};
    const loaded=()=>{cleanup();if(image.naturalWidth>0)resolve(image);else reject(new Error('Entourage image could not be loaded'));};
    const failed=()=>{cleanup();reject(new Error('Entourage image could not be loaded'));};
    const timeout=setTimeout(()=>{cleanup();reject(new Error('Entourage image loading timed out'));},30000);
    image.addEventListener('load',loaded);image.addEventListener('error',failed);
  });
}
