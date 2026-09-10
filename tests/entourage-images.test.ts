import {afterEach,expect,it,vi} from 'vitest';
import {getEntourageImage,prepareEntourageImage} from '$lib/utils/entourageImages';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it.each(['load','error','timeout'])('settles pending entourage image %s without leaking timers',async mode=>{
 vi.useFakeTimers();let image:EventTarget & {complete:boolean;naturalWidth:number};
 vi.stubGlobal('Image',class extends EventTarget {complete=false;naturalWidth=0;constructor(){super();image=this;}});
 const pending=prepareEntourageImage({id:mode,name:'test',dataUrl:mode,aspect:1});
 if(mode==='load'){image!.naturalWidth=50;image!.dispatchEvent(new Event('load'));await pending;}
 else {const rejected=expect(pending).rejects.toThrow();if(mode==='error')image!.dispatchEvent(new Event('error'));else await vi.advanceTimersByTimeAsync(30000);await rejected;}
 expect(vi.getTimerCount()).toBe(0);
});
it('replaces changed content under the same definition ID and handles ready/broken images',async()=>{
 vi.stubGlobal('Image',class {complete=true;naturalWidth=50;});
 const def={id:'reuse',name:'test',dataUrl:'first',aspect:1};const a=getEntourageImage(def);expect(getEntourageImage(def)).toBe(a);await prepareEntourageImage(def);
 expect(getEntourageImage({...def,dataUrl:'second'})).not.toBe(a);
 vi.stubGlobal('Image',class {complete=true;naturalWidth=0;});await expect(prepareEntourageImage({...def,id:'broken'})).rejects.toThrow();
});
