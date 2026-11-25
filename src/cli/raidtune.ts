/** 레이드 보정: 표준 파티 10라운드 평균 데미지·전멸률 (npx tsx src/cli/raidtune.ts) */
import { standardParty } from './floorsim';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import { RAID_DIFF, RAID_DIFFS, RAID_FORMS } from '../data/raid';
const BIG = 1e12;
for (const diff of RAID_DIFFS) {
  for (const tune of [2, 4, 6, 9]) {
    RAID_DIFF[diff].tune = tune;
    const parts: string[] = [];
    for (let w = 0; w < 3; w++) {
      let dmg = 0, wipes = 0; const N = 24;
      for (let r = 0; r < N; r++) {
        const p = standardParty(RAID_DIFF[diff].floor);
        const ex = new Expedition(p, { ...DEFAULT_SETTINGS, startFloor: RAID_DIFF[diff].floor, raid: { diff, week: w, hpLeft: BIG, maxHp: BIG } }, new Rng(r * 13 + w));
        ex.runFloor(); dmg += ex.raidDealt; if (ex.stopReason === 'wipe') wipes++;
      }
      parts.push(`${RAID_FORMS[w].id} dmg${Math.round(dmg / N)} wipe${Math.round(wipes / N * 100)}%`);
    }
    console.log(diff, 'tune', tune, parts.join(' | '));
  }
}
