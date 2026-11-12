// Desk props. Every one of them links somewhere — see main.js for the wiring.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { projectUV, shadowed, canvasTex, radialTex, rng, contactShadow, decal } from './util.js';
import { HAND, siliconGraphicsTex, drawCubeLogo } from './textures.js';

const deg = THREE.MathUtils.degToRad;
const loader = new THREE.TextureLoader();

// Paint a canvas now, repaint when an image arrives.
function imageCanvasTex(w, h, src, paint) {
  let img = null;
  const tex = canvasTex(w, h, (ctx) => paint(ctx, w, h, null));
  if (src) {
    const im = new Image();
    im.onload = () => { img = im; paint(tex.image.getContext('2d'), w, h, img); tex.needsUpdate = true; };
    im.src = src;
  }
  return tex;
}
function cover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

// ---------------------------------------------------------------------------
// Counter-balanced halogen desk lamp
// ---------------------------------------------------------------------------
export function buildLamp() {
  const g = new THREE.Group();
  g.name = 'lamp';
  const black = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.32, metalness: 0.6 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc0231c, roughness: 0.35 });
  const base = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.054, 0.082, 48), black));
  base.position.y = 0.041;
  g.add(base);
  const rodGeo = (len) => new THREE.BoxGeometry(len, 0.0045, 0.0045);
  const arm = (len, back) => {
    const a = new THREE.Group();
    for (const z of [-0.011, 0.011]) {
      const r = shadowed(new THREE.Mesh(rodGeo(len + back), black));
      r.position.set((len - back) / 2, 0, z);
      a.add(r);
    }
    return a;
  };
  // lower arm: pivots on the base, leans away then up
  const lower = arm(0.34, 0.1);
  lower.position.set(0, 0.105, 0);
  lower.rotation.z = deg(74);
  const cw1 = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.034, 20), black));
  cw1.rotation.x = Math.PI / 2; cw1.position.set(-0.1, 0, 0);
  const cw1cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.0165, 0.006, 20), red);
  cw1cap.rotation.x = Math.PI / 2; cw1cap.position.set(-0.1, 0, 0.02);
  lower.add(cw1, cw1cap);
  const post = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 12), black));
  post.position.y = 0.094;
  g.add(lower, post);
  // upper arm: from the elbow out over the desk
  const elbow = new THREE.Vector3(Math.cos(deg(74)) * 0.34, 0.105 + Math.sin(deg(74)) * 0.34, 0);
  const upper = arm(0.4, 0.12);
  upper.position.copy(elbow);
  upper.rotation.z = deg(-22);
  const cw2 = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.03, 20), black));
  cw2.rotation.x = Math.PI / 2; cw2.position.set(-0.12, 0, 0);
  const cw2cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0135, 0.0135, 0.005, 20), red);
  cw2cap.rotation.x = Math.PI / 2; cw2cap.position.set(-0.12, 0, 0.0175);
  upper.add(cw2, cw2cap);
  g.add(upper);
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.034, 12), red);
  pivot.rotation.x = Math.PI / 2; pivot.position.copy(elbow);
  g.add(pivot);
  // head
  const tip = new THREE.Vector3(elbow.x + Math.cos(deg(-22)) * 0.4, elbow.y + Math.sin(deg(-22)) * 0.4, 0);
  const head = new THREE.Group();
  head.position.copy(tip);
  head.rotation.z = deg(-12);
  const shade = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.105, 0.02, 0.046, 3, 0.006), black));
  shade.position.set(0.03, -0.004, 0);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0x2a2620, emissive: 0xffc98f, emissiveIntensity: 0, roughness: 0.4 });
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.003, 0.03), bulbMat);
  bulb.position.set(0.032, -0.0145, 0);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.03, 8), red);
  handle.rotation.z = Math.PI / 2; handle.position.set(0.095, -0.002, 0);
  head.add(shade, bulb, handle);
  g.add(head);
  const light = new THREE.SpotLight(0xffc48c, 0, 3.0, deg(66), 0.85, 1.3);
  light.position.set(tip.x + 0.03, tip.y - 0.02, 0);
  const target = new THREE.Object3D();
  target.position.set(tip.x + 0.12, 0, 0.02);
  g.add(light, target);
  light.target = target;
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.0006;
  light.shadow.radius = 5;
  light.shadow.camera.near = 0.05; light.shadow.camera.far = 2.6;
  const cs = contactShadow(0.2, 0.2, 0.55); cs.position.y = 0.0006; g.add(cs);
  return { group: g, light, bulbMat, head };
}

