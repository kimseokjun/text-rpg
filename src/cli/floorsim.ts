/**
 * 50층 밸런스: 층마다 "표준 파티"(권장 레벨, 해당 구간 장비, 기대 강화 수치)를 만들어 그 층만 N회 돌림
 *   npx tsx src/cli/floorsim.ts [N] [레벨오프셋]
 */
import { EQUIP_BASES, tierOfFloor } from '../data/items';
import { MERCENARIES } from '../data/mercenaries';
import { jobAtLevel } from '../data/jobs';
import { MAX_FLOOR, floorLevel, zoneOf } from '../data/monsters';
import { createHero, createMerc, syncSkillSlots } from '../core/character';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import { partyPower } from '../core/power';
import type { BaseJob, Character, JobId, Rarity } from '../core/types';

const LINES: [BaseJob, number][] = [['warrior', 0], ['mage', 0], ['archer', 0], ['priest', 1]];

export function standardParty(floor: number, levelOffset = 0, gearOffset = 0): Character[] {
  const level = Math.max(1, floorLevel(floor) + levelOffset);
  const tier = tierOfFloor(Math.max(1, floor - 3));
  // 마왕성(51층~)은 엔드게임 기준: 영웅 등급 4인 + 영웅 장비 +15
  const endgame = floor > 50;
  const rarity: Rarity = endgame ? 4 : floor >= 20 ? 3 : 2;
  const enh = endgame ? 15 : Math.max(0, Math.min(15, Math.round(2 + floor / 4) + gearOffset));
  return LINES.map(([base, branch], i) => {
    const grade = endgame ? 4 : 2;
    const c = i === 0 && !endgame ? createHero('주인공') : createMerc(MERCENARIES.find((m) => m.job === base && m.grade === grade && !m.traits.length) ?? MERCENARIES.find((m) => m.job === base && m.grade === grade)!, level);
    c.level = level;
    c.jobId = jobAtLevel(base, level, branch);
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const b = EQUIP_BASES.find((x) => x.slot === slot && x.tier === tier && (!x.jobs || x.jobs.includes(base)));
      if (b) c.equipment[slot] = { uid: `${i}${slot}`, baseId: b.id, rarity, enhance: enh, failStack: 0, options: [] };
    }
    c.skillSlots = []; syncSkillSlots(c);
    return c;
  });
}

export function clearRate(party: Character[], floor: number, n: number) {
  let w = 0;
  for (let r = 0; r < n; r++) if (new Expedition(party, { ...DEFAULT_SETTINGS, startFloor: floor }, new Rng(r * 97 + floor)).runFloor().win) w++;
  return w / n;
}

if (process.argv[1]?.endsWith('floorsim.ts')) {
  const N = Number(process.argv[2] ?? 30), off = Number(process.argv[3] ?? 0);
  const out: string[] = [];
  for (let f = 1; f <= MAX_FLOOR; f++) {
    const p = standardParty(f, off);
    const boss = zoneOf(f).boss.floor === f;
    out.push(`${String(f).padStart(2)}층${boss ? '(보스)' : '      '} Lv${floorLevel(f)} 파티CP ${String(partyPower(p)).padStart(6)} · 클리어 ${Math.round(clearRate(p, f, N) * 100)}%`);
  }
  console.log(out.join('\n'));
}
