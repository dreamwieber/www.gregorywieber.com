// Soft Break — the IRIX port. A small jelly brick-breaker that nods to the real game:
// bricks squish and wobble, broken bricks drop pieces you can catch and send back up,
// and every hit in a streak plays the next note of the scale.
const LEVELS = [
  ['1111111', '1111111', '1111111', '1111111'],
  ['..111..', '.11111.', '1122211', '.11111.', '..111..'],
  ['2.2.2.2', '.1.1.1.', '2121212', '.1.1.1.', '1.1.1.1'],
  ['.11.11.', '1111111', '1122211', '.11211.', '..111..', '...1...'],
];
const PALETTE = ['#ff8a70', '#ffb35c', '#ffd166', '#8ddc9a', '#7ad3c0', '#8fb8ff', '#b79bff', '#f29bd4'];

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function createSoftBreak(container, { audio, showPromo, hidePromo }) {
  const canvas = document.createElement('canvas');
  container.insertBefore(canvas, container.firstChild);
  const ctx = canvas.getContext('2d');
  let W = 400, H = 560, DPR = 2, U = 1; // U: size unit so the game scales with the window
  let state = 'ready', level = 0, score = 0, lives = 3, streak = 0, best = 0;
  let bricks = [], balls = [], pieces = [], sparks = [], dust = [];
  const paddle = { x: 200, tx: 200, w: 86, h: 14, y: 0, sq: 0, sv: 0 };
  let banner = null, active = true, raf = 0, last = performance.now(), disposed = false, time = 0, usedKeys = false;
  const keys = {};
  try { best = +(localStorage.getItem('indy.softbreak.best') || 0); } catch { /* ignore */ }

  // The soft drifting backdrop is all large gradients, the slowest thing a 2D canvas can fill
  // (Safari especially). It is painted small, every few frames, and stretched into place.
  const BG_DIV = 4, bgLayer = document.createElement('canvas'), bgCtx = bgLayer.getContext('2d');
  let bgAge = 0;
  function paintBackdrop() {
    const c = bgCtx, k = 1 / BG_DIV;
    c.setTransform(k, 0, 0, k, 0, 0);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#f3f4fa'); bg.addColorStop(1, '#dfe3f1');
    c.fillStyle = bg; c.fillRect(0, 0, W + BG_DIV, H + BG_DIV);
    for (let i = 0; i < 4; i++) {
      const x = W * (0.2 + 0.2 * i) + Math.sin(time * 0.2 + i * 2) * 40 * U, y = H * (0.35 + 0.14 * i) + Math.cos(time * 0.17 + i) * 30 * U, r = (90 + i * 22) * U;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, ['rgba(255,170,150,0.20)', 'rgba(150,190,255,0.20)', 'rgba(255,215,130,0.18)', 'rgba(180,160,255,0.18)'][i]); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  function resize() {
    W = Math.max(200, container.clientWidth - 2); H = Math.max(260, container.clientHeight - 2);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    bgLayer.width = Math.max(2, Math.ceil(W / BG_DIV)); bgLayer.height = Math.max(2, Math.ceil(H / BG_DIV)); bgAge = 0;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    U = Math.min(W / 440, H / 580);
    paddle.w = 90 * U; paddle.h = 15 * U; paddle.y = H - 40 * U;
    layoutBricks(false);
    draw();
  }

  function layoutBricks(fresh) {
    const rows = LEVELS[level], cols = 7;
    const margin = 18 * U, gap = 7 * U;
    const bw = (W - margin * 2 - gap * (cols - 1)) / cols, bh = 24 * U, top = 70 * U;
    if (fresh) bricks = [];
    let i = 0;
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '.') return;
      const x = margin + c * (bw + gap), y = top + r * (bh + gap);
      if (fresh) bricks.push({ x, y, w: bw, h: bh, hp: +ch, max: +ch, color: PALETTE[(r + level * 2) % PALETTE.length], sx: 0, sy: 0, vx: 0, vy: 0, ox: 0, oy: 0, ovx: 0, ovy: 0, dents: [], dead: false, born: i * 0.035, id: i });
      else { const b = bricks.find((q) => q.id === i); if (b) { b.x = x; b.y = y; b.w = bw; b.h = bh; } }
      i++;
    }));
  }

  function newBall() {
    balls = [{ x: paddle.x, y: paddle.y - 9 * U, vx: 0, vy: 0, r: 7.5 * U, stuck: true, trail: [] }];
  }
  function startLevel(n) {
    level = n; pieces = []; sparks = []; streak = 0;
    layoutBricks(true); newBall(); state = 'ready';
    banner = { text: `Level ${level + 1}`, t: 0 };
  }
  function restart() { score = 0; lives = 3; hidePromo(); startLevel(0); kick(); }
  function launch() {
    if (state === 'paused') { state = 'play'; return; }
    if (state !== 'ready') return;
    const b = balls[0]; if (!b) return;
    const sp = speed();
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.7;
    b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.stuck = false;
    state = 'play'; audio.paddle();
  }
  const speed = () => (330 + level * 26) * U;

  function hitBrick(b, nx, ny, power = 1) {
    b.hp -= 1;
    // squash along the hit axis, bulge on the other — then let the spring ring
    if (Math.abs(nx) > Math.abs(ny)) { b.vx -= 5.5 * power; b.vy += 4 * power; b.ovx += -nx * 90 * U; }
    else { b.vy -= 5.5 * power; b.vx += 4 * power; b.ovy += -ny * 90 * U; }
    streak++;
    audio.note(streak - 1);
    score += Math.round(10 * (1 + (streak - 1) * 0.15));
    // neighbours jiggle in sympathy
    for (const o of bricks) if (o !== b && !o.dead && Math.abs(o.x - b.x) < b.w * 1.3 && Math.abs(o.y - b.y) < b.h * 1.6) { o.vy += (Math.random() - 0.5) * 2.4; o.vx += (Math.random() - 0.5) * 2.4; }
    if (b.hp <= 0) {
      b.dead = true;
      const n = 2 + (Math.random() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) pieces.push({ x: b.x + b.w * (0.25 + 0.5 * (i / Math.max(1, n - 1))), y: b.y + b.h / 2, vx: (Math.random() - 0.5) * 120 * U, vy: (-60 - Math.random() * 90) * U, r: (6 + Math.random() * 3) * U, color: b.color, wob: Math.random() * 6 });
      for (let i = 0; i < 9; i++) dust.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: (Math.random() - 0.5) * 260 * U, vy: (Math.random() - 0.5) * 260 * U, life: 0.5, color: b.color });
      audio.squish();
    } else {
      b.dents.push({ x: 0.2 + Math.random() * 0.6, y: 0.3 + Math.random() * 0.4 });
    }
    if (bricks.every((q) => q.dead)) levelClear();
  }
  function levelClear() {
    audio.win();
    balls = [];
    if (level + 1 >= LEVELS.length) {
      state = 'won'; saveBest();
      setTimeout(() => showPromo({
        title: 'You cleared the IRIX port.', score: `Score ${score}${score >= best ? ' · new best' : ''}`,
        text: 'That was four levels on a 1993 workstation. The real <b>Soft Break</b> has eight hand-built worlds, bricks that truly dent and wobble, haptics for every material, and a melody in every streak.',
        again: 'Play again', primary: restart,
      }), 700);
    } else {
      state = 'clear';
      setTimeout(() => { if (!disposed && state === 'clear') startLevel(level + 1); }, 1100);
    }
  }
  function saveBest() { if (score > best) { best = score; try { localStorage.setItem('indy.softbreak.best', String(best)); } catch { /* ignore */ } } }
  function loseLife() {
    lives--; streak = 0; audio.lose();
    if (lives <= 0) {
      state = 'over'; saveBest();
      setTimeout(() => showPromo({
        title: 'Squished.', score: `Score ${score}${best ? ` · best ${best}` : ''}`,
        text: 'This is the little IRIX port. The real <b>Soft Break</b> is a brick breaker made of jelly — bricks dent, wobble and break apart, and every streak plays a melody.',
        again: 'Try again', primary: restart,
      }), 600);
    } else { newBall(); state = 'ready'; }
  }

  function step(dt) {
    time += dt;
    // paddle
    if (keys.ArrowLeft || keys.a) paddle.tx -= 520 * U * dt;
    if (keys.ArrowRight || keys.d) paddle.tx += 520 * U * dt;
    paddle.tx = Math.max(paddle.w / 2 + 4, Math.min(W - paddle.w / 2 - 4, paddle.tx));
    paddle.x += (paddle.tx - paddle.x) * (1 - Math.exp(-dt * 26));
    paddle.sv += (-paddle.sq * 260 - paddle.sv * 14) * dt; paddle.sq += paddle.sv * dt;
    if (banner) { banner.t += dt; if (banner.t > 1.5) banner = null; }

    for (const b of bricks) {
      if (b.born > 0) { b.born -= dt; continue; }
      // spring-damper per axis for the squish, another for the positional wobble
      b.vx += (-b.sx * 300 - b.vx * 9) * dt; b.sx += b.vx * dt;
      b.vy += (-b.sy * 300 - b.vy * 9) * dt; b.sy += b.vy * dt;
      b.ovx += (-b.ox * 220 - b.ovx * 10) * dt; b.ox += b.ovx * dt;
      b.ovy += (-b.oy * 220 - b.ovy * 10) * dt; b.oy += b.ovy * dt;
    }

    for (const ball of balls) {
      if (ball.stuck) { ball.x = paddle.x; ball.y = paddle.y - paddle.h / 2 - ball.r - 1; continue; }
      const steps = 3;
      for (let s = 0; s < steps; s++) {
        ball.x += (ball.vx * dt) / steps; ball.y += (ball.vy * dt) / steps;
        if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); audio.wall(); }
        if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); audio.wall(); }
        if (ball.y < ball.r + 44 * U) { ball.y = ball.r + 44 * U; ball.vy = Math.abs(ball.vy); audio.wall(); }
        // paddle
        if (ball.vy > 0 && ball.y + ball.r > paddle.y - paddle.h / 2 && ball.y < paddle.y + paddle.h && Math.abs(ball.x - paddle.x) < paddle.w / 2 + ball.r) {
          const off = (ball.x - paddle.x) / (paddle.w / 2);
          const a = -Math.PI / 2 + off * 1.05, sp = speed();
          ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp; ball.y = paddle.y - paddle.h / 2 - ball.r;
          paddle.sv = 5; streak = 0; audio.paddle();
        }
        // bricks
        for (const b of bricks) {
          if (b.dead || b.born > 0) continue;
          const cx = Math.max(b.x, Math.min(ball.x, b.x + b.w)), cy = Math.max(b.y, Math.min(ball.y, b.y + b.h));
          const dx = ball.x - cx, dy = ball.y - cy;
          if (dx * dx + dy * dy < ball.r * ball.r) {
            let nx, ny;
            if (dx === 0 && dy === 0) { nx = 0; ny = ball.vy > 0 ? -1 : 1; }
            else if (Math.abs(dx) > Math.abs(dy)) { nx = Math.sign(dx); ny = 0; } else { nx = 0; ny = Math.sign(dy); }
            if (nx) { ball.vx = Math.abs(ball.vx) * nx; ball.x = cx + nx * (ball.r + 0.5); } else { ball.vy = Math.abs(ball.vy) * ny; ball.y = cy + ny * (ball.r + 0.5); }
            hitBrick(b, nx, ny);
            break;
          }
        }
      }
      ball.trail.push(ball.x, ball.y); if (ball.trail.length > 16) ball.trail.splice(0, 2);
      // keep the ball from going flat
      if (Math.abs(ball.vy) < speed() * 0.18) ball.vy = Math.sign(ball.vy || -1) * speed() * 0.2;
    }
    if (state === 'play' && balls.length && balls.every((b) => b.y - b.r > H)) loseLife();

    // falling pieces: catch them to send them back up
    for (const p of pieces) {
      p.vy += 620 * U * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.wob += dt * 9;
      if (p.x < p.r || p.x > W - p.r) p.vx *= -1;
      if (!p.dead && p.vy > 0 && p.y + p.r > paddle.y - paddle.h / 2 && p.y < paddle.y + paddle.h && Math.abs(p.x - paddle.x) < paddle.w / 2 + p.r) {
        p.dead = true; paddle.sv = 3;
        const off = (p.x - paddle.x) / (paddle.w / 2);
        sparks.push({ x: p.x, y: paddle.y - paddle.h, vx: off * 190 * U, vy: -470 * U, r: p.r * 0.8, color: p.color });
        score += 5; audio.note(Math.min(13, streak + 2), { soft: true });
      }
      if (p.y > H + 30) p.dead = true;
    }
    pieces = pieces.filter((p) => !p.dead);
    for (const s of sparks) {
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.x < s.r || s.x > W - s.r) s.vx *= -1;
      if (s.y < 44 * U) s.dead = true;
      for (const b of bricks) {
        if (b.dead || s.dead || b.born > 0) continue;
        if (s.x > b.x - s.r && s.x < b.x + b.w + s.r && s.y > b.y - s.r && s.y < b.y + b.h + s.r) { s.dead = true; hitBrick(b, 0, 1, 0.8); }
      }
    }
    sparks = sparks.filter((s) => !s.dead);
    for (const d of dust) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 300 * U * dt; d.life -= dt; }
    dust = dust.filter((d) => d.life > 0);
  }

  // ------------------------------------------------------------------ drawing
  function jelly(x, y, w, h, r, color, gloss = true) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, shade(color, 0.28)); g.addColorStop(0.55, color); g.addColorStop(1, shade(color, -0.16));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    if (gloss) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.roundRect(x + w * 0.1, y + h * 0.13, w * 0.8, h * 0.24, h * 0.14); ctx.fill();
    }
  }
  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (bgAge-- <= 0) { paintBackdrop(); bgAge = 3; }
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(bgLayer, 0, 0, W, H);
    // HUD
    ctx.fillStyle = '#39415c'; ctx.textBaseline = 'middle';
    ctx.font = `600 ${13 * U}px -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.textAlign = 'left'; ctx.fillText(`SCORE  ${String(score).padStart(4, '0')}`, 18 * U, 24 * U);
    ctx.textAlign = 'center'; ctx.fillText(`LEVEL ${level + 1} / ${LEVELS.length}`, W / 2, 24 * U);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(W - 24 * U - i * 18 * U, 24 * U, 5.5 * U, 0, 6.283);
      ctx.fillStyle = i < lives ? '#ff8a70' : 'rgba(57,65,92,0.15)'; ctx.fill();
    }
    ctx.fillStyle = 'rgba(57,65,92,0.10)'; ctx.fillRect(14 * U, 43 * U, W - 28 * U, 1.5);

    // bricks
    for (const b of bricks) {
      if (b.dead) continue;
      const appear = b.born > 0 ? 0 : 1;
      if (!appear) continue;
      ctx.save();
      ctx.translate(b.x + b.w / 2 + b.ox, b.y + b.h / 2 + b.oy);
      ctx.scale(1 + b.sx, 1 + b.sy);
      // soft shadow
      ctx.fillStyle = 'rgba(70,80,120,0.16)';
      ctx.beginPath(); ctx.roundRect(-b.w / 2 + 1, -b.h / 2 + 5 * U, b.w, b.h, 8 * U); ctx.fill();
      jelly(-b.w / 2, -b.h / 2, b.w, b.h, 8 * U, b.max > 1 && b.hp > 1 ? shade(b.color, -0.14) : b.color);
      if (b.max > 1 && b.hp > 1) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2 * U; ctx.beginPath(); ctx.roundRect(-b.w / 2 + 3 * U, -b.h / 2 + 3 * U, b.w - 6 * U, b.h - 6 * U, 6 * U); ctx.stroke(); }
      for (const d of b.dents) {
        ctx.fillStyle = 'rgba(40,40,70,0.16)';
        ctx.beginPath(); ctx.ellipse(-b.w / 2 + d.x * b.w, -b.h / 2 + d.y * b.h, 7 * U, 5 * U, 0, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    }
    // dust
    for (const d of dust) { ctx.globalAlpha = Math.max(0, d.life * 2); ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(d.x, d.y, 3 * U, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1;
    // pieces + sparks
    for (const p of pieces) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1 + Math.sin(p.wob) * 0.16, 1 - Math.sin(p.wob) * 0.16);
      jelly(-p.r, -p.r, p.r * 2, p.r * 2, p.r * 0.8, p.color); ctx.restore();
    }
    for (const s of sparks) {
      ctx.fillStyle = shade(s.color, 0.2); ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(s.x, s.y + 10 * U, s.r * 0.8, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.35, 0, 6.283); ctx.fill();
    }
    // paddle
    ctx.save(); ctx.translate(paddle.x, paddle.y); ctx.scale(1 + paddle.sq * 0.5, 1 - paddle.sq);
    ctx.fillStyle = 'rgba(70,80,120,0.2)'; ctx.beginPath(); ctx.roundRect(-paddle.w / 2, -paddle.h / 2 + 5 * U, paddle.w, paddle.h, paddle.h / 2); ctx.fill();
    jelly(-paddle.w / 2, -paddle.h / 2, paddle.w, paddle.h, paddle.h / 2, '#4a5478');
    ctx.restore();
    // balls
    for (const ball of balls) {
      for (let i = 0; i < ball.trail.length; i += 2) { ctx.globalAlpha = (i / ball.trail.length) * 0.22; ctx.fillStyle = '#8fb8ff'; ctx.beginPath(); ctx.arc(ball.trail[i], ball.trail[i + 1], ball.r * (0.4 + 0.6 * (i / ball.trail.length)), 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(70,80,120,0.22)'; ctx.beginPath(); ctx.arc(ball.x + 1, ball.y + 5 * U, ball.r, 0, 6.283); ctx.fill();
      const g = ctx.createRadialGradient(ball.x - ball.r * 0.35, ball.y - ball.r * 0.35, 1, ball.x, ball.y, ball.r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cfd6ea');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 6.283); ctx.fill();
    }
    // messages
    ctx.textAlign = 'center';
    if (banner) {
      const a = Math.min(1, banner.t * 4) * Math.min(1, (1.5 - banner.t) * 3);
      ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = '#39415c';
      ctx.font = `700 ${30 * U}px -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif`;
      ctx.fillText(banner.text, W / 2, H * 0.6); ctx.globalAlpha = 1;
    }
    if (state === 'ready' && !banner) {
      ctx.fillStyle = 'rgba(57,65,92,0.7)'; ctx.font = `500 ${14 * U}px -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif`;
      ctx.fillText(usedKeys ? 'Press space to launch' : 'Click to launch · move to steer', W / 2, H * 0.68);
    }
    if (state === 'paused') {
      ctx.fillStyle = 'rgba(238,240,246,0.7)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#39415c'; ctx.font = `700 ${24 * U}px -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif`;
      ctx.fillText('Paused', W / 2, H / 2);
    }
  }

  // -------------------------------------------------------------------- loop
  function frame(now) {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    if (state !== 'paused') step(dt);
    draw();
    if (active) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && active && !disposed) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  // ------------------------------------------------------------------- input
  const toLocal = (ev) => { const r = canvas.getBoundingClientRect(); return ((ev.clientX - r.left) / r.width) * W; };
  canvas.addEventListener('pointermove', (ev) => { paddle.tx = toLocal(ev); });
  canvas.addEventListener('pointerdown', (ev) => { audio.unlock(); paddle.tx = toLocal(ev); if (ev.pointerType !== 'touch') paddle.x = paddle.tx; launch(); kick(); });
  const onKey = (ev) => {
    if (!active || disposed || ev.target.tagName === 'INPUT') return;
    const down = ev.type === 'keydown';
    if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(ev.key)) { keys[ev.key] = down; usedKeys = true; ev.preventDefault(); }
    if (down && (ev.key === ' ' || ev.key === 'Enter')) { usedKeys = true; launch(); ev.preventDefault(); }
    if (down && (ev.key === 'p' || ev.key === 'P')) togglePause();
  };
  addEventListener('keydown', onKey); addEventListener('keyup', onKey);
  function togglePause() { if (state === 'play') state = 'paused'; else if (state === 'paused') state = 'play'; draw(); }

  startLevel(0);
  resize();
  paddle.x = paddle.tx = W / 2;
  kick();

  return {
    canvas, restart, resize, togglePause,
    setActive(on) {
      if (on === active) return;
      active = on;
      if (!on && state === 'play') { state = 'paused'; draw(); }
      if (on) kick();
    },
    dispose() { disposed = true; cancelAnimationFrame(raf); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); canvas.remove(); },
  };
}
