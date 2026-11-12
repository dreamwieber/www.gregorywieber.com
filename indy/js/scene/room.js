// The room: desk, walls, window with venetian blinds, sky + treeline, light shafts.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { projectUV, shadowed, canvasTex, rng } from './util.js';

export const ROOM = {
  floorY: -0.74, ceilY: 1.75, backZ: -0.47, frontZ: 2.7, leftX: -1.32, rightX: 2.1,
  win: { z0: -0.28, z1: 0.98, y0: 0.14, y1: 1.44 },
  desk: { w: 1.78, d: 0.84, t: 0.036 },
};

export function buildRoom(T) {
  const g = new THREE.Group();
  const R = ROOM;
  const out = { group: g };

  // ---- desk --------------------------------------------------------------
  const woodMap = T.wood.clone(); woodMap.repeat.set(1, 2); woodMap.needsUpdate = true;
  const woodRough = T.woodRough.clone(); woodRough.repeat.set(3, 3); woodRough.needsUpdate = true;
  const deskMat = new THREE.MeshPhysicalMaterial({
    map: woodMap, roughness: 0.5, roughnessMap: woodRough, clearcoat: 0.12, clearcoatRoughness: 0.45,
    bumpMap: woodRough, bumpScale: 0.08,
  });
  const top = shadowed(new THREE.Mesh(projectUV(new RoundedBoxGeometry(R.desk.w, R.desk.t, R.desk.d, 3, 0.006), 0.8), deskMat));
  top.position.set(0, -R.desk.t / 2, -0.01);
  top.name = 'desk';
  g.add(top);
  const steel = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.38, metalness: 0.75 });
  const legH = -R.floorY - R.desk.t;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.032, legH, 0.032), steel));
      leg.position.set(sx * (R.desk.w / 2 - 0.07), -R.desk.t - legH / 2, -0.01 + sz * (R.desk.d / 2 - 0.07));
      g.add(leg);
    }
    const rail = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, R.desk.d - 0.14), steel));
    rail.position.set(sx * (R.desk.w / 2 - 0.07), -R.desk.t - 0.016, -0.01);
    g.add(rail);
    const foot = rail.clone(); foot.position.y = R.floorY + 0.12; g.add(foot);
  }
  const back = shadowed(new THREE.Mesh(new THREE.BoxGeometry(R.desk.w - 0.14, 0.032, 0.032), steel));
  back.position.set(0, -R.desk.t - 0.016, -0.01 - (R.desk.d / 2 - 0.07));
  g.add(back);

  // ---- shell ---------------------------------------------------------------
  const wallBump = T.wallBump.clone(); wallBump.repeat.set(1, 1); wallBump.needsUpdate = true;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.93, bumpMap: wallBump, bumpScale: 0.25 });
  out.wallMat = wallMat;
  const box = (x0, x1, y0, y1, z0, z1, mat = wallMat, uv = 1.2) => {
    const m = shadowed(new THREE.Mesh(projectUV(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), uv), mat));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    g.add(m);
    return m;
  };
  const th = 0.16;
  // back wall, right wall, front wall, ceiling
  box(R.leftX - th, R.rightX + th, R.floorY, R.ceilY, R.backZ - th, R.backZ);
  box(R.rightX, R.rightX + th, R.floorY, R.ceilY, R.backZ, R.frontZ);
  box(R.leftX - th, R.rightX + th, R.floorY, R.ceilY, R.frontZ, R.frontZ + th);
  box(R.leftX - th, R.rightX + th, R.ceilY, R.ceilY + th, R.backZ - th, R.frontZ + th,
    new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.95 }));
  // left wall with the window opening
  const w = R.win;
  box(R.leftX - th, R.leftX, R.floorY, w.y0, R.backZ, R.frontZ);
  box(R.leftX - th, R.leftX, w.y1, R.ceilY, R.backZ, R.frontZ);
  box(R.leftX - th, R.leftX, w.y0, w.y1, R.backZ, w.z0);
  box(R.leftX - th, R.leftX, w.y0, w.y1, w.z1, R.frontZ);

  const carpet = T.carpet.clone(); carpet.repeat.set(1, 1); carpet.needsUpdate = true;
  const floor = new THREE.Mesh(projectUV(new THREE.BoxGeometry(R.rightX - R.leftX + 0.4, 0.1, R.frontZ - R.backZ + 0.4), 2.2),
    new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }));
  floor.position.set((R.leftX + R.rightX) / 2, R.floorY - 0.05, (R.backZ + R.frontZ) / 2);
  floor.receiveShadow = true;
  g.add(floor);
  // baseboard
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.6 });
  box(R.leftX, R.rightX, R.floorY, R.floorY + 0.09, R.backZ, R.backZ + 0.014, baseMat);
  box(R.leftX, R.leftX + 0.014, R.floorY, R.floorY + 0.09, R.backZ, R.frontZ, baseMat);

  // ---- window frame, sill, glass -----------------------------------------
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.45 });
  const fx0 = R.leftX - th, fx1 = R.leftX + 0.012, ft = 0.045;
  box(fx0, fx1, w.y0 - 0.02, w.y0 + ft * 0.5, w.z0 - ft, w.z1 + ft, frameMat);        // bottom
  box(fx0, fx1, w.y1 - ft * 0.5, w.y1 + ft, w.z0 - ft, w.z1 + ft, frameMat);          // top
  box(fx0, fx1, w.y0, w.y1, w.z0 - ft, w.z0 + 0.012, frameMat);                        // back jamb
  box(fx0, fx1, w.y0, w.y1, w.z1 - 0.012, w.z1 + ft, frameMat);                        // front jamb
  box(fx0 + 0.05, fx0 + 0.09, w.y0, w.y1, (w.z0 + w.z1) / 2 - 0.016, (w.z0 + w.z1) / 2 + 0.016, frameMat); // mullion
  box(fx0 + 0.05, fx0 + 0.09, (w.y0 + w.y1) / 2 + 0.2, (w.y0 + w.y1) / 2 + 0.23, w.z0, w.z1, frameMat);   // transom
  box(R.leftX - 0.01, R.leftX + 0.07, w.y0 - 0.035, w.y0, w.z0 - 0.06, w.z1 + 0.06, frameMat);            // sill
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w.z1 - w.z0, w.y1 - w.y0),
    new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.03, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 0.25 }));
  glass.rotation.y = Math.PI / 2;
  glass.position.set(fx0 + 0.07, (w.y0 + w.y1) / 2, (w.z0 + w.z1) / 2);
  g.add(glass);

  // ---- venetian blinds ----------------------------------------------------
  const blinds = new THREE.Group();
  const slatLen = w.z1 - w.z0 - 0.03, slatW = 0.026, pitch = 0.0225;
  const count = Math.floor((w.y1 - w.y0 - 0.06) / pitch);
  const slatGeo = new THREE.BoxGeometry(slatW, 0.0008, slatLen, 4, 1, 1);
  // slight crown across the slat width like real aluminium slats
  const sp = slatGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) { const x = sp.getX(i) / (slatW / 2); sp.setY(i, sp.getY(i) + (1 - x * x) * 0.0016); }
  slatGeo.computeVertexNormals();
  const slatMat = new THREE.MeshStandardMaterial({ color: 0xf1eee6, roughness: 0.42, metalness: 0.15, side: THREE.DoubleSide });
  const slats = new THREE.InstancedMesh(slatGeo, slatMat, count);
  slats.castShadow = true; slats.receiveShadow = true;
  const d = new THREE.Object3D();
  const setTilt = (tilt) => {
    for (let i = 0; i < count; i++) {
      d.position.set(R.leftX + 0.04, w.y0 + 0.035 + i * pitch, (w.z0 + w.z1) / 2);
      d.rotation.set(0, 0, tilt);
      d.updateMatrix();
      slats.setMatrixAt(i, d.matrix);
    }
    slats.instanceMatrix.needsUpdate = true;
  };
  setTilt(THREE.MathUtils.degToRad(-24));
  blinds.add(slats);
  const rail = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, slatLen + 0.02), frameMat));
  rail.position.set(R.leftX + 0.04, w.y1 - 0.02, (w.z0 + w.z1) / 2);
  const bottomRail = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.012, slatLen + 0.01), frameMat));
  bottomRail.position.set(R.leftX + 0.04, w.y0 + 0.02, (w.z0 + w.z1) / 2);
  blinds.add(rail, bottomRail);
  const cordMat = new THREE.MeshStandardMaterial({ color: 0xe6e2d8, roughness: 0.8 });
  for (const t of [0.14, 0.5, 0.86]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, w.y1 - w.y0 - 0.05, 5), cordMat);
    c.position.set(R.leftX + 0.04, (w.y0 + w.y1) / 2, w.z0 + 0.015 + slatLen * t);
    blinds.add(c);
  }
  g.add(blinds);
  out.setBlindTilt = setTilt;

  // ---- sky dome + treeline (seen through the blinds, and in reflections) ---
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x3f86d9) }, uHorizon: { value: new THREE.Color(0xd8ebff) },
      uGlow: { value: new THREE.Color(0xfff0cf) }, uSunDir: { value: new THREE.Vector3(-1, 0.5, 0.5).normalize() },
      uStars: { value: 0 }, uGain: { value: 1 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uTop, uHorizon, uGlow, uSunDir; uniform float uStars, uGain; varying vec3 vDir;
      float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main(){
        vec3 d = normalize(vDir);
        float h = clamp(d.y * 1.6 + 0.08, 0.0, 1.0);
        vec3 col = mix(uHorizon, uTop, pow(h, 0.65));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        col += uGlow * (pow(s, 6.0) * 0.35 + pow(s, 900.0) * 30.0);
        vec3 c = floor(d * 190.0);
        float st = step(0.9965, hash(c)) * (0.4 + 0.6 * hash(c + 3.1));
        col += vec3(0.9, 0.95, 1.0) * st * uStars * smoothstep(0.0, 0.25, d.y);
        gl_FragColor = vec4(col * uGain, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), skyMat);
  g.add(sky);
  out.skyMat = skyMat;

  const treeTex = canvasTex(2048, 512, (ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    const rand = rng(77);
    const fir = (x, base, hgt, wdt) => {
      ctx.beginPath();
      ctx.moveTo(x, base - hgt);
      const tiers = 9 + ((rand() * 5) | 0);
      for (let i = 1; i <= tiers; i++) {
        const t = i / tiers, yy = base - hgt + hgt * t, ww = wdt * (0.12 + t * 0.9) * (0.8 + rand() * 0.4);
        ctx.lineTo(x + ww, yy); ctx.lineTo(x + ww * 0.45, yy - hgt * 0.02);
      }
      ctx.lineTo(x, base);
      for (let i = tiers; i >= 1; i--) {
        const t = i / tiers, yy = base - hgt + hgt * t, ww = wdt * (0.12 + t * 0.9) * (0.8 + rand() * 0.4);
        ctx.lineTo(x - ww * 0.45, yy - hgt * 0.02); ctx.lineTo(x - ww, yy);
      }
      ctx.closePath(); ctx.fill();
    };
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 70; i++) fir(rand() * W, H, 200 + rand() * 290, 34 + rand() * 30);
    ctx.fillRect(0, H - 24, W, 24);
  });
  treeTex.wrapS = THREE.RepeatWrapping;
  const mkTrees = (dist, height, y, color, repeat) => {
    const t = treeTex.clone(); t.repeat.set(repeat, 1); t.offset.x = dist * 0.37; t.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ map: t, color, transparent: true, depthWrite: false });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(dist, dist, height, 48, 1, true, Math.PI * 0.75, Math.PI * 1.5), mat);
    m.material.side = THREE.BackSide;
    m.position.set(R.leftX, y, 0.3);
    g.add(m);
    return mat;
  };
  out.treeFar = mkTrees(30, 9, 2.2, 0x7f9db8, 6);
  out.treeNear = mkTrees(17, 7.5, 1.5, 0x2f5246, 4);

  // ---- volumetric light shafts through the blinds ---------------------------
  const shaftTex = canvasTex(256, 256, (ctx) => {
    const rand = rng(5);
    const gr = ctx.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.06, 'rgba(255,255,255,1)');
    gr.addColorStop(0.55, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 256, 256);
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(0,0,0,${rand() * 0.35})`; ctx.fillRect(rand() * 256, 0, 2 + rand() * 14, 256); }
    const e = ctx.createLinearGradient(0, 0, 256, 0);
    e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(0.12, 'rgba(0,0,0,0)'); e.addColorStop(0.88, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = e; ctx.fillRect(0, 0, 256, 256);
  }, { srgb: false });
  const shaftMat = new THREE.MeshBasicMaterial({
    map: shaftTex, color: 0xfff0d2, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const shafts = new THREE.Mesh(new THREE.BufferGeometry(), shaftMat);
  shafts.renderOrder = 5;
  shafts.frustumCulled = false;
  g.add(shafts);
  out.shaftMat = shaftMat;
  out.setShaftDir = (dir) => {
    const N = 11, pos = [], uv = [], idx = [];
    for (let i = 0; i < N; i++) {
      const y = w.y0 + 0.1 + ((w.y1 - w.y0 - 0.16) * i) / (N - 1);
      const L = Math.min(4.2, (y - R.floorY) / Math.max(0.05, -dir.y));
      const x = R.leftX + 0.05;
      const a = [x, y, w.z0 + 0.03], b = [x, y, w.z1 - 0.03];
      const c = [b[0] + dir.x * L, b[1] + dir.y * L, b[2] + dir.z * L], e = [a[0] + dir.x * L, a[1] + dir.y * L, a[2] + dir.z * L];
      const o = pos.length / 3;
      pos.push(...a, ...b, ...c, ...e);
      uv.push(0, 1, 1, 1, 1, 0, 0, 0);
      idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
    shafts.geometry.dispose();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    shafts.geometry = geo;
  };

  // ---- dust motes drifting in the light -------------------------------------
  const MOTES = 260;
  const mp = new Float32Array(MOTES * 3), ms = new Float32Array(MOTES);
  const rand = rng(99);
  for (let i = 0; i < MOTES; i++) {
    mp[i * 3] = -1.2 + rand() * 2.4; mp[i * 3 + 1] = 0.02 + rand() * 1.2; mp[i * 3 + 2] = -0.4 + rand() * 1.3;
    ms[i] = rand();
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  moteGeo.setAttribute('aSeed', new THREE.BufferAttribute(ms, 1));
  const moteMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xfff2d8) }, uOpacity: { value: 0.5 }, uScale: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aSeed; uniform float uTime, uScale; varying float vA;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.11 + aSeed * 40.0) * 0.06;
        p.y += sin(uTime * 0.07 + aSeed * 71.0) * 0.05 + fract(aSeed * 13.0 + uTime * 0.004) * 0.1;
        p.z += cos(uTime * 0.09 + aSeed * 23.0) * 0.06;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uScale * (1.2 + aSeed * 2.4) / max(0.2, -mv.z);
        vA = 0.35 + 0.65 * sin(uTime * (0.6 + aSeed) + aSeed * 90.0) ;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uOpacity; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * max(vA, 0.0) * uOpacity;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  motes.renderOrder = 6;
  g.add(motes);
  out.moteMat = moteMat;

  return out;
}

// A small lighting-only scene used to bake the image-based-lighting probes.
export function buildEnvScene(night) {
  const s = new THREE.Scene();
  const R = ROOM;
  const mk = (geo, color, k = 1) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    s.add(m); return m;
  };
  const cx = (R.leftX + R.rightX) / 2, cz = (R.backZ + R.frontZ) / 2, cyy = (R.floorY + R.ceilY) / 2;
  const room = mk(new THREE.BoxGeometry(R.rightX - R.leftX, R.ceilY - R.floorY, R.frontZ - R.backZ), night ? 0x0c0f1c : 0x8f8a80, night ? 1 : 0.55);
  room.position.set(cx, cyy, cz);
  const floor = mk(new THREE.PlaneGeometry(6, 6), night ? 0x06070b : 0x4a4038, night ? 1 : 0.45);
  floor.rotation.x = -Math.PI / 2; floor.position.set(cx, R.floorY + 0.01, cz);
  const ceil = mk(new THREE.PlaneGeometry(6, 6), night ? 0x0b0d18 : 0xfff7ea, night ? 1 : 0.8);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, R.ceilY - 0.01, cz);
  // the window: a big soft key light
  const w = R.win;
  const win = mk(new THREE.PlaneGeometry(w.z1 - w.z0, w.y1 - w.y0), night ? 0x35509c : 0xdfeeff, night ? 1.3 : 9);
  win.rotation.y = Math.PI / 2; win.position.set(R.leftX + 0.02, (w.y0 + w.y1) / 2, (w.z0 + w.z1) / 2);
  // blind slats break the window up so glossy surfaces show stripes
  for (let i = 0; i < 14; i++) {
    const b = mk(new THREE.PlaneGeometry(w.z1 - w.z0, 0.04), night ? 0x04050a : 0x6a655c, 1);
    b.rotation.y = Math.PI / 2; b.position.set(R.leftX + 0.03, w.y0 + 0.05 + i * ((w.y1 - w.y0) / 14), (w.z0 + w.z1) / 2);
  }
  if (night) {
    // broad, dim warm bounce from the lamp-lit desk (no hot spots: probes have no parallax)
    const pool = mk(new THREE.CircleGeometry(0.9, 24), 0xffb070, 0.5); pool.rotation.x = -Math.PI / 2; pool.position.set(-0.2, R.floorY + 0.02, 0.4);
    const soft = mk(new THREE.PlaneGeometry(2.4, 1.4), 0x4a5a9c, 0.5); soft.position.set(0.4, 0.6, R.frontZ - 0.02); soft.rotation.y = Math.PI;
  } else {
    // warm bounce off the sunlit floor / desk
    const bounce = mk(new THREE.CircleGeometry(1.0, 24), 0xffd9a8, 1.6); bounce.rotation.x = -Math.PI / 2; bounce.position.set(0.3, R.floorY + 0.02, 0.6);
    const soft = mk(new THREE.PlaneGeometry(2.4, 1.6), 0xfff4e6, 1.3); soft.position.set(0.4, 0.6, R.frontZ - 0.02); soft.rotation.y = Math.PI;
  }
  return s;
}
