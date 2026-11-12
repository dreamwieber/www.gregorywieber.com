// Hand-drawn icons in the spirit of the Indigo Magic Desktop: chunky, isometric, outlined.
const S = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" stroke="#000" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

const carpet = (c1, c2) => `<path d="M32 40 58 50 32 61 6 50z" fill="${c1}"/><path d="M32 43 51 50 32 58 13 50z" fill="${c2}" stroke-width="1"/>`;

const SVG = {
  folder: S(`<path d="M8 22 22 16l6 3 26-9v30L22 52 8 46z" fill="#d9b25a"/><path d="M8 22l14 6v24L8 46z" fill="#b98f3c"/><path d="M22 28 54 16v24L22 52z" fill="#edcd7a"/><path d="M22 28l-6-9 30-11 8 8" fill="#f6e2a4"/>`),
  home: S(`<path d="M8 24 22 18l6 3 26-9v30L22 54 8 48z" fill="#d9b25a"/><path d="M8 24l14 6v24L8 48z" fill="#b98f3c"/><path d="M22 30 54 18v24L22 54z" fill="#edcd7a"/><path d="M30 44V34l8-9 8 3v10z" fill="#fff"/><path d="M28 35l10-11 10 4" fill="none" stroke="#c0392b" stroke-width="3"/><path d="M36 42v-6l4-1.5v6z" fill="#3a6ea5"/>`),
  text: S(`<path d="M16 8h24l10 10v38H16z" fill="#fff"/><path d="M40 8v10h10" fill="#d8d8d8"/><path d="M22 24h20M22 30h22M22 36h18M22 42h22M22 48h12" stroke="#3a6ea5" stroke-width="2"/>`),
  page: S(`<path d="M12 10h40v44H12z" fill="#fff"/><path d="M12 10h40v9H12z" fill="#2d5fa3"/><circle cx="17" cy="14.5" r="1.4" fill="#fff" stroke="none"/><path d="M17 26h14v12H17z" fill="#f0b84a"/><path d="M36 27h11M36 32h11M36 37h8M17 44h30M17 49h22" stroke="#555" stroke-width="2"/>`),
  movie: S(`${carpet('#7a2a22', '#c0392b')}<path d="M12 12h40v28H12z" fill="#1c1c1c"/><path d="M12 12h40v5H12zM12 35h40v5H12z" fill="#333"/><path d="M16 14.5h3M23 14.5h3M30 14.5h3M37 14.5h3M44 14.5h3M16 37.5h3M23 37.5h3M30 37.5h3M37 37.5h3M44 37.5h3" stroke="#fff" stroke-width="2"/><path d="M27 20v12l11-6z" fill="#fff"/>`),
  app: S(`${carpet('#234a80', '#3f78c4')}<path d="M18 14 32 8l14 6v18l-14 7-14-7z" fill="#e8e8e8"/><path d="M18 14l14 6 14-6M32 20v19" fill="none"/><path d="M32 20l14-6v18l-14 7z" fill="#bdbdbd"/><circle cx="25" cy="24" r="3" fill="#ff7a59"/>`),
  softbreak: S(`${carpet('#b8bdd0', '#eef0f6')}<rect x="8" y="10" width="14" height="9" rx="4" fill="#ff8a70"/><rect x="25" y="10" width="14" height="9" rx="4" fill="#ffd166"/><rect x="42" y="10" width="14" height="9" rx="4" fill="#7ad3c0"/><rect x="16" y="22" width="14" height="9" rx="4" fill="#9db5ff"/><rect x="34" y="22" width="14" height="9" rx="4" fill="#f29bd4"/><circle cx="34" cy="38" r="3.4" fill="#fff"/><rect x="22" y="45" width="22" height="6" rx="3" fill="#39415c"/>`),
  fsn: S(`<path d="M4 46 32 34l28 12-28 13z" fill="#2c7a3d"/><path d="M12 40l10-4 10 4-10 4z" fill="#3aa0d8"/><path d="M12 40v-8l10-4 10 4v8l-10 4z" fill="#3aa0d8"/><path d="M12 32l10 4 10-4M22 36v8" fill="none"/><path d="M34 46l9-3.5 9 3.5-9 3.5z" fill="#e0563a"/><path d="M34 46V30l9-3.5 9 3.5v16l-9 3.5z" fill="#e0563a"/><path d="M34 30l9 3.5 9-3.5M43 33.500v16" fill="none"/><path d="M26 22l7-3 7 3v9l-7 3-7-3z" fill="#e2a11a"/><path d="M26 22l7 3 7-3M33 25v9" fill="none"/>`),
  netscape: S(`${carpet('#123', '#1f6f8f')}<rect x="10" y="8" width="44" height="34" fill="#0d2b55"/><path d="M10 34c8-8 14 2 22-6s14-2 22-8v22H10z" fill="#1f8a8a"/><path d="M22 34V15l20 19V15" fill="none" stroke="#fff" stroke-width="5"/>`),
  console: S(`<rect x="7" y="9" width="50" height="38" fill="#b4b4b4"/><rect x="11" y="13" width="42" height="29" fill="#10182b"/><path d="M15 20l6 4-6 4M25 29h10" stroke="#7dffb0" stroke-width="2.4" fill="none"/><path d="M22 47h20l4 8H18z" fill="#9c9c9c"/>`),
  // the iconified Console window that lives beside the Toolchest (frame and label included)
  consoleMin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100"><defs><radialGradient id="w" cx="0.5" cy="0.35" r="0.8"><stop offset="0" stop-color="#8f55c8"/><stop offset="1" stop-color="#4f2684"/></radialGradient></defs><rect width="80" height="100" fill="#000"/><rect x="1" y="1" width="78" height="98" fill="#b9b9b9"/><path d="M1 1h78v2H3v96H1z" fill="#ececec"/><path d="M79 1v98H1v-2h76V1z" fill="#6b6b6b"/><path d="M5 5h70v1H6v69H5z" fill="#6b6b6b"/><path d="M75 5v71H5v-1h69V5z" fill="#ececec"/><rect x="6" y="6" width="68" height="69" fill="#000"/><rect x="7" y="7" width="66" height="67" fill="url(#w)"/><path d="M4 79h72v1H4z" fill="#6b6b6b"/><path d="M4 80h72v1H4z" fill="#ececec"/><g stroke="#2b2620" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round"><ellipse cx="43" cy="60" rx="24" ry="6" fill="#000" opacity="0.22" stroke="none"/><path d="M22 53c-9 2-10 8-4 10s6 4 11 5" fill="none" stroke="#2b2620" stroke-width="3"/><path d="M22 53c-9 2-10 8-4 10s6 4 11 5" fill="none" stroke="#d6cdb2" stroke-width="1.6"/><ellipse cx="43" cy="55" rx="11" ry="3.4" fill="#c9c0a4"/><path d="M18 22l7-4 1 33-7-4z" fill="#bdb294"/><path d="M20 26v8M21.5 25v8M23 24.4v8" stroke="#8f8468" stroke-width="0.6"/><path d="M25 18l34-3 1 33-34 4z" fill="#e6dec6"/><path d="M29 22.5l27-2.4 0.8 22.6-27 3.2z" fill="#22357f"/><path d="M32 36.5q3-2.2 6-1t6-1 6-1 4.5-1.2M32 40.3q3-2.2 6-1t6-1 6-1 4.5-1.2M32 44q3-2.2 6-1t6-1 6-1 4.5-1.2" fill="none" stroke="#7fb0ff" stroke-width="1.2"/><rect x="53" y="45.6" width="3.4" height="1.6" fill="#3ddc6a" stroke-width="0.5"/><path d="M29 63l33-9 10 5-32 10z" fill="#e6dec6"/><path d="M29 63l11 6v2.6l-11-6zM40 69l32-10v2.6L40 71.6z" fill="#b4a98b"/><path d="M34 62.6l27-7.4M36.6 64l27-7.6M39.4 65.4l27-7.8" stroke="#9c9176" stroke-width="1.5" stroke-dasharray="2.2 1" fill="none"/></g><text x="40" y="94" text-anchor="middle" font-family="Georgia, 'Times New Roman', Times, serif" font-size="13.5" fill="#111">Console</text></svg>`,
  dumpster: S(`<path d="M8 22h48l-5 30H13z" fill="#2f8f5b"/><path d="M6 16h52v7H6z" fill="#3fb173"/><path d="M20 28v18M32 28v18M44 28v18" stroke="#1d5c3a" stroke-width="2.4"/><path d="M22 16l4-7h12l4 7" fill="none"/>`),
  mail: S(`${carpet('#6b4a12', '#d9a53a')}<path d="M10 14h44v28H10z" fill="#fff"/><path d="M10 14l22 16 22-16" fill="none"/><path d="M44 18h6v7h-6z" fill="#c0392b"/>`),
  link: S(`${carpet('#1d5c3a', '#3fb173')}<circle cx="32" cy="24" r="16" fill="#3a8fd8"/><path d="M16 24h32M32 8c-9 8-9 24 0 32M32 8c9 8 9 24 0 32" fill="none"/><path d="M22 14c4 5 2 8 6 10s8-2 10 3-3 6-2 10" fill="none" stroke="#2c7a3d" stroke-width="3"/>`),
  indy: S(`<path d="M6 44 34 34l24 8-28 11z" fill="#1873a6"/><path d="M6 44v6l24 9v-6z" fill="#0e4f78"/><path d="M30 53l28-11v6L30 59z" fill="#135f8f"/><path d="M16 14h30v24H16z" fill="#cfccc3"/><path d="M20 18h22v16H20z" fill="#4d6f99"/><path d="M46 14l6 4v22l-6-2z" fill="#a9a69d"/>`),
  image: S(`<path d="M10 12h44v40H10z" fill="#fff"/><path d="M14 16h36v28H14z" fill="#8fc7ff"/><path d="M14 44l11-14 8 9 6-6 11 11z" fill="#3fae6a"/><circle cx="41" cy="24" r="4" fill="#ffd166"/>`),
  yt: S(`${carpet('#5c1d1d', '#c0392b')}<rect x="10" y="12" width="44" height="30" rx="8" fill="#e52d27"/><path d="M27 19v16l14-8z" fill="#fff"/>`),
};

const cache = new Map();
export function iconURL(name) {
  if (!cache.has(name)) cache.set(name, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SVG[name] || SVG.text));
  return cache.get(name);
}
const imgs = new Map();
export function iconImage(name) {
  if (!imgs.has(name)) { const i = new Image(); i.src = iconURL(name); imgs.set(name, i); }
  return imgs.get(name);
}
export function iconFor(node) {
  if (node.icon) return node.icon;
  switch (node.kind) {
    case 'dir': return node.parent ? 'folder' : 'home';
    case 'app': return node.app && node.app.key === 'softbreak' ? 'softbreak' : 'app';
    case 'video': return 'movie';
    case 'page': return node.image ? 'image' : 'page';
    case 'link': return node.url.startsWith('mailto') ? 'mail' : node.url.includes('youtube') ? 'yt' : 'link';
    default: return 'text';
  }
}
