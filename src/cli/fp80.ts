/** 표준 파티를 전 스탯(HP·공·마) 배율로 키워 80% 클리어 지점 전투력 → 권장 전투력 후보. npx tsx src/cli/fp80.ts from to N */
import { standardParty } from './floorsim';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import { partyPower, floorPower } from '../core/power';
import type { Modifier } from '../core/types';
const [from, to, N] = [Number(process.argv[2]), Number(process.argv[3]), Number(process.argv[4] ?? 120)];
const uni = (pct: number): Modifier[] => ['hp', 'atk', 'mag'].map((k) => ({ key: k as any, kind: 'pct', value: pct, scope: 'party' }));
const out: Record<number, number> = {};
for (let f = from; f <= to; f++) {
  const p = standardParty(f);
  const wr = (pct: number) => { let w = 0; for (let r = 0; r < N; r++) if (new Expedition(p, { ...DEFAULT_SETTINGS, startFloor: f, targetFloor: f, petMods: uni(pct) }, new Rng(r * 7919 + f)).runFloor().win) w++; return w / N; };
  let lo = -70, hi = 300;
  for (let i = 0; i < 10; i++) { const m = (lo + hi) / 2; if (wr(m) >= 0.8) hi = m; else lo = m; }
  out[f] = partyPower(p, uni(hi));
  console.error(f, Math.round(hi), out[f], floorPower(f), (out[f] / floorPower(f)).toFixed(2));
}
console.log(JSON.stringify(out));
