/** 장비·펫·아이템·몬스터 도트 (16×16 기준, 보스는 크게) */
import { hash, shade, sprite, type Palette } from './pixel';

const SPARK = '#fff6c8';
const addSparks = (g: string[], pts: [number, number][]) => g.map((row, y) => [...row.padEnd(16, '.')].map((c, x) => (c === '.' && pts.some(([px, py]) => px === x && py === y) ? 'x' : c)).join(''));
const SPARK_PTS: [number, number][] = [[1, 1], [14, 2], [0, 8], [15, 10], [2, 14], [13, 15], [7, 0]];

// ───────────────────── 장비 ─────────────────────
type Kind = 'sword' | 'staff' | 'bow' | 'relic' | 'armor' | 'accessory' | 'hat' | 'bottom' | 'ring';
/** 티어 그룹: 0 = T1-2 소박, 1 = T3-4 장식, 2 = T5-6 화려, 3 = T7 마왕성 */
const EQ: Record<Kind, string[][]> = {
  hat: [["................", "................", "................", ".....wwwwww.....", "....wwwwwwww....", "...wwlwwwwwww...", "...wwwwwwwwww...", "...wwwwwwwwww...", "..kkkkkkkkkkkk..", "..kkkkkkkkkkkk..", "................", "................", "................", "................", "................", "................"], ["................", ".......mm.......", ".....mmmmmm.....", "....mlmmmmmm....", "...mlmmmmmmmm...", "...mmmmmmmmmm...", "...mmbbbbbbmm...", "...mmb....bmm...", "...mmb....bmm...", "...mmm....mmm...", "....mm....mm....", "................", "................", "................", "................", "................"], [".......g........", "......gjg.......", ".....gmmmg......", "....mlmmmmmm....", "...mlmmgmmmmm...", "...mmmgjgmmmm...", "...gggggggggg...", "...mmb....bmm...", "...mmb....bmm...", "...gmm....mmg...", "....gm....mg....", "................", "................", "................", "................", "................"], ["..n..........n..", "..nn...g....nn..", "...nn.gjg..nn...", "....nmmmmmmn....", "...mlmmrmmmmm...", "...mmmrjrmmmm...", "...rrrrrrrrrr...", "...mmb....bmm...", "...mmb....bmm...", "...rmm....mmr...", "....rm....mr....", "................", "................", "................", "................", "................"]],
  bottom: [["................", "....kkkkkkkk....", "....wwwwwwww....", "....wwwwwwww....", "....wwwwwwww....", "....www..www....", "....www..www....", "....www..www....", "....www..www....", "....www..www....", "...kkkk..kkkk...", "................", "................", "................", "................", "................"], ["................", "....bbbbbbbb....", "....mlmmmmmm....", "....mlmmmmmm....", "....mmmmmmmm....", "....mmm..mmm....", "....mlm..mmm....", "....mmm..mmm....", "....mbm..mbm....", "....mmm..mmm....", "...bbbb..bbbb...", "................", "................", "................", "................", "................"], ["................", "....gggjgggg....", "....mlmmmmmm....", "....mlmmmmmm....", "....mmmmmmmm....", "....mgm..mgm....", "....mlm..mmm....", "....mgm..mgm....", "....mmm..mmm....", "....mgm..mgm....", "...gggg..gggg...", "................", "................", "................", "................", "................"], ["................", "....rrrjrrrr....", "....mlmmmmmm....", "....mlmrrmmm....", "....mmmmmmmm....", "....mrm..mrm....", "....mlm..mmm....", "....mrm..mrm....", "....mmm..mmm....", "....mrm..mrm....", "...rrrr..rrrr...", "................", "................", "................", "................", "................"]],
  ring: [["................", "................", "................", "................", "......mmmm......", ".....m....m.....", "....m......m....", "....m......m....", "....m......m....", ".....m....m.....", "......mmmm......", "................", "................", "................", "................", "................"], ["................", "................", ".......jj.......", "......jllj......", "......gjjg......", ".....m....m.....", "....m......m....", "....m......m....", "....m......m....", ".....m....m.....", "......mmmm......", "................", "................", "................", "................", "................"], ["................", ".......y........", "......jjj.......", ".....jlljj......", ".....gjjjg......", "....gg...gg.....", "...g.......g....", "...g.......g....", "...g.......g....", "....gg...gg.....", "......ggg.......", "................", "................", "................", "................", "................"], ["..v.........v...", ".vuv..jjj..vuv..", "..v..jllj...v...", ".....gjjjg......", "....rr...rr.....", "...r.......r....", "...r.......r....", "...g.......g....", "...r.......r....", "....rr...rr.....", "......rrr.......", "................", "................", "................", "................", "................"]],
  sword: [
    ['................', '.............ll.', '............lmm.', '...........lmm..', '..........lmm...', '.........lmm....', '........lmm.....', '.......lmm......', '..gg..lmm.......', '...gglmm........', '....ggm.........', '....wgg.........', '...ww.gg........', '..ww............', '.pp.............', '................'],
    ['...............l', '..............lm', '.............lmb', '............lmb.', '...........lmb..', '..........lmb...', '.........lmb....', '........lmb.....', '..g....lmb......', '..gg..lmb.......', '...ggjmb........', '....jgg.........', '...ww.gg........', '..ww...g........', '.ww.............', 'jj..............'],
    ['.............f.l', '...........f.flm', '............flmb', '..........f.lmbf', '...........lmbf.', '.........flmbf..', '..........lmbf..', '........flmbf...', '..g.....lmbf....', '.ggg...lmb......', '..gggjjmb.......', '...jjggg........', '..ww.gggg.......', '.ww...gg........', 'ww..............', 'jj..............'],
    ['............llmm', '...........lmmrm', '..........lmmrmb', '.........lmmrmb.', '........lmmrmb..', '.......lmmrmb...', '......lmmrmb....', '.v...lmmrmb.....', '.vv.lmmrmb......', '..vvgmrmb.......', '..vgjjgb........', '...gjjgvv.......', '..ww.gvvv.......', '.ww...v.........', 'ww..............', 'jj..............'],
  ],
  staff: [
    ['..........jj....', '.........jlljj..', '........jljjjj..', '........jjjjj...', '.........jjj....', '........gwg.....', '.......ww.......', '......ww........', '.....ww.........', '....ww..........', '...ww...........', '...w............', '..ww............', '.ww.............', '.w..............', '................'],
    ['........g..g....', '.......g.jj.g...', '.......gjllj.g..', '.......gjjjjg...', '........gjjg....', '........ggg.....', '.......ww.......', '......ww........', '.....gww........', '....ww..........', '...ww...........', '...w............', '..ww............', '.ww.............', 'gw..............', '................'],
    ['......ccc.......', '.....cc..cc.....', '....cc.jj..c....', '....c.jllj......', '....c.jjjj......', '....cc.jj.......', '.....cccgg......', '.......gww......', '......ww........', '.....gw.........', '....ww..........', '...ww...........', '..gw............', '.ww.............', 'gw..............', '................'],
    ['.....rrrrr......', '....r.jjj.r.....', '...r.jllljr.....', '...r.jljjj.r....', '...r.jjjjj.r....', '....r.jjj.r.....', '.....rrgrr......', '.......vgv......', '......vgwv......', '......gww.......', '.....ww.........', '....ww..........', '...gw...........', '..ww............', '.gw.............', '................'],
  ],
  bow: [
    ['.......mm.......', '......m..n......', '.....m...n......', '....m....n......', '...wm....n......', '...w.....n......', '..ww.....n......', '..gg.....n......', '..gg.....n......', '..ww.....n......', '...w.....n......', '...wm....n......', '....m....n......', '.....m...n......', '......m..n......', '.......mm.......'],
    ['.......gg.......', '......w..n......', '.....w...n......', '....w....n......', '...ww....n......', '...w.....n......', '..ww.....n......', '..gj.....n......', '..jg.....n......', '..ww.....n......', '...w.....n......', '...ww....n......', '....w....n......', '.....w...n......', '......w..n......', '.......gg.......'],
    ['....vvv.........', '...vuvvw..n.....', '....vvw...n.....', '.....w....n.....', '....ww....n.....', '...ww.....n.....', '..ww......n.....', '..gj......n.....', '..jg......n.....', '..ww......n.....', '...ww.....n.....', '....ww....n.....', '.....w....n.....', '....vvw...n.....', '...vuvvw..n.....', '....vvv.........'],
    ['..rr.vvv........', '.rrvvuvvw.f.....', '..rrvvvw..f.....', '....rww...f.....', '....ww....f.....', '...ww.....f.....', '..wwr.....f.....', '..gjj.....f.....', '..jjg.....f.....', '..wwr.....f.....', '...ww.....f.....', '....ww....f.....', '....rww...f.....', '..rrvvvw..f.....', '.rrvvuvvw.f.....', '..rr.vvv........'],
  ],
  relic: [
    ['................', '................', '...jjjjjjjj.....', '..jWWWWWWWWj....', '..jWWWWgWWWj....', '..jWWWgggWWj....', '..jWWWWgWWWj....', '..jWWWWgWWWj....', '..jWWWWWWWWj....', '..jWWWWWWWWj....', '..jjjjjjjjjj....', '...ggggggggg....', '................', '................', '................', '................'],
    ['................', '.....gggggg.....', '....gjjjjjjg....', '....gjlljjjg....', '....gjjjjjjg....', '.....gjjjjg.....', '......gjjg......', '.......gg.......', '.......gg.......', '.......gg.......', '......gmmg......', '.....gmmmmg.....', '....gggggggg....', '................', '................', '................'],
    ['.......y........', '...y...y...y....', '....y.ggg.y.....', '.....gyyyg......', '...yggyjjyggy...', '.....gyjjyg.....', '....y.gyyg.y....', '...y...gg...y...', '.......gg.......', '.......gg.......', '......gmmg......', '.....gmmmmg.....', '....gggggggg....', '................', '................', '................'],
    ['..v..........v..', '.vuv.gggggg.vuv.', '.vvvgjjjjjjgvvv.', '..vvgjlljjjgvv..', '...vgjjjjjjgv...', '.....gjjjjg.....', '......gjjg......', '.......gg.......', '......gyyg......', '.......gg.......', '......gmmg......', '.....gmmmmg.....', '....gggggggg....', '...gggggggggg...', '................', '................'],
  ],
  armor: [
    ['................', '...www....www...', '..wwwww..wwwww..', '..wwwwwwwwwwww..', '..wwwwwwwwwwww..', '...wwwwwwwwww...', '...wwwkkwwwww...', '...wwwkkwwwww...', '...wwwwwwwwww...', '...wwwwwwwwww...', '....wwwwwwww....', '....kkkkkkkk....', '....www..www....', '....www..www....', '................', '................'],
    ['................', '...mmm....mmm...', '..mlmmm..mmmmm..', '..mmmmmmmmmmmm..', '..mmlmmmmmmmmm..', '...mmmmggmmmm...', '...mmmmggmmmm...', '...mmggggggmm...', '...mmmmggmmmm...', '...mmmmggmmmm...', '....mmmmmmmm....', '....bbbbbbbb....', '....mmm..mmm....', '....mmm..mmm....', '................', '................'],
    ['.g............g.', '.gg.mmm..mmm.gg.', '..gglmmmmmmmgg..', '..gmmmmmmmmmmg..', '..mmlmmggmmmmm..', '...mmmgjjgmmm...', '...mmgjllgjmm...', '...mmmgjjgmmm...', '...gmmmggmmmg...', '...mgmmmmmmgm...', '....mmmmmmmm....', '....gggggggg....', '....mmm..mmm....', '....mgm..mgm....', '................', '................'],
    ['.n............n.', '.nn.mmm..mmm.nn.', '..nnlmmmmmmmnn..', '..mmmmmmmmmmmm..', '..mmlmrrrrmmmm..', '...mmmrjjrmmm...', '...mrrjllrjrm...', '...mmmrjjrmmm...', '...rmmmrrmmmr...', '...mrmmmmmmrm...', '....mmmmmmmm....', '....gggggggg....', '....mmm..mmm....', '....mrm..mrm....', '................', '................'],
  ],
  accessory: [
    ['................', '................', '................', '.....gggggg.....', '....gg....gg....', '...gg......gg...', '...g........g...', '...g...jj...g...', '...g..jllj..g...', '...gg.jjjj.gg...', '....gg.jj.gg....', '.....gggggg.....', '................', '................', '................', '................'],
    ['................', '.....nnnnnn.....', '....n......n....', '...n........n...', '...n........n...', '...n........n...', '....n......n....', '.....n....n.....', '......gggg......', '.....gjjjjg.....', '....gjlljjjg....', '....gjljjjjg....', '....gjjjjjjg....', '.....gjjjjg.....', '......gggg......', '................'],
    ['................', '.....nnnnnn.....', '....n......n....', '...n........n...', '...n........n...', '....n......n....', '.....n....n.....', '.vv...gggg...vv.', 'vuvv.gjjjjg.vvuv', '.vvvgjlljjjgvvv.', '..vvgjljjjjgvv..', '....gjjjjjjg....', '.....gjjjjg.....', '......gyyg......', '.......gg.......', '................'],
    ['................', '..j...j..j...j..', '..g...g..g...g..', '..gg.ggg.gg.gg..', '..gggggggggggg..', '..gjgggjjgggjg..', '..gggggggggggg..', '..rrrrrrrrrrrr..', '...gggggggggg...', '................', '................', '................', '................', '................', '................', '................'],
  ],
};
const TIER_METAL = ['#8b8f96', '#b4bcc8', '#9ec3e6', '#6fcf97', '#e0605a', '#a879e8', '#3a2c40'];
const TIER_GLEAM = ['#c7ccd3', '#e6ebf2', '#dff0ff', '#c9f5da', '#ffc2b5', '#e6d4ff', '#c8a8ff'];
const JEWEL = ['#c94a4a', '#3f7fd8', '#4fa0ff', '#3fd08a', '#ff4a3a', '#c060ff', '#ff3048'];
const TIER_GLOW = ['', '', '', '', '#ff8060', '#b080ff', '#ffd95e'];

