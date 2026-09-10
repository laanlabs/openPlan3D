import { afterEach, expect, it, vi } from 'vitest';
import { captureMain3DPNG } from '$lib/utils/captureMain3D';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('waits for a rendered main canvas and encodes it once', async()=>{
 vi.useFakeTimers();const blob=new Blob(['png']);
 const query=vi.fn().mockReturnValue(null);vi.stubGlobal('document',{querySelector:query});
 const pending=captureMain3DPNG();await vi.advanceTimersByTimeAsync(700);
 const toBlob=vi.fn(callback=>callback(blob));
 query.mockReturnValue({width:100,height:100,getContext:()=>({isContextLost:()=>false}),toBlob});
 await vi.advanceTimersByTimeAsync(50);expect(await pending).toBe(blob);expect(toBlob).toHaveBeenCalledTimes(1);
 expect(query).toHaveBeenCalledWith('canvas[data-plan3d-canvas="true"][data-rendered="true"]');
 expect(vi.getTimerCount()).toBe(0);
});
it.each(['lost','null','throw','timeout','abort'])('rejects %s capture and cleans timers',async failure=>{
 vi.useFakeTimers();const controller=new AbortController();
 vi.stubGlobal('document',{querySelector:()=>failure==='timeout'||failure==='abort'?null:{width:100,height:100,
  getContext:()=>({isContextLost:()=>failure==='lost'}),toBlob:(callback:(blob:null)=>void)=>{if(failure==='throw')throw new Error('tainted');callback(null);}}});
 const pending=expect(captureMain3DPNG(controller.signal)).rejects.toThrow();
 if(failure==='abort')controller.abort();
 if(failure==='timeout')await vi.advanceTimersByTimeAsync(10000);
 await pending;expect(vi.getTimerCount()).toBe(0);
});

it('allows encoding to finish after the readiness deadline',async()=>{
 vi.useFakeTimers();let complete: (blob: Blob)=>void = ()=>{};
 vi.stubGlobal('document',{querySelector:()=>({width:100,height:100,getContext:()=>({isContextLost:()=>false}),toBlob:(callback:typeof complete)=>{complete=callback;}})});
 const pending=captureMain3DPNG();await vi.advanceTimersByTimeAsync(12000);
 const blob=new Blob(['png']);complete(blob);expect(await pending).toBe(blob);expect(vi.getTimerCount()).toBe(0);
});
it('bounds encoding that never invokes its callback',async()=>{
 vi.useFakeTimers();vi.stubGlobal('document',{querySelector:()=>({width:100,height:100,getContext:()=>({isContextLost:()=>false}),toBlob:()=>{}})});
 const pending=expect(captureMain3DPNG()).rejects.toThrow('encoding timed out');
 await vi.advanceTimersByTimeAsync(30000);await pending;expect(vi.getTimerCount()).toBe(0);
});
