// Procedural textures: everything in the scene is painted at load time,
// so the page ships no texture downloads for the hardware.
import * as THREE from 'three';
import { canvasTex, rng } from './util.js';

function speckle(ctx, w, h, rand, count, colors, rMin, rMax, aMin, aMax) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w, y = rand() * h;
    const r = rMin + Math.pow(rand(), 2.2) * (rMax - rMin);
    ctx.globalAlpha = aMin + rand() * (aMax - aMin);
    ctx.fillStyle = colors[(rand() * colors.length) | 0];
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + rand() * 0.6), rand() * 3.14, 0, 6.283);
    ctx.fill();
    // wrap so the tile is seamless
    if (x < 4 || y < 4 || x > w - 4 || y > h - 4) {
      for (const [ox, oy] of [[w, 0], [-w, 0], [0, h], [0, -h]]) {
        ctx.beginPath(); ctx.ellipse(x + ox, y + oy, r, r, 0, 0, 6.283); ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function mottle(ctx, w, h, rand, count, color, alpha, size) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w, y = rand() * h, r = size * (0.5 + rand());
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('A', String(alpha * rand())));
    g.addColorStop(1, color.replace('A', '0'));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

// Fine pebbled noise used as a bump map on moulded plastic.
function noiseTex(size, seed, contrast = 1, blur = 0) {
  return canvasTex(size, size, (ctx) => {
    const rand = rng(seed), n = size * size;
    let v = new Float32Array(n);
    for (let i = 0; i < n; i++) v[i] = 128 + (rand() - 0.5) * 255 * contrast;
    if (blur) {
      // Gaussian blur done by hand (wrapping, so the tile stays seamless). Canvas `filter`
      // is not available in Safari, where the raw noise showed up as hard dots in the bump.
      const R = Math.ceil(blur * 3), k = [];
      let sum = 0;
      for (let d = -R; d <= R; d++) { const w = Math.exp(-(d * d) / (2 * blur * blur)); k.push(w); sum += w; }
      for (let pass = 0; pass < 2; pass++) {
        const out = new Float32Array(n);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          let acc = 0;
          for (let d = -R; d <= R; d++) {
            const xx = pass ? x : (x + d + size) % size, yy = pass ? (y + d + size) % size : y;
            acc += v[yy * size + xx] * k[d + R];
          }
          out[y * size + x] = acc / sum;
        }
        v = out;
      }
    }
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < n; i++) {
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v[i];
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, { srgb: false, repeat: true });
}

export function makeTextures() {
  const T = {};

  // --- SGI "granite": warm light grey with pepper flecks -------------------
  T.granite = canvasTex(1024, 1024, (ctx, w, h) => {
    const rand = rng(11);
    ctx.fillStyle = '#cfccc3'; ctx.fillRect(0, 0, w, h);
    mottle(ctx, w, h, rand, 90, 'rgba(120,112,98,A)', 0.07, 90);
    mottle(ctx, w, h, rand, 60, 'rgba(255,252,244,A)', 0.09, 110);
    speckle(ctx, w, h, rand, 5200, ['#4d4a44', '#3b3936', '#6a655c', '#2e2c2a'], 0.5, 2.6, 0.35, 0.95);
    speckle(ctx, w, h, rand, 1500, ['#8a7a66', '#7b6a55', '#96897a'], 0.5, 2.2, 0.3, 0.8);
    speckle(ctx, w, h, rand, 1700, ['#f6f3ea', '#ffffff'], 0.5, 2.0, 0.4, 0.9);
  }, { repeat: true });

  // Darker granite for key legends / control strip
  T.graniteDark = canvasTex(512, 512, (ctx, w, h) => {
    const rand = rng(12);
    ctx.fillStyle = '#b3b0a7'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, rand, 1500, ['#4d4a44', '#3b3936', '#6a655c'], 0.5, 2.2, 0.35, 0.9);
    speckle(ctx, w, h, rand, 500, ['#f1ede2'], 0.5, 1.8, 0.4, 0.8);
  }, { repeat: true });

  // --- Indy blue: saturated teal-blue with a fine navy/cyan fleck ----------
  T.indyBlue = canvasTex(1024, 1024, (ctx, w, h) => {
    const rand = rng(21);
    ctx.fillStyle = '#1873a6'; ctx.fillRect(0, 0, w, h);
    mottle(ctx, w, h, rand, 80, 'rgba(10,60,110,A)', 0.10, 120);
    mottle(ctx, w, h, rand, 80, 'rgba(70,170,215,A)', 0.09, 120);
    speckle(ctx, w, h, rand, 9000, ['#0b3f6b', '#0a3358', '#104a78', '#072845'], 0.5, 2.0, 0.3, 0.85);
    speckle(ctx, w, h, rand, 5200, ['#4fb0dc', '#63c1e6', '#3a9ccc'], 0.4, 1.6, 0.25, 0.75);
    speckle(ctx, w, h, rand, 500, ['#bfe9fb'], 0.4, 1.1, 0.3, 0.7);
  }, { repeat: true });

  T.pebble = noiseTex(512, 31, 1.0, 0.6);
  T.pebbleFine = noiseTex(256, 32, 0.8, 0);

  // --- Pale maple desk top ------------------------------------------------
  T.wood = canvasTex(2048, 1024, (ctx, w, h) => {
    const rand = rng(41);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#d9b98a'); g.addColorStop(0.5, '#d2ae7b'); g.addColorStop(1, '#dbbd90');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // long flowing grain lines
    for (let i = 0; i < 520; i++) {
      const y0 = rand() * h;
      const amp = 2 + rand() * 9, f = 0.002 + rand() * 0.004, ph = rand() * 6.28;
      ctx.strokeStyle = rand() < 0.6 ? `rgba(120,78,36,${0.03 + rand() * 0.10})` : `rgba(255,236,200,${0.03 + rand() * 0.08})`;
      ctx.lineWidth = 0.5 + rand() * 2.2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph * 2) * amp * 0.25;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // fine pores
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = `rgba(95,60,25,${0.05 + rand() * 0.12})`;
      ctx.fillRect(rand() * w, rand() * h, 3 + rand() * 14, 0.8);
    }
    // board seams
    for (let i = 1; i < 6; i++) {
      ctx.fillStyle = 'rgba(70,40,15,0.16)';
      ctx.fillRect(0, (i * h) / 6 + (rand() - 0.5) * 6, w, 1.2);
    }
  }, { repeat: true });

  T.woodRough = canvasTex(512, 512, (ctx, w, h) => {
    const rand = rng(42);
    ctx.fillStyle = '#6e6e6e'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = 80 + rand() * 80;
      ctx.fillStyle = `rgba(${v},${v},${v},0.25)`;
      ctx.fillRect(rand() * w, rand() * h, 10 + rand() * 60, 1);
    }
  }, { srgb: false, repeat: true });

  // --- Painted wall -------------------------------------------------------
  T.wallBump = noiseTex(512, 51, 0.5, 1.2);

  // --- Carpet --------------------------------------------------------------
  T.carpet = canvasTex(512, 512, (ctx, w, h) => {
    const rand = rng(61);
    ctx.fillStyle = '#3d4350'; ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, rand, 9000, ['#2c313b', '#4c5364', '#353a46', '#5a6274'], 0.6, 1.6, 0.4, 0.9);
  }, { repeat: true });

  return T;
}

