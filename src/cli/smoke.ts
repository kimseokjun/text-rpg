/** 마을 기능 스모크 테스트: 모집판 → 고용 → 중복 고용(각성) → 강화 */
import { createHero } from '../core/character';
import { Rng } from '../core/rng';
import { enhance, enhanceCost, hire, rollBoard } from '../core/town';
import { rollEquip } from '../core/dungeon';
import { MERC_BY_ID } from '../data/mercenaries';
import { GRADE_NAME, RARITY_NAME } from '../core/types';
import { EQUIP_BY_ID } from '../data/items';

const rng = new Rng(42);
const hero = createHero('킹'); hero.level = 8;
const roster = [hero];
let gold = 100000;

const board = rollBoard(rng, hero.level, 1, roster);
console.log('[길드 모집판]');
board.forEach((c, i) => { const d = MERC_BY_ID[c.mercId]; console.log(` ${i + 1}. ${d.name} / ${GRADE_NAME[d.grade]} / Lv.${c.level} / ${d.traits.join(', ') || '특성 없음'} - ${c.price}G`); });

const r = hire(board[0], roster, gold, 1, rng);
if (r.ok) { roster.push(r.character); gold -= r.cost!; console.log(`\n고용: ${r.character.name} (-${r.cost}G)`); }
for (let i = 0; i < 6; i++) {
  const again = hire(board[0], roster, gold, 1, rng);
  console.log(again.ok ? (again.kind === 'awakened' ? again.message : '?') : `실패: ${again.reason}`);
  if (again.ok) gold -= again.cost!;
}

const eq = rollEquip(rng, 8, 3);
console.log(`\n장비: ${EQUIP_BY_ID[eq.baseId].name} (${RARITY_NAME[eq.rarity]})`);
let tries = 0;
while (eq.enhance < 15 && tries < 300) {
  const c = enhanceCost(eq.enhance + 1);
  const res = enhance(eq, rng);
  tries++;
  if (res.success) console.log(`  +${eq.enhance} 성공 (확률 ${res.rate}%, 강화석 ${c.stone}, ${c.gold}G)`);
}
console.log(`  총 ${tries}회 시도로 +15`);