// ---------------------------------------------------------------------------
// Lava lamp — real marching-cubes metaballs
// ---------------------------------------------------------------------------
export function buildLavaLamp(low = false) {
  const g = new THREE.Group();
  g.name = 'lava';
  const metal = new THREE.MeshStandardMaterial({ color: 0xc9c9cc, roughness: 0.22, metalness: 1 });
  const baseProfile = [[0.001, 0], [0.058, 0], [0.058, 0.004], [0.034, 0.07], [0.047, 0.115], [0.047, 0.119], [0.001, 0.119]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(shadowed(new THREE.Mesh(new THREE.LatheGeometry(baseProfile, 48), metal)));
  const y0 = 0.112;
  const prof = [[0.042, 0], [0.05, 0.03], [0.052, 0.07], [0.045, 0.15], [0.033, 0.23], [0.024, 0.285]];
  const bottle = new THREE.Mesh(
    new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 48),
    new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 0.9, side: THREE.DoubleSide })
  );
  bottle.position.y = y0; bottle.renderOrder = 4;
  // tinted liquid
  const liquid = new THREE.Mesh(
    new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x * 0.94, y)), 40),
    new THREE.MeshStandardMaterial({ color: 0x2a1466, emissive: 0x3d1a8c, emissiveIntensity: 0.25, transparent: true, opacity: 0.5, roughness: 0.2, depthWrite: false, side: THREE.BackSide })
  );
  liquid.position.y = y0; liquid.renderOrder = 2;
  const cap = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.0255, 0.05, 40), metal));
  cap.position.y = y0 + 0.285 + 0.022;
  g.add(liquid, bottle, cap);

  const waxMat = new THREE.MeshStandardMaterial({ color: 0xff5a3c, emissive: 0xff3a55, emissiveIntensity: 0.9, roughness: 0.35 });
  const mc = new MarchingCubes(low ? 20 : 28, waxMat, false, false, 9000);
  mc.isolation = 60;
  // local cube [-1,1]^3 → bottle interior
  mc.scale.set(0.052, 0.143, 0.052);
  mc.position.y = y0 + 0.143;
  mc.renderOrder = 3;
  mc.frustumCulled = false;
  g.add(mc);
  // The lamp's glow is painted, not lit: a point light here throws a hard specular
  // streak across the lacquered desk from most camera angles.
  const glowTex = radialTex(128, [[0, 1], [0.35, 0.42], [1, 0]]);
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xff3d6e, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const deskGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), glowMat);
  deskGlow.rotation.x = -Math.PI / 2; deskGlow.position.y = 0.0012; deskGlow.renderOrder = 2;
  const wallGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), glowMat);
  wallGlow.position.set(0, y0 + 0.14, -0.19); wallGlow.renderOrder = 2;
  g.add(deskGlow, wallGlow);
  const glow = { set intensity(v) { glowMat.opacity = Math.min(1, v); }, get intensity() { return glowMat.opacity; } };

  const rand = rng(404);
  const blobs = Array.from({ length: 7 }, () => ({ ph: rand() * 6.28, sp: 0.09 + rand() * 0.12, r: rand() * 6.28, rr: 0.3 + rand() * 0.6, s: 0.5 + rand() * 0.5 }));
  const radiusAt = (t) => { // bottle radius as a 0..1 fraction of the cube half-width, t = 0..1 height
    const y = t * 0.285;
    for (let i = 0; i < prof.length - 1; i++) if (y <= prof[i + 1][1]) {
      const k = (y - prof[i][1]) / (prof[i + 1][1] - prof[i][1]);
      return (prof[i][0] + (prof[i + 1][0] - prof[i][0]) * k) / 0.052;
    }
    return 0.4;
  };
  let acc = 0;
  const update = (dt, t) => {
    acc += dt;
    if (acc < (low ? 1 / 20 : 1 / 40)) return;
    acc = 0;
    mc.reset();
    for (const b of blobs) {
      const yy = 0.5 + 0.44 * Math.sin(t * b.sp + b.ph);
      const rad = Math.max(0, radiusAt(yy) - 0.42) * 0.5 * b.rr;
      const x = 0.5 + Math.cos(t * 0.13 + b.r) * rad * 0.5;
      const z = 0.5 + Math.sin(t * 0.11 + b.r) * rad * 0.5;
      mc.addBall(x, yy, z, 0.2 * b.s * (0.55 + radiusAt(yy) * 0.6), 12);
    }
    // resting pool at the bottom
    mc.addBall(0.5, 0.03, 0.5, 0.5, 12);
    mc.update();
  };
  update(1, 0);
  const cs = contactShadow(0.2, 0.2, 0.55); cs.position.y = 0.0006; g.add(cs);
  return { group: g, update, glow, waxMat, liquid };
}

