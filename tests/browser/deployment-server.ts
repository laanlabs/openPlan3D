import { createServer, request as proxyRequest } from 'node:http';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';

/** Real HTTP cache fixture: routing via Playwright would disable the cache. */
export async function deploymentServer(upstream = 'http://127.0.0.1:4188') {
  const { version: current } = JSON.parse(await readFile('build/client/_app/version.json', 'utf8'));
  const different = current.slice(0, -1) + (current.endsWith('0') ? '1' : '0');
  const etag = `W/"${Buffer.byteLength(JSON.stringify({ version: current }))}-315532801000"`;
  const modified = 'Tue, 01 Jan 1980 00:00:01 GMT';
  let body = JSON.stringify({ version: current }), status = 200;
  const requests: { status: number; etag?: string; modified?: string }[] = [];
  const server = createServer((req, res) => {
    if (req.url?.split('?')[0] === '/_app/version.json') {
      // Deliberately collide across equal-sized, uncompressed representations.
      // Like the deployed adapter, explicit no-cache headers do not fix a 304.
      const conditional = req.headers['if-none-match'] === etag ||
        (!req.headers['if-none-match'] && req.headers['if-modified-since'] === modified);
      const code = status === 200 && conditional ? 304 : status;
      requests.push({ status: code, etag: req.headers['if-none-match'], modified: req.headers['if-modified-since'] });
      res.writeHead(code, {
        'content-type': 'application/json', 'cache-control': 'public, max-age=0, must-revalidate',
        etag, 'last-modified': modified,
      });
      res.end(code === 304 ? undefined : body);
      return;
    }
    const proxy = proxyRequest(new URL(req.url!, upstream), {
      method: req.method, headers: { ...req.headers, host: new URL(upstream).host },
    }, response => {
      res.writeHead(response.statusCode!, response.headers);
      response.pipe(res);
    });
    proxy.on('error', () => { res.writeHead(502); res.end(); });
    req.pipe(proxy);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    current, different, requests,
    serve(version: string, code = 200) { body = JSON.stringify({ version }); status = code; },
    async close() { server.closeAllConnections(); server.close(); await once(server, 'close'); },
  };
}
