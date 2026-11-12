// fsn — a File System Navigator for the site: directories are pedestals on a plain,
// files are blocks standing on them, and you fly between them.
import * as THREE from 'three';

const KIND_COLOR = { video: 0xd9482f, app: 0x2f7fd0, page: 0xd9d2bd, link: 0x3fae6a, text: 0xf2f2f2, dir: 0x888888 };

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; }

function labelTexture(text, { size = 30, w = 256, h = 64, color = '#fff', bg = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  let fs = size;
  ctx.font = `italic 700 ${fs}px Helvetica, Arial, sans-serif`;
  while (ctx.measureText(text).width > w - 12 && fs > 12) { fs -= 1; ctx.font = `italic 700 ${fs}px Helvetica, Arial, sans-serif`; }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillText(text, w / 2 + 2, h / 2 + 2);
  ctx.fillStyle = color; ctx.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function createFsn(container, { desk, root, start, onStatus, onSelect }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  const canvas = renderer.domElement;
  container.insertBefore(canvas, container.firstChild);
  const scene = new THREE.Scene();
  // sky: deep blue falling to a pale horizon, like the original
  {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const ctx = c.getContext('2d'); const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#07133a'); g.addColorStop(0.3, '#1d3f8a'); g.addColorStop(0.5, '#8fb0e0'); g.addColorStop(1, '#8fb0e0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; scene.background = t;
  }
  scene.fog = new THREE.Fog(0x8fb0e0, 60, 280);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 600);
  scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x20301f, 1.5));
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.2); sun.position.set(-30, 60, 40); scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ color: 0x1f5c3c }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; scene.add(ground);
  const grid = new THREE.GridHelper(900, 180, 0x2f7a52, 0x256443); grid.position.y = 0; grid.material.transparent = true; grid.material.opacity = 0.55; scene.add(grid);

  const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
  const pickables = [];
  const nodeMesh = new Map();
  const CELL = 2.5, CELL_Z = 3.1, PED_H = 0.5; // rows sit further apart than columns so a tall block doesn't hide the label behind it

  function weight(n) {
    if (n.kind === 'video') { const m = /(\d+)K/.exec(n.video.note || ''); return m ? Math.min(1, 0.45 + +m[1] / 250) : 0.2 + hash(n.name) * 0.35; }
    if (n.kind === 'app') return n.app.actions ? 0.75 + hash(n.name) * 0.25 : 0.2 + hash(n.name) * 0.3;
    if (n.kind === 'link') return 0.15;
    return 0.12 + hash(n.name) * 0.4;
  }

  function buildDir(node, x, z) {
    const files = node.children.filter((c) => c.kind !== 'dir');
    const n = Math.max(1, files.length);
    const cols = Math.min(n, Math.max(2, Math.ceil(Math.sqrt(n * 1.7))));
    const rows = Math.ceil(n / cols);
    const pw = cols * CELL + 1.4, pd = rows * CELL_Z + 3.2;
    const ped = new THREE.Mesh(new THREE.BoxGeometry(pw, PED_H, pd), new THREE.MeshLambertMaterial({ color: node.color || 0x6f86b8 }));
    ped.position.set(x, PED_H / 2, z);
    ped.userData.node = node; scene.add(ped); pickables.push(ped);
    node._fsn = { x, z, pw, pd, mesh: ped };
    nodeMesh.set(node, ped);
    // name plate along the front edge
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(pw - 0.4, 9), 1.5), new THREE.MeshBasicMaterial({ map: labelTexture(node.parent ? node.name + '/' : '~gregory', { size: 44, w: 384, h: 64 }), transparent: true, fog: false }));
    plate.rotation.x = -Math.PI / 2; plate.position.set(x, PED_H + 0.02, z + pd / 2 - 0.95); scene.add(plate);
    files.forEach((f, i) => {
      const cx = x - (cols * CELL) / 2 + CELL / 2 + (i % cols) * CELL;
      const cz = z - pd / 2 + 0.9 + CELL / 2 + Math.floor(i / cols) * CELL_Z - 0.3;
      const h = 0.7 + weight(f) * 3.4;
      const col = new THREE.Color(KIND_COLOR[f.kind] || 0xcccccc).offsetHSL((hash(f.name) - 0.5) * 0.04, 0, (hash(f.name + 'l') - 0.5) * 0.08);
      const side = new THREE.MeshLambertMaterial({ color: col });
      const topMat = new THREE.MeshLambertMaterial({ color: col.clone().multiplyScalar(1.15) });
      const img = f.kind === 'video' ? f.video.thumb : f.kind === 'app' ? f.app.image : f.image;
      if (img) loader.load(img, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; topMat.map = t; topMat.color.set(0xffffff); topMat.needsUpdate = true; kick(); }, undefined, () => {});
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, h, 1.5), [side, side, topMat, side, side, side]);
      box.position.set(cx, PED_H + h / 2, cz);
      box.userData.node = f; box.userData.h = h; box.userData.side = side; box.userData.top = topMat;
      scene.add(box); pickables.push(box); nodeMesh.set(f, box);
      const text = f.kind === 'video' ? f.video.short : f.kind === 'app' ? f.app.name : f.name.replace(/\.(html|url)$/, '');
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.5), new THREE.MeshBasicMaterial({ map: labelTexture(text, { size: 26 }), transparent: true }));
      lab.rotation.x = -Math.PI / 2; lab.position.set(cx, PED_H + 0.03, cz + 1.08); scene.add(lab);
    });
  }

  // root in front, sub-directories fanned out behind it
  buildDir(root, 0, 0);
  const dirs = root.children.filter((c) => c.kind === 'dir');
  {
    const widths = dirs.map((d) => { const n = Math.max(1, d.children.length); const cols = Math.min(n, Math.max(2, Math.ceil(Math.sqrt(n * 1.7)))); return cols * CELL + 1.4; });
    const gap = 2.2, total = widths.reduce((a, b) => a + b, 0) + gap * (dirs.length - 1);
    let x = -total / 2;
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xe8ecff });
    dirs.forEach((d, i) => {
      const cx = x + widths[i] / 2;
      const zz = -19 - (i % 2) * 9;
      buildDir(d, cx, zz);
      x += widths[i] + gap;
      // connector from the root pedestal
      const a = new THREE.Vector3(0, 0.03, -root._fsn.pd / 2), b = new THREE.Vector3(cx, 0.03, zz + d._fsn.pd / 2);
      const len = a.distanceTo(b);
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, len), lineMat);
      line.position.copy(a).add(b).multiplyScalar(0.5); line.lookAt(b); scene.add(line);
    });
  }

  // selection markers
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 40, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.visible = false; scene.add(beam);
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xfff27a, fog: false }));
  outline.visible = false; scene.add(outline);

  // ---- camera rig -----------------------------------------------------------
  const cur = { x: 0, z: 0, d: 150 }, want = { x: 0, z: -10, d: 60 };
  const PITCH = THREE.MathUtils.degToRad(37);
  function placeCamera() {
    camera.position.set(cur.x, cur.d * Math.sin(PITCH) + 0.5, cur.z + cur.d * Math.cos(PITCH));
    camera.lookAt(cur.x, 0.5, cur.z - cur.d * 0.22);
  }
  function overview() {
    const a = camera.aspect || 1.3;
    want.x = 0; want.z = -5; want.d = Math.max(40, 58 / Math.min(1.5, a));
    select(null); kick();
  }
  function flyTo(node) {
    if (!node) return;
    if (node.kind !== 'dir') { const p = node.parent; select(node); const m = nodeMesh.get(node); if (m && p && p._fsn) { want.x = m.position.x; want.z = m.position.z + 2.5; want.d = 13; } kick(); return; }
    const f = node._fsn; if (!f) return;
    const a = camera.aspect || 1.3;
    want.x = f.x; want.z = f.z + f.pd * 0.3; want.d = Math.max(14, (f.pw * 1.25) / Math.min(1.4, a) + f.pd * 0.75);
    select(node); kick();
    desk.audio.whoosh();
  }

  let selected = null, hovered = null;
  function select(node) {
    selected = node;
    const m = node && node.kind !== 'dir' ? nodeMesh.get(node) : null;
    beam.visible = outline.visible = !!m;
    if (m) {
      beam.position.set(m.position.x, 20 + PED_H + m.userData.h, m.position.z);
      outline.position.copy(m.position); outline.scale.set(1.62, m.userData.h + 0.12, 1.62);
    }
    onSelect(node && node.kind !== 'dir' ? node : null);
    if (node) onStatus(node.path);
    kick();
  }
  function setHover(m) {
    if (hovered === m) return;
    if (hovered && hovered.userData.side) { hovered.userData.side.emissive.set(0x000000); hovered.userData.top.emissive.set(0x000000); }
    if (hovered && !hovered.userData.side) hovered.material.emissive.set(0x000000);
    hovered = m;
    if (m && m.userData.side) { m.userData.side.emissive.set(0x3a3a20); m.userData.top.emissive.set(0x242412); }
    else if (m) m.material.emissive.set(0x1c1c10);
    canvas.style.cursor = m ? 'pointer' : 'grab';
    if (m) onStatus(m.userData.node.path); else if (selected) onStatus(selected.path);
    kick();
  }

  // ---- input ----------------------------------------------------------------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = (ev) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(pickables, false)[0];
    return h ? h.object : null;
  };
  let drag = null, moved = 0;
  const pts = new Map(); let pinch = 0;
  canvas.addEventListener('pointerdown', (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    drag = { x: ev.clientX, y: ev.clientY }; moved = 0;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  canvas.addEventListener('pointermove', (ev) => {
    const p = pts.get(ev.pointerId);
    if (p && drag) {
      const dx = ev.clientX - p.x, dy = ev.clientY - p.y; p.x = ev.clientX; p.y = ev.clientY;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) want.d = THREE.MathUtils.clamp(want.d * (pinch / d), 7, 130); pinch = d; moved += 10; kick(); return;
      }
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 5) {
        const k = (cur.d * 1.5) / canvas.getBoundingClientRect().height;
        want.x = THREE.MathUtils.clamp(want.x - dx * k, -70, 70); want.z = THREE.MathUtils.clamp(want.z - dy * k * 1.5, -70, 30);
        canvas.style.cursor = 'grabbing'; kick();
      }
      return;
    }
    if (ev.pointerType !== 'touch') setHover(pick(ev));
  });
  const up = (ev) => {
    if (!pts.delete(ev.pointerId)) return;
    if (pts.size < 2) pinch = 0;
    if (pts.size) return;
    canvas.style.cursor = hovered ? 'pointer' : 'grab';
    if (drag && moved <= 5 && ev.type === 'pointerup') {
      const m = pick(ev);
      if (m) {
        const node = m.userData.node;
        if (node.kind === 'dir') flyTo(node);
        else if (selected === node) { desk.audio.click(); desk.openNode(node); }
        else { desk.audio.blip(Math.floor(hash(node.name) * 9)); flyTo(node); }
      } else select(null);
    }
    drag = null;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => { if (!drag) setHover(null); });
  canvas.addEventListener('dblclick', (ev) => { const m = pick(ev); if (m && m.userData.node.kind !== 'dir') desk.openNode(m.userData.node); });
  canvas.addEventListener('wheel', (ev) => { ev.preventDefault(); want.d = THREE.MathUtils.clamp(want.d * Math.exp(ev.deltaY * 0.0014), 7, 130); kick(); }, { passive: false });

  // ---- loop -----------------------------------------------------------------
  let active = true, raf = 0, awake = 120, last = performance.now(), disposed = false;
  function kick() { awake = 90; if (!raf && active && !disposed) raf = requestAnimationFrame(frame); }
  function render() { placeCamera(); renderer.render(scene, camera); }
  function frame(now) {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = 1 - Math.exp(-dt * 4.2);
    cur.x += (want.x - cur.x) * k; cur.z += (want.z - cur.z) * k; cur.d += (want.d - cur.d) * k;
    if (beam.visible) { beam.material.opacity = 0.13 + 0.05 * Math.sin(now * 0.004); beam.rotation.y = now * 0.0004; }
    render();
    const moving = Math.abs(want.x - cur.x) + Math.abs(want.z - cur.z) + Math.abs(want.d - cur.d) > 0.01;
    if (moving || beam.visible) awake = 30; else awake--;
    if (active && desk.visible && awake > 0) raf = requestAnimationFrame(frame);
  }
  function resize() {
    const w = Math.max(50, container.clientWidth - 2), h = Math.max(50, container.clientHeight - 2);
    renderer.setPixelRatio(Math.min(2, (window.devicePixelRatio || 1) * Math.max(0.75, desk.scale)));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w / h < 0.9 ? 56 : 42; camera.updateProjectionMatrix();
    kick();
  }
  resize();
  overview();
  if (start && start !== root) setTimeout(() => flyTo(start), 700);
  last = performance.now();
  kick();

  return {
    canvas, flyTo, overview, resize, render,
    setActive(on) { active = on; if (on) { last = performance.now(); kick(); } },
    dispose() {
      disposed = true; cancelAnimationFrame(raf);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; ms.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); });
      renderer.dispose(); renderer.forceContextLoss?.(); canvas.remove();
    },
  };
}