// ---------------------------------------------------------------------------
// VHS tapes — one per video
// ---------------------------------------------------------------------------
export function buildTapes(videos) {
  const g = new THREE.Group();
  g.name = 'tapes';
  const plastic = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.42 });
  const tapes = [];
  const rand = rng(8);
  const inks = ['#1b2a6b', '#8a1c1c', '#1c1c1c', '#14532d'];
  videos.forEach((v, i) => {
    const t = new THREE.Group();
    const body = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.187, 0.025, 0.103, 3, 0.0025), plastic));
    body.position.y = 0.0125;
    t.add(body);
    // spine label (faces the viewer)
    const spine = decal(canvasTex(1024, 128, (ctx) => {
      ctx.fillStyle = '#f3efe2'; ctx.fillRect(0, 0, 1024, 128);
      ctx.fillStyle = ['#d94f30', '#2b6cb0', '#e0a100', '#2f855a'][i % 4]; ctx.fillRect(0, 0, 26, 128); ctx.fillRect(998, 0, 26, 128);
      ctx.strokeStyle = 'rgba(40,60,120,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(40, 100); ctx.lineTo(984, 100); ctx.stroke();
      ctx.fillStyle = inks[i % inks.length];
      let size = 66; ctx.font = `700 ${size}px ${HAND}`;
      while (ctx.measureText(v.short).width > 900 && size > 30) { size -= 3; ctx.font = `700 ${size}px ${HAND}`; }
      ctx.textBaseline = 'middle'; ctx.fillText(v.short, 46, 60);
    }), 0.15, 0.0185, { rough: 0.8 });
    spine.position.set(0, 0.0125, 0.0518);
    t.add(spine);
    if (i === videos.length - 1) {
      // top label with reel windows on the uppermost tape
      const topLabel = decal(canvasTex(1024, 512, (ctx) => {
        ctx.clearRect(0, 0, 1024, 512);
        ctx.fillStyle = '#f3efe2'; ctx.fillRect(150, 40, 724, 250);
        ctx.fillStyle = '#d94f30'; ctx.fillRect(150, 40, 724, 34);
        ctx.fillStyle = '#1b2a6b'; ctx.font = `700 78px ${HAND}`; ctx.textAlign = 'center';
        ctx.fillText('dreamwieber', 512, 160);
        ctx.font = `700 44px ${HAND}`; ctx.fillStyle = '#333';
        ctx.fillText('tech + design history — MASTERS', 512, 236);
        ctx.fillStyle = 'rgba(30,30,34,0.9)';
        for (const x of [310, 714]) { ctx.beginPath(); ctx.roundRect(x - 120, 330, 240, 130, 18); ctx.fill(); }
        ctx.fillStyle = '#e9e6dc';
        for (const x of [310, 714]) { ctx.beginPath(); ctx.arc(x, 395, 46, 0, 6.283); ctx.fill(); }
        ctx.fillStyle = '#18181b';
        for (const x of [310, 714]) { ctx.beginPath(); ctx.arc(x, 395, 18, 0, 6.283); ctx.fill(); }
      }), 0.187, 0.0935, { rough: 0.7 });
      topLabel.rotation.x = -Math.PI / 2;
      topLabel.position.set(0, 0.0254, 0);
      t.add(topLabel);
    }
    t.position.set((rand() - 0.5) * 0.012, i * 0.0252, (rand() - 0.5) * 0.01);
    t.rotation.y = deg((rand() - 0.5) * 9);
    t.userData.video = v;
    t.userData.home = t.position.clone();
    tapes.push(t);
    g.add(t);
  });
  const cs = contactShadow(0.27, 0.18, 0.6); cs.position.y = 0.0006; g.add(cs);
  return { group: g, tapes };
}