// ---------------------------------------------------------------------------
// Logos & lettering (drawn, not downloaded)
// ---------------------------------------------------------------------------

// The cube logo is a single closed tube with 18 straight runs. Each face of the
// cube carries an open square of tube; where a square would close, the tube
// turns down the neighbouring edge instead and becomes the next face's square.
// Returned in view space (x right, y up, z toward the viewer), looking down the
// cube's long diagonal, scaled so the silhouette just fits a unit circle.
let CUBE = null;
export function cubeLogoPath(a = 0.8, tube = 0.112) {
  if (CUBE && a === 0.8 && tube === 0.112) return CUBE;
  const g = 1 - a, m = g / 2;
  let run = [[-a + g, -a, 1], [a, -a, 1], [a, a, 1], [-a, a, 1], [-a, -a + g, 1], [-a, -a + g, -a + g]];
  const raw = [];
  for (let k = 0; k < 3; k++) { raw.push(...run); run = run.map(([x, y, z]) => [y, z, x]); }
  const s2 = Math.SQRT1_2, s6 = 1 / Math.sqrt(6), s3 = 1 / Math.sqrt(3);
  let pts = raw.map(([x, y, z]) => { x -= m; y -= m; z -= m; return [(y - x) * s2, (2 * z - x - y) * s6, (x + y + z) * s3]; });
  let ext = 0;
  for (const p of pts) ext = Math.max(ext, Math.hypot(p[0], p[1]));
  const k = 1 / (ext + tube);
  pts = pts.map((p) => p.map((v) => v * k));
  const out = { pts, r: tube * k };
  if (a === 0.8 && tube === 0.112) CUBE = out;
  return out;
}

