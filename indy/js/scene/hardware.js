// The hardware: Indy chassis, 17" granite monitor, IndyCam, keyboard, mouse.
// All dimensions in metres, modelled from reference photos.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { loft, projectUV, decal, shadowed, canvasTex, contactShadow } from './util.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cubeLogoPath, siliconGraphicsTex, indyWordmarkTex, INDY_UNITS, SG_SPLIT_GAP, HAND } from './textures.js';

const deg = THREE.MathUtils.degToRad;
const GR = 4.2; // granite texel density (UV units per metre)

export function makeMaterials(T) {
  const rep = (tex, n) => { const t = tex.clone(); t.repeat.set(n, n); t.needsUpdate = true; return t; };
  const M = {};
  M.granite = new THREE.MeshStandardMaterial({
    map: T.granite, roughness: 0.58, metalness: 0, bumpMap: rep(T.pebble, 3.2), bumpScale: 0.35,
  });
  M.graniteDark = new THREE.MeshStandardMaterial({
    map: T.graniteDark, roughness: 0.6, bumpMap: rep(T.pebble, 3.2), bumpScale: 0.35,
  });
  M.indy = new THREE.MeshStandardMaterial({
    map: T.indyBlue, roughness: 0.5, metalness: 0.0, bumpMap: rep(T.pebble, 2.2), bumpScale: 0.7,
  });
  M.dark = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.45 });
  M.darkMatte = new THREE.MeshStandardMaterial({ color: 0x0b1a26, roughness: 0.9 });
  M.blackGloss = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.18, metalness: 0.1 });
  M.silver = new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.28, metalness: 0.95 });
  M.key = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, bumpMap: rep(T.pebbleFine, 6), bumpScale: 0.25 });
  M.cable = new THREE.MeshStandardMaterial({ color: 0xbfbcb2, roughness: 0.6 });
  return M;
}

// ---------------------------------------------------------------------------
// The raised cube badge: the logo's real tube path, squashed into a low metal
// relief over a dark well. `radius` is the badge's half-width; it faces +z.
// ---------------------------------------------------------------------------
let badgeGeo = null, badgeMat = null, wellMat = null;
export function buildCubeBadge(radius, relief = 0.16) {
  if (!badgeGeo) {
    // fatter tube than the printed logo: neighbouring runs almost touch, as on the cast badge
    const { pts, r } = cubeLogoPath(0.8, 0.133);
    const parts = [], up = new THREE.Vector3(0, 1, 0), A = new THREE.Vector3(), B = new THREE.Vector3(), q = new THREE.Quaternion();
    pts.forEach((p, i) => {
      A.fromArray(p); B.fromArray(pts[(i + 1) % pts.length]);
      const len = A.distanceTo(B);
      const c = new THREE.CylinderGeometry(r, r, len, 14, 1, true);
      c.applyQuaternion(q.setFromUnitVectors(up, B.clone().sub(A).normalize()));
      c.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
      const s = new THREE.SphereGeometry(r, 14, 10);
      s.translate(A.x, A.y, A.z);
      parts.push(c, s);
    });
    badgeGeo = mergeGeometries(parts);
    badgeGeo.computeBoundingBox();
    badgeGeo.translate(0, 0, -badgeGeo.boundingBox.min.z);
    badgeMat = new THREE.MeshStandardMaterial({ color: 0xe4e0d6, roughness: 0.34, metalness: 0.62 });
    // a soft shadow rather than a painted plate: the case material shows through the openings
    wellMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false });
  }
  const g = new THREE.Group();
  g.name = 'badge';
  const tubes = new THREE.Mesh(badgeGeo, badgeMat);
  tubes.scale.set(radius, radius, radius * relief);
  tubes.position.z = 0.00014;
  const well = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius * 0.9, 0.0001, 6), wellMat);
  well.rotation.x = Math.PI / 2;
  g.add(well, tubes);
  return g;
}

