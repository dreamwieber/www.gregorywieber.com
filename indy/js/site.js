// Everything the Indy knows about gregorywieber.com.
// One place to edit when a new video / app ships.

const yt = (id) => `https://www.youtube.com/watch?v=${id}`;
const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const ROOT = '..'; // the Indy lives at /indy/, the site one level up

export const LINKS = {
  home: `${ROOT}/`,
  dreamwieber: 'https://www.youtube.com/@dreamwieber',
  dreamwieberSub: 'https://www.youtube.com/@dreamwieber?sub_confirmation=1',
  builds: 'https://www.youtube.com/@gregoryBuilds',
  buildsSub: 'https://www.youtube.com/@gregoryBuilds?sub_confirmation=1',
  apposite: 'https://apposite.ai',
  instagram: 'https://www.instagram.com/dreamwieber/',
  patreon: 'https://www.patreon.com/dreamwieber',
  email: 'mailto:hello@apposite.ai',
  softbreak: 'https://apps.apple.com/us/app/soft-break/id6825526231',
  softbreakSite: 'https://www.apposite.ai/softbreak.html',
  metaballs: 'https://apps.apple.com/us/app/metaballs/id6748781900',
  metaballsMobile: 'https://apps.apple.com/us/app/metaballs-mobile/id6761600536',
  vibescape: 'https://apps.apple.com/us/app/vibescape/id6476827678',
  polychord: 'https://apps.apple.com/us/app/polychord/id402625491',
  farmInsta: 'https://www.instagram.com/cleryfarm',
};

export const VIDEOS = [
  { id: 'hxHkNToXga8', title: 'HyperCard Changed Everything', short: 'HyperCard Changed Everything', note: '150K views' },
  { id: '3M1SuRSAbPs', title: 'The First Internet of Things Device?', short: 'The First IoT Device? (Coke machine)', note: '93K views' },
  { id: 'TedaOiRo_Qg', title: 'Why Every Drawing App Still Looks Like MacPaint', short: 'Why Everything Looks Like MacPaint' },
  { id: 'GaNuVR75cwY', title: 'The Connection Machine Was 30 Years Too Early', short: 'Connection Machine — 30 yrs too early' },
  { id: 'ForO33IynkA', title: 'Apple Predicted Siri AI in 1987', short: 'Knowledge Navigator, 1987' },
  { id: '3-sjZZvxLHI', title: 'Did We Learn the Wrong Lessons from Y2K?', short: 'Y2K' },
  { id: '8GweXRxRZX4', title: 'Why Do We Keep Giving Computers a Face?', short: 'Computers with faces' },
  { id: '3A7OUxer4FI', title: "How 'A Pattern Language' Inspired The Sims", short: 'A Pattern Language → The Sims' },
  { id: 'EnyqvtZz7Cg', title: 'How Did Virtual Sets Work Before CGI?', short: 'Virtual sets before CGI' },
  { id: 'LW03EEKjy9o', title: 'How Blobbies Changed CGI', short: 'Blobbies' },
].map((v) => ({ ...v, kind: 'video', channel: 'dreamwieber', url: yt(v.id), thumb: thumb(v.id) }));

export const BUILDS = [
  { id: 'lwBf0Ex5qGs', title: 'This Video Was the Prompt', short: 'This video was the prompt' },
  { id: 'lcpTj2jWbK8', title: 'I Asked Opus 5.5 to Build a Forest', short: 'Build a forest' },
  { id: 'bpgQNiIvnlY', title: 'We Turned an Experiment into a Game!', short: 'Experiment → game' },
].map((v) => ({ ...v, kind: 'video', channel: 'Gregory Builds', url: yt(v.id), thumb: thumb(v.id) }));

