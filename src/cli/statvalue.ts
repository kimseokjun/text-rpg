/** 스탯별 실전 가치 측정: 파티 전체 버프(+x)를 줬을 때 승률 변화 → "전 스탯(HP·공·마) 몇 % 올린 것과 같은가" 로 환산
 *  npx tsx src/cli/statvalue.ts floor [N] */
import { standardParty } from './floorsim';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import { partyPower } from '../core/power';
import { PET_KINDS, petMods } from '../data/pets';
import type { Modifier } from '../core/types';
const F = Number(process.argv[2] ?? 40), N = Number(process.argv[3] ?? 300);
const P: Modifier[] = [];
const pm = (key: string, value: number, kind: 'pct' | 'flat' = 'pct'): Modifier => ({ key: key as any, kind, value, scope: 'party' });
const uni = (pct: number) => ['hp', 'atk', 'mag'].map((k) => pm(k, pct));
const party = standardParty(F);
function win(mods: Modifier[]) { let w = 0; for (let r = 0; r < N; r++) if (new Expedition(party, { ...DEFAULT_SETTINGS, startFloor: F, targetFloor: F, petMods: mods }, new Rng(r * 7919 + 3)).runFloor().win) w++; return w / N; }
// 기준점: 승률 ~50%가 되도록 전 스탯 배율 b 찾기
let lo = -60, hi = 200;
for (let i = 0; i < 9; i++) { const m = (lo + hi) / 2; if (win(uni(m)) < 0.5) lo = m; else hi = m; }
const b = (lo + hi) / 2;
const base = (1 + b / 100);
// 곡선 W(k): 기준 대비 전 스탯 +0..+30%
const ks = [-10, -5, 0, 5, 10, 15, 20, 30];
const curve = ks.map((k) => ({ k, w: win(uni((base * (1 + k / 100) - 1) * 100)) }));
const eq = (w: number) => { // 승률 w 에 해당하는 k 보간
  for (let i = 0; i < curve.length - 1; i++) { const a = curve[i], c = curve[i + 1]; if ((w - a.w) * (w - c.w) <= 0 && a.w !== c.w) return a.k + (c.k - a.k) * (w - a.w) / (c.w - a.w); }
  return w < curve[0].w ? -99 : 99;
};
const baseMods = uni(b);
const pw0 = partyPower(party, baseMods);
const tests: [string, Modifier[]][] = [
  ['공격 +10%', [pm('atk', 10)]], ['마력 +10%', [pm('mag', 10)]], ['HP +10%', [pm('hp', 10)]],
  ['방어 +10%', [pm('def', 10)]], ['마저 +10%', [pm('res', 10)]], ['방어·마저 +10%', [pm('def', 10), pm('res', 10)]],
  ['민첩 +10%', [pm('agi', 10)]], ['민첩 +20%', [pm('agi', 20)]], ['치명 +5%p', [pm('crit', 5, 'flat')]], ['회복량 +20%', [pm('healPower', 20)]],
  ...PET_KINDS.map((k) => [`펫 ${k.name} 전설`, petMods({ uid: 'x', kind: k.id, grade: 5, stars: 0 } as any)] as [string, Modifier[]]),
];
console.log(`${F}층 기준 배율 ${b.toFixed(1)}% · 곡선 ${curve.map((c) => `${c.k}:${Math.round(c.w * 100)}`).join(' ')}`);
for (const [name, m] of tests) {
  const w = win([...baseMods, ...m]);
  const cp = (partyPower(party, [...baseMods, ...m]) / pw0 - 1) * 100;
  console.log(`${name.padEnd(14)} 승률 ${Math.round(w * 100)}% → 실전 +${eq(w).toFixed(1)}% · 현재 전투력 +${cp.toFixed(1)}%`);
}
