/** 난이도 기준선: 표준 파티 층별 승률 + 일일 + 레이드 데미지.  npx tsx src/cli/baseline.ts from to N [out.json] */
import { standardParty } from './floorsim';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import { DAILIES } from '../data/daily';
import { RAID_DIFF, RAID_DIFFS } from '../data/raid';
import { writeFileSync } from 'fs';
const [from, to, N] = [Number(process.argv[2] ?? 1), Number(process.argv[3] ?? 70), Number(process.argv[4] ?? 150)];
const out: Record<string, number> = {};
const wr = (f: number, extra: any = {}, lvOff = 0) => { const p = standardParty(f, lvOff); let w = 0; for (let r = 0; r < N; r++) if (new Expedition(p, { ...DEFAULT_SETTINGS, startFloor: f, targetFloor: f, ...extra }, new Rng(r * 7919 + f)).runFloor().win) w++; return w / N; };
if (from > 0) for (let f = from; f <= to; f++) { out[`f${f}`] = wr(f); console.error(f, out[`f${f}`]); }
if (process.argv[6] === 'extra') {
  for (const d of DAILIES) for (const k of [1, 4, 7, 10]) { out[`d_${d.id}_${k}`] = wr(d.stageFloor(k), { daily: { id: d.id, stage: k } }); console.error(d.id, k, out[`d_${d.id}_${k}`]); }
  for (const diff of RAID_DIFFS) for (let w = 0; w < 3; w++) {
    let dmg = 0; const n = 30;
    for (let r = 0; r < n; r++) { const ex = new Expedition(standardParty(RAID_DIFF[diff].floor), { ...DEFAULT_SETTINGS, startFloor: RAID_DIFF[diff].floor, raid: { diff, week: w, hpLeft: 1e12, maxHp: 1e12 } }, new Rng(r * 13 + w)); ex.runFloor(); dmg += ex.raidDealt; }
    out[`r_${diff}_${w}`] = Math.round(dmg / n); console.error(diff, w, out[`r_${diff}_${w}`]);
  }
}
if (process.argv[5]) writeFileSync(process.argv[5], JSON.stringify(out));
