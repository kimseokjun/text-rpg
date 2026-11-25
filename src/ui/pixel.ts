/**
 * 코드로 찍는 도트 스프라이트.
 * 그리드 문자 → 팔레트 색, 바깥 테두리는 자동으로 1px 어둡게 둘러준다.
 */
export type Palette = Record<string, string>;

const OUTLINE = '#1a0f14';

export function sprite(grid0: string[], pal: Palette, opts: { size?: number; outline?: boolean; title?: string; glow?: string; glow2?: string } = {}): string {
  const w = Math.max(...grid0.map((r) => r.length));
  const grid = grid0.map((r) => r.padEnd(w, '.'));
  const h = grid.length;
  const filled = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < w && grid[y][x] !== '.' && pal[grid[y][x]] !== undefined;
  const rects: string[] = [];
  // 테두리
  if (opts.outline !== false) {
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      if (filled(x, y)) continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) rects.push(`<rect x="${x + 1}" y="${y + 1}" width="1" height="1" fill="${OUTLINE}"/>`);
    }
  }
  // 같은 색 가로 줄은 하나로 합쳐 가볍게
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const ch = grid[y][x];
      if (!filled(x, y)) { x++; continue; }
      let run = 1;
      while (x + run < w && grid[y][x + run] === ch) run++;
      rects.push(`<rect x="${x + 1}" y="${y + 1}" width="${run}" height="1" fill="${pal[ch]}"/>`);
      x += run;
    }
  }
  const size = opts.size ?? 48;
  const cx = (w + 2) / 2, cy = (h + 2) / 2, R = Math.max(w, h) / 2 + 0.5;
  const glow = (opts.glow ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${opts.glow}" opacity=".26"/>` : '')
    + (opts.glow2 ? `<circle cx="${cx}" cy="${cy}" r="${R * 0.62}" fill="${opts.glow2}" opacity=".22"/>` : '');
  return `<svg class="px" viewBox="0 0 ${w + 2} ${h + 2}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="${opts.title ?? ''}">${glow}${rects.join('')}</svg>`;
}

/** 문자열에서 안정적인 해시 → 색 고르기 */
export function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pick = <T,>(arr: T[], n: number) => arr[n % arr.length];
/** 색 밝기 조절 */
export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * (amt > 0 ? 255 - v : v))));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ───────── 캐릭터 ─────────
const SKIN = ['#f3cfa8', '#e0b088', '#c98d62', '#9c6a45'];
const HAIR = ['#2b1d16', '#5a3420', '#9a5b2c', '#d8a84e', '#e8e0d0', '#7b2d2d', '#3d4b78', '#2f5d3a', '#b7b9c4'];

// ─────────────── 부품 조립 캐릭터 (20×22) ───────────────
type Grid = string[];
const W = 20, H = 22;
function canvas(): string[][] { return Array.from({ length: H }, () => Array(W).fill('.')); }
function put(cv: string[][], g: Grid, x: number, y: number) {
  g.forEach((row, dy) => [...row].forEach((ch, dx) => { const X = x + dx, Y = y + dy; if (ch !== '.' && X >= 0 && X < W && Y >= 0 && Y < H) cv[Y][X] = ch; }));
}
const FACE: Grid = ['ssssssss', 'ssssssss', 'ssessess', 'ssssssss', '.sskkss.', '..ssss..', '...ss...'];

