// Local-only static preview using the same CSP as the Cloudflare Worker.
// Run: node tests/preview.mjs   (no upload; listens on loopback only)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { handleRequest } from '../cloudflare/geo-worker.mjs';

const root = new URL('../', import.meta.url);
const types = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml' };
const pages = new Set(['index.html', 'politica-de-confidentialitate.html', 'style.css', 'script.js', 'fluid-cursor.js']);
const server = createServer(async (req, res) => {
    try {
        const path = new URL(req.url, 'http://localhost').pathname;
        const filename = decodeURIComponent(path === '/' ? 'index.html' : path.slice(1));
        const extension = filename.split('.').pop();
        const request = new Request(`https://pixelmagix.shop${req.url}`, { method: req.method });
        const result = await handleRequest(request, async () => {
            if (!['GET', 'HEAD'].includes(req.method)) return new Response('Method not allowed', { status: 405 });
            if (filename.includes('/') || filename.includes('\\') || (!pages.has(filename) && !/^[^.].*\.(webp|png|jpg|svg)$/.test(filename))) {
                return new Response('Not found', { status: 404 });
            }
            try {
                const data = await readFile(fileURLToPath(new URL(encodeURIComponent(filename), root)));
                return new Response(req.method === 'HEAD' ? null : data, { headers: { 'Content-Type': types[extension], 'Cache-Control': 'no-store' } });
            } catch { return new Response('Not found', { status: 404 }); }
        });
        res.writeHead(result.status, Object.fromEntries(result.headers));
        res.end(Buffer.from(await result.arrayBuffer()));
    } catch { res.writeHead(400); res.end('Bad request'); }
});
server.listen(5188, '127.0.0.1', () => console.log('PixelMagix preview: http://127.0.0.1:5188/'));
