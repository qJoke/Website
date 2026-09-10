# Cloudflare site security and geo endpoint

`geo-worker.mjs` keeps the existing country endpoint and wraps the GitHub Pages
origin with HTTPS redirects and response headers. The worker name stays
`pixelmagix-geo` to update the existing deployment instead of creating another.
The files are prepared locally; editing them does not update the public site.

## Route and origin

Both Wrangler configs now propose the exact apex route:

```text
pixelmagix.shop/*
```

This replaces the former `pixelmagix.shop/geo.json` route. GitHub Pages remains
the origin, its DNS records stay proxied through Cloudflare, and `CNAME` stays
unchanged. Use a **Worker Route**, not a Worker Custom Domain: the wrapper needs
the existing origin behind the route. All origin bodies are streamed unchanged;
status codes, redirects, cache directives and validators are retained.

The worker accepts only `pixelmagix.shop`. The `www` hostname was not in the
existing Worker configuration and returned 403 during the audit. It is not
silently added to this route. Check its intended DNS/canonical redirect in
Cloudflare separately before changing that hostname.

## Behavior

- HTTP requests receive a 308 redirect to the same path/query on HTTPS.
- `/geo.json` uses only trusted `request.cf.country` and returns `{ "country": "GB" }`
  or another two-letter country, with invalid/missing metadata returning `null`.
  GBP remains limited to GB in the browser; other countries/failures retain EUR.
- Geo accepts GET and HEAD, returns no response body for HEAD, rejects other
  methods with 405, and remains `Cache-Control: no-store`. It never returns IP,
  city or other location details. No cross-origin API access is added.
- Origin responses get missing `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and
  `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`.
  Existing origin headers are preserved if already set.
- HSTS starts at `max-age=86400` (one day) on the apex; stronger origin HSTS is
  preserved. `includeSubDomains` and `preload` are not added. Reassess a longer
  duration only after successful production verification.
- HTML responses additionally receive a Content Security Policy. A future
  origin CSP is retained too; browsers enforce both policies.
- Origin network failures produce a generic non-cacheable 502 response without
  upstream error details. This does not change Cloudflare's account-level
  availability limits or Worker failure-mode settings.

## Content Security Policy compatibility

The exported `pageContentSecurityPolicy` pins the current AOS, EmailJS,
intl-tel-input and Font Awesome CDN resource paths. It permits Google Fonts,
the existing external image hosts, country-flag images, EmailJS's API and
`www.youtube.com` embeds. Same-origin Cloudflare email obfuscation scripts
observed on the live site remain allowed. Cloudflare Insights was not observed
and is not added speculatively.

Inline JavaScript and JavaScript URLs are blocked. Deploy the accompanying
`script.js` change that handles failed movie posters through an event listener
before enabling this CSP; the old generated `onerror` attribute would be blocked.
Inline CSS remains allowed for the existing HTML styles, animations and widgets.
YouTube receives an origin referrer, which its player needs; do not replace the
referrer policy with `no-referrer` without testing trailer playback.

Native form submissions are blocked (`form-action 'none'`), because the contact
and newsletter forms submit using EmailJS JavaScript/fetch. This also prevents
native fallback from sending form data to static hosting if JavaScript fails.
This directive does not restrict the authorized EmailJS fetch request.

Keep CDN version/path changes and this policy synchronized. Test the contact
form and newsletter with mocked network responses so verification does not send
messages. Test actual delivery only when separately authorized.

## Local checks

From the repository root, run:

```powershell
node --test tests/security-worker.test.mjs
```

Tests cover HTTPS redirects, host validation, country metadata and spoofed
inputs, GET/HEAD/405 behavior, HTML/asset forwarding, cache headers, existing
policies, conditional responses, and redacted failures. They mock origin fetches
and do not contact or deploy to Cloudflare. A static Python preview alone cannot
verify response headers; test through a local Worker-compatible preview too.

## Production rollout, after publication approval

1. Review/deploy the corresponding static HTML/JavaScript changes first and
   confirm that CDN integrity checks pass, poster fallbacks work, and there are
   no inline executable handlers left. Keep the previous site/worker revision
   available for rollback.
2. Confirm the apex has a valid edge/origin certificate and the zone uses
   **Full (strict)** TLS. Keep proxied GitHub Pages DNS and the existing `CNAME`.
   Review current Worker routes, plan limits and failure mode: the new route
   invokes the Worker for all apex requests. Cloudflare Transform Rules may be
   preferable if the account's Worker quota is unsuitable.
3. Deploy the reviewed existing worker with the changed `pixelmagix.shop/*`
   route. Verify the effective route list has no obsolete, more-specific route
   overriding the intended behavior. Do not deploy this configuration as a
   Custom Domain or expand it to unrelated hostnames.
4. Enable Cloudflare **Always Use HTTPS** for the intended zone/host scope as
   an edge safeguard; verify it does not conflict with existing redirect rules.
   This is an account change, separate from the local source changes.
5. Check HTTP-to-HTTPS for `/`, the privacy page and assets; check GET and HEAD on
   `/geo.json`; verify a GB request still shows GBP and a non-GB request EUR.
   Confirm CSP/HSTS/nosniff/frame/referrer/permissions headers are present on
   the final HTML responses and no CSP violations affect the desktop/mobile UI.
6. Check contact validation, phone country picker, newsletter, WhatsApp,
   trailers and privacy navigation. Do not claim mail delivery was verified
   unless a separately authorized real delivery succeeds.

## Audit findings and account checks (2026-09-10)

The public apex returned HTTP **200 without an HTTPS redirect**. HTTPS on the
main and privacy pages worked, but the response headers listed above were
absent. The geo endpoint already returned only country with no-store/nosniff.
The four pinned npm packages (AOS 2.3.1, EmailJS browser 4.4.1,
intl-tel-input 25.12.4 and Font Awesome Free 6.7.2) returned no listed
vulnerabilities in an OSV batch query that day. That is a database snapshot,
not a guarantee against unknown vulnerabilities or compromised CDN content;
keep Subresource Integrity checks and recheck on upgrades.

EmailJS's browser public key is intentionally public, not a server secret.
The public site cannot prove the account's origin allowlist, template recipient
settings, CAPTCHA, quotas or abuse controls. In the EmailJS dashboard, review
the exact HTTPS origin allowlist and ensure user input cannot choose arbitrary
recipients. Assess existing spam protection/CAPTCHA there. A browser honeypot,
validation or duplicate-submit guard alone cannot stop direct API abuse.
Never add an EmailJS private key to static HTML or JavaScript.

Account access controls, Cloudflare/GitHub/EmailJS MFA, DNS ownership, origin
TLS mode, email template behavior and downloaded APK/EXE signing are outside
what a public static-site/source audit can establish. No account settings,
form deliveries, binary downloads or production deployments were changed here.

References: [Cloudflare Worker Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/),
[Cloudflare origin proxy example](https://developers.cloudflare.com/workers/examples/modify-response/),
[MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy),
[EmailJS abuse controls](https://www.emailjs.com/docs/faq/does-emailjs-expose-my-account-to-spam/),
[EmailJS SDK options](https://www.emailjs.com/docs/sdk/options/).