// ---------------------------------------------------------------------------
// CD-ROM jewel cases
// ---------------------------------------------------------------------------
export function buildCDs(list) {
  const g = new THREE.Group();
  g.name = 'cds';
  const clear = new THREE.MeshPhysicalMaterial({ color: 0xdfe6ea, roughness: 0.08, transparent: true, opacity: 0.32, clearcoat: 1, envMapIntensity: 1.3 });
  const spineMat = new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 0.35 });
  const cases = [];
  list.forEach((cd, i) => {
    const c = new THREE.Group();
    const tray = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.142, 0.0092, 0.125), spineMat));
    tray.position.y = 0.0046;
    const tex = imageCanvasTex(512, 450, cd.image, (ctx, w, h, img) => {
      ctx.fillStyle = cd.bg || '#eef0f6'; ctx.fillRect(0, 0, w, h);
      if (img) {
        if (cd.iconStyle) { // centred app icon on a soft field
          const s = 250; ctx.save(); ctx.beginPath(); ctx.roundRect((w - s) / 2, 44, s, s, 56); ctx.clip();
          ctx.drawImage(img, (w - s) / 2, 44, s, s); ctx.restore();
        } else cover(ctx, img, 0, 0, w, h - 96);
      }
      ctx.fillStyle = cd.bar || '#101114'; ctx.fillRect(0, h - 96, w, 96);
      ctx.fillStyle = cd.ink || '#ffffff'; ctx.font = '700 46px "Helvetica Neue", Helvetica, Arial, sans-serif'; ctx.textBaseline = 'middle';
      ctx.fillText(cd.title, 26, h - 58);
      ctx.font = '500 21px "Helvetica Neue", Helvetica, Arial, sans-serif'; ctx.globalAlpha = 0.75;
      ctx.fillText(cd.sub, 28, h - 22); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '700 15px Helvetica, Arial, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('CD-ROM', w - 20, h - 22); ctx.textAlign = 'left';
    });
    const art = new THREE.Mesh(new THREE.PlaneGeometry(0.128, 0.1215),
      new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.04 }));
    art.rotation.x = -Math.PI / 2; art.position.set(0.006, 0.0094, 0);
    art.receiveShadow = true;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.142, 0.0012, 0.125), clear);
    lid.position.y = 0.0102; lid.renderOrder = 3;
    c.add(tray, art, lid);
    c.position.set(i * 0.012, i * 0.0106, -i * 0.006);
    c.rotation.y = deg(-8 + i * 11);
    c.userData.cd = cd;
    cases.push(c);
    g.add(c);
  });
  const cs = contactShadow(0.22, 0.2, 0.55); cs.position.y = 0.0006; g.add(cs);
  return { group: g, cases };
}

