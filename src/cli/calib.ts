/**
 * 권장 전투력 재보정: 층마다 무작위 파티(레벨·장비·조합 다양)를 돌려
 * 전투력 비율 → 클리어율 로지스틱 회귀, 클리어 80% 지점을 구한다.
 *  npx tsx src/cli/calib.ts from to [parties] [healer|noheal]
 */
import { EQUIP_BASES, tierOfFloor } from '../data/items';
import { MERCENARIES } from '../data/mercenaries';
import { jobAtLevel } from '../data/jobs';
import { floorLevel } from '../data/monsters';
import { createHero, createMerc, syncSkillSlots } from '../core/character';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import { partyPower, floorPower } from '../core/power';
import type { BaseJob, Character, Rarity } from '../core/types';

const [from, to, NP, mode] = [Number(process.argv[2] ?? 1), Number(process.argv[3] ?? 50), Number(process.argv[4] ?? 300), process.argv[5] ?? 'healer'];
const RUNS = 10;
const rng = new Rng(1234 + from);
const DPS: BaseJob[] = ['warrior', 'mage', 'archer'];

function party(floor: number, healer: boolean): Character[] {
  const fl = floorLevel(floor);
  const size = rng.chance(75) ? 4 : 3;
  const jobs: BaseJob[] = ['warrior'];
  if (healer) jobs.push('priest');
  while (jobs.length < size) jobs.push(rng.pick(DPS));
  return jobs.map((job, i) => {
    const lv = Math.max(1, Math.min(100, fl + rng.int(-8, 8)));
    const c = i === 0 && rng.chance(50) ? createHero('h') : createMerc(rng.pick(MERCENARIES.filter((m) => m.job === job)), lv);
    c.level = lv;
    c.jobId = jobAtLevel(job, lv, rng.int(0, 1));
    const tier = tierOfFloor(Math.min(50, Math.max(1, floor + rng.int(-8, 4))));
    const rar = rng.weighted([1, 2, 3, 4, 5], (r) => [2, 3, 3, 2, 1][r - 1]) as Rarity;
    const enh = rng.int(0, 15);
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const b = EQUIP_BASES.find((x) => x.slot === slot && x.tier === tier && (!x.jobs || x.jobs.includes(job)));
      if (b) c.equipment[slot] = { uid: i + slot, baseId: b.id, rarity: rar, enhance: enh, failStack: 0, options: [] };
    }
    c.skillSlots = []; syncSkillSlots(c);
    return c;
  });
}

/** 로지스틱 회귀 (x = ln 비율) 경사하강 */
function fit(xs: number[], ys: number[]) {
  let a = 0, b = 1;
  for (let it = 0; it < 4000; it++) {
    let ga = 0, gb = 0;
    for (let i = 0; i < xs.length; i++) {
      const p = 1 / (1 + Math.exp(-(a + b * xs[i])));
      ga += ys[i] - p; gb += (ys[i] - p) * xs[i];
    }
    a += (0.5 * ga) / xs.length; b += (0.5 * gb) / xs.length;
  }
  return { a, b };
}

const out: Record<number, { r80: number; n: number }> = {};
for (let f = from; f <= to; f++) {
  const need = floorPower(f);
  const xs: number[] = [], ys: number[] = [];
  let got = 0, tries = 0;
  while (got < NP && tries < NP * 60) {
    tries++;
    const p = party(f, mode === 'healer');
    const ratio = partyPower(p) / need;
    if (ratio < 0.4 || ratio > 5) continue;
    got++;
    for (let r = 0; r < RUNS; r++) {
      const win = new Expedition(p, { ...DEFAULT_SETTINGS, startFloor: f }, new Rng(tries * 31 + r)).runFloor().win;
      xs.push(Math.log(ratio)); ys.push(win ? 1 : 0);
    }
  }
  const { a, b } = fit(xs, ys);
  const r80 = Math.exp((Math.log(0.8 / 0.2) - a) / b);
  out[f] = { r80: Math.round(r80 * 1000) / 1000, n: got };
  console.error(`${f}층 n=${got} r80=${r80.toFixed(2)} → ${Math.round(need * r80)}`);
}
console.log(JSON.stringify(out));
