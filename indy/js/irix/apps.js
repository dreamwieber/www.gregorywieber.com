// The applications that run on the toy IRIX desktop.
import { iconURL, iconFor } from './icons.js';
import { FS, APPS, LINKS, HINV, README, VIDEOS, BUILDS, resolvePath } from '../site.js';
import { drawCubeLogo } from '../scene/textures.js';
import { createFsn } from './fsn.js';
import { createSoftBreak } from './softbreak.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function makeApps(desk) {
  const { el, audio } = desk;
  const menubar = (items) => {
    const m = el('div', 'ix-menubar');
    items.forEach(([label, fn, right]) => { const s = el('span', right ? 'right' : '', label); if (fn) s.addEventListener('click', fn); m.appendChild(s); });
    return m;
  };
  const actionButtons = (actions) => {
    const row = el('div', 'ix-actions');
    (actions || []).forEach((a) => {
      const store = a.url && a.url.includes('apps.apple.com');
      const b = el('button', 'ix-btn' + (store ? ' store' : a.primary ? ' primary' : ''), esc(a.label));
      b.addEventListener('click', () => (a.run ? desk.launch(a.run, a.arg) : a.page ? desk.launch('page', a.page) : desk.external(a.url)));
      row.appendChild(b);
    });
    return row;
  };

  // ------------------------------------------------------------- icon view
  function fm(node = FS) {
    return desk.createWindow({
      id: 'fm:' + node.path, title: node.path, w: 520, h: 380, resizable: true,
      build: (body, win) => {
        const path = el('div', 'ix-path');
        if (node.parent) { const up = el('b', '', '↑ up'); up.addEventListener('click', () => { desk.launch('fm', node.parent); }); path.appendChild(up); }
        path.appendChild(el('span', '', esc(node.path)));
        const fly = el('b', '', 'view in fsn'); fly.style.marginLeft = 'auto';
        fly.addEventListener('click', () => desk.launch('fsn', node));
        path.appendChild(fly);
        const grid = el('div', 'ix-fm');
        const status = el('div', 'ix-status', `${node.children.length} items`);
        node.children.forEach((c) => {
          const ic = el('div', 'ix-icon', `<img src="${iconURL(iconFor(c))}" alt="" draggable="false"><span>${esc(c.name)}</span>`);
          ic.addEventListener('pointerenter', () => { status.textContent = describe(c); });
          ic.addEventListener('click', () => { grid.querySelectorAll('.sel').forEach((s) => s.classList.remove('sel')); ic.classList.add('sel'); desk.openNode(c); });
          grid.appendChild(ic);
        });
        body.append(path, grid, status);
      },
      preview: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#b9b9b9'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#d9d4c4'; ctx.fillRect(x + 3, y + 3, w - 6, 20);
        const cols = Math.max(1, Math.floor((w - 16) / 106));
        node.children.forEach((c, i) => {
          const cx = x + 8 + (i % cols) * 106, cy = y + 36 + Math.floor(i / cols) * 76;
          ctx.fillStyle = c.kind === 'dir' ? '#edcd7a' : '#f4f4f4'; ctx.fillRect(cx + 30, cy, 40, 40);
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cx + 18, cy + 50, 64, 5);
        });
      },
    });
  }
  function describe(n) {
    if (n.kind === 'dir') return `${n.name}/ — directory, ${n.children.length} items`;
    if (n.kind === 'video') return `${n.video.title} — ${n.video.channel} on YouTube${n.video.note ? ' · ' + n.video.note : ''}`;
    if (n.kind === 'app') return `${n.app.name} — ${n.app.platform}`;
    if (n.kind === 'link') return `${n.label} ↗`;
    if (n.kind === 'page') return `${n.name} — web page`;
    return n.name;
  }

  // ---------------------------------------------------------------- jot
  function readme(node) {
    const text = node && node.text ? node.text : README;
    const name = node && node.name ? node.name : 'README';
    return desk.createWindow({
      id: 'jot:' + name, title: `jot — ${name}`, w: 470, h: 520, x: desk.compact ? 0 : 312, y: desk.compact ? 0 : 60, resizable: true,
      build: (body) => {
        body.appendChild(menubar([['File'], ['Edit'], ['View'], ['Help', () => desk.launch('about'), true]]));
        body.appendChild(el('div', 'ix-text', esc(text)));
        const row = el('div', 'ix-transport');
        const b1 = el('button', 'ix-btn primary', 'Fly through the site (fsn)'); b1.addEventListener('click', () => desk.launch('fsn'));
        const b2 = el('button', 'ix-btn', 'Play Soft Break'); b2.addEventListener('click', () => desk.launch('softbreak'));
        row.append(b1, b2); body.appendChild(row);
      },
      preview: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#f4f1e6'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#222'; ctx.font = '12px Menlo, monospace'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
        text.split('\n').slice(0, Math.floor((h - 60) / 18)).forEach((l, i) => ctx.fillText(l, x + 14, y + 36 + i * 18));
        ctx.textBaseline = 'middle';
      },
    });
  }

  // -------------------------------------------------------------- about
  function about() {
    return desk.createWindow({
      id: 'about', title: 'About This System', w: 520, h: 400,
      build: (body) => {
        const wrap = el('div', 'ix-about');
        const c = document.createElement('canvas'); c.width = c.height = 144; c.style.cssText = 'width:72px;height:72px';
        drawCubeLogo(c.getContext('2d'), 72, 72, 60, { light: '#f2f2f2', dark: '#3a3a3a', mid: '#8f8f8f' });
        const r = el('div', '', `<h3>Indy</h3><p>IRIX 5.3 (toy edition) · host <b>indy.gregorywieber.com</b><br>
          The Indy was Silicon Graphics’ “affordable” workstation — exotic graphics, ethernet, and a webcam, in 1993.
          Gregory wanted one badly enough to write to SGI for the brochure. <a href="#" data-a="story">Read the story.</a></p><pre>${esc(HINV)}</pre>`);
        r.querySelector('[data-a=story]').addEventListener('click', (ev) => { ev.preventDefault(); desk.launch('page', { url: '../writing/my-computer-history.html', title: 'My Computer History' }); });
        wrap.append(c, r); body.appendChild(wrap);
      },
    });
  }

  // ------------------------------------------------------------ Netscape
  const pretty = (url) => {
    try { const u = new URL(url, location.href); return u.origin === location.origin ? 'http://gregorywieber.com' + u.pathname.replace(/index\.html$/, '') + u.hash : u.href; } catch { return url; }
  };
  function page({ url, title }) {
    const open = desk.getWindow('netscape');
    if (open) { desk.focusWindow(open); open.navigate(url, title); return open; }
    return desk.createWindow({
      id: 'netscape', title: `Netscape: ${title || 'Gregory Wieber'}`, w: 780, h: 600, x: desk.compact ? 0 : 150, y: desk.compact ? 0 : 60, resizable: true,
      build: (body, win) => {
        const bar = el('div', 'ix-ns-bar');
        const mk = (label, fn) => { const b = el('button', 'ix-btn', label); b.addEventListener('click', fn); bar.appendChild(b); return b; };
        const frame = el('iframe', 'ix-frame');
        frame.setAttribute('title', 'Web page');
        mk('Back', () => { try { frame.contentWindow.history.back(); } catch { /* cross-origin */ } });
        mk('Home', () => { frame.src = '../index.html'; });
        const loc = el('div', 'ix-ns-loc', esc(pretty(url)));
        bar.appendChild(loc);
        mk('Open ↗', () => { let u = url; try { u = frame.contentWindow.location.href; } catch { /* ignore */ } desk.external(u); });
        const n = el('div', 'ix-ns-n busy', 'N'); bar.appendChild(n);
        const wrap = el('div', 'ix-framewrap'); wrap.appendChild(frame);
        const status = el('div', 'ix-status', 'Connecting…');
        frame.addEventListener('load', () => {
          n.classList.remove('busy');
          try {
            const doc = frame.contentDocument;
            loc.textContent = pretty(frame.contentWindow.location.href);
            win.setTitle(`Netscape: ${doc.title || title || ''}`);
            status.textContent = 'Document: Done';
            // links that leave the site open in a real tab instead of dying in the frame
            doc.querySelectorAll('a[href]').forEach((a) => { if (a.origin !== location.origin || /\/indy\//.test(a.pathname)) a.target = '_blank'; a.rel = 'noopener'; });
            const st = doc.createElement('style'); st.textContent = '.site-header{position:static!important}'; doc.head.appendChild(st);
          } catch { status.textContent = 'Document: Done'; }
        });
        win.navigate = (u, t) => { n.classList.add('busy'); status.textContent = 'Connecting…'; loc.textContent = pretty(u); frame.src = u; if (t) win.setTitle(`Netscape: ${t}`); };
        body.append(menubar([['File'], ['Edit'], ['View'], ['Go'], ['Communicator'], ['Help', null, true]]), bar, wrap, status);
        frame.src = url;
      },
      preview: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#b4b4b4'; ctx.fillRect(x, y, w, 62);
        ctx.fillStyle = '#9f9fc4'; ctx.fillRect(x + 130, y + 30, w - 230, 20);
        ctx.fillStyle = '#173a6e'; ctx.fillRect(x + w - 40, y + 26, 30, 30);
        ctx.fillStyle = '#fbfaf7'; ctx.fillRect(x + 3, y + 62, w - 6, h - 86);
        ctx.fillStyle = '#111'; ctx.font = '700 44px Georgia, serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('Gregory', x + 40, y + 100); ctx.fillText('Wieber', x + 40, y + 148); ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.14)';
        for (let i = 0; i < 3; i++) ctx.fillRect(x + 40 + i * ((w - 100) / 3), y + 230, (w - 120) / 3, Math.max(20, h - 330));
      },
    });
  }

  // -------------------------------------------------------- movie player
  function video(v) {
    if (typeof v === 'string') v = [...VIDEOS, ...BUILDS].find((q) => q.id === v);
    if (!v) return null;
    const sub = v.channel === 'dreamwieber' ? LINKS.dreamwieberSub : LINKS.buildsSub;
    let thumbImg = null;
    const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { thumbImg = im; }; im.src = v.thumb;
    return desk.createWindow({
      id: 'movie:' + v.id, title: `movieplayer — ${v.title}`, w: 640, h: 452, resizable: true,
      build: (body, win) => {
        const stage = el('div', 'ix-movie', '<div class="ix-play"></div>');
        stage.style.backgroundImage = `url(${v.thumb})`;
        const play = () => {
          if (stage.querySelector('iframe')) return;
          if (location.protocol === 'file:') { desk.external(v.url); return; }
          stage.innerHTML = '';
          const f = el('iframe');
          f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
          f.allowFullscreen = true; f.title = v.title;
          f.referrerPolicy = 'strict-origin-when-cross-origin';
          f.src = `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1`;
          stage.appendChild(f);
          stage.style.cursor = 'default';
        };
        stage.addEventListener('click', play);
        const bar = el('div', 'ix-transport', `<div class="t">${esc(v.title)} <span style="font-weight:400">· ${esc(v.channel)}${v.note ? ' · ' + v.note : ''}</span></div>`);
        const s = el('button', 'ix-btn primary', `Subscribe to ${esc(v.channel)}`); s.addEventListener('click', () => desk.external(sub));
        const o = el('button', 'ix-btn', 'YouTube ↗'); o.addEventListener('click', () => desk.external(v.url));
        bar.append(s, o);
        body.append(stage, bar);
        win.onClose = () => { stage.innerHTML = ''; };
      },
      preview: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h - 40);
        if (thumbImg) { const s = Math.max(w / thumbImg.width, (h - 40) / thumbImg.height); ctx.drawImage(thumbImg, x + (w - thumbImg.width * s) / 2, y + (h - 40 - thumbImg.height * s) / 2, thumbImg.width * s, thumbImg.height * s); }
        ctx.fillStyle = '#b4b4b4'; ctx.fillRect(x, y + h - 40, w, 40);
        ctx.fillStyle = '#2d5fa3'; ctx.fillRect(x + w - 250, y + h - 33, 160, 26);
      },
    });
  }

  // ------------------------------------------------------------ showcase
  function app(key) {
    const a = typeof key === 'string' ? APPS.find((q) => q.key === key) : key;
    if (!a) return null;
    if (!a.blurb) return desk.launch('page', { url: a.page, title: a.name });
    let hero = null;
    const im = new Image(); im.onload = () => { hero = im; }; im.src = a.image;
    return desk.createWindow({
      id: 'app:' + a.key, title: `showcase — ${a.name}`, w: 560, h: a.key === 'softbreak' ? 470 : 450,
      build: (body) => {
        const wrap = el('div', 'ix-show');
        const h = el('div', 'ix-hero', a.award ? `<div class="award">★ ${esc(a.award)}</div>` : '');
        h.style.backgroundImage = `url(${a.image})`;
        const info = el('div', 'ix-info', `<h2>${esc(a.name)}</h2><div class="plat">${esc(a.platform)}</div><p><span class="tag">${esc(a.tagline)}</span> ${esc(a.blurb)}</p>`);
        const acts = [...(a.actions || [])];
        if (a.page) acts.push({ label: 'Read more', page: { url: a.page, title: a.name } });
        info.appendChild(actionButtons(acts));
        wrap.append(h, info); body.appendChild(wrap);
      },
      preview: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#b4b4b4'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#222'; ctx.fillRect(x + 3, y + 3, w - 6, 200);
        if (hero) { ctx.save(); ctx.beginPath(); ctx.rect(x + 3, y + 3, w - 6, 200); ctx.clip(); const s = Math.max((w - 6) / hero.width, 200 / hero.height); ctx.drawImage(hero, x + 3 + (w - 6 - hero.width * s) / 2, y + 3 + (200 - hero.height * s) / 2, hero.width * s, hero.height * s); ctx.restore(); }
        ctx.fillStyle = '#000'; ctx.font = 'italic 700 22px Helvetica, Arial, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(a.name, x + 16, y + 228);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 16, y + 256 + i * 16, w - 60 - i * 30, 5);
        ctx.fillStyle = '#000'; ctx.fillRect(x + 16, y + 340, 210, 32);
      },
    });
  }

  // ---------------------------------------------------------------- shell
  function consoleApp() {
    let me = null;
    return desk.createWindow({
      id: 'console', title: 'winterm — gregory@indy', w: 620, h: 400, x: desk.compact ? 0 : 230, y: desk.compact ? 0 : 300, resizable: true,
      build: (body, win) => {
        me = win;
        const term = el('div', 'ix-term');
        const out = el('div');
        const line = el('div', 'in', '<span class="p"></span><input autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Shell input">');
        const prompt = line.querySelector('.p'), input = line.querySelector('input');
        term.append(out, line); body.appendChild(term);
        let cwd = FS; const hist = []; let hi = 0;
        const short = (n) => (n === FS ? '~' : '~' + n.path.slice(FS.path.length));
        const setPrompt = () => { prompt.textContent = `indy ${short(cwd)}% `; };
        const print = (html) => { const d = el('div', '', html); out.appendChild(d); term.scrollTop = term.scrollHeight; win.lines.push(d.textContent); if (win.lines.length > 40) win.lines.shift(); };
        win.lines = [];
        const cls = (n) => (n.kind === 'dir' ? 'd' : n.kind === 'app' || n.kind === 'video' ? 'x' : '');
        const lsLine = (n) => `<span class="${cls(n)}">${esc(n.name)}${n.kind === 'dir' ? '/' : n.kind === 'app' ? '*' : n.kind === 'link' ? '@' : ''}</span>`;
        const CMDS = {
          help: () => print(`Commands: <span class="x">ls cd pwd cat open fsn softbreak hinv uname whoami date videos apps mail night day clear exit</span>\nTry: <span class="x">open videos/hypercard.mv</span>  ·  <span class="x">fsn</span>  ·  <span class="x">softbreak</span>`),
          ls: (a) => { const n = a[0] ? resolvePath(cwd, a[0]) : cwd; if (!n) return print(`<span class="e">ls: ${esc(a[0])}: No such file or directory</span>`); print(n.children ? n.children.map(lsLine).join('   ') : lsLine(n)); },
          cd: (a) => { const n = resolvePath(cwd, a[0] || '~'); if (!n || n.kind !== 'dir') return print(`<span class="e">cd: ${esc(a[0] || '')}: Not a directory</span>`); cwd = n; setPrompt(); },
          pwd: () => print(esc(cwd.path)),
          cat: (a) => { const n = resolvePath(cwd, a[0] || ''); if (!n || !a[0]) return print(`<span class="e">cat: ${esc(a[0] || '')}: No such file</span>`); if (n.kind === 'text') print(esc(n.text)); else if (n.kind === 'dir') print(`<span class="e">cat: ${esc(n.name)}: Is a directory</span>`); else print(`${esc(describe(n))}\n<span class="x">(binary — try: open ${esc(a[0])})</span>`); },
          open: (a) => { const n = resolvePath(cwd, a[0] || ''); if (!n || !a[0]) return print(`<span class="e">open: ${esc(a[0] || '')}: No such file</span>`); print(`Opening ${esc(n.name)}…`); desk.openNode(n); },
          fsn: () => { print('Launching File System Navigator… <span class="x">It’s a UNIX system! I know this!</span>'); desk.launch('fsn', cwd); },
          softbreak: () => { print('Starting Soft Break…'); desk.launch('softbreak'); },
          hinv: () => print(esc(HINV)),
          uname: (a) => print(a[0] === '-a' ? 'IRIX indy 5.3 11091812 IP22 mips' : 'IRIX'),
          whoami: () => print('guest'),
          date: () => print(esc(new Date().toString())),
          echo: (a) => print(esc(a.join(' '))),
          videos: () => { cwd = resolvePath(FS, 'videos'); setPrompt(); CMDS.ls([]); },
          apps: () => { cwd = resolvePath(FS, 'apps'); setPrompt(); CMDS.ls([]); },
          mail: () => { print('To: hello@apposite.ai'); desk.external(LINKS.email); },
          night: () => { print('Lights out.'); desk.night && desk.night(true); },
          day: () => { print('Good morning.'); desk.night && desk.night(false); },
          clear: () => { out.innerHTML = ''; win.lines.length = 0; },
          exit: () => { win.close(); },
          logout: () => { win.close(); desk.exit(); },
          shutdown: () => desk.shutdown(),
          sudo: () => print('<span class="e">guest is not in the sudoers file. This incident will be reported to Gregory.</span>'),
          rm: () => print('<span class="e">rm: Read-only file system (nice try)</span>'),
          vi: () => print('Use jot. Life is short.'),
          emacs: () => print('Use jot. Life is short.'),
          xyzzy: () => print('Nothing happens.'),
          man: (a) => print(a[0] ? `No manual entry for ${esc(a[0])}. Try <span class="x">help</span>.` : 'What manual page do you want?'),
        };
        CMDS.dir = CMDS.ls; CMDS.ll = CMDS.ls; CMDS.less = CMDS.cat; CMDS.more = CMDS.cat; CMDS['?'] = CMDS.help;
        const run = (text) => {
          print(`<span class="p">${esc(prompt.textContent)}</span>${esc(text)}`);
          const parts = text.trim().split(/\s+/).filter(Boolean);
          if (!parts.length) return;
          hist.push(text); hi = hist.length;
          const fn = CMDS[parts[0].toLowerCase()];
          if (fn) fn(parts.slice(1));
          else {
            const n = resolvePath(cwd, parts[0].replace(/^\.\//, ''));
            if (n && n !== cwd) { print(`Opening ${esc(n.name)}…`); desk.openNode(n); }
            else { print(`<span class="e">${esc(parts[0])}: Command not found.</span> Type <span class="x">help</span>.`); audio.error(); }
          }
        };
        input.addEventListener('keydown', (ev) => {
          ev.stopPropagation();
          if (ev.key === 'Enter') { const v = input.value; input.value = ''; run(v); }
          else if (ev.key === 'ArrowUp') { if (hi > 0) input.value = hist[--hi]; ev.preventDefault(); }
          else if (ev.key === 'ArrowDown') { input.value = hi < hist.length - 1 ? hist[++hi] : ((hi = hist.length), ''); ev.preventDefault(); }
          else if (ev.key === 'Tab') {
            ev.preventDefault();
            const parts = input.value.split(/\s+/); const last = parts.pop() || '';
            const slash = last.lastIndexOf('/'); const base = slash >= 0 ? resolvePath(cwd, last.slice(0, slash) || '/') : cwd; const frag = last.slice(slash + 1).toLowerCase();
            const pool = parts.length ? (base && base.children ? base.children.map((c) => c.name + (c.kind === 'dir' ? '/' : '')) : []) : Object.keys(CMDS);
            const hit = pool.filter((n) => n.toLowerCase().startsWith(frag));
            if (hit.length === 1) { parts.push((slash >= 0 ? last.slice(0, slash + 1) : '') + hit[0]); input.value = parts.join(' '); }
            else if (hit.length > 1) print(hit.map(esc).join('   '));
          } else if (ev.key.length === 1) audio.key();
          if (ev.key === 'Escape') { input.blur(); desk.exit(); }
        });
        term.addEventListener('click', () => { if (!String(getSelection())) input.focus({ preventScroll: true }); });
        win.onActive = (on) => { if (on && desk.visible && !desk.compact) setTimeout(() => input.focus({ preventScroll: true }), 30); };
        setPrompt();
        print(`IRIX Release 5.3 IP22 indy\nCopyright 1987-1994 Silicon Graphics, Inc. All Rights Reserved.\nLast login: ${new Date().toDateString()} on ttyq0\n\nWelcome, guest. Type <span class="x">help</span> — or just <span class="x">ls</span>.`);
        win._focusInput = () => input.focus({ preventScroll: true });
      },
      preview: (ctx, x, y, w, h) => {
        ctx.fillStyle = '#10182b'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#d6e2ff'; ctx.font = '13px Menlo, monospace'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
        const lines = ((me && me.lines) || []).join('\n').split('\n'); const max = Math.floor((h - 16) / 17);
        lines.slice(-max).forEach((l, i) => ctx.fillText(l.slice(0, 90), x + 10, y + 8 + i * 17));
        ctx.textBaseline = 'middle';
      },
    });
  }

  // ------------------------------------------------------------------ fsn
  function fsn(node) {
    const existing = desk.getWindow('fsn');
    if (existing) { desk.focusWindow(existing); if (node && existing.fsn) existing.fsn.flyTo(node); return existing; }
    return desk.createWindow({
      id: 'fsn', title: 'fsn — /usr/people/gregory', w: 860, h: 640, x: desk.compact ? 0 : 82, y: desk.compact ? 0 : 56, resizable: true,
      build: (body, win) => {
        const wrap = el('div', 'ix-fsn');
        const label = el('div', 'ix-fsn-label', '');
        const info = el('div', 'ix-fsn-info');
        wrap.append(label, info);
        const reset = () => win.fsn && win.fsn.overview();
        body.append(menubar([['Overview', reset], ['Home', () => win.fsn.flyTo(FS)], ['videos', () => win.fsn.flyTo(resolvePath(FS, 'videos'))], ['apps', () => win.fsn.flyTo(resolvePath(FS, 'apps'))], ['art', () => win.fsn.flyTo(resolvePath(FS, 'art'))], ['writing', () => win.fsn.flyTo(resolvePath(FS, 'writing'))], ['Help', () => desk.dialog('fsn', 'File System Navigator.<br>Directories are pedestals, files are blocks. Taller blocks are bigger hits.<br><br><i>“It’s a UNIX system! I know this!”</i>'), true]]), wrap);
        const status = el('div', 'ix-status', 'Drag to fly · scroll to climb · click a block to select it, click again to open'); body.appendChild(status);
        try {
          win.fsn = createFsn(wrap, {
            desk, root: FS, start: node,
            onStatus: (t) => { status.textContent = t; },
            onSelect: (n) => {
              if (!n) { info.classList.remove('on'); return; }
              const img = n.kind === 'video' ? n.video.thumb : n.kind === 'app' ? n.app.image : n.image;
              info.innerHTML = `${img ? `<img src="${img}" alt="">` : ''}<div class="n">${esc(n.kind === 'video' ? n.video.title : n.kind === 'app' ? n.app.name : n.name)}<small>${esc(describe(n))}</small></div>`;
              const b = el('button', 'ix-btn primary', n.kind === 'video' ? 'Play' : n.kind === 'dir' ? 'Fly there' : 'Open');
              b.addEventListener('click', () => (n.kind === 'dir' ? win.fsn.flyTo(n) : desk.openNode(n)));
              info.appendChild(b); info.classList.add('on');
            },
          });
        } catch (err) {
          console.error(err);
          wrap.appendChild(el('div', 'ix-fsn-label', 'fsn: could not open a GL context. Try the icon view instead.'));
        }
        win.onResize = () => win.fsn && win.fsn.resize();
        win.onActive = (on) => win.fsn && win.fsn.setActive(on);
        win.onClose = () => win.fsn && win.fsn.dispose();
        win.preview = (ctx, x, y, w, h) => { if (!win.fsn) return false; ctx.fillStyle = '#0a1430'; ctx.fillRect(x, y, w, h); win.fsn.render(); ctx.drawImage(win.fsn.canvas, x + 3, y + 26, w - 6, h - 52); };
      },
    });
  }

  // ------------------------------------------------------------ Soft Break
  function softbreak() {
    return desk.createWindow({
      id: 'softbreak', title: 'Soft Break — IRIX port', w: 470, h: 660, x: desk.compact ? 0 : 280, y: desk.compact ? 0 : 50,
      build: (body, win) => {
        const wrap = el('div', 'ix-game');
        const promo = el('div', 'ix-promo');
        wrap.appendChild(promo);
        body.append(menubar([['Game', (ev) => desk.showMenu([{ label: 'New Game', fn: () => win.game.restart() }, { label: 'Pause', fn: () => win.game.togglePause() }, '-', { label: 'Quit', fn: () => win.close() }], win.x + 8, win.y + 54)], ['About', () => desk.launch('app', 'softbreak')], ['Get the real one ↗', () => desk.external(LINKS.softbreak), true]]), wrap);
        const showPromo = ({ title, score, text, primary, again }) => {
          promo.innerHTML = `<img src="assets/softbreak-icon.png" alt="Soft Break app icon"><div class="score">${esc(score)}</div><h3>${esc(title)}</h3><p>${text}</p>`;
          const row = el('div', 'ix-actions');
          const s = el('button', 'ix-btn store', 'Download on the App Store'); s.addEventListener('click', () => desk.external(LINKS.softbreak));
          const a = el('button', 'ix-btn', esc(again)); a.addEventListener('click', () => { promo.classList.remove('on'); primary(); });
          row.append(s, a); promo.appendChild(row);
          promo.appendChild(el('div', 'fine', 'iPhone · iPad · Apple Vision Pro · No ads, no in-app purchases'));
          promo.classList.add('on');
        };
        win.game = createSoftBreak(wrap, { audio, showPromo, hidePromo: () => promo.classList.remove('on') });
        win.onResize = () => win.game.resize();
        win.onActive = (on) => win.game.setActive(on && desk.visible);
        win.onClose = () => win.game.dispose();
        win.preview = (ctx, x, y, w, h) => { ctx.fillStyle = '#b4b4b4'; ctx.fillRect(x, y, w, h); ctx.drawImage(win.game.canvas, x + 3, y + 26, w - 6, h - 29); };
      },
    });
  }

  return { fm, readme, about, page, video, app, console: consoleApp, fsn, softbreak };
}
