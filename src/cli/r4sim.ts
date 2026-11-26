/**
 * 4인 레이드 밸런스: 표준 4인(전사·마법사·궁수·성직자)을 1인 목표 전투력에 맞춰 자동 전투
 *   npx tsx src/cli/r4sim.ts [N] [전투력 비율=1]
 */
import { Raid4Battle, R4_PRESSURE, R4_TUNE, type R4Member } from '../core/raid4battle';
if (process.env.TUNE) Object.assign(R4_TUNE, JSON.parse(process.env.TUNE));
if (process.env.PRESS) Object.assign(R4_PRESSURE, JSON.parse(process.env.PRESS));
import { R4, R4_DIFFS, type R4BossId } from '../data/raid4';
import { charPower } from '../core/power';
import { standardParty } from './floorsim';
import type { Modifier } from '../core/types';

const N = Number(process.argv[2] ?? 40);
const ratios = (process.argv[3] ?? '0.75,1,1.25').split(',').map(Number);
const AI = Number(process.argv[4] ?? 70);
const DIFFS = (process.argv[5] ?? R4_DIFFS.join(',')).split(',') as typeof R4_DIFFS;
const BOSS = (process.argv[6] ?? 'abaddon') as R4BossId;
const DH = Number(process.argv[7] ?? 1);

function scaleTo(c: Parameters<typeof charPower>[0], target: number): Modifier[] {
  let lo = -90, hi = 3000;
  const mods = (v: number): Modifier[] => (['hp', 'atk', 'mag', 'def', 'res'] as const).map((key) => ({ key, kind: 'pct', value: v }));
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (charPower(c, mods(m)) < target) lo = m; else hi = m; }
  return mods(hi);
}

for (const diff of DIFFS) {
  for (const r of ratios) {
    const party = standardParty(80);
    const mems: R4Member[] = party.map((c, i) => ({ owner: `user${i}xxxxxxx`, ownerName: `P${i}`, char: c, mods: scaleTo(c, R4[diff].power * r) }));
    let win = 0, rounds = 0, frac = 0, wipes = 0, breaks = 0, deaths = 0;
    for (let s = 0; s < N; s++) {
      const b = new Raid4Battle(mems, diff, 1000 + s, undefined, BOSS); b.autoInterrupt = AI; b.simDodgeHits = DH; b.runAuto();
      const st = b.state();
      if (b.win) { win++; rounds += st.round; }
      frac += st.dealt / st.maxHp;
      const raid = b.ctx.log.filter((e) => e.t === 'raid') as { kind: string }[];
      deaths += b.ctx.log.filter((e) => e.t === 'death' && e.side === 'party').length;
      wipes += raid.filter((e) => e.kind === 'wipe').length; breaks += raid.filter((e) => e.kind === 'break').length;
    }
    console.log(`${diff.padEnd(6)} ×${r}  승률 ${Math.round((win / N) * 100)}%  평균 라운드 ${win ? (rounds / win).toFixed(1) : '-'}  평균 딜 ${Math.round((frac / N) * 100)}%  전멸기 맞음 ${(wipes / N).toFixed(1)} · 끊음 ${(breaks / N).toFixed(1)}  사망 ${(deaths / N).toFixed(1)}`);
  }
}
