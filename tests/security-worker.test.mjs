import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleRequest, pageContentSecurityPolicy } from '../cloudflare/geo-worker.mjs';

const noOrigin = () => { throw new Error('The origin must not be contacted for this request'); };
const requestFor = (path = '/', init = {}, country) => {
    const request = new Request(`https://pixelmagix.shop${path}`, init);
    if (country !== undefined) Object.defineProperty(request, 'cf', { value: { country } });
    return request;
};

test('HTTP redirects to the same HTTPS path and query without reaching the origin', async () => {
    const response = await handleRequest(new Request('http://pixelmagix.shop/path?q=a%20b'), noOrigin);
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), 'https://pixelmagix.shop/path?q=a%20b');
    assert.equal(await response.text(), '');
});

test('unexpected hosts cannot turn the Worker into a proxy or redirector', async () => {
    for (const host of ['evil.example', 'pixelmagix.shop.evil.example', 'www.pixelmagix.shop']) {
        const response = await handleRequest(new Request(`https://${host}/`), noOrigin);
        assert.equal(response.status, 404);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal(response.headers.get('location'), null);
    }
});

test('geo retains GB and other countries, returning no identifying metadata', async () => {
    for (const [country, expected] of [[' gb ', 'GB'], ['RO', 'RO'], ['US', 'US']]) {
        const response = await handleRequest(requestFor('/geo.json', {}, country), noOrigin);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { country: expected });
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(response.headers.get('access-control-allow-origin'), null);
    }
});

test('geo rejects malformed metadata and ignores caller-controlled country inputs', async () => {
    for (const country of [undefined, null, 123, '', 'GB<script>', 'USA', 'G\r\nB', '<>']) {
        const request = requestFor('/geo.json?country=GB', {
            headers: { 'CF-IPCountry': 'GB', 'X-Country': 'GB' }
        }, country);
        const response = await handleRequest(request, noOrigin);
        assert.deepEqual(await response.json(), { country: null });
    }
});

test('geo HEAD has the same metadata headers and an empty body', async () => {
    const response = await handleRequest(requestFor('/geo.json', { method: 'HEAD' }, 'GB'), noOrigin);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(await response.text(), '');
});

test('geo does not accept writes or expose CORS access on unsupported methods', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
        const response = await handleRequest(requestFor('/geo.json', { method }, 'GB'), noOrigin);
        assert.equal(response.status, 405);
        assert.equal(response.headers.get('allow'), 'GET, HEAD');
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal(response.headers.get('access-control-allow-origin'), null);
        assert.deepEqual(await response.json(), { error: 'Method not allowed' });
    }
});

test('HTML proxy preserves the origin body, cache validators and status while adding defenses', async () => {
    const request = requestFor('/missing-page');
    const response = await handleRequest(request, async forwarded => {
        assert.equal(forwarded.url, request.url);
        assert.equal(forwarded.redirect, 'manual');
        return new Response('<h1>Existing page</h1>', {
            status: 404,
            headers: { 'content-type': 'text/html; charset=utf-8', etag: '"original"', 'cache-control': 'max-age=600' }
        });
    });
    assert.equal(response.status, 404);
    assert.equal(await response.text(), '<h1>Existing page</h1>');
    assert.equal(response.headers.get('etag'), '"original"');
    assert.equal(response.headers.get('cache-control'), 'max-age=600');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.match(response.headers.get('permissions-policy'), /camera=\(\)/);
    assert.equal(response.headers.get('strict-transport-security'), 'max-age=86400');
    assert.equal(response.headers.get('content-security-policy'), pageContentSecurityPolicy);
});

test('binary assets stream unchanged and keep cache/content headers', async () => {
    const bytes = new Uint8Array([0, 255, 10, 33, 127]);
    const response = await handleRequest(requestFor('/background.webp'), async () => new Response(bytes, {
        headers: { 'content-type': 'image/webp', 'content-length': '5', 'cache-control': 'max-age=600' }
    }));
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
    assert.equal(response.headers.get('content-length'), '5');
    assert.equal(response.headers.get('cache-control'), 'max-age=600');
    assert.equal(response.headers.get('content-security-policy'), null);
});

test('origin redirects are returned without following them or changing their destination', async () => {
    let originCalls = 0;
    const response = await handleRequest(requestFor('/legacy'), async request => {
        originCalls += 1;
        assert.equal(request.redirect, 'manual');
        return new Response(null, { status: 301, headers: { location: '/new-location' } });
    });
    assert.equal(originCalls, 1);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), '/new-location');
});

test('HEAD and conditional 304 origin responses retain their empty bodies and validators', async () => {
    for (const [method, status] of [['HEAD', 200], ['GET', 304]]) {
        const response = await handleRequest(requestFor('/style.css', {
            method, headers: { 'if-none-match': '"v1"' }
        }), async request => {
            assert.equal(request.method, method);
            assert.equal(request.headers.get('if-none-match'), '"v1"');
            return new Response(null, { status, headers: { etag: '"v1"' } });
        });
        assert.equal(response.status, status);
        assert.equal(response.headers.get('etag'), '"v1"');
        assert.equal(await response.text(), '');
    }
});

test('existing stronger origin HSTS and CSP policies are preserved', async () => {
    const response = await handleRequest(requestFor('/'), async () => new Response('page', {
        headers: {
            'content-type': 'text/html',
            'strict-transport-security': 'max-age=31536000',
            'content-security-policy': "object-src 'none'"
        }
    }));
    assert.equal(response.headers.get('strict-transport-security'), 'max-age=31536000');
    assert.equal(response.headers.get('content-security-policy'), `object-src 'none', ${pageContentSecurityPolicy}`);
});

test('origin failures return a generic non-cacheable response without error details', async () => {
    const response = await handleRequest(requestFor('/'), async () => { throw new Error('private upstream error'); });
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { error: 'Temporarily unavailable' });
});

test('HTML policy blocks inline executable code while retaining required integrations', () => {
    const directives = new Map(pageContentSecurityPolicy.split('; ').map(value => {
        const [name, ...sources] = value.split(' ');
        return [name, sources];
    }));
    assert.ok(!directives.get('script-src').includes("'unsafe-inline'"));
    assert.ok(!directives.get('script-src').includes("'unsafe-eval'"));
    assert.deepEqual(directives.get('script-src-attr'), ["'none'"]);
    assert.deepEqual(directives.get('frame-ancestors'), ["'none'"]);
    assert.deepEqual(directives.get('form-action'), ["'none'"]);
    assert.ok(directives.get('connect-src').includes('https://api.emailjs.com'));
    assert.ok(directives.get('script-src').includes('https://cdn.jsdelivr.net/npm/intl-tel-input@25.12.4/build/js/utils.js'));
    assert.ok(directives.get('frame-src').includes('https://www.youtube.com'));
});
