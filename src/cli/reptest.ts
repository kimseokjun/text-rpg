import { standardParty } from './floorsim';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import { diagnose } from '../core/report';
import { JOBS } from '../data/jobs';
import { rowOf } from '../core/combat';
for (const [f, seed] of [[55, 1], [60, 2], [40, 3], [25, 5]] as const) {
  const p = standardParty(f, -6);
  const ex = new Expedition(p, { ...DEFAULT_SETTINGS, startFloor: f, targetFloor: f }, new Rng(seed));
  const r = ex.runFloor();
  const d = diagnose(ex.report, r.win, { hasHealer: true, healerName: p[3].name, rows: Object.fromEntries(p.map((c) => [c.uid, rowOf(c)])), prefs: {}, tankIds: [p[0].uid] });
  console.log(f, r.win, JSON.stringify(ex.report.members.map((m) => [m.name, Math.round(m.dealt), Math.round(m.taken), Math.round(m.takenMag), Math.round(m.healed), m.deaths])), JSON.stringify(ex.report.fights.map(x=>[x.rounds,x.bulwark,x.bulwarkDmg,x.dealt,x.enemyHealed])));
  console.log(Object.entries(ex.report.hitters).sort((a,b)=>b[1]-a[1]).slice(0,3));
  console.log(d.join('\n'));
}
