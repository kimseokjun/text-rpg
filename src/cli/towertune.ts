/** 무한 탑 난이도 확인: 표준 마왕성 파티(70층 기준)의 층별 승률. npx tsx src/cli/towertune.ts [N] [lvOff] */
import { standardParty } from './floorsim';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import { towerGimmick } from '../data/tower';
const N = Number(process.argv[2] ?? 60);
const p = standardParty(70);
if (process.argv[3] === 'smart') { p[1].target = 'adds'; p[2].target = 'adds'; }
const out: string[] = [];
for (const t of [10, 15, 20, 25, 30, 35, 40, 45, 50, 60]) {
  let w = 0;
  for (let r = 0; r < N; r++) { const ex = new Expedition(p, { ...DEFAULT_SETTINGS, startFloor: t, tower: true, insured: true }, new Rng(r * 31 + t)); if (ex.runFloor().win) w++; }
  out.push(`${t}(${towerGimmick(t).id}):${Math.round((w / N) * 100)}`);
}
console.log(out.join(' '));
