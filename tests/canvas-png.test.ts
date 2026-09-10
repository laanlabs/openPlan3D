import { afterEach, expect, it, vi } from 'vitest';
import { canvasPNG } from '$lib/utils/canvasPNG';
afterEach(()=>vi.useRealTimers());
it.each(['blob','null','throw','timeout'])('handles %s PNG encoding', async mode=>{
 vi.useFakeTimers();const blob=new Blob(['png']);
 const canvas={toBlob:(callback:BlobCallback)=>{if(mode==='throw')throw new Error('tainted');if(mode!=='timeout')callback(mode==='blob'?blob:null);}} as HTMLCanvasElement;
 const pending=canvasPNG(canvas);
 if(mode==='blob')expect(await pending).toBe(blob);
 else {const rejected=expect(pending).rejects.toThrow();if(mode==='timeout')await vi.advanceTimersByTimeAsync(30000);await rejected;}
 expect(vi.getTimerCount()).toBe(0);
});