export const APPS = [
  {
    key: 'softbreak', name: 'Soft Break', platform: 'iPhone · iPad · Apple Vision Pro',
    tagline: 'A brick breaker made of jelly.',
    blurb: 'Bricks you can squish. They dent, wobble and break apart — catch the falling pieces and send them back up. A streak plays a melody. Buy it once and keep it: no ads, no in-app purchases, no tracking.',
    image: 'assets/softbreak-header.jpg', icon: 'assets/softbreak-icon.png',
    actions: [{ label: 'Download on the App Store', url: LINKS.softbreak, primary: true }, { label: 'Play the IRIX port', run: 'softbreak' }],
  },
  {
    key: 'metaballs', name: 'Metaballs', platform: 'Apple Vision Pro · iPhone · iPad', award: 'Apple Design Award Nominee, 2026',
    tagline: 'Seriously satisfying sculpting.',
    blurb: 'The most fun, direct way to sculpt organic forms. Drag simple primitives into the scene and they fuse together; apply materials and watch them blend. Export for sharing and 3D printing.',
    image: `${ROOT}/assets/images/apps/metaballs.jpg`, page: `${ROOT}/apps/metaballs.html`,
    actions: [{ label: 'Metaballs for Vision Pro', url: LINKS.metaballs, primary: true }, { label: 'Metaballs Mobile', url: LINKS.metaballsMobile, primary: true }],
  },
  {
    key: 'vibescape', name: 'Vibescape', platform: 'Apple Vision Pro', award: 'Featured by Apple',
    tagline: 'Immersive worlds that transport you.',
    blurb: 'Step into hand-crafted immersive environments designed for focus, relaxation, and wonder.',
    image: `${ROOT}/assets/images/vibescape.jpeg`, page: `${ROOT}/apps/vibescape.html`,
    actions: [{ label: 'Get Vibescape', url: LINKS.vibescape, primary: true }],
  },
  {
    key: 'polychord', name: 'Polychord', platform: 'iPad',
    tagline: 'The award-winning iPad instrument.',
    blurb: 'A musical instrument for iPad, loved by professionals and novices alike since 2010. Strum chords, play melodies, write songs.',
    image: `${ROOT}/assets/images/apps/polychord.png`, page: `${ROOT}/apps/polychord.html`,
    actions: [{ label: 'Get Polychord', url: LINKS.polychord, primary: true }],
  },
  { key: 'sagebrush', name: 'SageBrush', platform: 'AI painter · iPad', image: `${ROOT}/assets/images/sagebrush-hero.png`, page: `${ROOT}/apps/sagebrush.html` },
  { key: 'hum', name: 'Hum to Search', platform: 'Google', image: `${ROOT}/assets/images/apps/hum-to-search.png`, page: `${ROOT}/apps/hum-to-search.html` },
  { key: 'pinball', name: 'Search Pinball', platform: 'Google easter egg', image: `${ROOT}/assets/images/apps/search-pinball.png`, page: `${ROOT}/apps/search-pinball.html` },
  { key: 'menace', name: 'Menace', platform: 'Experimental synth · iOS', image: `${ROOT}/assets/images/apps/menace-thumb.png`, page: `${ROOT}/apps/menace.html` },
  { key: 'microcosm', name: 'Microcosm', platform: 'Sound toy · iOS', image: `${ROOT}/assets/images/apps/microcosm-icon.png`, page: `${ROOT}/apps/microcosm.html` },
  { key: 'lineal', name: 'Lineal', platform: 'Timeline app · iPad', image: `${ROOT}/assets/images/apps/lineal.png`, page: `${ROOT}/apps/lineal.html` },
  { key: 'timeful', name: 'Timeful', platform: 'Acquired by Google, 2015', image: `${ROOT}/assets/images/apps/timeful.jpg`, page: `${ROOT}/apps/timeful.html` },
];

const page = (name, path, extra = {}) => ({ name, kind: 'page', url: `${ROOT}/${path}`, ...extra });
const app = (key, file) => ({ name: file, kind: 'app', app: APPS.find((a) => a.key === key) });
const vid = (v) => ({ name: v.id === 'hxHkNToXga8' ? 'hypercard.mv' : slug(v.title) + '.mv', kind: 'video', video: v });
function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28).replace(/-$/, ''); }

export const README = `Welcome to indy.gregorywieber.com

You are logged in as a guest on Gregory Wieber's
Silicon Graphics Indy (R5000, 24-bit XL graphics).

This machine is a toy version of gregorywieber.com.
Everything here goes somewhere:

  * Click the icons on the desktop.
  * Toolchest > Find > File System Navigator
    flies you through the whole site in 3D.
    (It's a UNIX system. You know this.)
  * videos/  holds the dreamwieber tapes:
    stories about the technology and design
    of the recent past.
  * apps/    holds what we make at Apposite:
    Metaballs, Vibescape, Polychord, Soft Break.
  * The Soft Break icon is a little IRIX port of
    our jelly brick-breaker. The real one is on
    iPhone, iPad and Apple Vision Pro.

Step back from the screen (Esc) and try the
things on the desk, too. The lamp is the
day/night switch.

                                    -- Gregory
`;

export const HINV = `1 180 MHZ IP22 Processor
FPU: MIPS R5000 Floating Point Coprocessor Revision: 1.0
CPU: MIPS R5000 Processor Chip Revision: 2.1
On-board serial ports: 2
On-board bi-directional parallel port
Data cache size: 32 Kbytes
Instruction cache size: 32 Kbytes
Secondary unified instruction/data cache size: 512 Kbytes
Main memory size: 128 Mbytes
Iris Audio Processor: version A2 revision 4.1.0
Integral Ethernet: ec0, version 1
Integral SCSI controller 0: Version WD33C93B, revision D
Disk drive: unit 1 on SCSI controller 0
Graphics board: Indy 24-bit
Vino video: unit 0, revision 0, IndyCam connected
Operator: 1 indie developer on a farm in the Pacific Northwest`;