// Ray-cast the tube once (orthographic, 2x supersampled) into brightness + coverage;
// every coloured variant is then just a ramp lookup.
let CAST = null;
function castCubeLogo(N = 256) {
  if (CAST) return CAST;
  const { pts, r } = cubeLogoPath();
  const S = N * 2, n = pts.length;
  const segs = pts.map((A, i) => {
    const B = pts[(i + 1) % n];
    const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
    const len = Math.hypot(d[0], d[1], d[2]);
    const ax = [d[0] / len, d[1] / len, d[2] / len];
    return { A, ax, len, e: [-ax[2] * ax[0], -ax[2] * ax[1], 1 - ax[2] * ax[2]], ee: 1 - ax[2] * ax[2] };
  });
  let zMin = 1e9, zMax = -1e9;
  for (const p of pts) { zMin = Math.min(zMin, p[2]); zMax = Math.max(zMax, p[2]); }
  const lum = new Float32Array(S * S), cov = new Uint8Array(S * S);
  const Lx = -0.42, Ly = 0.6, Lz = 0.68; // key light, upper left
  const Hl = Math.hypot(Lx, Ly, Lz + 1), Hx = Lx / Hl, Hy = Ly / Hl, Hz = (Lz + 1) / Hl;
  const r2 = r * r;
  for (let py = 0; py < S; py++) {
    const y = 1 - ((py + 0.5) / S) * 2;
    for (let px = 0; px < S; px++) {
      const x = ((px + 0.5) / S) * 2 - 1;
      if (x * x + y * y > 1.02) continue;
      let best = -1e9, nx = 0, ny = 0, nz = 1;
      for (let s = 0; s < n; s++) {
        const { A, ax, len, e, ee } = segs[s];
        const qx = x - A[0], qy = y - A[1], qz = -A[2];
        const dxy = qx * qx + qy * qy;
        if (dxy <= r2) { // rounded elbow
          const h = Math.sqrt(r2 - dxy), t = A[2] + h;
          if (t > best) { best = t; nx = qx / r; ny = qy / r; nz = h / r; }
        }
        const qn = qx * ax[0] + qy * ax[1] + qz * ax[2];
        const wx = qx - qn * ax[0], wy = qy - qn * ax[1], wz = qz - qn * ax[2];
        const b = wx * e[0] + wy * e[1] + wz * e[2];
        const disc = b * b - ee * (wx * wx + wy * wy + wz * wz - r2);
        if (disc < 0) continue;
        const t = (-b + Math.sqrt(disc)) / ee;
        const along = qn + t * ax[2];
        if (along < 0 || along > len || t <= best) continue;
        best = t; nx = (wx + t * e[0]) / r; ny = (wy + t * e[1]) / r; nz = (wz + t * e[2]) / r;
      }
      if (best < -1e8) continue;
      const k = py * S + px;
      const diff = Math.max(0, nx * Lx + ny * Ly + nz * Lz);
      const spec = Math.pow(Math.max(0, nx * Hx + ny * Hy + nz * Hz), 26);
      const depth = (best - zMin) / (zMax - zMin + r); // 0 far .. 1 near
      const rim = Math.min(1, Math.max(0, nz / 0.55));
      lum[k] = Math.min(1, (0.16 + 0.6 * diff) * (0.5 + 0.5 * depth) * (0.4 + 0.6 * rim * (2 - rim)) + 0.5 * spec);
      cov[k] = 1;
    }
  }
  CAST = { lum, cov, S, N };
  return CAST;
}

