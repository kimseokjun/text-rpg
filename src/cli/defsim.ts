/** 랜덤 디펜스 밸런스: 가상 단원 풀 + 자동 플레이로 웨이브 도달 분포
 *   npx tsx src/cli/defsim.ts [N=20] [인원=1] [풀=mid|low|high]
 */
import { autoPlay, D_DIFF, newDefense, step, type DDef, type DDiff } from '../core/defense';
const N = Number(process.argv[2] ?? 20), P = Number(process.argv[3] ?? 1), kind = process.argv[4] ?? 'mid';
const JOBS = ['warrior', 'mage', 'archer', 'priest'] as const;
const COUNTS: Record<string, number[]> = { low: [0, 6, 5, 2, 0, 0], mid: [0, 6, 6, 4, 2, 2], high: [0, 4, 6, 6, 4, 4] };
const GM = [0, 100, 125, 160, 210, 280];
const GROW: Record<string, number> = { low: 1.2, mid: 1.6, high: 2.1 };
function pool(owner: string, seed: number): DDef[] {
  const out: DDef[] = [];
  let i = 0;
  COUNTS[kind].forEach((n, g) => {
    for (let k = 0; k < n; k++, i++) {
      const base = JOBS[(i + seed) % 4];
      out.push({ key: `${owner}:${i}`, owner, name: `m${i}`, base, jobId: base, grade: g, level: 60, dmg: Math.round(GM[g] * GROW[kind] * (0.9 + ((i * 37) % 20) / 100)), agi: 60, crit: 20, critDmg: 1.5, unique: g === 5 ? 'x' : null });
    }
  });
  return out;
}
const HP = process.env.HP?.split(',').map(Number);
if (HP) (Object.keys(D_DIFF) as DDiff[]).forEach((d, i) => (D_DIFF[d].hp = HP[i]));
for (const diff of Object.keys(D_DIFF) as DDiff[]) {
  const waves: number[] = []; let win = 0;
  for (let s = 0; s < N; s++) {
    const ps = Array.from({ length: P }, (_, j) => ({ id: `p${j}`, name: `P${j}`, pool: pool(`p${j}`, s + j) }));
    const st = newDefense(ps, diff, 1000 + s);
    let k = 0;
    while (st.phase === 'run' && st.t < 3000) { if (k++ % 10 === 0) for (const p of ps) autoPlay(st, p.id); step(st); }
    waves.push(st.phase === 'win' ? 31 : st.wave); if (st.phase === 'win') win++;
  }
  waves.sort((a, b) => a - b);
  console.log(`${D_DIFF[diff].name} ${kind} ${P}인: 승률 ${Math.round((win / N) * 100)}% · 웨이브 중앙값 ${waves[Math.floor(N / 2)]} · 최소 ${waves[0]} · 최대 ${waves[N - 1]}`);
}