export function equipKind(slot: string, job?: string): Kind {
  if (slot === 'armor') return 'armor';
  if (slot === 'accessory') return 'accessory';
  if (slot === 'hat' || slot === 'bottom' || slot === 'ring') return slot;
  return ({ warrior: 'sword', mage: 'staff', archer: 'bow', priest: 'relic' } as Record<string, Kind>)[job ?? 'warrior'] ?? 'sword';
}
/** 마왕성 세트: 어둡고 룬이 빛나는 색 */
const SET_PAL: Record<string, { m: string; l: string; j: string; r: string; g: string; glow: string; glow2: string }> = {
  ash: { m: '#4a525c', l: '#a8d8e8', j: '#5ad0ff', r: '#5ad0ff', g: '#7a8a98', glow: '#3ab0ff', glow2: '#1a2a3a' },
  blood: { m: '#3a0c14', l: '#ff5060', j: '#ff1a30', r: '#ff1a30', g: '#a02030', glow: '#ff1a30', glow2: '#3a0008' },
  grim: { m: '#24163a', l: '#b080ff', j: '#30f0c8', r: '#30f0c8', g: '#7a5ad8', glow: '#7a40ff', glow2: '#30f0c8' },
  hunter: { m: '#3a2418', l: '#ffb060', j: '#ff7a20', r: '#ff7a20', g: '#c8803a', glow: '#ff8a30', glow2: '#3a1008' },
  saint: { m: '#e8e4f0', l: '#fff6c8', j: '#7fd4ff', r: '#ffd95e', g: '#ffd95e', glow: '#fff2a8', glow2: '#7fd4ff' },
  myth: { m: '#140a2a', l: '#9ff6ff', j: '#ff5af0', r: '#7a40ff', g: '#9ff6ff', glow: '#7a40ff', glow2: '#ff5af0' },
  demon: { m: '#120810', l: '#ffd95e', j: '#ff2040', r: '#ffb020', g: '#ffd95e', glow: '#ffb020', glow2: '#ff2040' },
};
export function equipSprite(kind: Kind, tier: number, opts: { size?: number; set?: string } = {}) {
  if (opts.set && SET_PAL[opts.set]) {
    const sp = SET_PAL[opts.set];
    const grid = addSparks(EQ[kind][3], SPARK_PTS);
    const pal: Palette = {
      m: sp.m, l: sp.l, b: shade(sp.m, -0.4), g: sp.g, w: '#1a0e14', p: sp.g, j: sp.j, n: sp.g, k: '#2a1820', W: '#2a2030', y: sp.l,
      f: sp.r, c: sp.l, r: sp.r, v: shade(sp.m, 0.15), u: sp.l, x: sp.l,
    };
    return sprite(grid, pal, { size: opts.size, glow: sp.glow, glow2: sp.glow2 });
  }
  const t = Math.max(1, Math.min(7, tier)) - 1;
  const g = t >= 6 ? 3 : t >= 4 ? 2 : t >= 2 ? 1 : 0;
  let grid = EQ[kind][g];
  if (t >= 5) grid = addSparks(grid, t >= 6 ? SPARK_PTS : SPARK_PTS.slice(0, 3));
  const metal = TIER_METAL[t];
  const pal: Palette = {
    m: metal, l: TIER_GLEAM[t], b: shade(metal, -0.35), g: t >= 5 ? '#ffd95e' : t >= 3 ? '#d8ac3f' : '#a8823a',
    w: t >= 6 ? '#2a1820' : t >= 4 ? '#5a3020' : t === 0 ? '#8a5a30' : '#7a5230', p: '#c89b3c', j: JEWEL[t], n: t >= 4 ? '#e8d27a' : '#b9b2a2',
    k: '#5a3a24', W: '#f4ecd8', y: '#ffe680', f: '#ff8a3a', c: t >= 6 ? '#c8a8ff' : '#bfe8ff',
    r: t >= 6 ? '#ff3048' : '#c84040', v: t >= 6 ? '#2a1830' : '#f4f0e8', u: t >= 6 ? '#8a5ad8' : '#ffffff', x: SPARK,
  };
  if ((kind === 'armor' || kind === 'hat' || kind === 'bottom') && g === 0) pal.w = '#8a5a30';
  return sprite(grid, pal, { size: opts.size, glow: TIER_GLOW[t] || undefined, glow2: t >= 6 ? '#ff6040' : t >= 5 ? '#ffffff' : undefined });
}

