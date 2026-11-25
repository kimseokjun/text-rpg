/** 일일 던전 단계별 난이도 배율 찾기: npx tsx src/cli/dailytune.ts [dailyId] */
import { standardParty } from './floorsim';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import { DAILIES, DAILY_TUNE } from '../data/daily';
const only = process.argv[2];
const out: Record<string, number[]> = {};
for (const d of DAILIES.filter((x) => !only || x.id === only)) {
  const target = d.id === 'legion' ? 0.6 : 0.8;
  out[d.id] = [];
  for (let k = 1; k <= 10; k++) {
    const f = d.stageFloor(k), p = standardParty(f);
    const rate = (m: number) => { DAILY_TUNE[d.id] = Array(10).fill(m); let w = 0; for (let r = 0; r < 40; r++) if (new Expedition(p, { ...DEFAULT_SETTINGS, startFloor: f, targetFloor: f, daily: { id: d.id, stage: k } }, new Rng(r * 7)).runFloor().win) w++; return w / 40; };
    let lo = 0.2, hi = 30;
    for (let i = 0; i < 12; i++) { const mid = Math.sqrt(lo * hi); if (rate(mid) >= target) lo = mid; else hi = mid; }
    out[d.id].push(Math.round(lo * 100) / 100);
    console.error(d.id, k, lo.toFixed(2));
  }
}
console.log(JSON.stringify(out));
