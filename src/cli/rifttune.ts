/** 균열 구역별 보정값 찾기: 구역 가운데 층 표준 파티 완주 60% */
import { standardParty } from './floorsim';
import { Expedition, DEFAULT_SETTINGS, RIFT_ZONE_K } from '../core/dungeon';
import { Rng } from '../core/rng';
import { ZONES } from '../data/monsters';
const N = 40, out: Record<string, number> = {};
const zones = ZONES.filter((z, i) => !process.argv[2] || (i % 2) === Number(process.argv[2]));
for (const z of zones) {
  const F = z.floors[0] + 2, p = standardParty(F);
  const rate = (k: number) => { RIFT_ZONE_K[z.id] = k; let w = 0; for (let r = 0; r < N; r++) if (new Expedition(p, { ...DEFAULT_SETTINGS, startFloor: 1, targetFloor: 10, rift: { level: F }, insured: true }, new Rng(r * 31 + F)).runAuto().floorsCleared >= 10) w++; return w / N; };
  let lo = 0.1, hi = 5;
  for (let i = 0; i < 9; i++) { const m = Math.sqrt(lo * hi); if (rate(m) >= 0.6) lo = m; else hi = m; }
  out[z.id] = Math.round(Math.sqrt(lo * hi) * 100) / 100;
  console.error(z.id, F, out[z.id]);
}
console.log(JSON.stringify(out));
