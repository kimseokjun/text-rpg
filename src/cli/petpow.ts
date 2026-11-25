import { readFileSync } from 'fs';
import * as G from '../state/game';
import { partyPower } from '../core/power';
import { petMods } from '../data/pets';
const s = G.migrate(JSON.parse(readFileSync(process.argv[2], 'utf8')))!;
const cs = G.partyChars(s);
for (const [k, g] of [['owl', 3], ['hawk', 5], ['turtle', 5], ['fox', 5], ['bear', 5], ['fairy', 5], ['owl', 5]] as const)
  console.log(k, g, partyPower(cs, petMods({ uid: 'x', kind: k, grade: g, stars: 0 } as any)));
console.log('none', partyPower(cs));