// ---------------------------------------------------------------------------
// Indy chassis — two wedge-shaped slabs, slightly twisted against each other
// ---------------------------------------------------------------------------
export function buildIndy(M) {
  const g = new THREE.Group();
  g.name = 'indy';
  const W = 0.41, D = 0.36, H = 0.0765;
  const hL = 0.0285, hR = 0.047, gap = 0.0016;
  const xk = -W / 2 + 0.118; // where the diagonal seam begins
  const bev = 0.0022;
  const ext = { depth: D - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 4 };

  const mkSlab = (pts) => {
    const s = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    let geo = new THREE.ExtrudeGeometry(s, ext);
    geo.translate(0, 0, -D / 2 + bev);
    geo = projectUV(geo, 3.3);
    return shadowed(new THREE.Mesh(geo, M.indy));
  };
  const i = bev; // inset so bevel lands on the true outline
  const bottom = new THREE.Group();
  bottom.add(mkSlab([[-W / 2 + i, i], [W / 2 - i, i], [W / 2 - i, hR - i], [xk, hL - i], [-W / 2 + i, hL - i]]));
  bottom.position.set(0.006, 0, -0.002);
  const top = new THREE.Group();
  top.add(mkSlab([[-W / 2 + i, hL + gap + i], [xk, hL + gap + i], [W / 2 - i, hR + gap + i], [W / 2 - i, H - i], [-W / 2 + i, H - i]]));
  top.position.set(-0.005, 0, 0.004);
  top.rotation.y = deg(1.1);
  g.add(bottom, top);

  // dark fill so the seam between the slabs reads as a shadow line
  const seam = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, 0.03, D - 0.02), M.darkMatte);
  seam.position.set(0, (hL + hR) / 2, 0);
  g.add(seam);

  const zf = D / 2 + 0.0003; // front face
  // ---- ventilation slats (lower left, on both slabs)
  const slatGeo = new THREE.BoxGeometry(0.098, 0.0017, 0.002);
  for (let k = 0; k < 5; k++) {
    const a = new THREE.Mesh(slatGeo, M.darkMatte);
    a.position.set(-W / 2 + 0.058, hL + gap + 0.0045 + k * 0.0036, zf);
    top.add(a);
    const b = new THREE.Mesh(slatGeo, M.darkMatte);
    b.position.set(-W / 2 + 0.062, 0.0055 + k * 0.0041, zf);
    bottom.add(b);
  }

  // ---- power button, its engraved lead line and LED
  const power = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 24), M.dark);
  power.rotation.x = Math.PI / 2;
  power.position.set(-W / 2 + 0.034, H - 0.0125, zf);
  power.name = 'power';
  const lead = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.0009, 0.001), M.darkMatte);
  lead.position.set(-W / 2 + 0.018, H - 0.0125, zf);
  const led = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0016, 0.0016, 0.002, 12),
    new THREE.MeshStandardMaterial({ color: 0x0a1f0c, emissive: 0x39ff6a, emissiveIntensity: 3, roughness: 0.3 })
  );
  led.rotation.x = Math.PI / 2;
  led.position.set(-W / 2 + 0.0465, H - 0.0125, zf);
  // a generous invisible hit target for the tiny button
  const powerHit = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.022, 0.01), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  powerHit.position.set(-W / 2 + 0.03, H - 0.0125, zf);
  top.add(power, lead, led, powerHit);

  // ---- volume buttons ▼ ▲
  const tri = (up) => {
    const s = new THREE.Shape();
    const r = 0.0068;
    if (up) { s.moveTo(-r, -r * 0.8); s.lineTo(r, -r * 0.8); s.lineTo(0, r * 0.9); }
    else { s.moveTo(-r, r * 0.8); s.lineTo(0, -r * 0.9); s.lineTo(r, r * 0.8); }
    s.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.002, bevelEnabled: true, bevelSize: 0.0006, bevelThickness: 0.0006, bevelSegments: 2 }), M.dark);
    return m;
  };
  const volDown = tri(false); volDown.position.set(-W / 2 + 0.083, H - 0.0135, zf - 0.001);
  const volUp = tri(true); volUp.position.set(-W / 2 + 0.099, H - 0.0135, zf - 0.001);
  const volHitGeo = new THREE.BoxGeometry(0.017, 0.022, 0.01);
  const hidden = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const volDownHit = new THREE.Mesh(volHitGeo, hidden); volDownHit.position.set(-W / 2 + 0.082, H - 0.0135, zf);
  const volUpHit = new THREE.Mesh(volHitGeo, hidden); volUpHit.position.set(-W / 2 + 0.1, H - 0.0135, zf);
  top.add(volDown, volUp, volDownHit, volUpHit);

  // ---- raised cube badge + INDY wordmark on the top slab (placement measured off photos)
  const badge = buildCubeBadge(0.009);
  badge.position.set(0.11, 0.0605, zf);
  const mPerUnit = 0.0505 / INDY_UNITS.glyphW;
  const word = decal(indyWordmarkTex(), INDY_UNITS.w * mPerUnit, INDY_UNITS.h * mPerUnit, { rough: 0.4, metal: 0.15, color: 0xf6f8fa });
  word.position.set(0.157, 0.0571, zf + 0.0002);
  top.add(badge, word);

  // ---- SiliconGraphics, low on the right of the bottom slab
  const sg = decal(siliconGraphicsTex('#f4f7f9'), 0.049, 0.049 / 6.4, { rough: 0.4 });
  sg.position.set(0.163, 0.0118, zf + 0.0002);
  bottom.add(sg);

  // ---- rear latch tab + a hint of the port panel
  const latch = new THREE.Mesh(new RoundedBoxGeometry(0.034, 0.006, 0.014, 2, 0.002), M.dark);
  latch.position.set(0.01, H + 0.002, -D / 2 + 0.004);
  const ports = new THREE.Mesh(new THREE.BoxGeometry(W - 0.05, H - 0.02, 0.002), M.dark);
  ports.position.set(0, H / 2, -D / 2 - 0.001);
  g.add(latch, ports);

  const cs = contactShadow(W + 0.09, D + 0.09, 0.55);
  cs.position.y = 0.0006;
  g.add(cs);

  return { group: g, top, bottom, power: powerHit, powerCap: power, led, volUp: volUpHit, volDown: volDownHit, volUpCap: volUp, volDownCap: volDown, badge, H, W, D };
}

