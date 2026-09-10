import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');

// Run the production blocks with small DOM doubles; no SDK calls or network requests.
function blockBetween(start, end) {
    const first = source.indexOf(start);
    const last = source.indexOf(end, first + start.length);
    assert.ok(first >= 0 && last > first, `Production block exists: ${start}`);
    return source.slice(first, last);
}

function element(document, values = {}) {
    const listeners = new Map();
    const attributes = new Map();
    const classes = new Set();
    const node = {
        value: '', style: {}, textContent: '', inert: false, isConnected: true,
        maxLength: -1, disabled: false, required: false, type: 'text', validationMessage: '',
        ...values,
        classList: {
            add: (...names) => names.forEach(name => classes.add(name)),
            remove: (...names) => names.forEach(name => classes.delete(name)),
            contains: name => classes.has(name),
            toggle(name, state = !classes.has(name)) {
                if (state) classes.add(name); else classes.delete(name);
                return state;
            }
        },
        addEventListener(type, handler) {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type).push(handler);
        },
        async emit(type, details = {}) {
            const event = { target: node, preventDefault() {}, ...details };
            await Promise.all((listeners.get(type) || []).map(handler => handler(event)));
        },
        setAttribute: (name, value) => attributes.set(name, String(value)),
        getAttribute: name => attributes.get(name) ?? null,
        setCustomValidity(message) { node.validationMessage = message; },
        get validity() {
            return {
                valueMissing: node.required && !node.value,
                typeMismatch: node.type === 'email' && Boolean(node.value) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(node.value)
            };
        },
        checkValidity() {
            return !node.validationMessage && !node.validity.valueMissing && !node.validity.typeMismatch;
        },
        focus() { document.activeElement = node; },
        scrollIntoView(options) { node.lastScroll = options; },
        getClientRects: () => [1],
        closest() {
            for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
                if (ancestor.inert) return ancestor;
            }
            return null;
        }
    };
    return node;
}

function contactHarness({ send, phonePlugin = null, sdk = true } = {}) {
    const document = {};
    const fields = Object.fromEntries(['nume', 'telefon', 'email', 'tara', 'furnizor', 'mesaj', 'website']
        .map(id => [id, element(document)]));
    Object.assign(fields.nume, { value: 'Test local', required: true, maxLength: 120 });
    Object.assign(fields.tara, { value: 'România', required: true, maxLength: 100 });
    Object.assign(fields.email, { value: 'test@example.com', type: 'email', maxLength: 254 });
    fields.telefon.maxLength = 40;
    fields.furnizor.maxLength = 160;
    fields.mesaj.maxLength = 3000;
    const button = element(document);
    const status = element(document);
    const statusText = element(document);
    status.querySelector = selector => selector === 'span' ? statusText : null;
    const form = element(document);
    form.querySelector = () => button;
    form.checkValidity = () => Object.values(fields).every(field => field.checkValidity());
    form.reportValidity = () => { form.reportCount = (form.reportCount || 0) + 1; };
    form.reset = () => { Object.values(fields).forEach(field => { field.value = ''; }); };
    document.getElementById = id => fields[id];
    document.querySelector = selector => selector === '.contact-form form' ? form : selector === '.form-status' ? status : null;
    const calls = [];
    const emailjs = sdk ? { init() {}, send(...args) { calls.push(args); return send?.(...args) ?? Promise.resolve(); } } : undefined;
    const context = {
        document, window: { emailjs, intlTelInput: phonePlugin ? () => phonePlugin : undefined },
        console: { warn() {}, error() {} }, Intl, Date
    };
    vm.runInNewContext('const prefersReducedMotion = true;\n' + blockBetween(
        '// Require at least one contact method in the form + send via EmailJS',
        '// Newsletter subscription via EmailJS'
    ), context);
    return { fields, button, status, statusText, form, calls, submit: () => form.emit('submit') };
}