// ---------------------------------------------------------------------------
// Coffee mug with steam
// ---------------------------------------------------------------------------
export function buildMug() {
  const g = new THREE.Group();
  g.name = 'mug';
  const ceramic = new THREE.MeshPhysicalMaterial({ color: 0xf4f1ea, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  const prof = [[0.001, 0], [0.036, 0], [0.039, 0.004], [0.041, 0.09], [0.0405, 0.094], [0.0375, 0.094], [0.036, 0.008], [0.001, 0.008]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(shadowed(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), ceramic)));
  const handle = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0055, 12, 28, Math.PI), ceramic));
  handle.rotation.z = -Math.PI / 2; handle.position.set(0.04, 0.05, 0);
  g.add(handle);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.0372, 40), new THREE.MeshPhysicalMaterial({ color: 0x1c0f08, roughness: 0.08, clearcoat: 1 }));
  coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.083;
  g.add(coffee);
  const band = decal(canvasTex(512, 128, (ctx) => {
    ctx.clearRect(0, 0, 512, 128);
    drawCubeLogo(ctx, 64, 64, 46, { light: '#8fd0ee', dark: '#0d3f66', mid: '#1b78a8' });
    ctx.fillStyle = '#0d3f66'; ctx.font = 'italic 700 46px Helvetica, Arial, sans-serif'; ctx.textBaseline = 'middle';
    ctx.fillText('ideas in motion', 132, 66);
  }), 0.06, 0.015);
  // wrap the decal on the mug wall facing the viewer
  band.geometry = new THREE.CylinderGeometry(0.0412, 0.0412, 0.016, 24, 1, true, -0.75, 1.5);
  band.position.y = 0.05;
  g.add(band);
  // steam
  const steamTex = canvasTex(64, 128, (ctx) => {
    const gr = ctx.createRadialGradient(32, 64, 2, 32, 64, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.scale(1, 2); ctx.translate(0, -32); ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 128); ctx.restore();
  }, { srgb: false });
  const puffs = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.09),
      new THREE.MeshBasicMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.renderOrder = 7;
    g.add(m);
    puffs.push({ m, ph: i / 5 });
  }
  const update = (dt, t, camera) => {
    for (const p of puffs) {
      const k = (t * 0.16 + p.ph) % 1;
      p.m.position.set(Math.sin(t * 0.7 + p.ph * 9) * 0.008 * (1 + k * 2), 0.1 + k * 0.14, Math.cos(t * 0.5 + p.ph * 5) * 0.006);
      p.m.scale.setScalar(0.6 + k * 1.3);
      p.m.material.opacity = Math.sin(k * Math.PI) * 0.11;
      p.m.quaternion.copy(camera.quaternion);
    }
  };
  const cs = contactShadow(0.16, 0.14, 0.55); cs.position.set(0.006, 0.0006, 0); g.add(cs);
  return { group: g, update };
}