// ---------------------------------------------------------------------------
// Monitor
// ---------------------------------------------------------------------------
export const SCREEN_W = 0.336, SCREEN_H = 0.252;

export function buildMonitor(M, screenTexture) {
  const g = new THREE.Group();
  g.name = 'monitor';
  const Hb = 0.372;

  // plinth + swivel neck
  const plinth = shadowed(new THREE.Mesh(projectUV(new RoundedBoxGeometry(0.32, 0.024, 0.3, 4, 0.009), GR), M.granite));
  plinth.position.y = 0.012;
  const neck = shadowed(new THREE.Mesh(projectUV(new THREE.CylinderGeometry(0.1, 0.122, 0.03, 56), GR), M.granite));
  neck.position.y = 0.024 + 0.015;
  const dish = shadowed(new THREE.Mesh(projectUV(new THREE.SphereGeometry(0.105, 48, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), GR), M.granite));
  dish.scale.set(1, 0.42, 1);
  dish.position.y = 0.024 + 0.03 + 0.036;
  g.add(plinth, neck, dish);

  // body (tilts back a few degrees on the swivel)
  const body = new THREE.Group();
  body.position.set(0, 0.062, -0.01);
  body.rotation.x = deg(-3.5);
  g.add(body);

  const cy = Hb / 2, sy = cy + 0.02;
  const shell = loft([
    { z: -0.225, w: 0.2, h: 0.19, r: 0.05, y: cy - 0.012 },
    { z: -0.19, w: 0.262, h: 0.244, r: 0.055, y: cy - 0.008 },
    { z: -0.05, w: 0.372, h: 0.336, r: 0.04, y: cy - 0.002 },
    { z: 0.12, w: 0.402, h: 0.364, r: 0.028, y: cy },
    { z: 0.19, w: 0.41, h: 0.372, r: 0.022, y: cy },
    { z: 0.1975, w: 0.41, h: 0.372, r: 0.022, y: cy },
    { z: 0.2, w: 0.405, h: 0.367, r: 0.02, y: cy, hard: true },
    { z: 0.2, w: 0.352, h: 0.268, r: 0.014, y: sy, hard: true },
    { z: 0.186, w: 0.34, h: 0.256, r: 0.012, y: sy },
  ], { seg: 8, capStart: true });
  const shellMesh = shadowed(new THREE.Mesh(projectUV(shell, GR), M.granite));
  body.add(shellMesh);

  // dark tube surround behind the glass
  const mask = new THREE.Mesh(new THREE.PlaneGeometry(0.345, 0.262), new THREE.MeshBasicMaterial({ color: 0x050506 }));
  mask.position.set(0, sy, 0.1855);
  body.add(mask);

  // the picture tube: a gently bulged emissive surface
  const bulge = 0.0065;
  const sg = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H, 40, 30);
  const sp = sg.attributes.position;
  for (let k = 0; k < sp.count; k++) {
    const x = sp.getX(k) / (SCREEN_W / 2), y = sp.getY(k) / (SCREEN_H / 2);
    sp.setZ(k, bulge * (1 - x * x) * (1 - y * y) * 0.6 + bulge * 0.4 * (1 - (x * x + y * y) / 2));
  }
  sg.computeVertexNormals();
  const screenMat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: screenTexture },
      uPower: { value: 1 },
      uGain: { value: 1 },
      uTime: { value: 0 },
      uFlash: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform float uPower, uGain, uTime, uFlash;
      varying vec2 vUv;
      void main() {
        vec2 c = vUv - 0.5;
        // CRT power collapse: picture squeezes to a line, then a dot
        float sy = smoothstep(0.0, 0.55, uPower);
        float sx = smoothstep(0.0, 0.18, uPower);
        vec2 q = vec2(c.x / max(sx, 0.004), c.y / max(sy, 0.004));
        vec3 col = vec3(0.0);
        if (abs(q.x) < 0.5 && abs(q.y) < 0.5) {
          col = texture2D(map, q + 0.5).rgb;
          col += (1.0 - sy) * 1.6;
        }
        // faint scanlines + phosphor falloff toward the corners
        col *= 0.94 + 0.06 * sin(vUv.y * 768.0 * 3.14159);
        col *= 1.0 - 0.22 * dot(c, c) * 2.0;
        col *= 0.985 + 0.015 * sin(uTime * 55.0 + vUv.y * 9.0);
        col = col * uGain * step(0.001, uPower) + uFlash;
        // glass never goes fully black
        col += vec3(0.012, 0.014, 0.016);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const screen = new THREE.Mesh(sg, screenMat);
  screen.position.set(0, sy, 0.187);
  screen.name = 'screen';
  body.add(screen);

  // glass: only adds reflections on top of the picture
  const glass = new THREE.Mesh(sg, new THREE.MeshPhysicalMaterial({
    color: 0x000000, roughness: 0.07, metalness: 0, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, envMapIntensity: 0.3, specularIntensity: 1, ior: 1.52,
  }));
  glass.position.set(0, sy, 0.1878);
  glass.renderOrder = 2;
  body.add(glass);

  // anchor used to line the DOM desktop up with the tube
  const anchor = new THREE.Object3D();
  anchor.position.set(0, sy, 0.187 + bulge * 0.7);
  body.add(anchor);

  // "Silicon [cube] Graphics" on the chin
  const labelW = 0.112;
  const label = decal(siliconGraphicsTex('#26262a', 'split'), labelW, labelW / 6.4, { rough: 0.5 });
  label.position.set(0, 0.04, 0.2004);
  const mBadge = buildCubeBadge(Math.min(0.0088, labelW * SG_SPLIT_GAP * 0.36));
  mBadge.position.set(0, 0.0412, 0.2002);
  body.add(label, mBadge);

  // control strip tucked under the chin
  const strip = shadowed(new THREE.Mesh(projectUV(new RoundedBoxGeometry(0.3, 0.017, 0.03, 3, 0.004), GR), M.graniteDark));
  strip.position.set(0, -0.004, 0.176);
  body.add(strip);
  const btnGeo = new RoundedBoxGeometry(0.02, 0.005, 0.004, 2, 0.0012);
  const dotGeo = new RoundedBoxGeometry(0.006, 0.004, 0.004, 2, 0.001);
  const btnMat = new THREE.MeshStandardMaterial({ color: 0xd9d6cc, roughness: 0.5 });
  [[0.0, 1], [0.04, 1], [0.065, 1], [0.1, 1], [0.125, 1], [-0.04, 0], [-0.055, 0], [-0.07, 0], [-0.085, 0], [-0.1, 0], [-0.125, 0]].forEach(([x, big]) => {
    const b = new THREE.Mesh(big ? btnGeo : dotGeo, btnMat);
    b.position.set(x, -0.003, 0.1915);
    body.add(b);
  });
  const mled = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.0022, 0.002),
    new THREE.MeshStandardMaterial({ color: 0x0a1f0c, emissive: 0x39ff6a, emissiveIntensity: 3 }));
  mled.position.set(-0.14, -0.003, 0.1915);
  body.add(mled);

  // rear vents: a few dark grooves on the top of the housing
  for (let k = 0; k < 9; k++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.001, 0.005), M.darkMatte);
    const z = -0.13 + k * 0.013;
    const t = (z + 0.19) / 0.14; // along the taper between sections 2..3
    v.position.set(0, cy - 0.008 + (0.244 + (0.336 - 0.244) * t) / 2 + 0.0004, z);
    v.rotation.x = Math.atan2(0.046, 0.14) * -1;
    body.add(v);
  }

  // sticky note on the chin
  const note = new THREE.Mesh(
    (() => { const p = new THREE.PlaneGeometry(0.05, 0.05, 1, 8); const a = p.attributes.position;
      for (let k = 0; k < a.count; k++) { const y = a.getY(k); a.setZ(k, Math.pow(Math.max(0, -y + 0.005) / 0.03, 2) * 0.004); }
      p.computeVertexNormals(); return p; })(),
    new THREE.MeshStandardMaterial({
      map: canvasTex(256, 256, (ctx) => {
        ctx.fillStyle = '#ffe873'; ctx.fillRect(0, 0, 256, 256);
        const gr = ctx.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(0,0,0,0.10)'); gr.addColorStop(0.2, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#27324a'; ctx.textAlign = 'center';
        ctx.font = `700 40px ${HAND}`; ctx.fillText('say hi!', 128, 84);
        ctx.font = `700 29px ${HAND}`; ctx.fillText('hello@', 128, 142); ctx.fillText('apposite.ai', 128, 180);
        ctx.font = `700 34px ${HAND}`; ctx.fillText('— G', 180, 232);
      }), roughness: 0.85, side: THREE.DoubleSide,
    })
  );
  note.position.set(0.148, 0.043, 0.2012);
  note.rotation.z = deg(-5);
  note.castShadow = true;
  body.add(note);

  return { group: g, body, shell: shellMesh, screen, screenMat, glass, anchor, note, led: mled, Hb, topY: 0.062 + Hb };
}