const HAIRSTYLE: Record<string, { g: Grid; x: number; y: number; back?: boolean }[]> = {
  short: [{ g: ['..hhhhhh..', '.hhhhhhhh.', '.hhhhhhhh.', '.h......h.'], x: 5, y: 2 }],
  long: [{ g: ['..hhhhhh..', '.hhhhhhhh.', 'hhhhhhhhhh', 'hh......hh', 'h........h', 'h........h', 'h........h', 'hh......hh', 'hh......hh', 'hh......hh'], x: 5, y: 2 }],
  pony: [{ g: ['..hhhhhh....', '.hhhhhhhhh..', '.hhhhhhhhhhh', '.h......h.hh', '..........hh', '..........h.', '.........hh.'], x: 5, y: 2 }],
  spiky: [{ g: ['.h..h..h..', '.hh.hh.hh.', 'hhhhhhhhhh', '.hhhhhhhh.', '.h......h.'], x: 5, y: 0 }],
  bun: [{ g: ['....hh....', '...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '.hhhhhhhh.', '.h......h.'], x: 5, y: 0 }],
  bald: [{ g: ['..ssssss..', '.ssssssss.'], x: 5, y: 2 }],
  mohawk: [{ g: ['....hh....', '....hh....', '...hhhh...', '.sshhhhss.', '.ssssssss.'], x: 5, y: 0 }],
};
const BEARD: Grid = ['h......h', 'hh.kk.hh', '.hhhhhh.', '..hhhh..'];

const HEADGEAR: Record<string, { g: Grid; x: number; y: number; hideHair?: boolean }> = {
  helm: { g: ['...mmmm...', '..mmlmmm..', '.mmmmmmmm.', '.mmmmmmmm.', '.m......m.', '.m......m.'], x: 5, y: 1, hideHair: true },
  hornhelm: { g: ['n........n', 'nn.mmmm.nn', '.nmmlmmmn.', '.mmmmmmmm.', '.mmmmmmmm.', '.m......m.', '.m......m.'], x: 5, y: 0, hideHair: true },
  greathelm: { g: ['..mmmmmm..', '.mmlmmmmm.', '.mmmmmmmm.', '.mmmmmmmm.', '.mmmeemmm.', '.mmmmmmmm.', '.mmmmmmmm.', '..mmmmmm..'], x: 5, y: 1, hideHair: true },
  bandana: { g: ['.rrrrrrrr.', 'r........r', '.........r', '........rr'], x: 5, y: 4 },
  wizard: { g: ['......a...', '.....aa...', '....aaaa..', '...aaaaaa.', '..aaaaaaa.', 'aaaggggaaa'], x: 5, y: -1, hideHair: false },
  hood: { g: ['...qqqq...', '..qqqqqq..', '.qqqqqqqq.', '.qqq..qqq.', '.q......q.', '.q......q.', '.q......q.', '.qq....qq.', '.qq....qq.'], x: 5, y: 1, hideHair: true },
  circlet: { g: ['.gggjggg.'], x: 5, y: 4 },
  feather: { g: ['........f.', '.......ff.', '...cccff..', '..cccccc..', '.cccccccc.'], x: 5, y: 0 },
  mitre: { g: ['....gg....', '...WWWW...', '...WggW...', '..WWggWW..', '.WWWWWWWW.'], x: 5, y: 0, hideHair: true },
  crown: { g: ['.g.g.g.g.', '.gggjggg.'], x: 5, y: 2 },
};

const BODY: Record<string, Grid> = {
  warrior: ['..aaaaaaaa..', '.aaalaaaaaa.', 'saaaaaaaaaas', 'saaaaggaaaas', 'saaaaggaaaas', 's.bbbbbbbb.s', '..aaaaaaaa..', '..bbb..bbb..', '..bbb..bbb..', '.ccc....ccc.'],
  mage: ['..aaaaaaaa..', '.aaaaggaaaa.', 'aaaaaggaaaaa', 'saaaaggaaaas', '.aaaaggaaaa.', '.aaaaaaaaaa.', '.aaaaaaaaaa.', 'aaaaaaaaaaaa', 'bbbbbbbbbbbb', '.cc......cc.'],
  archer: ['..aaaaaaaa..', '.aaawaaaaaa.', 'saaaawaaaaas', 'saaaaawaaaas', 'saaaaaawaaas', 's.bbbbbbbb.s', '..aaaaaaaa..', '..bbb..bbb..', '..ccc..ccc..', '.ccc....ccc.'],
  priest: ['..aaaaaaaa..', '.aaaggggaaa.', 'aaaaaggaaaaa', 'saaaaggaaaas', '.aaaaggaaaa.', '.aaaaggaaaa.', '.aaaaggaaaa.', 'aaaaaggaaaaa', 'bbbbbbbbbbbb', '.cc......cc.'],
};
const PAULDRON: Grid = ['pp........pp', 'pgp......pgp'];
const CAPE: Grid = ['.rrrrrrrrrrrr.', 'rr..........rr', 'rr..........rr', 'rr..........rr', 'rr..........rr', 'rr..........rr', 'rr..........rr', 'rr..........rr', 'rrr........rrr', '.rr........rr.'];
const HALO: Grid = ['.yyyyyy.', 'y......y', '.yyyyyy.'];
const WINGS: Grid = [
  'vv................vv',
  'uvv..............vvu',
  'vuvv............vvuv',
  'vvuvv..........vvuvv',
  '.vvuvv........vvuvv.',
  '.vvvuv........vuvvv.',
  '..vvvv........vvvv..',
  '..uvv..........vvu..',
  '...vv..........vv...',
  '....v..........v....',
];
const SPARKS: [number, number][] = [[1, 1], [18, 2], [0, 9], [19, 12], [1, 19], [18, 20], [3, 5], [16, 7]];
const COLLAR: Grid = ['.gggggggg.'];
const WING_COL: Record<string, [string, string]> = { warrior: ['#e0503a', '#ffb070'], mage: ['#8a5ad8', '#e0c8ff'], archer: ['#3fae5a', '#c8f5a8'], priest: ['#e8e4dc', '#ffffff'] };
export const JOB_GLOW: Record<string, string> = { warrior: '#ff7040', mage: '#a070ff', archer: '#60e080', priest: '#ffe680' };

const WEAPON: Record<string, Grid> = {
  sword: ['..l..', '..m..', '..m..', '..m..', '..m..', '..m..', '..m..', '..m..', '.ggg.', '..w..', '..w..', '..p..'],
  axe: ['..wmm', '..wml', '..wmm', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..'],
  spear: ['..l..', '.lml.', '..m..', '..g..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..'],
  greatsword: ['..l..', '.lml.', '.mmm.', '.mmm.', '.mmm.', '.mmm.', '.mmm.', '.mmm.', '.mmm.', 'ggggg', '..w..', '..w..', '..p..'],
  orbstaff: ['.jjj.', 'jjljj', 'jjjjj', '.jjj.', '..g..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..'],
  crook: ['.www.', 'w...w', '....w', '...jw', '..ww.', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..'],
  book: ['.....', '.....', '.....', '.....', '.....', '.....', '.....', '.....', 'jjjj.', 'jWWj.', 'jgWj.', 'jjjj.'],
  bow: ['.m...', '..m..', '..wn.', '..w.n', '..w.n', '.ww.n', '.gg.n', '.ww.n', '..w.n', '..w.n', '..wn.', '..m..', '.m...'],
  crossbow: ['.....', '.....', '.....', '.....', '.....', '.....', '.....', 'm...m', '.mmm.', 'wwwwww', '..ww.', '..w..'],
  crossstaff: ['..g..', '.ggg.', '..g..', '..g..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..'],
  mace: ['.l.l.', 'mmmmm', 'mmlmm', 'mmmmm', '.l.l.', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..'],
};
// 무기를 쥐는 손 위치 (y=15)에 맞춰 각 무기의 아래 끝을 정렬
const SHIELD: Record<string, Grid> = {
  round: ['.mmm.', 'mmgmm', 'mgggm', 'mmgmm', '.mmm.'],
  kite: ['mmmmm', 'mrgrm', 'mrrrm', '.mrm.', '..m..'],
  tower: ['mmmm', 'mrrm', 'mggm', 'mrrm', 'mrrm', 'mmmm'],
};

const LOOK: Record<string, { hair: string[]; head: string[]; weapon: string[]; shield?: string[]; beard: number }> = {
  warrior: { hair: ['short', 'spiky', 'mohawk', 'pony', 'bald', 'long'], head: ['none', 'helm', 'hornhelm', 'greathelm', 'bandana', 'none'], weapon: ['sword', 'axe', 'spear', 'greatsword'], shield: ['round', 'kite', 'tower', 'none'], beard: 45 },
  mage: { hair: ['long', 'short', 'bun', 'pony', 'spiky'], head: ['wizard', 'hood', 'circlet', 'none', 'wizard'], weapon: ['orbstaff', 'crook', 'book', 'orbstaff'], beard: 30 },
  archer: { hair: ['pony', 'short', 'long', 'spiky', 'bun'], head: ['hood', 'feather', 'bandana', 'none'], weapon: ['bow', 'bow', 'crossbow'], beard: 20 },
  priest: { hair: ['long', 'short', 'bun', 'bald'], head: ['hood', 'mitre', 'circlet', 'none'], weapon: ['crossstaff', 'mace', 'book', 'crossstaff'], beard: 25 },
};
const OUTFITS: Record<string, string[]> = {
  warrior: ['#7d8794', '#5b6fa0', '#8a3a3a', '#4a5a4a', '#6a5a8a', '#8a6a3a'],
  mage: ['#5d4a9a', '#2f4f8f', '#8a2f4a', '#2f6a6a', '#4a2a6a', '#7a3f9a'],
  archer: ['#4f7a3a', '#6a5030', '#2f5d3a', '#5a6a3a', '#3a4a5a', '#7a4a2a'],
  priest: ['#ece4d0', '#d8d0f0', '#f0e0c0', '#e0ecf4', '#f4dede'],
};
const CAPES: Record<string, string> = { warrior: '#9a2a2a', mage: '#3a1f6a', archer: '#2a4a2a', priest: '#c89b3c' };

export function charSprite(base: 'warrior' | 'mage' | 'archer' | 'priest', name: string, tier = 1, opts: { size?: number; glow?: string } = {}) {
  const hs = hash(name), r = (n: number) => (hs >>> n) & 0xff;
  const look = LOOK[base];
  const hair = look.hair[r(0) % look.hair.length];
  let head = look.head[r(3) % look.head.length];
  if (tier >= 5 && head === 'none') head = base === 'priest' ? 'mitre' : 'crown';
  const weapon = look.weapon[r(7) % look.weapon.length];
  const shield = look.shield ? look.shield[r(11) % look.shield.length] : 'none';
  const beard = r(13) % 100 < look.beard;
  const t = Math.max(1, Math.min(5, tier));
  const cv = canvas();
  // 뒤쪽: 날개/망토
  if (t >= 5) put(cv, WINGS, 0, 6);
  if (t >= 4) put(cv, CAPE, 3, 11);
  // 몸
  put(cv, BODY[base], 4, 11);
  if (t >= 3) put(cv, base === 'warrior' || base === 'archer' ? PAULDRON : ['gg........gg', '.g........g.'], 4, 11);
  if (t >= 4) put(cv, COLLAR, 5, 11);
  // 얼굴·머리
  put(cv, FACE, 6, 4);
  const hg = head !== 'none' ? HEADGEAR[head] : null;
  if (!hg?.hideHair) for (const p of HAIRSTYLE[hair]) put(cv, p.g, p.x, p.y);
  if (beard && head !== 'greathelm') put(cv, BEARD, 6, 7);
  if (hg) put(cv, hg.g, hg.x, hg.y);
  if (t >= 5 && base !== 'priest' && head !== 'wizard') put(cv, HALO, 6, head === 'crown' ? -1 : -1);
  // 무기 (아래 끝이 손 y=16에 오게)
  const wg = WEAPON[weapon];
  const wy = weapon === 'book' || weapon === 'crossbow' ? 5 : 16 - wg.length + 1;
  put(cv, wg, 14, wy);
  if (shield !== 'none') put(cv, SHIELD[shield], 1, 13);
  if (t >= 5) for (const [x, y] of SPARKS) if (cv[y][x] === '.') cv[y][x] = 'x';
  const grid = cv.map((row) => row.join(''));
  const outfit = pick(OUTFITS[base], r(17)), trim = ['#a8823a', '#c89b3c', '#d8ac3f', '#eac24a', '#ffd95e'][t - 1];
  const pal: Palette = {
    s: pick(SKIN, r(19)), e: '#1a0f14', k: shade(pick(SKIN, r(19)), -0.25), h: pick(HAIR, r(21)),
    a: outfit, b: shade(outfit, -0.35), l: shade(outfit, 0.35), g: trim, c: '#3a2a22',
    m: t >= 4 ? '#e8eef8' : '#b4bcc8', p: t >= 4 ? '#d8ac3f' : '#9aa2ae', n: '#efe6cc', w: '#7a5230', j: pick(['#c94a4a', '#3f7fd8', '#6fcf97', '#a050e0', '#e8b84a'], r(23)),
    q: shade(outfit, -0.15), r: t >= 5 ? shade(CAPES[base], 0.15) : CAPES[base], y: '#ffe680', f: '#e85a3a', W: '#f4f0e8',
    v: WING_COL[base][0], u: WING_COL[base][1], x: '#fff6c8',
  };
  if (t >= 5) { pal.m = '#fff3c0'; pal.w = '#c89b3c'; pal.p = '#ffd95e'; }
  else if (t >= 4) { pal.w = '#5a3020'; }
  const glow = opts.glow ?? (t >= 5 ? JOB_GLOW[base] : undefined);
  return sprite(grid, pal, { size: opts.size, glow, glow2: t >= 5 ? '#fff6c8' : t >= 4 ? JOB_GLOW[base] : undefined, title: name });
}
