// Gregory Wieber's Indy — scene controller.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import { makeTextures, drawCubeLogo } from './scene/textures.js';
import { makeMaterials, buildIndy, buildMonitor, buildIndyCam, buildKeyboard, buildMouse, cable, SCREEN_W, SCREEN_H } from './scene/hardware.js';
import { buildRoom, buildEnvScene, ROOM } from './scene/room.js';
import { buildLamp, buildLavaLamp, buildTapes, buildCDs, buildCassette, buildMug, buildNotebook, buildBrochure, buildMousePad, buildFern, buildFrame } from './scene/props.js';
import { lerp, clamp, easeInOut, setMaxAnisotropy } from './scene/util.js';
import { createAudio } from './audio.js';
import { createDesktop } from './irix/desktop.js';
import { VIDEOS, BUILDS, APPS, LINKS } from './site.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#gl');
const tubeEl = $('#tube'), irixEl = $('#irix');
const tipEl = $('#tip'), hintEl = $('#hint');
const deg = THREE.MathUtils.degToRad;
const params = new URLSearchParams(location.search);

document.body.classList.add('loading');
{ // little cube logo in the loader
  const c = document.createElement('canvas'); c.width = c.height = 108; c.style.width = c.style.height = '54px';
  drawCubeLogo(c.getContext('2d'), 54, 54, 46, { light: '#f2f2f2', dark: '#3a3a3a', mid: '#9c9c9c' });
  $('#boot-logo').appendChild(c);
}
const bootBar = (p, msg) => { $('#boot-bar').style.width = `${p}%`; if (msg) $('#boot-msg').textContent = msg; };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

const coarse = matchMedia('(pointer: coarse)').matches;
const LOW = coarse || (navigator.hardwareConcurrency || 8) <= 4 || params.has('low');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

init().catch((err) => {
  console.error(err);
  document.body.classList.remove('loading');
  $('#fallback').hidden = false;
});

