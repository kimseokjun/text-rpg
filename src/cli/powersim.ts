/** 층별 권장 전투력: 표준 파티의 레벨·강화를 바꿔가며 클리어율 80%가 되는 파티 전투력을 찾음 */
import { MAX_FLOOR } from '../data/monsters';
import { partyPower } from '../core/power';
import { clearRate, standardParty } from './floorsim';
const N = 30, out: number[] = [];
for (let f = 1; f <= MAX_FLOOR; f++) {
  const pts: { cp: number; c: number }[] = [];
  for (let o = -14; o <= 8; o += 2) {
    const p = standardParty(f, o, Math.round(o / 3));
    pts.push({ cp: partyPower(p), c: clearRate(p, f, N) });
  }
  pts.sort((a, b) => a.cp - b.cp);
  // 처음으로 80% 이상이 되는 지점 (그 아래 점과 선형 보간)
  let rec = pts[pts.length - 1].cp;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].c >= 0.8) {
      const a = pts[i - 1];
      rec = a && a.c < 0.8 ? a.cp + (pts[i].cp - a.cp) * (0.8 - a.c) / (pts[i].c - a.c) : pts[i].cp;
      break;
    }
  }
  out.push(Math.round(rec));
  process.stderr.write(`${f}:${Math.round(rec)} `);
}
console.log('\n' + JSON.stringify(out));
