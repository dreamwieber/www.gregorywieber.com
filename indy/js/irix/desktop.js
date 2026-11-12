// A toy IRIX desktop: window manager, Toolchest, desktop icons, boot sequence,
// and a canvas "mimic" of the screen that the 3D monitor shows when you step back.
import { iconURL, iconImage, iconFor } from './icons.js';
import { FS, LINKS } from '../site.js';
import { drawCubeLogo } from '../scene/textures.js';
import { makeApps } from './apps.js';

// The stock IRIX desktop: teal-green with a dense one-pixel speckle. Painted once into a small repeating tile.
let speckle = null;
function speckleTile() {
  if (speckle) return speckle;
  const N = 160, c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d'), img = ctx.createImageData(N, N), d = img.data;
  let seed = 90210;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const tones = [[0.07, [20, 52, 56]], [0.24, [38, 88, 88]], [0.62, [60, 124, 120]], [0.82, [74, 140, 132]], [0.95, [104, 164, 150]], [1.01, [140, 190, 172]]];
  let run = null;
  for (let k = 0; k < N * N; k++) {
    let t = run;
    run = null;
    if (!t) {
      const r = rnd();
      t = tones.find(([p]) => r < p)[1];
      if (rnd() < 0.22) run = t; // short horizontal clumps, as in the original dither
    }
    const j = (rnd() - 0.5) * 10;
    d[k * 4] = t[0] + j; d[k * 4 + 1] = t[1] + j; d[k * 4 + 2] = t[2] + j; d[k * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  speckle = { canvas: c, url: c.toDataURL('image/png') };
  return speckle;
}

const BACKGROUNDS = [
  { name: 'IRIX speckle', color: '#3c7c78', tile: true },
  { name: 'Indigo', color: '#4d6f99' },
  { name: 'Teal weave', color: '#2f7f86' },
  { name: 'Granite', color: '#7b7a85' },
  { name: 'Clery Farm', color: '#51683f', image: 'assets/tex/cleryfarm.jpg' },
  { name: 'Lorenz', color: '#101018', image: 'assets/tex/lorenz-2.jpg' },
  { name: 'Midnight', color: '#1d2440' },
];

export function createDesktop(opts) {
  const { mount, audio } = opts;
  let W = 1024, H = 768, scale = 1, compact = false;
  let state = 'on'; // off | boot | on
  let bootStage = 0, bootTimers = [];
  let z = 10, bgIndex = 0;
  let welcomed = false, visible = false;
  const wins = [];
  const pending = [];

  mount.className = 'irix';
  mount.innerHTML = `
    <div class="ix-bg"></div>
    <div class="ix-icons"></div>
    <div class="ix-toolchest"></div>
    <div class="ix-windows"></div>
    <div class="ix-menus"></div>
    <canvas class="ix-boot" width="1024" height="768"></canvas>`;
  const $ = (s) => mount.querySelector(s);
  const bgEl = $('.ix-bg'), iconsEl = $('.ix-icons'), tcEl = $('.ix-toolchest'), winsEl = $('.ix-windows'), menusEl = $('.ix-menus');
  const canvas = $('.ix-boot');
  const ctx = canvas.getContext('2d');
  try { bgIndex = +(localStorage.getItem('indy.bg') || 0) % BACKGROUNDS.length; } catch { /* ignore */ }
  let bgImage = null;

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const external = (url) => { audio.open(); if (url.startsWith('mailto:')) location.href = url; else window.open(url, '_blank', 'noopener'); };

  // ------------------------------------------------------------- background
  function setBackground(i) {
    bgIndex = (i + BACKGROUNDS.length) % BACKGROUNDS.length;
    const b = BACKGROUNDS[bgIndex];
    bgEl.style.backgroundColor = b.color;
    bgEl.style.backgroundImage = b.tile ? `url(${speckleTile().url})` : b.image ? `url(${b.image})` : 'none';
    bgEl.style.backgroundSize = b.tile ? 'auto' : '';
    bgEl.style.backgroundRepeat = b.tile ? 'repeat' : '';
    bgEl.style.imageRendering = b.tile ? 'pixelated' : '';
    bgImage = null;
    if (b.image) { const im = new Image(); im.onload = () => { bgImage = im; paint(); }; im.src = b.image; }
    try { localStorage.setItem('indy.bg', String(bgIndex)); } catch { /* ignore */ }
    paint();
  }

  // ------------------------------------------------------------------ menus
  let menuOpen = null;
  function closeMenus() { menusEl.innerHTML = ''; tcEl.querySelectorAll('.open').forEach((r) => r.classList.remove('open')); menuOpen = null; }
  function showMenu(items, x, y, key) {
    closeMenus();
    const m = el('div', 'ix-menu');
    for (const it of items) {
      if (it === '-') { m.appendChild(el('div', 'ix-sep')); continue; }
      const row = el('div', 'ix-mi' + (it.off ? ' off' : ''), `<span>${it.label}</span>${it.hint ? `<small>${it.hint}</small>` : ''}`);
      row.addEventListener('click', (ev) => { ev.stopPropagation(); closeMenus(); audio.click(); it.fn && it.fn(); });
      m.appendChild(row);
    }
    menusEl.appendChild(m);
    const mw = m.offsetWidth, mh = m.offsetHeight;
    m.style.left = `${Math.max(2, Math.min(x, W - mw - 2))}px`;
    m.style.top = `${Math.max(2, Math.min(y, H - mh - 2))}px`;
    menuOpen = key || true;
    audio.click();
  }
  mount.addEventListener('pointerdown', (ev) => {
    if (menuOpen && !ev.target.closest('.ix-menu') && !ev.target.closest('.ix-tc-row')) closeMenus();
  });

  // -------------------------------------------------------------- toolchest
  const ext = (label, url) => ({ label, hint: '↗', fn: () => external(url) });
  const TOOLCHEST = [
    ['Desktop', () => [
      { label: 'Open Home Directory', fn: () => launch('fm', FS) },
      { label: 'Open Unix Shell', fn: () => launch('console') },
      '-',
      { label: opts.isNight() ? 'Good Morning (day)' : 'Lights Out (night)', fn: () => opts.onNight(!opts.isNight()) },
      { label: `Background: ${BACKGROUNDS[(bgIndex + 1) % BACKGROUNDS.length].name}`, fn: () => setBackground(bgIndex + 1) },
      '-',
      { label: 'Step Away From the Desk', hint: 'Esc', fn: () => opts.onExit() },
    ]],
    ['Selected', () => [
      { label: selected ? `Open “${selected.name}”` : 'Open', off: !selected, fn: () => selected && selected.action() },
      { label: 'Get Info', off: !selected, fn: () => selected && dialog('Get Info', `<b>${selected.name}</b><br>${selected.info || 'An icon on the desktop.'}`) },
    ]],
    ['Internet', () => [
      { label: 'Open Web Browser', fn: () => launch('page', { url: '../index.html', title: 'Gregory Wieber' }) },
      '-',
      ext('dreamwieber on YouTube', LINKS.dreamwieber),
      ext('Gregory Builds on YouTube', LINKS.builds),
      ext('Apposite', LINKS.apposite),
      ext('Instagram', LINKS.instagram),
      ext('Patreon', LINKS.patreon),
      '-',
      ext('Mail Gregory', LINKS.email),
    ]],
    ['Find', () => [
      { label: 'File System Navigator', hint: 'fsn', fn: () => launch('fsn') },
      { label: 'An Icon…', fn: () => launch('fm', FS) },
      { label: 'Videos', fn: () => launch('fm', FS.children.find((c) => c.name === 'videos')) },
    ]],
    ['Apposite Products', () => [
      { label: 'Soft Break (IRIX port)', hint: 'play', fn: () => launch('softbreak') },
      '-',
      { label: 'Soft Break', fn: () => launch('app', 'softbreak') },
      { label: 'Metaballs', fn: () => launch('app', 'metaballs') },
      { label: 'Vibescape', fn: () => launch('app', 'vibescape') },
      { label: 'Polychord', fn: () => launch('app', 'polychord') },
    ]],
    ['System', () => [
      { label: 'About This System', fn: () => launch('about') },
      { label: audio.muted ? 'Audio: Unmute' : 'Audio: Mute', fn: () => { audio.setMuted(!audio.muted); document.body.classList.toggle('muted', audio.muted); } },
      '-',
      { label: 'Restart System', fn: () => { powerOff(); setTimeout(() => { audio.chime(); powerOn(); }, 900); } },
      { label: 'Shut Down System', fn: () => opts.onShutdown() },
    ]],
    ['Help', () => [
      { label: 'QuickStart', fn: () => launch('readme') },
      { label: 'About This Page', fn: () => dialog('About This Page', 'A love letter to the Silicon Graphics Indy, drawn in WebGL by Gregory Wieber.<br><br>Not affiliated with Silicon Graphics. Everything on screen is built from scratch — no ROMs, no emulation.') },
      ext('gregorywieber.com', LINKS.home),
    ]],
  ];
  tcEl.appendChild(el('div', 'ix-tc-title', 'Toolchest'));
  TOOLCHEST.forEach(([name, items]) => {
    const row = el('div', 'ix-tc-row', `<span>${name}</span>`);
    row.addEventListener('click', () => {
      if (menuOpen === name) { closeMenus(); return; }
      const r = row.getBoundingClientRect(), m = mount.getBoundingClientRect();
      const x = (r.left - m.left) / scale, y = (r.top - m.top) / scale;
      if (compact) showMenu(items(), x, y + r.height / scale, name);
      else showMenu(items(), x + r.width / scale - 2, y, name);
      row.classList.add('open');
    });
    tcEl.appendChild(row);
  });

  // ---------------------------------------------------------- desktop icons
  let selected = null;
  const dir = (n) => FS.children.find((c) => c.name === n);
  const ICONS = [
    { name: 'gregory', icon: 'home', info: 'Home directory: /usr/people/gregory', action: () => launch('fm', FS) },
    { name: 'fsn', icon: 'fsn', info: 'File System Navigator — the whole site in 3D.', action: () => launch('fsn') },
    { name: 'Soft Break', icon: 'softbreak', info: 'A brick breaker made of jelly. IRIX port.', action: () => launch('softbreak') },
    { name: 'videos', icon: 'movie', info: 'dreamwieber on YouTube', action: () => launch('fm', dir('videos')) },
    { name: 'apps', icon: 'app', info: 'Apposite apps', action: () => launch('fm', dir('apps')) },
    { name: 'netscape', icon: 'netscape', info: 'Browse gregorywieber.com', action: () => launch('page', { url: '../index.html', title: 'Gregory Wieber' }) },
    { name: 'README', icon: 'text', info: 'Start here.', action: () => launch('readme') },
    { name: 'dumpster', icon: 'dumpster', info: 'Where ideas go to rest.', action: () => dialog('dumpster', 'The dumpster is empty.<br><small style="font-weight:400;font-style:normal">(All the bad ideas shipped.)</small>') },
    // not a desktop icon: the Console is an iconified window parked by the Toolchest, as on a real IRIX login
    { name: 'Console', icon: 'consoleMin', mini: true, info: 'Unix shell', action: () => launch('console') },
  ];
  ICONS.forEach((ic) => {
    const e = ic.mini
      ? el('div', 'ix-icon ix-mini', `<img src="${iconURL(ic.icon)}" alt="${ic.name}" draggable="false">`)
      : el('div', 'ix-icon', `<img src="${iconURL(ic.icon)}" alt="" draggable="false"><span>${ic.name}</span>`);
    e.addEventListener('click', () => {
      iconsEl.querySelectorAll('.sel').forEach((s) => s.classList.remove('sel'));
      e.classList.add('sel'); selected = ic;
      ic.action();
      setTimeout(() => e.classList.remove('sel'), 600);
    });
    ic.el = e; iconsEl.appendChild(e);
    iconImage(ic.icon);
  });
  function layoutIcons() {
    if (compact) {
      const cols = Math.max(3, Math.floor(W / 96)), cw = W / cols;
      ICONS.forEach((ic, i) => { ic.x = (i % cols) * cw + (cw - 92) / 2; ic.y = 52 + Math.floor(i / cols) * 92; });
    } else {
      // two columns down the right edge, dumpster in the corner like the real thing
      ICONS.forEach((ic, i) => {
        if (ic.name === 'dumpster') { ic.x = W - 108; ic.y = H - 96; return; }
        if (ic.mini) { ic.x = 222; ic.y = 12; return; }
        const col = i < 4 ? 0 : 1, row = i < 4 ? i : i - 4;
        ic.x = W - 108 - col * 104; ic.y = 20 + row * 92;
      });
    }
    ICONS.forEach((ic) => { ic.el.style.left = `${ic.x}px`; ic.el.style.top = `${ic.y}px`; });
  }

  // ---------------------------------------------------------------- windows
  function focusWin(win) {
    if (!win) return;
    wins.forEach((w) => w.el.classList.toggle('active', w === win));
    win.el.style.zIndex = ++z;
    const i = wins.indexOf(win); if (i >= 0) { wins.splice(i, 1); wins.push(win); }
    wins.forEach((w) => w.onActive && w.onActive(w === win));
  }
  function createWindow({ id, title, w = 480, h = 360, x, y, resizable = false, className = '', build, preview, onClose, onResize, onActive }) {
    const existing = id && wins.find((q) => q.id === id);
    if (existing) { focusWin(existing); return existing; }
    w = Math.min(w, W - 16); h = Math.min(h, H - 16);
    const n = wins.length;
    // keep new windows clear of the Toolchest and the iconified Console when there is room
    if (x == null) x = Math.max(8, Math.min(W - w - 8, Math.max(compact ? 8 : 306, (W - w) / 2 - 60 + n * 26)));
    if (y == null) y = Math.max(8, Math.min(H - h - 8, (H - h) / 2 - 20 + n * 22));
    const e = el('div', `ix-win opening ${className}`, `
      <div class="ix-title"><div class="ix-tb close" title="Close"></div><div class="ix-tname"></div><div class="ix-tb min" title="Roll up"></div><div class="ix-tb max" title="Maximize"></div></div>
      <div class="ix-body"></div>`);
    const win = { id, el: e, x, y, w, h, title, body: e.querySelector('.ix-body'), preview, onClose, onResize, onActive, rolled: false, maxed: null };
    const apply = () => {
      e.style.left = `${win.x}px`; e.style.top = `${win.y}px`; e.style.width = `${win.w}px`;
      e.style.height = win.rolled ? '35px' : `${win.h}px`;
      win.body.style.display = win.rolled ? 'none' : '';
    };
    win.apply = apply;
    win.setTitle = (t) => { win.title = t; e.querySelector('.ix-tname').textContent = t; };
    win.close = () => {
      const i = wins.indexOf(win); if (i < 0) return;
      wins.splice(i, 1);
      try { win.onClose && win.onClose(); } catch (err) { console.error(err); }
      e.remove(); audio.close();
      focusWin(wins[wins.length - 1]);
    };
    win.resized = () => { try { win.onResize && win.onResize(); } catch (err) { console.error(err); } };
    win.setTitle(title);
    apply();
    e.addEventListener('pointerdown', () => focusWin(win), true);
    e.querySelector('.close').addEventListener('click', (ev) => { ev.stopPropagation(); win.close(); });
    e.querySelector('.min').addEventListener('click', (ev) => { ev.stopPropagation(); win.rolled = !win.rolled; apply(); audio.click(); });
    e.querySelector('.max').addEventListener('click', (ev) => {
      ev.stopPropagation(); audio.click();
      if (win.maxed) { Object.assign(win, win.maxed); win.maxed = null; }
      else { win.maxed = { x: win.x, y: win.y, w: win.w, h: win.h }; win.x = 4; win.y = 4; win.w = W - 8; win.h = H - 8; }
      win.rolled = false; apply(); win.resized();
    });
    // drag by the title bar
    const bar = e.querySelector('.ix-title');
    bar.addEventListener('pointerdown', (ev) => {
      if (ev.target.classList.contains('ix-tb') || compact) return;
      bar.setPointerCapture(ev.pointerId);
      const sx = ev.clientX, sy = ev.clientY, ox = win.x, oy = win.y;
      const move = (m) => {
        win.x = Math.max(-win.w + 60, Math.min(W - 60, ox + (m.clientX - sx) / scale));
        win.y = Math.max(0, Math.min(H - 30, oy + (m.clientY - sy) / scale));
        apply();
      };
      const up = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up); };
      bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
    });
    if (resizable) {
      const grip = el('div', 'ix-grip');
      e.appendChild(grip);
      grip.addEventListener('pointerdown', (ev) => {
        ev.stopPropagation(); grip.setPointerCapture(ev.pointerId);
        const sx = ev.clientX, sy = ev.clientY, ow = win.w, oh = win.h;
        const move = (m) => {
          win.w = Math.max(280, Math.min(W - win.x, ow + (m.clientX - sx) / scale));
          win.h = Math.max(200, Math.min(H - win.y, oh + (m.clientY - sy) / scale));
          apply(); win.resized();
        };
        const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); };
        grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
      });
    }
    winsEl.appendChild(e);
    wins.push(win);
    setTimeout(() => e.classList.remove('opening'), 220);
    if (build) build(win.body, win);
    focusWin(win);
    audio.open();
    return win;
  }

  function dialog(title, html, buttons = [{ label: 'OK' }]) {
    return createWindow({
      title, w: 380, h: 190, id: 'dlg-' + title,
      build: (body, win) => {
        const c = document.createElement('canvas'); c.width = c.height = 96; c.style.cssText = 'width:48px;height:48px;flex:none';
        drawCubeLogo(c.getContext('2d'), 48, 48, 40, { light: '#f2f2f2', dark: '#3a3a3a', mid: '#8f8f8f' });
        const d = el('div', 'ix-dialog');
        const right = el('div', '', `<p>${html}</p>`);
        const row = el('div', 'ix-actions');
        buttons.forEach((b) => { const bt = el('button', 'ix-btn' + (b.primary ? ' primary' : ''), b.label); bt.addEventListener('click', () => { win.close(); b.fn && b.fn(); }); row.appendChild(bt); });
        right.appendChild(row); d.append(c, right); body.appendChild(d);
      },
    });
  }

  // ------------------------------------------------------------------- apps
  const desk = {
    audio, createWindow, dialog, external, showMenu, el,
    getWindow: (id) => wins.find((w) => w.id === id) || null,
    focusWindow: (w) => focusWin(w),
    night: (n) => opts.onNight(n),
    get scale() { return scale; }, get compact() { return compact; }, get W() { return W; }, get H() { return H; },
    get visible() { return visible && state === 'on'; },
    launch: (...a) => launch(...a),
    openNode,
    exit: () => opts.onExit(),
    shutdown: () => opts.onShutdown(),
  };
  const apps = makeApps(desk);
  function launch(app, arg) {
    if (state !== 'on') { pending.push([app, arg]); return null; }
    const fn = apps[app];
    if (!fn) return null;
    try { return fn(arg); } catch (err) { console.error(err); audio.error(); return dialog('Error', `${app}: ${String(err.message || err)}`); }
  }
  function openNode(node) {
    switch (node.kind) {
      case 'dir': return launch('fm', node);
      case 'text': return launch('readme', node);
      case 'app': return node.app.key === 'softbreak' ? launch('app', 'softbreak') : launch('app', node.app.key);
      case 'video': return launch('video', node.video);
      case 'page': return launch('page', { url: node.url, title: node.name });
      case 'link': return external(node.url);
      default: return null;
    }
  }

  // ------------------------------------------------- the mimic / boot canvas
  function paintDesktop() {
    const b = BACKGROUNDS[bgIndex];
    ctx.fillStyle = b.tile ? ctx.createPattern(speckleTile().canvas, 'repeat') : b.color; ctx.fillRect(0, 0, 1024, 768);
    if (bgImage) {
      const s = Math.max(1024 / bgImage.width, 768 / bgImage.height);
      ctx.drawImage(bgImage, (1024 - bgImage.width * s) / 2, (768 - bgImage.height * s) / 2, bgImage.width * s, bgImage.height * s);
    }
    const sx = 1024 / W, sy = 768 / H;
    ctx.save(); ctx.scale(sx, sy);
    const bevel = (x, y, w, h, fill = '#b4b4b4') => {
      ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#e9e9e9'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
      ctx.fillStyle = '#5e5e5e'; ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
    };
    ctx.textBaseline = 'middle';
    // icons
    for (const ic of ICONS) {
      const im = iconImage(ic.icon);
      if (ic.mini) {
        if (im.complete && im.naturalWidth) { if (compact) ctx.drawImage(im, ic.x + 17, ic.y, 58, 72); else ctx.drawImage(im, ic.x, ic.y, 72, 90); }
        continue;
      }
      if (im.complete && im.naturalWidth) ctx.drawImage(im, ic.x + 20, ic.y + 2, 52, 52);
      ctx.font = 'italic 700 13px Helvetica, Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(ic.name, ic.x + 47, ic.y + 65);
      ctx.fillStyle = '#fff'; ctx.fillText(ic.name, ic.x + 46, ic.y + 64);
    }
    // toolchest
    ctx.textAlign = 'left'; ctx.font = 'italic 700 14px Helvetica, Arial, sans-serif';
    if (compact) {
      bevel(0, 0, W, 34);
      ctx.fillStyle = '#000';
      let x = 12; for (const [name] of TOOLCHEST) { ctx.fillText(name, x, 17); x += ctx.measureText(name).width + 24; }
    } else {
      bevel(14, 12, 196, 24, '#9c9c9c'); ctx.fillStyle = '#000'; ctx.fillText('Toolchest', 24, 25);
      TOOLCHEST.forEach(([name], i) => {
        const y = 36 + i * 27; bevel(14, y, 196, 27);
        ctx.fillStyle = '#000'; ctx.fillText(name, 24, y + 14);
        ctx.fillRect(188, y + 7, 11, 13); ctx.fillStyle = '#ddd'; ctx.fillRect(189, y + 8, 9, 11);
      });
    }
    // windows, back to front
    for (const w of wins) {
      const h = w.rolled ? 35 : w.h;
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(w.x + 4, w.y + 6, w.w, h);
      bevel(w.x, w.y, w.w, h, '#bdbcb4');
      bevel(w.x + 6, w.y + 6, w.w - 12, 22, w === wins[wins.length - 1] ? '#c9c5b3' : '#9c9c9c');
      ctx.fillStyle = '#000'; ctx.font = 'italic 700 14px Helvetica, Arial, sans-serif';
      ctx.fillText(w.title, w.x + 38, w.y + 18, w.w - 100);
      if (w.rolled) continue;
      const bx = w.x + 6, by = w.y + 29, bw = w.w - 12, bh = h - 35;
      ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
      let drawn = false;
      if (w.preview) { try { drawn = w.preview(ctx, bx, by, bw, bh) !== false; } catch { drawn = false; } }
      if (!drawn) {
        ctx.fillStyle = '#f1efe6'; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        for (let yy = by + 18; yy < by + bh - 10; yy += 16) ctx.fillRect(bx + 14, yy, (bw - 28) * (0.5 + 0.5 * Math.abs(Math.sin(yy * 1.7))), 5);
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function paintBoot() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1024, 768);
    if (state === 'off' || bootStage === 0) return;
    ctx.fillStyle = bootStage >= 3 ? BACKGROUNDS[bgIndex].color : '#3d587d'; ctx.fillRect(0, 0, 1024, 768);
    if (bootStage >= 3) return;
    const x = 312, y = 300, w = 400, h = 150;
    ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#b9b9b9'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ececec'; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y, 2, h);
    ctx.fillStyle = '#6b6b6b'; ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x + w - 2, y, 2, h); ctx.fillRect(x + 2, y + 30, w - 4, 1);
    ctx.fillStyle = '#000'; ctx.font = 'italic 700 16px Helvetica, Arial, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText('System Maintenance', x + 12, y + 16);
    drawCubeLogo(ctx, x + 50, y + 90, 30, { light: '#f2f2f2', dark: '#3a3a3a', mid: '#8f8f8f' });
    ctx.fillText(bootStage === 1 ? 'Running power-on diagnostics…' : 'Starting up the system…', x + 100, y + 76);
    ctx.fillStyle = '#8f8f8f'; ctx.fillRect(x + 100, y + 98, 270, 14);
    ctx.fillStyle = '#2f5f9e'; ctx.fillRect(x + 102, y + 100, 266 * (bootStage === 1 ? 0.3 : 0.82), 10);
  }
  function paint() {
    if (state === 'on') paintDesktop(); else paintBoot();
    opts.onPaint && opts.onPaint();
  }

  // ------------------------------------------------------------------ power
  function setState(s) { state = s; mount.classList.toggle('booting', s !== 'on'); }
  function powerOff() {
    bootTimers.forEach(clearTimeout); bootTimers = [];
    closeMenus();
    [...wins].forEach((w) => w.close());
    setState('off'); bootStage = 0; paint();
  }
  function powerOn() {
    bootTimers.forEach(clearTimeout); bootTimers = [];
    setState('boot'); bootStage = 0; paint();
    const at = (ms, fn) => bootTimers.push(setTimeout(fn, ms));
    at(900, () => { bootStage = 1; paint(); });
    at(2100, () => { bootStage = 2; paint(); });
    at(3500, () => { bootStage = 3; paint(); });
    at(3900, () => {
      setState('on'); paint();
      if (visible) firstLook();
      pending.splice(0).forEach(([a, arg], i) => setTimeout(() => launch(a, arg), 150 * i));
    });
  }
  function firstLook() {
    if (welcomed) return;
    welcomed = true;
    if (!wins.length && !pending.length) setTimeout(() => { if (visible && !wins.length) launch('readme'); }, 350);
  }

  // ----------------------------------------------------------------- layout
  function layout(pxW, pxH, isCompact) {
    const was = compact;
    compact = isCompact;
    if (compact) { W = Math.round(pxW); H = Math.round(pxH); scale = 1; }
    else { W = 1024; H = 768; scale = pxW / 1024; }
    mount.style.width = `${W}px`; mount.style.height = `${H}px`;
    mount.style.transform = scale === 1 ? 'none' : `scale(${scale})`;
    mount.classList.toggle('compact', compact);
    layoutIcons();
    if (was !== compact) closeMenus();
    for (const w of wins) {
      if (!compact) { w.x = Math.min(w.x, W - 80); w.y = Math.min(w.y, H - 40); w.apply(); }
      w.resized();
    }
  }
  layout(1024, 768, false);
  setBackground(bgIndex);
  // icons are SVG images: repaint the mimic once they have decoded
  Promise.all(ICONS.map((ic) => iconImage(ic.icon).decode?.().catch(() => {}))).then(paint);

  return {
    canvas, paint, layout, launch, powerOn, powerOff,
    get state() { return state; },
    focus() { visible = true; if (state === 'on') firstLook(); wins.forEach((w) => w.onActive && w.onActive(w === wins[wins.length - 1])); },
    blur() { visible = false; closeMenus(); wins.forEach((w) => w.onActive && w.onActive(false)); },
  };
}