test('contact rejects empty contact details, invalid email, phone text, and whitespace names', async () => {
    for (const invalid of [
        { telefon: '', email: '' },
        { telefon: '', email: 'invalid' },
        { telefon: 'not a number', email: 'valid@example.com' },
        { telefon: '123', email: '' },
        { nume: '   ' },
        { tara: '   ' }
    ]) {
        const h = contactHarness();
        for (const [key, value] of Object.entries(invalid)) h.fields[key].value = value;
        await h.submit();
        assert.equal(h.calls.length, 0, JSON.stringify(invalid));
        assert.equal(h.form.reportCount, 1);
    }
});

test('contact ignores the honeypot and offers a fallback if the SDK is unavailable', async () => {
    const trapped = contactHarness();
    trapped.fields.website.value = 'filled by bot';
    await trapped.submit();
    assert.equal(trapped.calls.length, 0);
    const unavailable = contactHarness({ sdk: false });
    await unavailable.submit();
    assert.equal(unavailable.calls.length, 0);
    assert.equal(unavailable.status.classList.contains('error'), true);
    assert.match(unavailable.statusText.textContent, /WhatsApp/);
    assert.equal(unavailable.button.disabled, false);
});

test('contact allows only one in-flight submission and restores the form after success', async () => {
    let finish;
    const pending = new Promise(resolve => { finish = resolve; });
    const h = contactHarness({ send: () => pending });
    const first = h.submit();
    await h.submit();
    assert.equal(h.calls.length, 1);
    assert.equal(h.button.disabled, true);
    assert.equal(h.form.getAttribute('aria-busy'), 'true');
    assert.equal(h.calls[0][2].email, 'test@example.com');
    finish();
    await first;
    assert.equal(h.form.getAttribute('aria-busy'), 'false');
    assert.equal(h.button.disabled, false);
    assert.equal(h.fields.nume.value, '');
    assert.match(h.statusText.textContent, /trimis/);
    assert.equal(h.status.classList.contains('error'), false);
    assert.equal(h.status.lastScroll.behavior, 'auto');
});

test('contact preserves entered data and permits retry after an SDK failure', async () => {
    let fail = true;
    const h = contactHarness({ send: () => fail ? Promise.reject(new Error('Mock failure')) : Promise.resolve() });
    await h.submit();
    assert.equal(h.button.disabled, false);
    assert.equal(h.form.getAttribute('aria-busy'), 'false');
    assert.equal(h.fields.nume.value, 'Test local');
    assert.equal(h.status.classList.contains('error'), true);
    fail = false;
    await h.submit();
    assert.equal(h.calls.length, 2);
    assert.equal(h.status.classList.contains('error'), false);
});

test('phone fallback preserves the selected calling code when optional utilities are unavailable', async () => {
    const h = contactHarness({ phonePlugin: { getSelectedCountryData: () => ({ dialCode: '40' }), setNumber() {} } });
    h.fields.telefon.value = '0712 345 678';
    h.fields.email.value = '';
    await h.submit();
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0][2].telefon, '+40 0712 345 678');
    const international = contactHarness({ phonePlugin: { getSelectedCountryData: () => ({ dialCode: '40' }), setNumber() {} } });
    international.fields.telefon.value = '+44 7700 900123';
    await international.submit();
    assert.equal(international.calls[0][2].telefon, '+44 7700 900123');
});

test('correcting an overlong optional field clears the error and allows a subsequent submission', async () => {
    for (const id of ['furnizor', 'mesaj']) {
        const h = contactHarness();
        h.fields[id].value = 'x'.repeat(h.fields[id].maxLength + 1);
        await h.submit();
        assert.equal(h.calls.length, 0);
        h.fields[id].value = 'Corectat';
        await h.fields[id].emit('input');
        await h.submit();
        assert.equal(h.calls.length, 1, `${id} should be usable after correcting its length`);
    }
});

