import { bridgeGuard } from '$lib/server/agentBridgeGuard';
import { connectTab, tabHello } from '$lib/server/agentBridge';

/** Server-Sent Events channel to one editor tab (?tab=<id>): carries agent requests to the tab. */
export function GET(event) {
  const blocked = bridgeGuard(event);
  if (blocked) return blocked;
  const tab = event.url.searchParams.get('tab') ?? '';
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(tab)) return new Response('Bad tab id', { status: 400 });
  let disconnect = () => {}, keepAlive: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (name: string, data: unknown) => {
        try { controller.enqueue(encoder.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { disconnect(); }
      };
      disconnect = connectTab(tab, send);
      tabHello(tab, event.url.searchParams.get('project'));
      send('ready', { tab });
      keepAlive = setInterval(() => send('ping', {}), 25_000);
    },
    cancel() { clearInterval(keepAlive); disconnect(); },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' } });
}