const hex3 = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const v = parseInt(h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const sprites = new Map();
function cubeLogoSprite(light, mid, dark) {
  const key = light + mid + dark;
  if (sprites.has(key)) return sprites.get(key);
  const { lum, cov, S, N } = castCubeLogo();
  const big = document.createElement('canvas');
  big.width = big.height = S;
  const bctx = big.getContext('2d');
  const img = bctx.createImageData(S, S), d = img.data;
  const L = hex3(light), M = hex3(mid), D = hex3(dark);
  for (let k = 0; k < S * S; k++) {
    if (!cov[k]) continue;
    const v = lum[k], lo = v < 0.5, t = lo ? v * 2 : (v - 0.5) * 2;
    const a = lo ? D : M, b = lo ? M : L;
    d[k * 4] = a[0] + (b[0] - a[0]) * t; d[k * 4 + 1] = a[1] + (b[1] - a[1]) * t; d[k * 4 + 2] = a[2] + (b[2] - a[2]) * t;
    d[k * 4 + 3] = 255;
  }
  bctx.putImageData(img, 0, 0);
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(big, 0, 0, N, N);
  sprites.set(key, c);
  return c;
}

// Draw the cube logo centred on (cx, cy), fitting a circle of radius R.
export function drawCubeLogo(ctx, cx, cy, R, { light = '#f4f4f0', dark = '#3a3a3a', mid = '#b9b9b4' } = {}) {
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cubeLogoSprite(light, mid, dark), cx - R, cy - R, R * 2, R * 2);
  ctx.restore();
}

// "SiliconGraphics" — heavy, condensed, oblique grotesque with the two words butted together.
const SG_FONT = 'italic 700 100px "Helvetica Neue", Helvetica, "Nimbus Sans", Arial, sans-serif';
const SG_SQUEEZE = 0.8;
function sgWord(ctx, text, x, y, size, color) {
  // x is the left edge in canvas pixels; returns the drawn width
  ctx.save();
  ctx.translate(x, y); ctx.scale((size / 100) * SG_SQUEEZE, size / 100);
  ctx.font = SG_FONT; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
  ctx.fillText(text, 0, 0); ctx.strokeText(text, 0, 0);
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w * (size / 100) * SG_SQUEEZE;
}
function sgWidth(ctx, text, size) {
  ctx.save(); ctx.font = SG_FONT; const w = ctx.measureText(text).width; ctx.restore();
  return w * (size / 100) * SG_SQUEEZE;
}