test('video URLs require HTTPS, an exact allowed YouTube host, and a valid video identifier', () => {
    const context = { URL };
    vm.runInNewContext(blockBetween('const getYoutubeEmbedUrl =', 'const openTrailer =') + '\nglobalThis.toEmbed = getYoutubeEmbedUrl;', context);
    const id = '5PSNL1qE6VY';
    for (const url of [`https://youtu.be/${id}`, `https://www.youtube.com/watch?v=${id}`, `https://m.youtube.com/watch?v=${id}`, `https://youtube.com/embed/${id}`]) {
        assert.equal(context.toEmbed(url), `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`);
    }
    for (const url of ['', 'not a URL', `http://youtu.be/${id}`, `https://youtube.com.evil.example/watch?v=${id}`, `https://fake-youtu.be/${id}`, `https://youtube.com@evil.example/watch?v=${id}`, 'javascript:alert(1)', 'https://youtube.com/watch?v=too-short', 'https://youtu.be/5PSNL1qE6VY%22']) {
        assert.equal(context.toEmbed(url), '', url);
    }
});

function dialogHarness() {
    const document = { activeElement: null };
    const trigger = element(document);
    const first = element(document);
    const last = element(document);
    const dialog = element(document, { inert: true });
    first.parentElement = dialog;
    last.parentElement = dialog;
    dialog.querySelector = () => first;
    dialog.querySelectorAll = () => [first, last];
    dialog.contains = node => node === first || node === last;
    const backdrop = element(document);
    const content = element(document);
    const alreadyInert = element(document, { inert: true });
    document.body = { style: { overflow: 'auto' }, children: [content, dialog, backdrop, alreadyInert] };
    document.activeElement = trigger;
    document.addEventListener = (type, handler) => { if (type === 'keydown') document.keydown = handler; };
    const context = { document };
    vm.runInNewContext(blockBetween('const dialogStates =', '// Pricing toggle functionality') + '\nglobalThis.toggleDialog = setDialogOpen;', context);
    return { document, dialog, backdrop, content, alreadyInert, trigger, first, last, toggle: context.toggleDialog };
}

test('dialog opening isolates the background and closing restores its prior focus, inert state, and scrolling', () => {
    const h = dialogHarness();
    h.toggle(h.dialog, true, h.backdrop);
    assert.equal(h.document.activeElement, h.first);
    assert.equal(h.content.inert, true);
    assert.equal(h.backdrop.inert, false);
    assert.equal(h.dialog.inert, false);
    assert.equal(h.dialog.getAttribute('aria-hidden'), 'false');
    assert.equal(h.document.body.style.overflow, 'hidden');
    h.toggle(h.dialog, true, h.backdrop);
    h.toggle(h.dialog, false);
    assert.equal(h.document.activeElement, h.trigger);
    assert.equal(h.content.inert, false);
    assert.equal(h.alreadyInert.inert, true);
    assert.equal(h.document.body.style.overflow, 'auto');
    assert.equal(h.dialog.inert, true);
    assert.equal(h.dialog.getAttribute('aria-hidden'), 'true');
    h.toggle(h.dialog, false);
    assert.equal(h.document.body.style.overflow, 'auto');
});

test('dialog keyboard navigation wraps in both directions and recovers outside focus', () => {
    const h = dialogHarness();
    h.toggle(h.dialog, true);
    let prevented = 0;
    const key = shiftKey => h.document.keydown({ key: 'Tab', shiftKey, preventDefault: () => { prevented++; } });
    key(true);
    assert.equal(h.document.activeElement, h.last);
    key(false);
    assert.equal(h.document.activeElement, h.first);
    h.document.activeElement = h.trigger;
    key(false);
    assert.equal(h.document.activeElement, h.first);
    assert.equal(prevented, 3);
});

