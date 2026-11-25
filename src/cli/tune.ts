/** 층별 난이도 배율 자동 탐색: 표준 파티 기준 일반층 TN, 보스층 TB (기본 85%/60%)
 *  npx tsx src/cli/tune.ts 시작층 끝층 [TN] [TB] */
import { DIFF_TUNE, MAX_FLOOR, zoneOf } from '../data/monsters';
import { clearRate, standardParty } from './floorsim';
const N = Number(process.env.N ?? 40), from = Number(process.argv[2] ?? 11);
const TN = Number(process.argv[4] ?? 0.85), TB = Number(process.argv[5] ?? 0.6);
// 지금 값에서 출발해 곱해지는 배율을 찾음
const BASE: Record<number, number> = { ...DIFF_TUNE };
const res: Record<number, number> = {};
const to = Number(process.argv[3] ?? MAX_FLOOR);
for (let f = from; f <= to; f++) {
  const target = zoneOf(f).boss.floor === f ? TB : TN;
  const p = standardParty(f);
  let lo = 0.2, hi = 80;
  for (let i = 0; i < 14; i++) {
    const mid = Math.sqrt(lo * hi);
    DIFF_TUNE[f] = mid;
    if (clearRate(p, f, N) >= target) lo = mid; else hi = mid;
  }
  res[f] = Math.round(Math.sqrt(lo * hi) * 100) / 100;
  DIFF_TUNE[f] = res[f];
  console.log(f, res[f]);
}
console.log(JSON.stringify(res));
