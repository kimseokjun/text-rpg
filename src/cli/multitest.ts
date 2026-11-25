import { readFileSync } from 'fs';
import { simulateMulti } from '../server/multi';
import { Expedition } from '../core/dungeon';
import { Rng } from '../core/rng';
const a = JSON.parse(readFileSync('/tmp/save5.json', 'utf8')), b = JSON.parse(readFileSync('/tmp/save4.json', 'utf8'));
for (const floor of [20, 45, 58]) {
  const r = simulateMulti([{ user_id: 'aaaaaaaa-1', username: 'A', chars: a.party.slice(0, 2), save: a, host: true }, { user_id: 'bbbbbbbb-2', username: 'B', chars: b.party.slice(0, 2), save: b, host: false }], floor, 12345 + floor);
  if ('error' in r) { console.log(r.error); continue; }
  // UI와 같은 방식으로 재생 (JSON 왕복 포함)
  const j = JSON.parse(JSON.stringify(r));
  const ex = new Expedition(j.chars, j.settings, new Rng(j.seed));
  while (true) {
    const fr = ex.runFloor();
    if (!fr.win) break;
    const reason = ex.autoStopReason();
    if (reason && reason !== 'bossAhead') { ex.finish(reason); break; }
    ex.next();
  }
  console.log(floor, 'server cleared', r.cleared, 'gold', r.reward.gold, '| replay cleared', ex.floorsCleared, 'gold', Math.round(ex.loot.gold * 1.2), r.wiped);
}