// ───────────────────── 펫 ─────────────────────
const PETS: Record<string, { grid: string[]; pal: Palette; crown: [number, number] }> = {
  turtle: { grid: ['................', '................', '................', '.....ssssss.....', '....slsslsss....', '...ssssllsssss..', '..ssllsssslssss.', '..sssssllssssskk', '.ksssslsssssskek', 'kkbbbbbbbbbbbkkk', '.kk..kk..kk..k..', '.kk..kk..kk.....', '................', '................', '................', '................'], pal: { s: '#4f8a5b', l: '#8fcf7a', b: '#c8b070', k: '#9cc87a', e: '#1a0f14' }, crown: [12, 5] },
  fox: { grid: ['................', '..f.......f.....', '..ff.....ff.....', '..fwf...fwf.....', '..ffffffff......', '..fefffeff......', '..ffwwwfff....ff', '...fwkwff....fff', '....ffff....ffw.', '...ffffffffffw..', '..ffffffffffff..', '..fwwfffffffff..', '..ff.ff..ff.ff..', '..kk.kk..kk.kk..', '................', '................'], pal: { f: '#e8783a', w: '#fbe8d0', k: '#3a2018', e: '#1a0f14' }, crown: [3, 0] },
  owl: { grid: ['................', '...o.......o....', '...oo.....oo....', '...ooooooooo....', '..oowwooowwoo...', '..owyewowyewo...', '..oowwoboowwo...', '..ooooobooooo...', '..ollloooollo...', '..olllllllllo...', '..ollllllllloo..', '...olllllllo....', '....oo...oo.....', '....yy...yy.....', '................', '................'], pal: { o: '#5a4aa0', w: '#f0ecd8', y: '#f0c040', e: '#1a0f14', b: '#e8a030', l: '#8a7ad0' }, crown: [4, 0] },
  bear: { grid: ['................', '..bb......bb....', '.bppb....bppb...', '.bbbbbbbbbbbb...', '.bbbbbbbbbbbb...', '.bbebbbbbbebb...', '.bbbbmmmmbbbb...', '..bbbmkkmbbb....', '..bbbbmmbbbbb...', '.bbbbbbbbbbbbb..', 'bbbbbbllllbbbbb.', 'bbbbbllllllbbbb.', '.bbbbllllllbbb..', '.bbb.bbbbb.bbb..', '.ccc.......ccc..', '................'], pal: { b: '#7a4a2a', p: '#c89a7a', e: '#1a0f14', m: '#c8a080', k: '#2a1a14', l: '#a87a52', c: '#3a2418' }, crown: [5, 0] },
  hawk: { grid: ['................', '.......hhh......', '......hhhhh.....', '......hewhhyy...', '......hhhhhyy...', '.......hhhh.....', '..ww..hhhhhh..ww', '.wwww.hllllh.www', 'wwwwwwhllllhwwww', '.wwwwwhllllhwww.', '..www.hllllh.ww.', '.......hhhh.....', '.......h..h.....', '......yy..yy....', '................', '................'], pal: { h: '#6a4a30', e: '#1a0f14', w: '#8a6a48', y: '#f0c040', l: '#e8dcc0' }, crown: [6, 0] },
  fairy: { grid: ['......y.........', '..uu.yyy.uu.....', '.uvvu.y.uvvu....', '.uvvvuhhuvvvu...', '..uvvhhhhvvu....', '...uuhsshuu.....', '....hsesesh.....', '.....ssssy......', '..uu.dddd.uu....', '.uvvudddduvvu...', '.uvvvddddvvvu...', '..uuudddduuu....', '.....dddd.......', '......ss........', '................', '................'], pal: { y: '#ffe680', u: '#bfe8ff', v: '#e8f6ff', h: '#f0c8e8', s: '#f8e0d0', e: '#3a2a4a', d: '#ff9ad8' }, crown: [5, 0] },
};
const CROWN = ['g.g.g', 'ggjgg'];
const PET_GLOW = ['', '', '', '#4fa0ff', '#c070ff', '#ffb84d'];
export function petSprite(kind: string, grade: number, opts: { size?: number } = {}) {
  const def = PETS[kind];
  if (!def) return '';
  let grid = def.grid.map((r) => r.padEnd(16, '.'));
  if (grade >= 5) {
    const [cx, cy] = def.crown;
    grid = grid.map((row, y) => (y >= cy && y < cy + 2 ? [...row].map((c, x) => (x >= cx && x < cx + 5 && CROWN[y - cy][x - cx] !== '.' ? CROWN[y - cy][x - cx] : c)).join('') : row));
  }
  if (grade >= 4) grid = addSparks(grid, grade >= 5 ? SPARK_PTS : SPARK_PTS.slice(0, 4));
  return sprite(grid, { ...def.pal, g: '#ffd95e', j: '#ff4a6a', x: SPARK }, { size: opts.size, glow: PET_GLOW[grade] || undefined, glow2: grade >= 5 ? '#fff6c8' : undefined });
}