// ---------------------------------------------------------------------------
// Lab notebook + pencil (Gregory Builds)
// ---------------------------------------------------------------------------
export function buildNotebook() {
  const g = new THREE.Group();
  g.name = 'notebook';
  const pages = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.148, 0.011, 0.208), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.9 })));
  pages.position.y = 0.0065;
  const coverTex = canvasTex(512, 720, (ctx, w, h) => {
    const rand = rng(3);
    ctx.fillStyle = '#b08a57'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { ctx.fillStyle = `rgba(${rand() < 0.5 ? '70,45,20' : '235,205,160'},${rand() * 0.12})`; ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1); }
    ctx.fillStyle = '#f6f1e4'; ctx.beginPath(); ctx.roundRect(70, 150, 372, 250, 6); ctx.fill();
    ctx.strokeStyle = '#27324a'; ctx.lineWidth = 3; ctx.strokeRect(84, 164, 344, 222);
    ctx.fillStyle = '#27324a'; ctx.textAlign = 'center';
    ctx.font = '800 50px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillText('GREGORY', 256, 238); ctx.fillText('BUILDS', 256, 292);
    ctx.font = `700 34px ${HAND}`; ctx.fillStyle = '#b3261e';
    ctx.fillText('lab notebook  ▶', 256, 352);
    ctx.font = `700 26px ${HAND}`; ctx.fillStyle = 'rgba(40,30,20,0.7)';
    ctx.fillText('experiments · vibe coding · art', 256, 640);
  });
  const coverM = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.152, 0.0015, 0.212),
    [0, 1, 2, 3, 4, 5].map((i) => new THREE.MeshStandardMaterial(i === 2 ? { map: coverTex, roughness: 0.85 } : { color: 0xa98250, roughness: 0.9 }))));
  coverM.position.y = 0.0128;
  const backCover = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.152, 0.0015, 0.212), new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.9 })));
  backCover.position.y = 0.0008;
  g.add(pages, coverM, backCover);
  // wire-o binding along the left edge
  const wire = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.3, metalness: 0.8 });
  const ringGeo = new THREE.TorusGeometry(0.0078, 0.0009, 6, 14);
  const rings = new THREE.InstancedMesh(ringGeo, wire, 26);
  const d = new THREE.Object3D();
  for (let i = 0; i < 26; i++) { d.position.set(-0.071, 0.0068, -0.097 + i * 0.00776); d.rotation.set(0, 0, 0); d.updateMatrix(); rings.setMatrixAt(i, d.matrix); }
  rings.castShadow = true;
  g.add(rings);
  // pencil
  const pencil = new THREE.Group();
  const shaft = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.15, 6), new THREE.MeshStandardMaterial({ color: 0xf2b21b, roughness: 0.45 })));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.0036, 0.014, 6), new THREE.MeshStandardMaterial({ color: 0xe2c49a, roughness: 0.8 }));
  cone.position.y = 0.082;
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0012, 0.0045, 6), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }));
  lead.position.y = 0.0868;
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.011, 10), new THREE.MeshStandardMaterial({ color: 0xb9b9b9, metalness: 1, roughness: 0.3 }));
  ferrule.position.y = -0.0795;
  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.009, 10), new THREE.MeshStandardMaterial({ color: 0xd9788a, roughness: 0.9 }));
  eraser.position.y = -0.0895;
  pencil.add(shaft, cone, lead, ferrule, eraser);
  pencil.rotation.set(Math.PI / 2, 0, deg(62), 'YXZ');
  pencil.position.set(0.03, 0.0172, 0.03);
  g.add(pencil);
  const cs = contactShadow(0.22, 0.27, 0.5); cs.position.y = 0.0006; g.add(cs);
  return { group: g };
}