async function init() {
  // ---------------------------------------------------------------- renderer
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  } catch (e) { throw new Error('WebGL unavailable'); }
  let pixelRatio = Math.min(window.devicePixelRatio || 1, LOW ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 120);

  bootBar(12, 'Running power-on diagnostics…');
  await nextFrame();

  let shadowFrames = 10, dirty = true;
  // ------------------------------------------------------------------ audio
  const audio = createAudio();
  document.body.classList.toggle('muted', audio.muted);

  // ---------------------------------------------------------------- desktop
  let screenTex = null;
  const desktop = createDesktop({
    mount: irixEl, audio,
    onExit: () => exitComputer(),
    onShutdown: () => { exitComputer(); setTimeout(() => setPower(false), 900); },
    onPaint: () => { if (screenTex) screenTex.needsUpdate = true; dirty = true; },
    onNight: (n) => setNight(n),
    isNight: () => night,
  });
  screenTex = new THREE.CanvasTexture(desktop.canvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = 8;

  // ------------------------------------------------------------------ build
  const T = makeTextures();
  const M = makeMaterials(T);
  bootBar(30, 'Checking graphics board…');
  await nextFrame();

  const room = buildRoom(T);
  scene.add(room.group);

  const rig = new THREE.Group(); // Indy + monitor + camera
  rig.position.set(0, 0, -0.13);
  scene.add(rig);
  const indy = buildIndy(M);
  rig.add(indy.group);
  const monitor = buildMonitor(M, screenTex);
  monitor.group.position.set(0, indy.H, -0.012);
  rig.add(monitor.group);
  const cam = buildIndyCam(M);
  cam.group.position.set(0.02, 0.3662, 0.098);
  cam.group.rotation.x = -0.08;
  monitor.body.add(cam.group);

  const keyboard = buildKeyboard(M);
  keyboard.group.position.set(-0.012, 0, 0.222);
  scene.add(keyboard.group);
  const pad = buildMousePad();
  pad.group.position.set(0.385, 0, 0.225);
  pad.group.rotation.y = deg(-3);
  scene.add(pad.group);
  const mouse = buildMouse(M);
  mouse.group.position.set(0.375, 0.004, 0.22);
  mouse.group.rotation.y = deg(-9);
  scene.add(mouse.group);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  scene.add(cable([V(-0.012, 0.02, 0.135), V(-0.05, 0.004, 0.09), V(-0.15, 0.003, 0.075), V(-0.235, 0.003, 0.0), V(-0.24, 0.003, -0.2), V(-0.15, 0.02, -0.33)], 0.0024, M.cable));
  scene.add(cable([V(0.368, 0.012, 0.17), V(0.355, 0.004, 0.13), V(0.3, 0.003, 0.06), V(0.262, 0.003, -0.08), V(0.25, 0.003, -0.25), V(0.15, 0.02, -0.33)], 0.0019, M.cable));

  bootBar(48, 'Mounting /usr/people/gregory…');
  await nextFrame();

  const lamp = buildLamp();
  lamp.group.position.set(-0.75, 0, -0.2);
  lamp.group.rotation.y = -0.93;
  scene.add(lamp.group);
  const lava = buildLavaLamp(LOW);
  lava.group.position.set(0.405, 0, -0.275);
  scene.add(lava.group);
  const fern = buildFern();
  fern.group.position.set(0.73, 0, -0.21);
  scene.add(fern.group);
  const tapes = buildTapes(VIDEOS.slice(0, 4).reverse());
  tapes.group.position.set(0.635, 0, 0.055);
  tapes.group.rotation.y = deg(-13);
  scene.add(tapes.group);
  const cassette = buildCassette(0.42);
  cassette.group.position.set(0.405, 0, -0.205); // propped against the lava lamp's base
  cassette.group.rotation.y = deg(8);
  scene.add(cassette.group);
  const cds = buildCDs([
    { key: 'polychord', title: 'Polychord', sub: 'The iPad instrument', image: 'assets/tex/polychord.jpg', bar: '#17181c' },
    { key: 'vibescape', title: 'Vibescape', sub: 'Immersive worlds · Vision Pro', image: 'assets/tex/vibescape.jpg', bar: '#131a2a' },
    { key: 'softbreak', title: 'Soft Break', sub: 'A brick breaker made of jelly', image: 'assets/softbreak-icon.png', iconStyle: true, bg: '#eef0f6', bar: '#ff7a59' },
  ]);
  cds.group.position.set(0.655, 0, 0.3);
  cds.group.rotation.y = deg(8);
  scene.add(cds.group);
  const mug = buildMug();
  mug.group.position.set(-0.345, 0, 0.295);
  mug.group.rotation.y = deg(-150);
  scene.add(mug.group);
  const notebook = buildNotebook();
  notebook.group.position.set(-0.585, 0, 0.215);
  notebook.group.rotation.y = deg(14);
  scene.add(notebook.group);
  const brochure = buildBrochure();
  brochure.group.position.set(-0.49, 0, -0.085);
  brochure.group.rotation.y = deg(-13);
  scene.add(brochure.group);

  const wallZ = ROOM.backZ + 0.012;
  const frameA = buildFrame('assets/tex/pixel-pnw.jpg', 0.36, 0.27);
  frameA.group.position.set(-0.6, 0.68, wallZ);
  const frameB = buildFrame('assets/tex/lorenz.jpg', 0.21, 0.373);
  frameB.group.position.set(0.6, 0.7, wallZ);
  const frameC = buildFrame('assets/tex/pixel-dojo.jpg', 0.3, 0.235);
  frameC.group.position.set(0.98, 0.66, wallZ);
  scene.add(frameA.group, frameB.group, frameC.group);

  bootBar(66, 'Starting the window system…');
  await nextFrame();

  // ---------------------------------------------------------------- lights
  const sun = new THREE.DirectionalLight(0xfff0d8, 5);
  sun.castShadow = true;
  const SM = LOW ? 2048 : 4096;
  sun.shadow.mapSize.set(SM, SM);
  Object.assign(sun.shadow.camera, { left: -2.3, right: 2.3, top: 2.3, bottom: -2.3, near: 0.5, far: 12 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.008;
  sun.shadow.radius = 2.2;
  scene.add(sun, sun.target);
  sun.target.position.set(0.25, 0.2, 0.6);

  const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x8a6f52, 0.5);
  scene.add(hemi);
  // soft frontal fill so the front of the hardware never goes to mud
  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(1.2, 1.1, 2.4);
  scene.add(fill);

  // light spilling out of the CRT
  const crt = new THREE.SpotLight(0x8fb4ff, 1, 1.6, deg(72), 1, 1.4);
  const crtTarget = new THREE.Object3D(); crtTarget.position.set(0, -0.35, 0.6); monitor.anchor.add(crtTarget);
  scene.add(crt); crt.target = crtTarget;
  scene.updateMatrixWorld(true);
  monitor.anchor.getWorldPosition(crt.position);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envDay = pmrem.fromScene(buildEnvScene(false), 0.035, 0.05, 30).texture;
  const envNight = pmrem.fromScene(buildEnvScene(true), 0.035, 0.05, 30).texture;
  pmrem.dispose();

  // ------------------------------------------------------------ day / night
  let night = false;
  try {
    const saved = localStorage.getItem('indy.night');
    if (saved !== null) night = saved === '1';
    else { const h = new Date().getHours(); night = h < 7 || h >= 19; }
  } catch { /* ignore */ }
  if (params.has('night')) night = true;
  if (params.has('day')) night = false;
  let nightT = night ? 1 : 0;
  let lampOn = night;
  let lampT = lampOn ? 1 : 0;

  const C = (h) => new THREE.Color(h);
  const DAY = {
    sunColor: C(0xfff0dc), sunI: 3.4, sunDir: new THREE.Vector3(0.80, -0.40, -0.45).normalize(),
    hemiSky: C(0xcfe2ff), hemiGround: C(0x8d7a66), hemiI: 0.28, fillI: 0.16, envI: 0.42, exposure: 0.92,
    skyTop: C(0x2f78d2), skyHorizon: C(0xcfe6ff), skyGlow: C(0xfff1d0), stars: 0, skyGain: 1.6,
    treeFar: C(0x8fb0cc), treeNear: C(0x35604a), wall: C(0xd9d4ca), shafts: 0.022, motes: 0.5,
    bloom: 0.14, crtGain: 1.0, crtI: 0.4, vignette: 0.45, tint: C(0xfffdf8), lava: 0.05, bg: C(0x9fb7d6),
  };
  const NIGHT = {
    sunColor: C(0x9db4ff), sunI: 0.9, sunDir: new THREE.Vector3(0.62, -0.60, -0.50).normalize(),
    hemiSky: C(0x2a3a78), hemiGround: C(0x181210), hemiI: 0.3, fillI: 0.04, envI: 0.55, exposure: 1.0,
    skyTop: C(0x050916), skyHorizon: C(0x14244a), skyGlow: C(0xb8ccff), stars: 1, skyGain: 1.0,
    treeFar: C(0x0a1326), treeNear: C(0x04080e), wall: C(0xd9d4ca), shafts: 0.006, motes: 0.2,
    bloom: 0.42, crtGain: 1.15, crtI: 2.2, vignette: 0.6, tint: C(0xf6f7ff), lava: 0.42, bg: C(0x05060a),
  };
  const tmpC = new THREE.Color(), tmpV = new THREE.Vector3();
  const mixC = (a, b, t) => tmpC.copy(a).lerp(b, t);
  let envNow = null;
  function applyLighting() {
    const t = nightT, s = easeInOut(t);
    tmpV.copy(DAY.sunDir).lerp(NIGHT.sunDir, s).normalize();
    sun.position.copy(sun.target.position).addScaledVector(tmpV, -6);
    room.skyMat.uniforms.uSunDir.value.copy(tmpV).multiplyScalar(-1);
    sun.color.copy(mixC(DAY.sunColor, NIGHT.sunColor, s));
    // dip through darkness mid-transition, like a cloud passing
    const dip = 1 - Math.sin(t * Math.PI) * 0.85;
    sun.intensity = lerp(DAY.sunI, NIGHT.sunI, s) * dip;
    hemi.color.copy(mixC(DAY.hemiSky, NIGHT.hemiSky, s));
    hemi.groundColor.copy(mixC(DAY.hemiGround, NIGHT.hemiGround, s));
    hemi.intensity = lerp(DAY.hemiI, NIGHT.hemiI, s);
    fill.intensity = lerp(DAY.fillI, NIGHT.fillI, s);
    const env = t < 0.5 ? envDay : envNight;
    if (env !== envNow) { scene.environment = env; envNow = env; }
    scene.environmentIntensity = (t < 0.5 ? DAY.envI : NIGHT.envI) * (0.25 + 0.75 * Math.abs(1 - 2 * t));
    renderer.toneMappingExposure = lerp(DAY.exposure, NIGHT.exposure, s);
    const u = room.skyMat.uniforms;
    u.uTop.value.copy(mixC(DAY.skyTop, NIGHT.skyTop, s));
    u.uHorizon.value.copy(mixC(DAY.skyHorizon, NIGHT.skyHorizon, s));
    u.uGlow.value.copy(mixC(DAY.skyGlow, NIGHT.skyGlow, s));
    u.uStars.value = lerp(DAY.stars, NIGHT.stars, s);
    u.uGain.value = lerp(DAY.skyGain, NIGHT.skyGain, s);
    room.treeFar.color.copy(mixC(DAY.treeFar, NIGHT.treeFar, s));
    room.treeNear.color.copy(mixC(DAY.treeNear, NIGHT.treeNear, s));
    room.wallMat.color.copy(mixC(DAY.wall, NIGHT.wall, s));
    room.shaftMat.opacity = lerp(DAY.shafts, NIGHT.shafts, s) * dip;
    room.shaftMat.color.copy(mixC(DAY.sunColor, NIGHT.sunColor, s));
    room.moteMat.uniforms.uOpacity.value = lerp(DAY.motes, NIGHT.motes, s);
    room.setShaftDir(tmpV);
    bloom.strength = lerp(DAY.bloom, NIGHT.bloom, s);
    grade.uniforms.uVignette.value = lerp(DAY.vignette, NIGHT.vignette, s);
    grade.uniforms.uTint.value.copy(mixC(DAY.tint, NIGHT.tint, s));
    lava.glow.intensity = lerp(DAY.lava, NIGHT.lava, s);
    lava.waxMat.emissiveIntensity = lerp(0.55, 1.5, s);
    applyLamp();
    applyPower();
    shadowFrames = 3;
  }
  function applyLamp() {
    const k = easeInOut(lampT);
    lamp.light.intensity = k * lerp(1.6, 3.0, nightT);
    lamp.bulbMat.emissiveIntensity = k * 7;
  }
  function setNight(n, { silent = false } = {}) {
    if (n === night) return;
    night = n;
    lampOn = n;
    document.body.classList.toggle('night', n);
    try { localStorage.setItem('indy.night', n ? '1' : '0'); } catch { /* ignore */ }
    if (!silent) audio.switch();
    dirty = true;
  }
  document.body.classList.toggle('night', night);

  // ------------------------------------------------------------------ power
  let powerOn = true, powerT = 1;
  function applyPower() {
    const s = easeInOut(nightT);
    monitor.screenMat.uniforms.uPower.value = powerT;
    monitor.screenMat.uniforms.uGain.value = lerp(DAY.crtGain, NIGHT.crtGain, s);
    crt.intensity = lerp(DAY.crtI, NIGHT.crtI, s) * powerT;
    indy.led.material.emissiveIntensity = powerOn ? 3 : 0;
    monitor.led.material.emissiveIntensity = powerOn ? 3 : 0.0;
    monitor.led.material.emissive.set(powerOn ? 0x39ff6a : 0xffa020);
    if (!powerOn) monitor.led.material.emissiveIntensity = 1.2;
  }
  function setPower(on) {
    if (on === powerOn) return;
    powerOn = on;
    if (on) { audio.thunk(); audio.degauss(); setTimeout(() => audio.chime(), 350); desktop.powerOn(); }
    else { audio.powerDown(); desktop.powerOff(); }
    dirty = true;
  }

  // ---------------------------------------------------------------- post fx
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: LOW ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.25, 0.65, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.4 }, uGrain: { value: 0.028 }, uTint: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain; uniform vec3 uTint; varying vec2 vUv;
      void main(){
        vec2 c = vUv - 0.5;
        float r2 = dot(c, c);
        vec2 off = c * r2 * 0.0035;
        vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
        col = mix(col, col * col * (3.0 - 2.0 * col), 0.22);
        col *= uTint;
        col *= 1.0 - uVignette * smoothstep(0.12, 0.9, r2 * 1.7);
        float n = fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 61.0, vec2(12.9898, 78.233))) * 43758.5453);
        col += (n - 0.5) * uGrain;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  composer.addPass(grade);

  // ----------------------------------------------------------- interactions
  const hits = []; // { root, def }
  const hitObjects = [];
  function register(root, def) {
    def.hover = 0; def.root = root;
    if (def.lift) def.baseY = def.lift.position.y;
    hits.push(def);
    root.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && !o.userData.def) { o.userData.def = def; hitObjects.push(o); } });
  }
  const openExternal = (url) => { window.open(url, '_blank', 'noopener'); };
  const inIrix = (fn) => () => enterComputer(fn);

  // order matters: small controls on the Indy are registered before the chassis itself
  register(indy.power, { id: 'power', label: 'Power', sub: () => (powerOn ? 'Shut the Indy down' : 'Boot the Indy'), onClick: () => { press(indy.powerCap); audio.click(); setPower(!powerOn); } });
  register(indy.volUp, { id: 'volup', label: 'Volume up', onClick: () => { press(indy.volUpCap); audio.setMuted(false); document.body.classList.remove('muted'); audio.setVolume(audio.volume + 0.15); audio.blip(Math.round(audio.volume * 6)); } });
  register(indy.volDown, { id: 'voldown', label: 'Volume down', onClick: () => { press(indy.volDownCap); audio.setVolume(audio.volume - 0.15); audio.blip(Math.round(audio.volume * 6)); } });
  register(monitor.note, { id: 'note', label: 'hello@apposite.ai', sub: 'Say hi ↗', onClick: () => { audio.paper(); location.href = LINKS.email; } });
  register(cam.group, { id: 'cam', label: 'IndyCam', sub: '@dreamwieber on Instagram ↗', onClick: () => { snap(); setTimeout(() => openExternal(LINKS.instagram), 420); } });
  register(monitor.screen, { id: 'screen', label: () => (powerOn ? 'Log in' : 'Power on & log in'), sub: 'Sit down at the Indy', onClick: () => enterComputer() });
  register(monitor.group, { id: 'monitor', label: () => (powerOn ? 'Log in' : 'Power on & log in'), sub: 'Sit down at the Indy', onClick: () => enterComputer() });
  register(indy.group, { id: 'indy', label: 'Silicon Graphics Indy', sub: 'About this system', onClick: inIrix(() => desktop.launch('about')) });
  register(keyboard.group, { id: 'keyboard', label: 'Keyboard', sub: 'Open a Unix shell', onClick: () => { keyboard.ripple(); for (let i = 0; i < 7; i++) setTimeout(() => audio.key(), i * 45); shadowFrames = 60; enterComputer(() => desktop.launch('console')); } });
  register(mouse.group, { id: 'mouse', lift: mouse.group, onClick: () => { audio.squeak(); wiggle(mouse.group); } });
  register(pad.group, { id: 'pad', label: 'Apposite', sub: 'Our indie studio ↗', onClick: () => openExternal(LINKS.apposite) });
  register(lamp.group, { id: 'lamp', label: () => (night ? 'Good morning' : 'Lights out'), sub: 'Switch between day and night', onClick: () => setNight(!night) });
  register(lava.group, { id: 'lava', label: 'Metaballs', sub: 'Apple Design Award nominee, 2026', onClick: inIrix(() => desktop.launch('app', 'metaballs')) });
  register(fern.group, { id: 'fern', label: 'Clery Farm', sub: 'Restoring prairie and oak woodland', onClick: inIrix(() => desktop.launch('page', { url: '../cleryfarm.html', title: 'Clery Farm' })) });
  tapes.tapes.forEach((t) => register(t, { id: 'tape-' + t.userData.video.id, label: t.userData.video.title, sub: 'dreamwieber · play the tape', lift: t, liftAmt: 0.004, slide: 0.03, onClick: inIrix(() => desktop.launch('video', t.userData.video)) }));
  cds.cases.forEach((c) => {
    const k = c.userData.cd.key;
    const a = APPS.find((x) => x.key === k);
    register(c, { id: 'cd-' + k, label: a.name, sub: k === 'softbreak' ? 'Play the IRIX port' : a.tagline, lift: c, liftAmt: 0.004, onClick: inIrix(() => desktop.launch(k === 'softbreak' ? 'softbreak' : 'app', k)) });
  });
  register(cassette.group, { id: 'cassette', label: 'imaiorami', sub: 'Colleen’s new music project', lift: cassette.body, liftAmt: 0.004, onClick: inIrix(() => desktop.launch('music')) });
  register(mug.group, { id: 'mug', label: 'Buy me a coffee', sub: 'Support the videos on Patreon ↗', lift: mug.group, liftAmt: 0.008, onClick: () => { audio.wall(); openExternal(LINKS.patreon); } });
  register(notebook.group, { id: 'notebook', label: 'Gregory Builds', sub: 'Behind the scenes · watch the latest', lift: notebook.group, liftAmt: 0.004, onClick: inIrix(() => desktop.launch('video', BUILDS[0])) });
  register(brochure.group, { id: 'brochure', label: 'The brochure SGI mailed back', sub: 'Read “My Computer History”', lift: brochure.group, liftAmt: 0.004, onClick: () => { audio.paper(); enterComputer(() => desktop.launch('page', { url: '../writing/my-computer-history.html', title: 'My Computer History' })); } });
  for (const [f, url, title] of [[frameA, '../art/pixel-art.html', 'Pixel Art'], [frameB, '../art/digital.html', 'Generative Art'], [frameC, '../art/pixel-art.html', 'Pixel Art']]) {
    register(f.group, { id: 'frame', label: title, sub: 'See the art', onClick: inIrix(() => desktop.launch('page', { url, title })) });
  }
  // the desk itself blocks rays so things behind it can't be clicked through
  room.group.traverse((o) => { if (o.isMesh && o.name === 'desk') hitObjects.push(o); });

  const anims = [];
  function press(obj) {
    const z0 = obj.userData.z0 ?? (obj.userData.z0 = obj.position.z);
    anims.push({ t: 0, dur: 0.22, fn: (k) => { obj.position.z = z0 - Math.sin(k * Math.PI) * 0.0022; } });
    shadowFrames = 20;
  }
  function wiggle(obj) {
    const r0 = obj.rotation.y, x0 = obj.position.x;
    anims.push({ t: 0, dur: 0.6, fn: (k) => { obj.rotation.y = r0 + Math.sin(k * Math.PI * 4) * 0.12 * (1 - k); obj.position.x = x0 + Math.sin(k * Math.PI * 3) * 0.008 * (1 - k); } });
    shadowFrames = 45;
  }
  function snap() {
    audio.shutter();
    cam.tally.material.emissiveIntensity = 6;
    anims.push({ t: 0, dur: 0.5, fn: (k) => { grade.uniforms.uGrain.value = 0.028 + (k < 0.15 ? 1.6 * (1 - k / 0.15) : 0); if (k >= 1) cam.tally.material.emissiveIntensity = 0; } });
  }

  // ----------------------------------------------------------------- camera
  const orbit = { az: 0.36, el: deg(13), dist: 1.5, target: new THREE.Vector3(0.03, 0.19, 0.02) };
  const want = { az: orbit.az, el: orbit.el, dist: orbit.dist };
  let baseDist = 1.5;
  const mouseN = { x: 0, y: 0 };
  let mode = 'desk'; // desk | entering | computer | leaving
  let modeT = 0;
  const camFrom = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 30 };
  const camTo = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 30 };
  let afterEnter = null;
  let compact = false;
  let intro = reduceMotion ? 1 : 0;

  function frameForAspect() {
    const a = innerWidth / innerHeight;
    const portrait = a < 0.85;
    camera.fov = portrait ? 44 : a < 1.25 ? 36 : 30;
    const halfW = portrait ? 0.36 : a < 1.25 ? 0.56 : 0.84;
    baseDist = clamp(halfW / (Math.tan(deg(camera.fov / 2)) * a), 0.95, 2.35);
    want.dist = orbit.dist = baseDist;
    orbit.target.set(portrait ? 0.0 : 0.03, portrait ? 0.21 : 0.215, 0.02);
    camera.aspect = a;
    camera.updateProjectionMatrix();
  }
  function orbitPose(o, out) {
    const ce = Math.cos(o.el);
    out.set(Math.sin(o.az) * ce, Math.sin(o.el), Math.cos(o.az) * ce).multiplyScalar(o.dist).add(orbit.target);
    // stay inside the room
    const lim = (v, lo, hi, t) => (v < lo ? (lo - t) / (v - t) : v > hi ? (hi - t) / (v - t) : 1);
    const s = Math.min(
      lim(out.x, ROOM.leftX + 0.22, ROOM.rightX - 0.15, orbit.target.x),
      lim(out.z, -10, ROOM.frontZ - 0.15, orbit.target.z),
      lim(out.y, 0.03, ROOM.ceilY - 0.2, orbit.target.y)
    );
    if (s < 1) out.sub(orbit.target).multiplyScalar(s).add(orbit.target);
    return out;
  }
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _n = new THREE.Vector3(), _q = new THREE.Quaternion();
  function computerPose(out) {
    monitor.anchor.updateWorldMatrix(true, false);
    _p.setFromMatrixPosition(monitor.anchor.matrixWorld);
    _n.set(0, 0, 1).transformDirection(monitor.anchor.matrixWorld);
    const a = innerWidth / innerHeight;
    compact = innerWidth < 760 || innerHeight < 540;
    const fov = compact ? 40 : 30;
    const th = Math.tan(deg(fov / 2));
    const fracH = compact ? 0.94 : 0.72, fracW = compact ? 1.5 : 0.86;
    const d = Math.max((SCREEN_H / 2) / (th * fracH), (SCREEN_W / 2) / (th * a * fracW));
    out.pos.copy(_p).addScaledVector(_n, d);
    _m.lookAt(out.pos, _p, THREE.Object3D.DEFAULT_UP);
    out.quat.setFromRotationMatrix(_m);
    out.fov = fov;
  }
  function enterComputer(after) {
    audio.unlock();
    if (mode === 'computer') { if (after) after(); return; }
    if (mode !== 'desk') { afterEnter = after || afterEnter; return; }
    if (!powerOn) setPower(true);
    afterEnter = after || null;
    camFrom.pos.copy(camera.position); camFrom.quat.copy(camera.quaternion); camFrom.fov = camera.fov;
    computerPose(camTo);
    mode = 'entering'; modeT = 0;
    setTip(null);
    canvas.className = '';
    hintEl.classList.remove('show');
    audio.whoosh();
  }
  function exitComputer() {
    if (mode !== 'computer' && mode !== 'entering') return;
    desktop.blur();
    desktop.paint();
    tubeEl.classList.remove('on');
    document.body.classList.remove('seated');
    tubeEl.setAttribute('aria-hidden', 'true');
    $('#btn-back').hidden = true;
    camFrom.pos.copy(camera.position); camFrom.quat.copy(camera.quaternion); camFrom.fov = camera.fov;
    frameForAspectKeep();
    orbitPose(orbit, camTo.pos);
    _m.lookAt(camTo.pos, orbit.target, THREE.Object3D.DEFAULT_UP);
    camTo.quat.setFromRotationMatrix(_m);
    camTo.fov = deskFov();
    mode = 'leaving'; modeT = 0;
    audio.whoosh();
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    setTimeout(() => showHint('Everything on the desk does something. <b>Try the lamp.</b>', 6000), 1400);
  }
  const deskFov = () => { const a = innerWidth / innerHeight; return a < 0.85 ? 44 : a < 1.25 ? 36 : 30; };
  function frameForAspectKeep() { const az = orbit.az, el = orbit.el; frameForAspect(); orbit.az = want.az = az; orbit.el = want.el = el; }

  // place the DOM desktop exactly over the picture tube
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  function layoutTube() {
    document.body.classList.toggle('compact', compact);
    let x, y, w, h;
    if (compact) { x = 0; y = 52; w = innerWidth; h = innerHeight - 52; }
    else {
      const hw = SCREEN_W / 2 * 0.985, hh = SCREEN_H / 2 * 0.985;
      corners[0].set(-hw, hh, 0); corners[1].set(hw, hh, 0); corners[2].set(-hw, -hh, 0); corners[3].set(hw, -hh, 0);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const c of corners) {
        c.applyMatrix4(monitor.anchor.matrixWorld).project(camera);
        const px = (c.x * 0.5 + 0.5) * innerWidth, py = (-c.y * 0.5 + 0.5) * innerHeight;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      x = x0; y = y0; w = x1 - x0; h = y1 - y0;
    }
    tubeEl.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
    tubeEl.style.width = `${w.toFixed(2)}px`; tubeEl.style.height = `${h.toFixed(2)}px`;
    desktop.layout(w, h, compact);
  }

  // ---------------------------------------------------------------- pointer
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null, dragging = false, moved = 0, downAt = null, pinch = 0;
  const pointers = new Map();
  function pick(ev) {
    ndc.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(hitObjects, false)[0];
    return h ? h.object.userData.def || null : null;
  }
  const val = (v) => (typeof v === 'function' ? v() : v);
  function setTip(def, ev) {
    if (!def || !def.label) { tipEl.classList.remove('show'); return; } // no label: still clickable, just no tooltip
    tipEl.innerHTML = `<strong>${val(def.label)}</strong>${def.sub ? `<span>${val(def.sub)}</span>` : ''}`;
    tipEl.classList.add('show');
    if (ev) moveTip(ev);
  }
  function moveTip(ev) {
    const x = clamp(ev.clientX, 130, innerWidth - 130), y = Math.max(70, ev.clientY);
    tipEl.style.left = `${x}px`; tipEl.style.top = `${y}px`;
  }
  function setHover(def, ev) {
    if (def !== hovered) {
      hovered = def;
      setTip(def, ev);
      if (def && !coarse) audio.tick();
      canvas.className = def ? 'point' : dragging ? 'grabbing' : 'grab';
    } else if (def && ev) moveTip(ev);
  }
  canvas.addEventListener('pointerdown', (ev) => {
    audio.unlock();
    if (mode === 'computer') { exitComputer(); return; }
    if (mode !== 'desk') return;
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    canvas.setPointerCapture(ev.pointerId);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    downAt = { x: ev.clientX, y: ev.clientY, def: pick(ev) };
    dragging = true; moved = 0;
    intro = 1;
    if (!hovered) canvas.className = 'grabbing';
  });
  canvas.addEventListener('pointermove', (ev) => {
    mouseN.x = (ev.clientX / innerWidth) * 2 - 1; mouseN.y = (ev.clientY / innerHeight) * 2 - 1;
    if (mode !== 'desk') return;
    const p = pointers.get(ev.pointerId);
    if (dragging && p) {
      const dx = ev.clientX - p.x, dy = ev.clientY - p.y;
      p.x = ev.clientX; p.y = ev.clientY;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) want.dist = clamp(want.dist * (pinch / d), baseDist * 0.5, baseDist * 1.2);
        pinch = d; moved += 10;
        return;
      }
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 6) {
        want.az = clamp(want.az - dx * 0.0042, -1.05, 1.1);
        want.el = clamp(want.el + dy * 0.0034, deg(2), deg(52));
        setHover(null);
        canvas.className = 'grabbing';
      }
      return;
    }
    if (ev.pointerType !== 'touch') setHover(pick(ev), ev);
  });
  const up = (ev) => {
    const had = pointers.delete(ev.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (!had || pointers.size) return;
    dragging = false;
    canvas.className = hovered ? 'point' : 'grab';
    if (mode === 'desk' && moved <= 6 && downAt && ev.type === 'pointerup') {
      const def = pick(ev);
      if (def && def === downAt.def && def.onClick) {
        if (ev.pointerType === 'touch') { setTip(def, ev); setTimeout(() => setTip(null), 1400); }
        def.onClick(def);
        dirty = true;
      }
    }
    downAt = null;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => { if (!dragging) setHover(null); });
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    if (mode !== 'desk') return;
    want.dist = clamp(want.dist * Math.exp(ev.deltaY * 0.0012), baseDist * 0.5, baseDist * 1.2);
  }, { passive: false });
  canvas.className = 'grab';

  addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && (mode === 'computer' || mode === 'entering')) { ev.preventDefault(); exitComputer(); return; }
    if (mode !== 'desk' || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === 'Enter') enterComputer();
    else if (ev.key === 'n' || ev.key === 'N') setNight(!night);
    else if (ev.key === 'ArrowLeft') want.az = clamp(want.az - 0.15, -1.05, 1.1);
    else if (ev.key === 'ArrowRight') want.az = clamp(want.az + 0.15, -1.05, 1.1);
  });
  $('#btn-light').addEventListener('click', () => { audio.unlock(); setNight(!night); });
  $('#btn-sound').addEventListener('click', () => { audio.unlock(); audio.setMuted(!audio.muted); document.body.classList.toggle('muted', audio.muted); if (!audio.muted) audio.blip(2); });
  $('#btn-back').addEventListener('click', () => exitComputer());

  let hintTimer = 0;
  function showHint(html, ms = 7000) {
    if (mode !== 'desk' && mode !== 'leaving') return;
    hintEl.innerHTML = html; hintEl.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hintEl.classList.remove('show'), ms);
  }

  // ----------------------------------------------------------------- resize
  function resize() {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(innerWidth, innerHeight);
    room.moteMat.uniforms.uScale.value = innerHeight * pixelRatio * 0.0022;
    if (mode === 'desk') frameForAspectKeep();
    else { camera.aspect = innerWidth / innerHeight; computerPose(camTo); if (mode === 'computer') { camera.position.copy(camTo.pos); camera.quaternion.copy(camTo.quat); camera.fov = camTo.fov; } camera.updateProjectionMatrix(); }
    dirty = true;
  }
  addEventListener('resize', resize);

  // ------------------------------------------------------------------- loop
  const clock = { last: performance.now(), elapsedTime: 0, getDelta() { const n = performance.now(); const d = (n - this.last) / 1000; this.last = n; this.elapsedTime += Math.min(d, 0.1); return d; } };
  let slowFrames = 0, frameCount = 0, hidden = false;
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (!hidden) clock.getDelta(); });

  frameForAspect();
  resize();
  applyLighting();
  orbitPose(orbit, camera.position);
  camera.lookAt(orbit.target);

  bootBar(88, 'The system is coming up…');
  await nextFrame();
  renderer.shadowMap.needsUpdate = true;
  renderer.compile(scene, camera);
  composer.render();
  bootBar(100);
  await nextFrame();

  const introFrom = { az: orbit.az + 0.5, el: deg(30), dist: baseDist * 1.35 };

  function tick() {
    requestAnimationFrame(tick);
    if (hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    frameCount++;

    // day/night + lamp easing
    const nt = night ? 1 : 0;
    if (nightT !== nt) { nightT = clamp(nightT + Math.sign(nt - nightT) * dt / 1.5, 0, 1); applyLighting(); dirty = true; }
    const lt = lampOn ? 1 : 0;
    if (lampT !== lt) { lampT = clamp(lampT + Math.sign(lt - lampT) * dt / 0.35, 0, 1); applyLamp(); shadowFrames = 3; dirty = true; }
    const pt = powerOn ? 1 : 0;
    if (powerT !== pt) { powerT = clamp(powerT + Math.sign(pt - powerT) * dt / (powerOn ? 0.9 : 0.45), 0, 1); applyPower(); dirty = true; }

    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i]; a.t += dt;
      const k = Math.min(1, a.t / a.dur); a.fn(k);
      if (k >= 1) anims.splice(i, 1);
      dirty = true;
    }

    // hover lifts
    for (const d of hits) {
      const target = d === hovered && mode === 'desk' ? 1 : 0;
      if (d.hover !== target) {
        d.hover = lerp(d.hover, target, 1 - Math.exp(-dt * 14));
        if (Math.abs(d.hover - target) < 0.002) d.hover = target;
        if (d.lift) {
          d.lift.position.y = d.baseY + d.hover * (d.liftAmt || 0.006);
          if (d.slide) d.lift.position.z = d.lift.userData.home.z + d.hover * d.slide;
          shadowFrames = 2;
        }
        dirty = true;
      }
    }

    // camera
    if (mode === 'desk') {
      if (intro < 1) {
        intro = Math.min(1, intro + dt / 3.2);
        const k = easeInOut(intro);
        orbit.az = lerp(introFrom.az, want.az, k); orbit.el = lerp(introFrom.el, want.el, k); orbit.dist = lerp(introFrom.dist, want.dist, k);
      } else {
        const k = 1 - Math.exp(-dt * 7);
        const par = dragging || coarse || reduceMotion ? 0 : 1;
        orbit.az = lerp(orbit.az, want.az - mouseN.x * 0.035 * par, k);
        orbit.el = lerp(orbit.el, want.el + mouseN.y * 0.02 * par, k);
        orbit.dist = lerp(orbit.dist, want.dist, k);
      }
      orbitPose(orbit, camera.position);
      camera.lookAt(orbit.target);
    } else if (mode === 'entering' || mode === 'leaving') {
      modeT = Math.min(1, modeT + dt / (reduceMotion ? 0.01 : 1.35));
      const k = easeInOut(modeT);
      if (mode === 'entering') computerPose(camTo);
      camera.position.lerpVectors(camFrom.pos, camTo.pos, k);
      camera.quaternion.slerpQuaternions(camFrom.quat, camTo.quat, k);
      camera.fov = lerp(camFrom.fov, camTo.fov, k);
      camera.updateProjectionMatrix();
      if (modeT >= 1) {
        if (mode === 'entering') {
          mode = 'computer';
          camera.updateMatrixWorld();
          layoutTube();
          tubeEl.classList.add('on');
          document.body.classList.add('seated');
          tubeEl.removeAttribute('aria-hidden');
          $('#btn-back').hidden = false;
          desktop.focus();
          const fn = afterEnter; afterEnter = null;
          if (fn) setTimeout(fn, 180);
        } else {
          mode = 'desk';
          camera.fov = deskFov(); camera.updateProjectionMatrix();
        }
      }
      dirty = true;
    }

    const active = mode !== 'computer';
    if (active) {
      keyboard.update(dt);
      lava.update(dt, t);
      mug.update(dt, t, camera);
      room.moteMat.uniforms.uTime.value = t;
      monitor.screenMat.uniforms.uTime.value = t;
      grade.uniforms.uTime.value = t;
      if (shadowFrames > 0) { renderer.shadowMap.needsUpdate = true; shadowFrames--; }
      composer.render();
    } else if (dirty) {
      // seated at the computer: the scene is a still frame behind the desktop
      camera.updateMatrixWorld();
      layoutTube();
      renderer.shadowMap.needsUpdate = true;
      composer.render();
    }
    dirty = false;

    // adapt resolution if the GPU is struggling
    if (active && frameCount > 90) {
      if (dt > 0.03) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 45 && pixelRatio > 0.85) { pixelRatio = Math.max(0.85, pixelRatio - 0.25); slowFrames = 0; resize(); }
    }
  }

  document.body.classList.remove('loading');
  canvas.focus?.();
  requestAnimationFrame(tick);
  setTimeout(() => showHint(coarse ? '<b>Tap the screen</b> to log in · drag to look around' : '<b>Click the screen</b> to log in · drag to look around', 9000), 3400);

  // deep links: /indy/#softbreak, #fsn, #irix
  const hash = location.hash.replace('#', '');
  if (hash) {
    const go = { irix: null, softbreak: () => desktop.launch('softbreak'), fsn: () => desktop.launch('fsn'), shell: () => desktop.launch('console') }[hash];
    if (go !== undefined) { intro = 1; setTimeout(() => enterComputer(go), 600); }
  }

  // handy for tinkering in the console
  window.indy = { scene, camera, renderer, desktop, setNight, setPower, enterComputer, exitComputer, orbit, want, room, sun, DAY, NIGHT, applyLighting, lamp, monitor, get mode() { return mode; } };
}