// The virtual filesystem — shared by the icon view, the shell and fsn.
export const FS = {
  name: 'gregory', kind: 'dir', path: '/usr/people/gregory', children: [
    { name: 'README', kind: 'text', text: README },
    {
      name: 'apps', kind: 'dir', color: 0x3aa0d8, children: [
        app('softbreak', 'SoftBreak'), app('metaballs', 'Metaballs'), app('vibescape', 'Vibescape'), app('polychord', 'Polychord'),
        app('sagebrush', 'SageBrush'), app('hum', 'HumToSearch'), app('pinball', 'SearchPinball'),
        app('menace', 'Menace'), app('microcosm', 'Microcosm'), app('lineal', 'Lineal'), app('timeful', 'Timeful'),
      ],
    },
    {
      name: 'videos', kind: 'dir', color: 0xe0563a, children: [
        ...VIDEOS.map(vid),
        { name: 'SUBSCRIBE', kind: 'link', url: LINKS.dreamwieberSub, label: 'Subscribe to dreamwieber on YouTube' },
      ],
    },
    {
      name: 'builds', kind: 'dir', color: 0xe2a11a, children: [
        ...BUILDS.map(vid),
        { name: 'SUBSCRIBE', kind: 'link', url: LINKS.buildsSub, label: 'Subscribe to Gregory Builds on YouTube' },
      ],
    },
    {
      name: 'art', kind: 'dir', color: 0x9b59d0, children: [
        page('generative.html', 'art/digital.html', { image: `${ROOT}/assets/images/art/experiments-lines.jpg` }),
        page('pixel-art.html', 'art/pixel-art.html', { image: `${ROOT}/assets/images/art/pixel-dojo.png` }),
        page('traditional.html', 'art/traditional.html', { image: `${ROOT}/assets/images/art/waterhouse.png` }),
        page('fake-shapes.html', 'art/fake-shapes.html', { image: `${ROOT}/assets/images/tmp-ginormous.png` }),
        page('latent-space.html', 'art/a-walk-through-latent-space-making-art-with-neural-networks.html', { image: `${ROOT}/assets/images/art/fauv-0.jpg` }),
        page('rain', 'art/rain/index.html'),
      ],
    },
    {
      name: 'writing', kind: 'dir', color: 0x3fae6a, children: [
        page('my-computer-history.html', 'writing/my-computer-history.html'),
        page('comet.html', 'writing/comet.html'),
        page('dawn-of-the-new-everything.html', 'writing/dawn-of-the-new-everything-review.html'),
        page('dragons.html', 'writing/dragons.html'),
      ],
    },
    {
      name: 'about', kind: 'dir', color: 0xd8c23a, children: [
        page('bio.html', 'bio.html'),
        page('clery-farm.html', 'cleryfarm.html', { image: `${ROOT}/assets/images/cleryfarm2.jpg` }),
        { name: 'apposite.url', kind: 'link', url: LINKS.apposite, label: 'Apposite — our studio' },
        { name: 'instagram.url', kind: 'link', url: LINKS.instagram, label: '@dreamwieber on Instagram' },
        { name: 'patreon.url', kind: 'link', url: LINKS.patreon, label: 'Support the videos on Patreon' },
        { name: 'mail', kind: 'link', url: LINKS.email, label: 'hello@apposite.ai' },
      ],
    },
    { name: 'gregorywieber.com', kind: 'page', url: `${ROOT}/index.html` },
  ],
};

// annotate paths + parents
(function walk(node, parent) {
  node.parent = parent || null;
  if (parent) node.path = `${parent.path}/${node.name}`;
  (node.children || []).forEach((c) => walk(c, node));
})(FS);

export function resolvePath(cwd, input) {
  if (!input || input === '~') return FS;
  let node = input.startsWith('/') || input.startsWith('~') ? FS : cwd;
  const parts = input.replace(/^~\/?/, '').replace(/^\/usr\/people\/gregory\/?/, '').split('/').filter(Boolean);
  for (const p of parts) {
    if (p === '.') continue;
    if (p === '..') { node = node.parent || node; continue; }
    const next = (node.children || []).find((c) => c.name.toLowerCase() === p.toLowerCase() || c.name.toLowerCase().replace(/\.[a-z]+$/, '') === p.toLowerCase());
    if (!next) return null;
    node = next;
  }
  return node;
}
