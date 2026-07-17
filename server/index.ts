// A11 measurement stub — NOT the real scoring service.
// Exists only to measure, on Render's actual free tier:
//   1. Render's proxy request timeout (unknown, must not be guessed)
//   2. Real cold-start duration for a 0.1-CPU instance after ~15min idle
//   3. Whether a client disconnect kills in-flight work server-side
//
// /score sleeps 30s before responding so a request outliving Render's
// proxy timeout (if any) is observable. Server-side console logs let us
// confirm whether disconnected requests keep running to completion.

import http from 'node:http';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const BOOT_TIME = Date.now();

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, upSinceMs: Date.now() - BOOT_TIME }));
    return;
  }

  if (url.pathname === '/score' && req.method === 'POST') {
    const requestId = Math.random().toString(36).slice(2, 8);
    const startedAt = Date.now();
    console.log(`[${requestId}] /score received, sleeping 30s`);

    req.on('close', () => {
      if (!res.writableEnded) {
        console.log(`[${requestId}] client disconnected after ${Date.now() - startedAt}ms — work continues`);
      }
    });

    setTimeout(() => {
      const elapsed = Date.now() - startedAt;
      console.log(`[${requestId}] work finished after ${elapsed}ms, response writable: ${!res.writableEnded}`);
      if (!res.writableEnded) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, elapsedMs: elapsed, requestId }));
      }
    }, 30_000);
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`A11 stub listening on 0.0.0.0:${PORT}`);
});
