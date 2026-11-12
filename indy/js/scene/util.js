// Shared geometry + texture helpers for the Indy scene.
import * as THREE from 'three';

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);

let maxAniso = 8;
export function setMaxAnisotropy(n) { maxAniso = Math.min(8, n || 1); }

export function canvasTex(w, h, draw, { srgb = true, repeat = false, mip = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = maxAniso;
  t.generateMipmaps = mip;
  if (!mip) t.minFilter = THREE.LinearFilter;
  return t;
}

// A soft radial falloff (white, alpha from `stops`: [radius 0..1, alpha] pairs) built as raw
// pixel data. Smooth gradients must not go through a 2D canvas: Safari perturbs canvas pixels
// on read-back, which showed up as dark dots in the lava lamp's glow.
export function radialTex(size, stops) {
  const data = new Uint8Array(size * size * 4), h = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x + 0.5 - h, y + 0.5 - h) / h;
    let a = d <= stops[0][0] ? stops[0][1] : 0;
    for (let i = 1; i < stops.length; i++) {
      const [r0, a0] = stops[i - 1], [r1, a1] = stops[i];
      if (d > r0 && d <= r1) a = a0 + (a1 - a0) * ((d - r0) / (r1 - r0));
    }
    const k = (y * size + x) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(a * 255);
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// Re-project UVs per triangle along the dominant axis of the face normal so
// isotropic textures (granite, pebbled plastic, wood) keep a constant texel
// density on any shape. `scale` = UV units per metre.
export function projectUV(geo, scale = 1, { woodAxis = null } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    e1.subVectors(b, a); e2.subVectors(c, a); n.crossVectors(e1, e2);
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = k === 0 ? a : k === 1 ? b : c;
      let u, w;
      if (ay >= ax && ay >= az) { u = v.x; w = v.z; }
      else if (ax >= az) { u = v.z; w = v.y; }
      else { u = v.x; w = v.y; }
      if (woodAxis === 'x' && !(ay >= ax && ay >= az) && ax >= az) { u = v.y; w = v.z; }
      uv[(i + k) * 2] = u * scale;
      uv[(i + k) * 2 + 1] = w * scale;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// Points of a rounded rectangle, counter-clockwise seen from +z.
export function roundedRectPoints(w, h, r, seg = 6) {
  r = Math.min(r, w / 2 - 1e-5, h / 2 - 1e-5);
  const pts = [];
  const corners = [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
    [w / 2 - r, -h / 2 + r, Math.PI * 1.5],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

// Loft a stack of rounded-rect cross-sections into a shell.
// sections: [{ z, w, h, r, x?, y?, hard? }]  — `hard` splits normals at that ring.
// caps: { start: bool, end: bool } closes the first / last ring.
export function loft(sections, { seg = 6, capStart = false, capEnd = false } = {}) {
  const n = 4 * (seg + 1);
  const pos = [];
  const idx = [];
  const ringStart = []; // per section: [inIndex, outIndex]
  const pushRing = (s) => {
    const start = pos.length / 3;
    for (const [x, y] of roundedRectPoints(s.w, s.h, s.r ?? 0.001, seg)) pos.push(x + (s.x || 0), y + (s.y || 0), s.z);
    return start;
  };
  sections.forEach((s, i) => {
    const a = pushRing(s);
    const b = s.hard && i > 0 && i < sections.length - 1 ? pushRing(s) : a;
    ringStart.push([a, b]);
  });
  for (let i = 0; i < sections.length - 1; i++) {
    const A = ringStart[i][1], B = ringStart[i + 1][0];
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;
      idx.push(A + k, A + k2, B + k, A + k2, B + k2, B + k);
    }
  }
  const cap = (s, flip) => {
    const start = pushRing(s);
    const c = pos.length / 3;
    pos.push(s.x || 0, s.y || 0, s.z);
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;
      if (flip) idx.push(c, start + k2, start + k); else idx.push(c, start + k, start + k2);
    }
  };
  if (capStart) cap(sections[0], true);
  if (capEnd) cap(sections[sections.length - 1], false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A flat decal quad that sits a hair above a surface.
export function decal(tex, w, h, { emissive = false, opacity = 1, metal = 0, rough = 0.6, color = 0xffffff } = {}) {
  const m = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, opacity, depthWrite: false, roughness: rough, metalness: metal, color,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  if (emissive) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = tex; m.emissiveIntensity = 0.4; }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.receiveShadow = true;
  return mesh;
}

export function shadowed(mesh, cast = true, receive = true) {
  mesh.castShadow = cast; mesh.receiveShadow = receive;
  return mesh;
}

// Soft radial contact-shadow blob laid on a surface (cheap ambient occlusion).
let blobTex = null;
export function contactShadow(w, d, strength = 0.5) {
  if (!blobTex) {
    blobTex = radialTex(128, [[0.125, 1], [0.606, 0.55], [1, 0]]);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: strength, depthWrite: false, color: 0x000000,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}