// ───────────────────── 아이템 ─────────────────────
const ITEMS: Record<string, { grid: string[]; pal: Palette }> = {
  potion: { grid: ['................', '......kkkk......', '......cccc......', '.......gg.......', '.......gg.......', '......gggg......', '.....grrrrg.....', '....grllrrrg....', '....grlrrrrg....', '....grrrrrrg....', '....grrrrrrg....', '.....grrrrg.....', '......gggg......'], pal: { k: '#7a5230', c: '#a07850', g: '#d8e8f0', r: '#d8443a', l: '#ffb0a0' } },
  stone: { grid: ['................', '................', '.......bb.......', '......bllb......', '.....bllbbb.....', '....bllbbbbb....', '...bllbbbbbdb...', '...bbbbbbbbdb...', '....bbbbbbdb....', '.....bbbbdb.....', '......bbdb......', '.......bb.......'], pal: { b: '#3f7fd8', l: '#bfe0ff', d: '#24508f' } },
  refine: { grid: ['................', '........p.......', '.......ppp......', '...p...plp..p...', '..ppp..plp.ppp..', '..plp.pplpppplp.', '..plpppplppppp..', '..pppppppppppp..', '...dddddddddd...', '....dddddddd....'], pal: { p: '#a050e0', l: '#ecc8ff', d: '#4a3a50' } },
  egg: { grid: ['................', '......eeee......', '.....eeeeee.....', '....eeesseee....', '....eessseee....', '...eeeeeeeeee...', '...eesseeeeee...', '...esssseesse...', '...eesseessse...', '...eeeeeeeeee...', '....eeeeeeee....', '.....eeeeee.....', '......dddd......'], pal: { e: '#f4ecd8', s: '#e8a85a', d: '#c8b898' } },
  scroll: { grid: ['................', '...rrrrrrrrrr...', '..rwwwwwwwwwwr..', '...wkkkkkkkkw...', '...wwwwwwwwww...', '...wkkkkkkkww...', '...wwwwwwwwww...', '...wkkkkkkkkw...', '...wwwwwggwww...', '...wwwwgyygww...', '...wwwwwggwww...', '..rwwwwwwwwwwr..', '...rrrrrrrrrr...'], pal: { r: '#a07850', w: '#f4e8c8', k: '#b8a888', g: '#c89b3c', y: '#ffd95e' } },
  gold: { grid: ['................', '................', '.....gggg.......', '....gyyyyg......', '...gyggggyg.....', '...gygyygyg.ggg.', '...gyggggygyyyg.', '....gyyyyggyggyg', '.....ggggygyyyg.', '.........gyggyg.', '..........gggg..'], pal: { g: '#b8862a', y: '#ffd95e' } },
};
const POTION_COLOR: Record<string, string> = {};
export function setPotionColors(m: Record<string, string>) { Object.assign(POTION_COLOR, m); }
export function itemSprite(kind: string, opts: { size?: number; color?: string } = {}) {
  const def = ITEMS[kind];
  if (!def) return '';
  const pal = { ...def.pal };
  if (kind === 'potion' && opts.color) { pal.r = opts.color; pal.l = shade(opts.color, 0.55); }
  return sprite(def.grid, pal, { size: opts.size });
}

