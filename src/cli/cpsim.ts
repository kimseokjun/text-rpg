/**
 * 전투력 공식 검증 + 층별 권장 전투력 산출
 * 랜덤 파티(레벨·인원·직업·등급·장비)를 만들어 각 층을 "풀 HP로 1층만" 돌려 클리어율을 기록
 */
import { EQUIP_BASES } from '../data/items';
import { MERCENARIES } from '../data/mercenaries';
import { ADVANCE_OPTIONS } from '../data/jobs';
import { createHero, createMerc, syncSkillSlots } from '../core/character';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import { finalStats, partyMods } from '../core/stats';
import { charPower } from '../core/power';
import type { BaseJob, Character, Rarity } from '../core/types';

type Formula = (c: Character, shared: any[]) => number;
export const FORMULAS: Record<string, Formula> = {
  A: (c, sh) => { const { stats: s } = finalStats(c, sh); return Math.max(s.atk, s.mag) * (1 + s.crit / 200) * 4 + s.hp * 0.6 + (s.def + s.res) * 2; },
  B: (c, sh) => charPower(c, sh),
};

const rng = new Rng(2024);
const JOBS: BaseJob[] = ['warrior', 'mage', 'archer', 'priest'];
function randomParty(): Character[] {
  const strong = rng.chance(35);
  const level = strong ? rng.int(18, 30) : rng.int(1, 30);
  const size = strong ? 4 : rng.int(1, 4);
  const tier = Math.min(3, Math.max(1, Math.round(level / 10 + rng.range(-0.5, 0.8))));
  const rarity = Math.min(5, Math.max(1, Math.round(1 + level / 10 + rng.range(-1, strong ? 2 : 1)))) as Rarity;
  const enh = Math.max(0, Math.min(15, Math.round(level / 3 + rng.range(-3, strong ? 5 : 3))));
  const out: Character[] = [];
  for (let i = 0; i < size; i++) {
    let c: Character;
    if (i === 0) c = createHero('주인공');
    else {
      const job = rng.pick(JOBS);
      const g = rng.weighted([1, 2, 3, 4, 5] as const, (x) => [54, 30, 12, 3, 1][x - 1]);
      c = createMerc(rng.pick(MERCENARIES.filter((m) => m.job === job && m.grade === g)), level);
    }
    c.level = level;
    if (level >= 20) c.jobId = rng.pick(ADVANCE_OPTIONS[c.jobId as BaseJob]);
    if (rng.chance(85)) for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const base = EQUIP_BASES.find((b) => b.slot === slot && b.tier === tier && (!b.jobs || b.jobs.includes(JOBS.find((j) => c.jobId === j) ?? (({ knight: 'warrior', berserker: 'warrior', elementalist: 'mage', warlock: 'mage', ranger: 'archer', hunter: 'archer', paladin: 'priest', archpriest: 'priest' } as any)[c.jobId]))));
      if (base) c.equipment[slot] = { uid: `${i}${slot}`, baseId: base.id, rarity, enhance: enh, failStack: 0, options: [] };
    }
    c.skillSlots = []; syncSkillSlots(c);
    out.push(c);
  }
  return out;
}

if (process.argv[1]?.endsWith('cpsim.ts')) main();
function main() {
const N_PARTY = Number(process.argv[2] ?? 700), RUNS = 4;
const rows: { cp: Record<string, number>; floor: number; win: number }[] = [];
for (let p = 0; p < N_PARTY; p++) {
  const party = randomParty();
  const sh = partyMods(party);
  const cp = Object.fromEntries(Object.entries(FORMULAS).map(([k, f]) => [k, party.reduce((s, c) => s + f(c, sh), 0)]));
  for (let floor = 1; floor <= 10; floor++) {
    let win = 0;
    for (let r = 0; r < RUNS; r++) {
      const ex = new Expedition(party, { ...DEFAULT_SETTINGS, startFloor: floor, targetFloor: floor, retreatHpPct: 0 }, new Rng(p * 1000 + floor * 10 + r));
      if (ex.runFloor().win) win++;
    }
    rows.push({ cp, floor, win: win / RUNS });
  }
}

// 지표: 층별로 CP 순위와 클리어율의 일치도 (AUC 비슷하게: 승/패 쌍에서 CP가 높은 쪽이 이긴 비율)
for (const k of Object.keys(FORMULAS)) {
  let agree = 0, total = 0;
  for (let f = 1; f <= 10; f++) {
    const r = rows.filter((x) => x.floor === f);
    const wins = r.filter((x) => x.win >= 0.5), loss = r.filter((x) => x.win < 0.5);
    for (const w of wins) for (const l of loss) { total++; if (w.cp[k] > l.cp[k]) agree++; }
  }
  console.log(`공식 ${k}: 순위 일치도 ${(agree / total * 100).toFixed(1)}%`);
}

// 층별 50% / 80% 클리어 지점 (CP 정렬 후 이동평균)
const key = process.argv[3] ?? 'B';
console.log(`\n공식 ${key} 기준 층별 클리어 지점`);
for (let f = 1; f <= 10; f++) {
  const r = rows.filter((x) => x.floor === f).sort((a, b) => a.cp[key] - b.cp[key]);
  const w = 40;
  const at = (target: number) => {
    for (let i = 0; i + w <= r.length; i++) {
      const avg = r.slice(i, i + w).reduce((s, x) => s + x.win, 0) / w;
      if (avg >= target) return Math.round(r[i + w / 2].cp[key]);
    }
    return NaN;
  };
  console.log(`${f}층: 50% ${at(0.5)} · 80% ${at(0.8)} · 95% ${at(0.95)}`);
}

if (process.argv[4] === 'f10') {
  const r = rows.filter((x) => x.floor === 10).sort((a, b) => a.cp[key] - b.cp[key]);
  const top = r.slice(-60);
  console.log('10층 상위 60개 CP 범위', Math.round(top[0].cp[key]), '~', Math.round(top[top.length - 1].cp[key]), '평균 클리어', (top.reduce((s, x) => s + x.win, 0) / top.length).toFixed(2));
  for (const t of [6000, 8000, 10000, 12000, 14000]) {
    const b = r.filter((x) => x.cp[key] >= t);
    if (b.length) console.log(`CP ${t}+ : ${b.length}팀, 클리어율 ${(b.reduce((s, x) => s + x.win, 0) / b.length * 100).toFixed(0)}%`);
  }
}

}