// ---------------------------------------------------------------------------
// The product brochure (the one SGI mailed back)
// ---------------------------------------------------------------------------
export function buildBrochure() {
  const g = new THREE.Group();
  g.name = 'brochure';
  const tex = canvasTex(768, 994, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0b1030'); bg.addColorStop(0.55, '#24135c'); bg.addColorStop(1, '#0a5a8a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // 90s gradient horizon + grid
    const sun = ctx.createRadialGradient(w * 0.62, h * 0.52, 10, w * 0.62, h * 0.52, 420);
    sun.addColorStop(0, 'rgba(255,170,90,0.95)'); sun.addColorStop(0.35, 'rgba(240,70,140,0.55)'); sun.addColorStop(1, 'rgba(60,20,120,0)');
    ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,220,255,0.35)'; ctx.lineWidth = 1.5;
    for (let i = 0; i <= 14; i++) { const y = h * 0.62 + Math.pow(i / 14, 2.2) * h * 0.4; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(w / 2 + i * 22, h * 0.62); ctx.lineTo(w / 2 + i * 150, h); ctx.stroke(); }
    // the machine, drawn simply
    ctx.save(); ctx.translate(w * 0.5, h * 0.5);
    ctx.fillStyle = '#d6d3ca'; ctx.beginPath(); ctx.roundRect(-150, -210, 300, 262, 16); ctx.fill();
    ctx.fillStyle = '#10131a'; ctx.beginPath(); ctx.roundRect(-122, -184, 244, 184, 8); ctx.fill();
    const sc = ctx.createLinearGradient(-122, -184, 122, 0); sc.addColorStop(0, '#3c6ea8'); sc.addColorStop(1, '#6fb7d8');
    ctx.fillStyle = sc; ctx.fillRect(-112, -174, 224, 164);
    ctx.fillStyle = '#c9c6bd'; ctx.fillRect(-90, 52, 180, 22);
    ctx.fillStyle = '#1a78ad'; ctx.beginPath(); ctx.roundRect(-170, 74, 340, 58, 4); ctx.fill();
    ctx.fillStyle = '#12608e'; ctx.fillRect(-170, 104, 340, 3);
    ctx.restore();
    ctx.fillStyle = '#ffffff'; ctx.font = 'italic 300 150px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillText('Indy', 54, 190);
    ctx.font = '500 30px "Helvetica Neue", Helvetica, Arial, sans-serif';
    ctx.fillText('See what you can do.', 62, 246);
    ctx.font = 'italic 700 34px "Helvetica Neue", Helvetica, Arial, sans-serif';
    drawCubeLogo(ctx, 82, h - 74, 34, { light: '#ffffff', dark: '#0b1030', mid: '#b9c6d8' });
    ctx.fillStyle = '#fff'; ctx.fillText('SiliconGraphics', 130, h - 62);
    ctx.font = '400 19px "Helvetica Neue", Helvetica, Arial, sans-serif'; ctx.globalAlpha = 0.8;
    ctx.fillText('Computer Systems · Product Literature', 132, h - 34);
  });
  const paper = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.12 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.8 });
  const m = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.2159, 0.0028, 0.2794), [edge, edge, paper, edge, edge, edge]));
  m.position.y = 0.0015;
  g.add(m);
  const cs = contactShadow(0.27, 0.33, 0.4); cs.position.y = 0.0004; g.add(cs);
  return { group: g };
}

// ---------------------------------------------------------------------------
// Mouse pad
// ---------------------------------------------------------------------------
export function buildMousePad() {
  const g = new THREE.Group();
  g.name = 'pad';
  const tex = canvasTex(512, 440, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#20242c'); bg.addColorStop(1, '#2b3140');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const rand = rng(6);
    for (let i = 0; i < 9000; i++) { ctx.fillStyle = `rgba(255,255,255,${rand() * 0.035})`; ctx.fillRect(rand() * w, rand() * h, 1, 1); }
    ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.font = '300 44px "Helvetica Neue", Helvetica, Arial, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('apposite', w - 30, h - 34);
    ctx.fillStyle = '#ff7a3d'; ctx.beginPath(); ctx.arc(w - 214, h - 48, 7, 0, 6.283); ctx.fill();
  });
  const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
  const side = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.9 });
  const m = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.235, 0.004, 0.2, 2, 0.002), top));
  m.position.y = 0.002;
  m.material = top;
  g.add(m);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.233, 0.0025, 0.198), side); rim.position.y = 0.0013; g.add(rim);
  return { group: g };
}

