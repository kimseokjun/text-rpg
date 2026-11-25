import { standardParty } from './floorsim';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import type { Modifier } from '../core/types';
const p = standardParty(70); p[1].target = 'adds'; p[2].target = 'adds';
const uni = (pct: number): Modifier[] => ['hp', 'atk', 'mag'].map((k) => ({ key: k as any, kind: 'pct', value: pct, scope: 'party' }));
const N = 40;
const out: string[] = [];
for (const t of (process.argv[2] ?? '20,25,29,30,31,39,40,50').split(',').map(Number)) {
  const wr = (pct: number) => { let w = 0; for (let r = 0; r < N; r++) if (new Expedition(p, { ...DEFAULT_SETTINGS, startFloor: t, tower: true, insured: true, petMods: uni(pct) }, new Rng(r * 31 + t)).runFloor().win) w++; return w / N; };
  let lo = -60, hi = 600;
  for (let i = 0; i < 9; i++) { const m = (lo + hi) / 2; if (wr(m) >= 0.5) hi = m; else lo = m; }
  out.push(`${t}:+${Math.round(hi)}%`);
}
console.log(out.join(' '));
