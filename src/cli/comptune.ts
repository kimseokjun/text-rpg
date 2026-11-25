/** 층별 DEF_COMP 찾기: 기준선(/tmp/base.json) 승률에 맞춤.  npx tsx src/cli/comptune.ts from to N out.json */
import { standardParty } from './floorsim';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import { DEF_COMP } from '../data/monsters';
import { readFileSync, writeFileSync } from 'fs';
const base = JSON.parse(readFileSync('/tmp/base.json', 'utf8'));
const [from, to, N] = [Number(process.argv[2]), Number(process.argv[3]), Number(process.argv[4] ?? 150)];
const out: Record<number, number> = {};
for (let f = from; f <= to; f++) {
  const target = base[`f${f}`];
  const p = standardParty(f);
  const wr = (c: number) => { DEF_COMP[f - 1] = c; let w = 0; for (let r = 0; r < N; r++) if (new Expedition(p, { ...DEFAULT_SETTINGS, startFloor: f, targetFloor: f }, new Rng(r * 7919 + f)).runFloor().win) w++; return w / N; };
  if (target >= 0.99) { out[f] = 1.5; console.error(f, 'saturated'); continue; }
  let lo = 0.8, hi = 9;
  for (let i = 0; i < 9; i++) { const m = Math.sqrt(lo * hi); if (wr(m) > target) lo = m; else hi = m; }
  out[f] = Math.round(Math.sqrt(lo * hi) * 100) / 100;
  console.error(f, target.toFixed(2), out[f]);
}
writeFileSync(process.argv[5], JSON.stringify(out));