// ---------------------------------------------------------------------------
// IndyCam — sits on top of the monitor
// ---------------------------------------------------------------------------
export function buildIndyCam(M) {
  const g = new THREE.Group();
  g.name = 'indycam';
  const cradle = shadowed(new THREE.Mesh(projectUV(new RoundedBoxGeometry(0.128, 0.007, 0.05, 3, 0.003), GR), M.granite));
  cradle.position.y = 0.0035;
  g.add(cradle);
  for (const sx of [-1, 1]) {
    const arm = shadowed(new THREE.Mesh(projectUV(new RoundedBoxGeometry(0.007, 0.042, 0.03, 3, 0.003), GR), M.granite));
    arm.position.set(sx * 0.0605, 0.024, 0);
    g.add(arm);
  }
  const barrel = new THREE.Group();
  barrel.position.y = 0.03;
  g.add(barrel);
  const tube = shadowed(new THREE.Mesh(projectUV(new THREE.CapsuleGeometry(0.0205, 0.07, 8, 28), GR), M.granite));
  tube.rotation.z = Math.PI / 2;
  tube.scale.set(1, 1, 0.92);
  barrel.add(tube);
  // centre shutter band
  const band = shadowed(new THREE.Mesh(projectUV(new THREE.CylinderGeometry(0.0222, 0.0222, 0.04, 36), GR), M.granite));
  band.rotation.z = Math.PI / 2;
  band.scale.set(1, 1, 0.92);
  barrel.add(band);
  // lens
  const lensRing = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.003, 28), M.dark);
  lensRing.rotation.x = Math.PI / 2; lensRing.position.set(0, -0.002, 0.0198);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.007, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0x05060a, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 }));
  lens.rotation.x = Math.PI / 2; lens.scale.set(1, 0.35, 1); lens.position.set(0, -0.002, 0.021);
  const tally = new THREE.Mesh(new THREE.SphereGeometry(0.0013, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x200404, emissive: 0xff2a1a, emissiveIntensity: 0 }));
  tally.position.set(0.013, 0.006, 0.0195);
  barrel.add(lensRing, lens, tally);
  const logo = decal(siliconGraphicsTex('#232325', 'logo'), 0.034, 0.0053, { rough: 0.5 });
  logo.position.set(0, 0.0125, 0.0178);
  logo.rotation.x = deg(-33);
  barrel.add(logo);
  // mic on the side
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.006, 16), M.graniteDark);
  mic.rotation.x = Math.PI / 2; mic.position.set(0.07, 0.008, 0.012);
  g.add(mic);
  barrel.rotation.x = deg(8);
  return { group: g, barrel, tally, lens };
}

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------
export function buildKeyboard(M) {
  const g = new THREE.Group();
  g.name = 'keyboard';
  const Wk = 0.472, Dk = 0.178;
  const s = new THREE.Shape();
  s.moveTo(0.004, 0); s.lineTo(Dk - 0.004, 0); s.lineTo(Dk, 0.004);
  s.lineTo(Dk, 0.028); s.lineTo(Dk - 0.006, 0.033); s.lineTo(Dk - 0.02, 0.0335);
  s.lineTo(0.012, 0.0155); s.lineTo(0.003, 0.0135); s.lineTo(0, 0.009); s.closePath();
  let geo = new THREE.ExtrudeGeometry(s, { depth: Wk - 0.008, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 3 });
  geo.translate(0, 0, 0.004);
  geo.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, -Wk / 2, 0, 1, 0, 0, -1, 0, 0, Dk / 2, 0, 0, 0, 1));
  geo = projectUV(geo, GR);
  g.add(shadowed(new THREE.Mesh(geo, M.granite)));

  const slope = Math.atan2(0.0335 - 0.0155, Dk - 0.032);
  const deck = new THREE.Group();
  // deck origin: front edge of the sloped top surface
  deck.position.set(0, 0.0155 + 0.0042, Dk / 2 - 0.012);
  deck.rotation.x = slope;
  g.add(deck);

  // layout in key units; z rows go back (negative z)
  const u = 0.0186;
  const keys = [];
  const C = 0, Mo = 1; // cream / modifier grey
  const row = (zi, x0, list) => {
    let x = x0;
    for (const k of list) {
      if (typeof k === 'number') { x += k; continue; } // gap
      const [w, tone, h = 1] = k;
      keys.push({ x: x + w / 2, z: zi, w, tone, h });
      x += w;
    }
  };
  const a = (n, t = C) => Array.from({ length: n }, () => [1, t]);
  // main block starts at x=0; nav cluster at 15.5; numpad at 19
  row(5.4, 0, [[1, Mo], 1, ...a(4, C), 0.5, ...a(4, Mo), 0.5, ...a(4, C), 0.5, ...a(3, Mo)]);
  row(4, 0, [...a(13), [2, Mo], 0.5, ...a(3, Mo), 0.5, ...a(4, Mo)]);
  row(3, 0, [[1.5, Mo], ...a(12), [1.5, Mo], 0.5, ...a(3, Mo), 0.5, ...a(3), [1, Mo, 2]]);
  row(2, 0, [[1.75, Mo], ...a(11), [2.25, Mo], 4, ...a(3)]);
  row(1, 0, [[2.25, Mo], ...a(10), [2.75, Mo], 1.5, [1, Mo], 1.5, ...a(3), [1, Mo, 2]]);
  row(0, 0, [[1.5, Mo], 1, [1.5, Mo], [7, C], [1.5, Mo], 1, [1.5, Mo], 0.5, ...a(3, Mo), 0.5, [2, C], [1, C]]);

  const total = 22.5;
  const capGeo = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  const cp = capGeo.attributes.position;
  for (let k = 0; k < cp.count; k++) if (cp.getY(k) > 0) { cp.setX(k, cp.getX(k) * 0.8); cp.setZ(k, cp.getZ(k) * 0.78 - 0.03); }
  capGeo.computeVertexNormals();
  const inst = new THREE.InstancedMesh(capGeo, M.key, keys.length);
  inst.castShadow = true; inst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const cream = new THREE.Color(0xe9e3d3), grey = new THREE.Color(0xc4bfb2);
  const base = [];
  keys.forEach((k, idx) => {
    const x = (k.x - total / 2) * u;
    // tall keys (numpad + / enter) extend toward the front row
    const z = -(k.z + 0.5 - (k.h - 1) / 2) * u - 0.006;
    dummy.position.set(x, 0.0042, z);
    dummy.scale.set(k.w * u - 0.0016, 0.0085, k.h * u - 0.0016);
    dummy.updateMatrix();
    inst.setMatrixAt(idx, dummy.matrix);
    inst.setColorAt(idx, k.tone === Mo ? grey : cream);
    base.push({ x, z, sx: dummy.scale.x, sz: dummy.scale.z });
  });
  inst.instanceColor.needsUpdate = true;
  deck.add(inst);

  // dark well under the keys
  const well = new THREE.Mesh(new THREE.BoxGeometry(total * u + 0.006, 0.002, 6.5 * u + 0.004), new THREE.MeshStandardMaterial({ color: 0x7c786f, roughness: 0.9 }));
  well.position.set(0, -0.0008, -3.2 * u - 0.006);
  well.receiveShadow = true;
  deck.add(well);

  const logo = decal(siliconGraphicsTex('#3a3a3c', 'logo'), 0.07, 0.011, { rough: 0.6 });
  logo.rotation.x = -Math.PI / 2;
  logo.position.set(-Wk / 2 + 0.06, 0.0002, -6.75 * u - 0.008);
  deck.add(logo);
  for (let k = 0; k < 3; k++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.001, 0.002),
      new THREE.MeshStandardMaterial({ color: 0x0a1f0c, emissive: 0x39ff6a, emissiveIntensity: k === 1 ? 0 : 2.2 }));
    l.position.set(Wk / 2 - 0.07 + k * 0.018, 0.0004, -6.75 * u - 0.008);
    deck.add(l);
  }

  const cs = contactShadow(Wk + 0.06, Dk + 0.06, 0.5);
  cs.position.y = 0.0006;
  g.add(cs);

  // key ripple animation (used when you click the keyboard)
  let rippleT = -1;
  const update = (dt) => {
    if (rippleT < 0) return;
    rippleT += dt;
    for (let idx = 0; idx < base.length; idx++) {
      const b = base[idx];
      const d = Math.abs(b.x + 0.21) * 3.2;
      const ph = (rippleT * 4.5 - d);
      const press = ph > 0 && ph < 1 ? Math.sin(ph * Math.PI) : 0;
      dummy.position.set(b.x, 0.0042 - press * 0.003, b.z);
      dummy.scale.set(b.sx, 0.0085, b.sz);
      dummy.updateMatrix();
      inst.setMatrixAt(idx, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (rippleT > 0.75) rippleT = -1;
  };
  return { group: g, update, ripple: () => { rippleT = 0; }, Wk, Dk };
}

// ---------------------------------------------------------------------------
// Mouse + pad
// ---------------------------------------------------------------------------
export function buildMouse(M) {
  const g = new THREE.Group();
  g.name = 'mouse';
  const rx = 0.031, ry = 0.03, rz = 0.052;
  const bodyGeo = projectUV(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.56).scale(rx, ry, rz), GR);
  const body = shadowed(new THREE.Mesh(bodyGeo, M.granite));
  body.position.y = 0.0045;
  g.add(body);
  const skirt = shadowed(new THREE.Mesh(projectUV(new THREE.CylinderGeometry(1, 1, 1, 40).scale(rx * 0.985, 0.006, rz * 0.985), GR), M.graniteDark));
  skirt.position.y = 0.003;
  g.add(skirt);
  // button seams follow the shell
  const onShell = (x, z) => new THREE.Vector3(x, 0.0045 + ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - (z / rz) ** 2)) + 0.0003, z);
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x5c5a54, roughness: 0.8 });
  const seam = (pts) => g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.00045, 5), seamMat));
  for (const x of [-0.0105, 0.0105]) seam(Array.from({ length: 10 }, (_, k) => onShell(x, -0.004 - (k / 9) * 0.04)));
  seam(Array.from({ length: 12 }, (_, k) => onShell(-0.027 + (k / 11) * 0.054, -0.004)));
  const cs = contactShadow(0.1, 0.14, 0.5);
  cs.position.y = 0.0006;
  g.add(cs);
  return { group: g, body };
}

export function cable(points, radius, mat) {
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5), 80, radius, 8), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