test('sidebar closes at the desktop breakpoint and restores its dialog state', async () => {
    const h = dialogHarness();
    const hamburger = element(h.document);
    const closeButton = element(h.document);
    const link = element(h.document);
    h.dialog.querySelector = () => closeButton;
    h.dialog.querySelectorAll = () => [link];
    h.document.querySelector = selector => ({ '.hamburger': hamburger, '.sidebar': h.dialog, '.overlay': h.backdrop })[selector];
    let mediaQuery;
    let onResize;
    const context = {
        document: h.document,
        window: { matchMedia(query) { mediaQuery = query; return { addEventListener(type, handler) { onResize = handler; } }; } },
        setDialogOpen: h.toggle
    };
    vm.runInNewContext(blockBetween('// Sidebar functionality', '// Navbar scroll behaviour'), context);
    assert.equal(mediaQuery, '(min-width: 1101px)');
    await hamburger.emit('click');
    assert.equal(h.dialog.classList.contains('active'), true);
    assert.equal(h.content.inert, true);
    onResize({ matches: true });
    assert.equal(h.dialog.classList.contains('active'), false);
    assert.equal(h.backdrop.classList.contains('active'), false);
    assert.equal(h.content.inert, false);
    assert.equal(hamburger.getAttribute('aria-expanded'), 'false');
    assert.equal(h.document.body.style.overflow, 'auto');
    await hamburger.emit('click');
    await h.dialog.emit('keydown', { key: 'Escape' });
    assert.equal(h.dialog.classList.contains('active'), false);
});

test('movie auto-scroll cancels timers while paused and never starts for hidden, reduced-motion, or interacting visitors', () => {
    const intervals = new Map();
    const timeouts = new Map();
    let serial = 0;
    const context = {
        document: { hidden: false, activeElement: null, querySelector: () => null },
        setInterval: fn => { const id = ++serial; intervals.set(id, fn); return id; },
        clearInterval: id => intervals.delete(id),
        setTimeout: fn => { const id = ++serial; timeouts.set(id, fn); return id; },
        clearTimeout: id => timeouts.delete(id)
    };
    vm.runInNewContext(`
        let prefersReducedMotion = false, recentIsVisible = true, recentUserPaused = false, recentIsHovered = false;
        let recentAutoTimer = null, recentAutoResumeTimer = null, recentIsAutoPaused = false;
        let recentIsDragging = false, recentIsRepositioning = false;
        const recentMoviesWindow = { scrollLeft: 0, contains: () => false };
        const recentAutoStepPx = 0.54, recentAutoIntervalMs = 30;
        const checkRecentBoundaries = () => {}, syncRecentIndex = () => {};
        ${blockBetween('const pauseRecentAuto =', 'const scrollRecentMoviesBy =')}
        globalThis.controls = { start: startRecentAuto, pause: pauseRecentAuto, schedule: scheduleRecentAuto };
    `, context);
    context.controls.start();
    context.controls.start();
    assert.equal(intervals.size, 1);
    context.controls.schedule();
    assert.equal(timeouts.size, 1);
    context.controls.pause();
    assert.equal(intervals.size, 0);
    assert.equal(timeouts.size, 0);
    for (const flag of ['prefersReducedMotion', '!recentIsVisible', 'recentUserPaused', 'recentIsHovered', 'document.hidden']) {
        const name = flag.replace('!', '');
        vm.runInNewContext(`${name} = ${!flag.startsWith('!')};`, context);
        context.controls.start();
        assert.equal(intervals.size, 0, flag);
        vm.runInNewContext(`${name} = ${flag.startsWith('!')};`, context);
    }
    vm.runInNewContext('recentMoviesWindow.contains = () => true;', context);
    context.controls.start();
    assert.equal(intervals.size, 0, 'Keyboard focus inside the movie list pauses auto-scroll');
    vm.runInNewContext('recentMoviesWindow.contains = () => false;', context);
    context.document.querySelector = () => ({});
    context.controls.start();
    assert.equal(intervals.size, 0, 'Open video dialog pauses auto-scroll');
});