// ───────────────────── 몬스터 ─────────────────────
const MON: Record<string, string[]> = {
  rat: ['................', '................', '................', '................', '..aa............', '.aaaa.....aaa...', '.aeaaaaaaaaaaa..', 'naaaaaaaaaaaaaa.', '.aaaaaaaaaaaaaaa', '..aaaaaaaaaaa..t', '...a.a...a.a..t.', '..............t.'],
  bat: ['................', '................', 'a..............a', 'aa....a..a....aa', 'aaa...aaaa...aaa', 'aaaa.aaaaaa.aaaa', '.aaaaaeaaeaaaaa.', '..aaaaaaaaaaaa..', '...aa.aaaa.aa...', '.......nn.......'],
  skeleton: ['................', '.....wwwww......', '....wwwwwww.....', '....weewwee.....', '....wwwwwww.....', '.....wnwnw......', '......www.......', '...w.wwwww.w....', '..w..w.w.w..w...', '..w..wwwww..m...', '.....w.w.w..m...', '......www...m...', '.....w...w..m...', '.....w...w......', '....ww...ww.....'],
  zombie: ['................', '.....aaaaa......', '....aaaaaaa.....', '....aeaaaea.....', '....aaaaaaa.....', '.....akkka......', '......aaa.......', '...cccccccc.....', '..aacccccccaa...', '.aa.ccccccc.aa..', '....ccccccc.....', '....cc...cc.....', '....aa...aa.....', '...aaa...aaa....'],
  robe: ['......hhh.......', '.....hhhhh......', '....hhhhhhh.....', '....hheeehh.....', '....hhsssshh....', '.....hssssh.....', '...rrhhhhhhrr...', '..rrrhhhhhhrrr..', '..r.hhhhhhhh.rj.', '....hhhhhhhh..w.', '...hhhhhhhhhh.w.', '...hhhhhhhhhh.w.', '..hhhhhhhhhhhhw.', '..bbbbbbbbbbbb..'],
  ghost: ['................', '.....aaaaa......', '....aaaaaaa.....', '...aaaaaaaaa....', '...aaeaaaeaa....', '...aaaaaaaaa....', '...aaakkkaaa....', '...aaaaaaaaa....', '..aaaaaaaaaaa...', '..aaaaaaaaaaa...', '..aaaaaaaaaaa...', '..aa.aaa.aaa....', '..a...a...a.....'],
  golem: ['................', '....aaaaaaa.....', '...aaaaaaaaa....', '...aaeaaaeaa....', '...aaaaaaaaa....', '.aaaaaaaaaaaaa..', 'aaaabbbaabbbaaaa', 'aaa.aaaaaaaa.aaa', 'aaa.aaaaaaaa.aaa', 'bbb.aaaaaaaa.bbb', '....aaa..aaa....', '....aaa..aaa....', '...bbbb..bbbb...'],
  knight: ['................', '.....mmmmm......', '....mmmmmmm.....', '....meeeeem.....', '....mmmmmmm.....', '.....mmmmm......', '...aaaaaaaaa..l.', '..aaaaggaaaaa.m.', '..mm.aggaaa.mmm.', '..mm.aaaaaa..m..', '.....bbbbbb.....', '.....aa..aa.....', '.....aa..aa.....', '....mmm..mmm....'],
  kobold: ['................', '................', '...a......a.....', '...aa....aa.....', '....aaaaaa......', '...aeaaaaea.....', '...aaanaaaa.....', '....aaaaaa..l...', '...cccccccc.m...', '..aacccccccam...', '....cccccc..w...', '....aa..aa......', '...aaa..aaa.....'],
  toad: ['................', '................', '................', '................', '....aa....aa....', '...aeea..aeea...', '...aaaaaaaaaa...', '..aaaaaaaaaaaa..', '.aallllllllllaa.', '.aaalllllllaaaa.', 'aaa.aaaaaaa..aaa', 'aa............aa'],
  vine: ['................', '.......a........', '......aaa.......', '.....aarraa.....', '....aaeerraa....', '.....aarraa.....', '..a...aaaa...a..', '..aa...aa...aa..', '...aaa.aa.aaa...', '.....aaaaaa.....', '......aaaa......', '....bbbbbbbb....', '...bbbbbbbbbb...'],
  insect: ['................', '..u.....u.......', '.uuu...uuu......', '..uuu.uuu.......', '....aaaa........', '...aeaaea.......', '....aaaa........', '...bababab......', '....babab.......', '.....bab........', '......b.........', '...a.a.a.a......'],
  lizard: ['................', '.....aaaa.......', '....aaaaaa......', '....aeaaaann....', '....aaaaaa......', '.....aaaa.......', '...lllllllla..m.', '..aalllllllaa.m.', '..a..llllll..mm.', '.....llllll...m.', '.....aa..aa.....', '....aaa..aaaaaa.', '...........aaaa.'],
  wolf: ['................', '................', '..a.a...........', '..aaaa..........', '.aeaaaa.........', 'naaaaaaaaaaaa...', '...aaaaaaaaaaaa.', '....aaaaaaaaaaaa', '....aaaaaaaaa..a', '....aa.aa..aa...', '....aa.aa..aa...'],
  giant: ['....aaaaaa......', '...aaaaaaaa.....', '...aeaaaaea.....', '...aaannaaa.....', '...aaaaaaaa.....', '.aaaaaaaaaaaa...', 'aaaaaaaaaaaaaa..', 'aa.aaaaaaaaa.aa.', 'aa.aaaaaaaaa.aa.', 'aa.aaaaaaaaa.bb.', 'bb.aaaaaaaaa.bb.', '...aaaa.aaaa....', '...aaaa.aaaa....', '..bbbbb.bbbbb...'],
  spider: ['................', '................', '.a....aaaa....a.', '..a..aaaaaa..a..', '...aaaeaaeaaa...', 'aaa.aaaaaaaa.aaa', '...aaaaaaaaaa...', '..a.abbbbbba.a..', '.a..abbbbbba..a.', 'a....abbbba....a', '......aaaa......'],
  egg: ['................', '................', '................', '....aa....aa....', '...aaaa..aaaa...', '...abaa..abaa...', '...aaaaaaaaaa...', '..aa.aaaaaa.aa..', '..ab.abaaba.ab..', '..aa.aaaaaa.aa..', '.bbbbbbbbbbbbbb.'],
  demon: ['..n..........n..', '..nn.aaaaa..nn..', '...nnaaaaaann...', '....aeaaaeaa....', '....aaaaaaaa....', 'v....akkka....v.', 'vv.aaaaaaaaa.vv.', 'vvvaaaaaaaaaavvv', '.vvaaaaaaaaaavv.', '..v.aaaaaaa..v..', '....aaa.aaa.....', '....aa...aa.....', '...bbb...bbb....'],
  crystal: ['................', '.......l........', '......lal.......', '.....laaal......', '....laaaaal.....', '....aaaeaaa.....', '....aaaaaaa.....', '.....aaaaa......', '......aaa.......', '.......a........', '....bbbbbbb.....'],
  chest: ['................', '................', '...gaaaaaaaag...', '..gaaaaaaaaaag..', '..gaaaaaaaaaag..', '..ggggggggggggg.', '..gnenneennnen..', '..gkkkkkkkkkkg..', '..gaaaaggaaaag..', '..gaaaaggaaaag..', '..gaaaaaaaaaag..', '..gggggggggggg..'],
  book: ['................', '................', '..aaaaaaaaaaaa..', '.aWWWWWaWWWWWWa.', '.aWkkkWaWkkkWWa.', '.aWWWWWaWeWeWWa.', '.aWkkkWaWWWWWWa.', '.aWWWWWaWkkkWWa.', '.aaaaaaaaaaaaaa.', '..bbbbbbbbbbbb..'],
};
/** 몬스터 → 계열·색 */
const MON_LOOK: Record<string, [string, string, string?]> = {
  rat: ['rat', '#8a7a6a'], skeleton: ['skeleton', '#e8e0cc'], bat: ['bat', '#4a3a4a'], ghoul: ['zombie', '#7a9a6a', '#4a3a3a'], skeletonKnight: ['knight', '#5a5a6a', '#d8d0bc'],
  morten: ['robe', '#3a3a4a'], monk: ['robe', '#7a3a2a'], statue: ['golem', '#9a9a8a'], assassin: ['robe', '#3a3a50'], spirit: ['ghost', '#7a8af0'], templeGuard: ['knight', '#c8a050'], velas: ['robe', '#e8d8a0'],
  kobold: ['kobold', '#b8783a'], caveGolem: ['golem', '#6a5a4a'], bomberKobold: ['kobold', '#c8503a'], crystalBat: ['bat', '#7ad0f0'], ironGolem: ['golem', '#7a8494'], mineKing: ['ghost', '#9ab080'],
  swampToad: ['toad', '#5a8a3a'], rotVine: ['vine', '#4a6a2a'], mosquito: ['insect', '#6a5a3a'], lizardman: ['lizard', '#4a8a5a'], lizardShaman: ['lizard', '#3a7a7a'], swampWitch: ['robe', '#4a6a3a'],
  frostWolf: ['wolf', '#c8dcf0'], iceSpirit: ['ghost', '#a8e0ff'], yeti: ['giant', '#e8eef4'], iceArcher: ['knight', '#8ab8e0'], frostKnight: ['knight', '#6aa0d8'], frostGiant: ['giant', '#8ac0e8'],
  salamander: ['lizard', '#e86a3a'], lavaGolem: ['golem', '#a83a20'], imp: ['demon', '#e8503a'], volcBat: ['bat', '#a8402a'], ifrit: ['demon', '#ff7a2a'], flameLord: ['demon', '#ff4a1a'],
  venomSpider: ['spider', '#6a3a7a'], webSpider: ['spider', '#9a9aa8'], eggCluster: ['egg', '#d8d0b0'], spiderRider: ['spider', '#44445a'], spiderPriest: ['robe', '#5a2a5a'], spiderQueen: ['spider', '#4a1a4a'],
  drownedSoldier: ['zombie', '#5a8a9a', '#2a4a5a'], abyssShaman: ['robe', '#2a5a7a'], coralGolem: ['golem', '#e87a8a'], siren: ['ghost', '#5ab0c8'], seaKnight: ['knight', '#3a6a8a'], abyssWarden: ['giant', '#2a5a8a'],
  lesserDemon: ['demon', '#a8303a'], hellhound: ['wolf', '#5a1a1a'], voidMage: ['robe', '#3a1a5a'], fallenKnight: ['knight', '#4a3a4a'], demonOfficer: ['demon', '#7a1a2a'], demonGeneral: ['demon', '#5a0a1a'],
  sealWarden: ['golem', '#c8b060'], chaosEcho: ['ghost', '#8a3ab0'], coreSpirit: ['ghost', '#4ae0c0'], shadowClone: ['ghost', '#4a3a5a'], sealProxy: ['robe', '#c8a040'], sealedOne: ['demon', '#3a1a5a'],
  gargoyle: ['demon', '#7a7a80'], castleArcher: ['knight', '#5a3a3a'], hellKnight: ['knight', '#4a1a1a'], castleWarlock: ['robe', '#4a1a3a'], siegeGolem: ['golem', '#5a4a3a'], wardStone: ['crystal', '#8ad0ff'], granit: ['golem', '#4a4048'],
  vampireBat: ['bat', '#6a1a2a'], bloodKnight: ['knight', '#7a1a1a'], thrallGhoul: ['zombie', '#9a8a7a', '#5a1a1a'], bloodMage: ['robe', '#8a1a2a'], crimsonGuard: ['knight', '#a81a2a'], carmilla: ['robe', '#5a0a1a'],
  grimoire: ['book', '#5a2a1a'], inkGolem: ['golem', '#34344a'], librarianGhost: ['ghost', '#c8c0a0'], runeSentinel: ['golem', '#5a6a8a'], archLibrarian: ['robe', '#3a2a5a'], cultist: ['robe', '#4a1a1a'], morgath: ['robe', '#2a0a3a'],
  goldGolem: ['golem', '#e0b030'], mimic: ['chest', '#8a5a2a'], vaultKeeper: ['golem', '#ffd060'],
  crystalSpirit: ['crystal', '#b070ff'], shardGolem: ['golem', '#7a50c0'], crystalHeart: ['crystal', '#ff60c0'],
  rockGiant: ['giant', '#8a7a6a'], stoneBeetle: ['spider', '#6a6050'], quarryLord: ['knight', '#8a7a5a'],
  trainingDummy: ['zombie', '#c8a060', '#8a6a3a'], swordInstructor: ['knight', '#3a5a8a'], grandMaster: ['robe', '#e8e0d0'],
  treasureGoblin: ['kobold', '#d8b030', '#ffd95e'], abyssKing: ['demon', '#2a0a4a', '#7a40ff'], voidWraith: ['ghost', '#3a2a6a'], abyssKnight: ['knight', '#2a1a4a'], soulReaper: ['ghost', '#1a1a2a'], chaosHound: ['wolf', '#4a1a3a'], voidArchon: ['robe', '#2a1a5a'], shadowKing: ['demon', '#1a1028', '#6a4aff'], fallenSeraph: ['ghost', '#c8c0e0'], hellTitan: ['giant', '#6a1a1a'], mindFlayer: ['robe', '#4a2a5a'], doomBringer: ['knight', '#5a1020'], kingGuard: ['knight', '#3a0a18'], lucifel: ['demon', '#e8e0f0', '#ff3048'], archDemon: ['demon', '#8a1a3a'], nightmare: ['ghost', '#3a0a4a'], doomGuard: ['knight', '#4a1a2a'], succubus: ['demon', '#c84a8a'], demonDuke: ['demon', '#4a0a2a'], azazel: ['demon', '#4a0a28'],
};
const EYE: Record<string, string> = { undead: '#80ffb0', demon: '#ff3030' };
export function monsterSprite(id: string, opts: { size?: number; boss?: boolean; elite?: boolean; tags?: string[] } = {}) {
  const look = MON_LOOK[id] ?? ['zombie', '#7a7a7a'];
  let grid = MON[look[0]].map((r) => r.padEnd(16, '.'));
  const main = look[1], h = hash(id);
  if (opts.boss) {
    // 왕관을 머리 위에 얹음
    const top = grid.findIndex((r) => r.replace(/\./g, '').length > 2);
    const cy = Math.max(0, top - 2), cx = Math.max(0, grid[top].indexOf(grid[top].replace(/^\.+/, '')[0]) + 1);
    grid = grid.map((row, y) => (y >= cy && y < cy + 2 ? [...row].map((c, x) => (x >= cx && x < cx + 5 && CROWN[y - cy][x - cx] !== '.' ? CROWN[y - cy][x - cx] : c)).join('') : row));
    grid = addSparks(grid, SPARK_PTS);
  }
  const eye = (opts.tags ?? []).includes('demon') ? EYE.demon : (opts.tags ?? []).includes('undead') ? EYE.undead : '#ffe680';
  const pal: Palette = {
    a: main, b: shade(main, -0.35), l: shade(main, 0.35), e: eye, n: '#efe6cc', k: shade(main, -0.55), t: shade(main, 0.2),
    w: look[0] === 'skeleton' ? main : '#7a5230', m: '#b4bcc8', h: main, s: '#e0c0a0', r: look[2] ?? shade(main, 0.2), j: ['#ff4a4a', '#4aa0ff', '#4ae08a', '#c060ff'][h % 4],
    c: look[2] ?? shade(main, -0.25), g: '#ffd95e', u: '#e8f0ff', v: shade(main, -0.2), W: '#f4ecd8', x: SPARK,
  };
  const glow = opts.boss ? '#ff4040' : opts.elite ? '#c070ff' : undefined;
  return sprite(grid, pal, { size: opts.size, glow, glow2: opts.boss ? '#ffd95e' : undefined });
}
