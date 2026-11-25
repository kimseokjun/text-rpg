import { standardParty } from './floorsim';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import { petMods } from '../data/pets';
import { partyPower } from '../core/power';
import { DIFF_TUNE } from '../data/monsters';
const pets = { none: undefined, owl3: { uid: 'a', kind: 'owl', grade: 3, stars: 0 }, hawk5: { uid: 'b', kind: 'hawk', grade: 5, stars: 0 }, fox5: { uid: 'c', kind: 'fox', grade: 5, stars: 0 }, owl5: { uid: 'd', kind: 'owl', grade: 5, stars: 0 }, turtle5: { uid: 'e', kind: 'turtle', grade: 5, stars: 0 } } as any;
for (const f of [20, 45, 55, 65]) {
  const p = standardParty(f);
  const row: string[] = [];
  for (const [k, pet] of Object.entries(pets)) {
    const pm = petMods(pet as any);
    let w = 0, N = 120;
    for (let r = 0; r < N; r++) if (new Expedition(p, { ...DEFAULT_SETTINGS, startFloor: f, targetFloor: f, petMods: pm }, new Rng(r * 13 + 1)).runFloor().win) w++;
    row.push(`${k} ${Math.round(w / N * 100)}% pw${partyPower(p, pm)}`);
  }
  console.log(f, row.join(' | '));
}