// ---------------------------------------------------------------------------
// Sword fern in a terracotta pot (Clery Farm)
// ---------------------------------------------------------------------------
export function buildFern() {
  const g = new THREE.Group();
  g.name = 'fern';
  const terracotta = new THREE.MeshStandardMaterial({ color: 0xb5613c, roughness: 0.85 });
  const prof = [[0.001, 0], [0.052, 0], [0.07, 0.11], [0.076, 0.112], [0.076, 0.128], [0.066, 0.128], [0.064, 0.12], [0.001, 0.118]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(shadowed(new THREE.Mesh(new THREE.LatheGeometry(prof, 40), terracotta)));
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.066, 24), new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 1 }));
  soil.rotation.x = -Math.PI / 2; soil.position.y = 0.12; g.add(soil);

  const frondTex = canvasTex(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const rand = rng(17);
    ctx.strokeStyle = '#3f5a22'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w - 10, h / 2); ctx.stroke();
    const n = 46;
    for (let i = 2; i < n; i++) {
      const t = i / n, x = t * w;
      const len = (h * 0.47) * Math.sin(Math.pow(t, 0.75) * Math.PI) * (0.9 + rand() * 0.15) + 6;
      const wid = 15 * (1 - t * 0.55);
      for (const s of [-1, 1]) {
        const gcol = ctx.createLinearGradient(x, h / 2, x + 14, h / 2 + s * len);
        gcol.addColorStop(0, '#2f6b28'); gcol.addColorStop(1, rand() < 0.5 ? '#4f9a3a' : '#3d8433');
        ctx.fillStyle = gcol;
        ctx.beginPath();
        ctx.moveTo(x, h / 2);
        ctx.quadraticCurveTo(x + wid * 1.3, h / 2 + s * len * 0.45, x + 18, h / 2 + s * len);
        ctx.quadraticCurveTo(x - wid * 0.4, h / 2 + s * len * 0.5, x - wid * 0.4, h / 2);
        ctx.closePath(); ctx.fill();
      }
    }
  });
  const leafMat = new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.65 });
  const rand = rng(23);
  const N = 17;
  for (let i = 0; i < N; i++) {
    const len = 0.3 + rand() * 0.2, wid = 0.085 + rand() * 0.03;
    const geo = new THREE.PlaneGeometry(len, wid, 14, 2);
    geo.translate(len / 2, 0, 0);
    const p = geo.attributes.position;
    const lift = 0.9 + rand() * 0.5, droop = 1.1 + rand() * 1.1;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k), t = x / len;
      const ang = lift - droop * t * t; // elevation along the frond
      // integrate a simple arc
      const px = len * (t - (droop * t * t * t) / 6) * Math.cos(lift * 0.72);
      const py = len * (Math.sin(lift) * t - 0.42 * droop * t * t * t);
      p.setXYZ(k, px, py + Math.abs(y) * 0.25 * (1 - t), y + Math.sin(t * 5 + i) * 0.006);
      void ang;
    }
    geo.computeVertexNormals();
    const m = shadowed(new THREE.Mesh(geo, leafMat));
    m.position.y = 0.118;
    m.rotation.y = (i / N) * Math.PI * 2 + rand() * 0.5;
    m.userData.sway = rand() * 6.28;
    g.add(m);
  }
  const cs = contactShadow(0.26, 0.26, 0.6); cs.position.y = 0.0006; g.add(cs);
  return { group: g };
}

// ---------------------------------------------------------------------------
// Framed prints on the wall
// ---------------------------------------------------------------------------
export function buildFrame(src, w, h, { mat = 0.035 } = {}) {
  const g = new THREE.Group();
  g.name = 'frame';
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.35, metalness: 0.2 });
  const outerW = w + mat * 2 + 0.03, outerH = h + mat * 2 + 0.03;
  const f = shadowed(new THREE.Mesh(new RoundedBoxGeometry(outerW, outerH, 0.022, 2, 0.003), frameMat));
  g.add(f);
  const matte = new THREE.Mesh(new THREE.PlaneGeometry(outerW - 0.03, outerH - 0.03), new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.95 }));
  matte.position.z = 0.0114; matte.receiveShadow = true;
  const tex = loader.load(src); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
  art.position.z = 0.0118; art.receiveShadow = true;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(outerW - 0.03, outerH - 0.03),
    new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.05, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 0.35 }));
  glass.position.z = 0.0124; glass.renderOrder = 3;
  g.add(matte, art, glass);
  return { group: g };
}