// mode: 'plain' — wordmark filling the canvas (the Indy's lower slab)
//       'logo'  — printed cube followed by the wordmark (keyboard, IndyCam)
//       'split' — "Silicon      Graphics" with a gap left for a raised badge (monitor chin)
export const SG_SPLIT_GAP = 0.25; // fraction of the texture width left clear in 'split' mode
export function siliconGraphicsTex(color = '#ffffff', mode = 'plain') {
  if (mode === true) mode = 'logo';
  return canvasTex(1024, 160, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const base = h * 0.7;
    if (mode === 'split') {
      const gap = w * SG_SPLIT_GAP;
      // the badge sits dead centre, so the longer word sets the size
      const size = Math.min(118, 100 * ((w - gap) / 2 - 10) / sgWidth(ctx, 'Graphics', 100));
      const wa = sgWidth(ctx, 'Silicon', size), wb = sgWidth(ctx, 'Graphics', size);
      sgWord(ctx, 'Silicon', w / 2 - gap / 2 - wa, base, size, color);
      sgWord(ctx, 'Graphics', w / 2 + gap / 2, base, size, color);
    } else if (mode === 'logo') {
      const size = 104 * (w - 168) / sgWidth(ctx, 'SiliconGraphics', 104);
      drawCubeLogo(ctx, 70, h / 2, 64, { light: '#e9e9e4', dark: '#1c1c1e', mid: '#77777a' });
      sgWord(ctx, 'SiliconGraphics', 152, base, Math.min(size, 118), color);
    } else {
      let size = 100 * (w - 28) / sgWidth(ctx, 'SiliconGraphics', 100);
      size = Math.min(size, 122);
      sgWord(ctx, 'SiliconGraphics', (w - sgWidth(ctx, 'SiliconGraphics', size)) / 2, base, size, color);
    }
  });
}

// The INDY wordmark: four brush-drawn italic capitals — a tapered slash for the I,
// thin stems and a heavy diagonal on the N, a swelling bowl on the D, and a Y whose
// right stroke carries on below the baseline as a tail.
function ribbon(ctx, at, w0, w1, wMid = null, steps = 28) {
  const L = [], R = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, [x, y] = at(t), [x2, y2] = at(Math.min(1, t + 0.01)), [x1, y1] = at(Math.max(0, t - 0.01));
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1;
    let wd = w0 + (w1 - w0) * t;
    if (wMid != null) wd += (wMid - (w0 + w1) / 2) * Math.sin(Math.PI * t);
    L.push([x - (dy / l) * wd / 2, y + (dx / l) * wd / 2]); R.push([x + (dy / l) * wd / 2, y - (dx / l) * wd / 2]);
  }
  ctx.beginPath();
  L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  R.reverse().forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath(); ctx.fill();
}
const seg = (a, b) => (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const cubic = (p0, p1, p2, p3) => (t) => {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
};
export const INDY_UNITS = { w: 487.6, h: 121.9, glyphW: 450 }; // drawing units across the texture
export function indyWordmarkTex() {
  return canvasTex(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f4f7f9';
    ctx.save();
    ctx.scale(2.1, 2.1); ctx.translate(18, 6);
    // I
    ribbon(ctx, seg([37, 2], [3, 68]), 16, 5);
    // N
    ribbon(ctx, seg([95, 68], [121, 11]), 4.5, 6.5);
    ribbon(ctx, cubic([110, 14], [124, 6], [132, 22], [158, 69]), 11, 10, 15.5);
    ribbon(ctx, seg([157, 69], [178, 8]), 5, 7.5);
    // D
    ribbon(ctx, seg([266, 13], [243, 69]), 6.5, 5.5);
    ribbon(ctx, cubic([250, 15], [352, -2], [352, 66], [240, 68]), 6, 5.5, 16.5);
    // Y
    ribbon(ctx, cubic([370, 14], [382, 14], [392, 34], [403, 54]), 8.5, 6);
    ribbon(ctx, cubic([449, 11], [428, 34], [408, 58], [384, 107]), 15, 3.5);
    ctx.restore();
  });
}

export function textTex(text, { w = 512, h = 128, font = '600 64px Helvetica, Arial, sans-serif', color = '#222', bg = null, align = 'center', pad = 16 } = {}) {
  return canvasTex(w, h, (ctx) => {
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); } else ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color; ctx.font = font; ctx.textBaseline = 'middle'; ctx.textAlign = align;
    ctx.fillText(text, align === 'center' ? w / 2 : pad, h / 2 + 2);
  });
}

export const HAND = '"Bradley Hand", "Marker Felt", "Segoe Print", "Comic Sans MS", cursive';
