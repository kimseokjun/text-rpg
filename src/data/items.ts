import type { EquipBase, Modifier, Rarity } from '../core/types';

export const EQUIP_BASES: EquipBase[] = [
  // 무기 (tier 1~3)
  { id: 'w_sword1', name: '낡은 장검', slot: 'weapon', jobs: ['warrior'], tier: 1, stats: { atk: 6 } },
  { id: 'w_sword2', name: '기사의 장검', slot: 'weapon', jobs: ['warrior'], tier: 2, stats: { atk: 14, def: 3 } },
  { id: 'w_axe3', name: '전투 도끼', slot: 'weapon', jobs: ['warrior'], tier: 3, stats: { atk: 26, crit: 3 } },
  { id: 'w_staff1', name: '견습 지팡이', slot: 'weapon', jobs: ['mage'], tier: 1, stats: { mag: 7, mp: 10 } },
  { id: 'w_staff2', name: '수정 지팡이', slot: 'weapon', jobs: ['mage'], tier: 2, stats: { mag: 16, mp: 20 } },
  { id: 'w_tome3', name: '고대 마도서', slot: 'weapon', jobs: ['mage'], tier: 3, stats: { mag: 28, res: 6 } },
  { id: 'w_bow1', name: '사냥용 단궁', slot: 'weapon', jobs: ['archer'], tier: 1, stats: { atk: 6, agi: 2 } },
  { id: 'w_bow2', name: '복합궁', slot: 'weapon', jobs: ['archer'], tier: 2, stats: { atk: 14, crit: 3 } },
  { id: 'w_xbow3', name: '정예 석궁', slot: 'weapon', jobs: ['archer'], tier: 3, stats: { atk: 26, crit: 5 } },
  { id: 'w_mace1', name: '나무 메이스', slot: 'weapon', jobs: ['priest'], tier: 1, stats: { atk: 3, mag: 5 } },
  { id: 'w_mace2', name: '은 메이스', slot: 'weapon', jobs: ['priest'], tier: 2, stats: { atk: 7, mag: 12 } },
  { id: 'w_relic3', name: '성스러운 성물', slot: 'weapon', jobs: ['priest'], tier: 3, stats: { mag: 24, mp: 25 } },
  // 방어구
  { id: 'a_cloth1', name: '누빈 옷', slot: 'armor', tier: 1, stats: { hp: 20, def: 3 } },
  { id: 'a_leather2', name: '가죽 갑옷', slot: 'armor', tier: 2, stats: { hp: 45, def: 7, res: 4 } },
  { id: 'a_plate3', name: '판금 갑옷', slot: 'armor', tier: 3, stats: { hp: 90, def: 14, res: 8 } },
  // 장신구
  { id: 'c_ring1', name: '구리 반지', slot: 'accessory', tier: 1, stats: { crit: 2 } },
  { id: 'c_amulet2', name: '수호 부적', slot: 'accessory', tier: 2, stats: { hp: 30, res: 6 } },
  { id: 'c_charm3', name: '바람의 장식', slot: 'accessory', tier: 3, stats: { agi: 6, crit: 4 } },
  // T4~T6
  { id: 'w_sword4', name: '미스릴 대검', slot: 'weapon', jobs: ['warrior'], tier: 4, stats: { atk: 42, def: 6 } },
  { id: 'w_halberd5', name: '용린 할버드', slot: 'weapon', jobs: ['warrior'], tier: 5, stats: { atk: 62, crit: 6 } },
  { id: 'w_holysword6', name: '왕가의 성검', slot: 'weapon', jobs: ['warrior'], tier: 6, stats: { atk: 88, def: 10, crit: 6 } },
  { id: 'w_staff4', name: '서리불꽃 지팡이', slot: 'weapon', jobs: ['mage'], tier: 4, stats: { mag: 44, mp: 35 } },
  { id: 'w_tome5', name: '별빛 마도서', slot: 'weapon', jobs: ['mage'], tier: 5, stats: { mag: 64, res: 14 } },
  { id: 'w_staff6', name: '태초의 지팡이', slot: 'weapon', jobs: ['mage'], tier: 6, stats: { mag: 90, mp: 60, res: 12 } },
  { id: 'w_bow4', name: '엘프 장궁', slot: 'weapon', jobs: ['archer'], tier: 4, stats: { atk: 40, crit: 6, agi: 4 } },
  { id: 'w_xbow5', name: '폭풍 석궁', slot: 'weapon', jobs: ['archer'], tier: 5, stats: { atk: 60, crit: 8 } },
  { id: 'w_bow6', name: '천궁의 시위', slot: 'weapon', jobs: ['archer'], tier: 6, stats: { atk: 84, crit: 10, agi: 8 } },
  { id: 'w_mace4', name: '축성된 메이스', slot: 'weapon', jobs: ['priest'], tier: 4, stats: { atk: 14, mag: 30, mp: 30 } },
  { id: 'w_scepter5', name: '성광의 홀', slot: 'weapon', jobs: ['priest'], tier: 5, stats: { mag: 52, mp: 45, res: 10 } },
  { id: 'w_relic6', name: '여명의 성유물', slot: 'weapon', jobs: ['priest'], tier: 6, stats: { mag: 76, mp: 70, hp: 80 } },
  { id: 'a_mithril4', name: '미스릴 사슬갑옷', slot: 'armor', tier: 4, stats: { hp: 150, def: 22, res: 13 } },
  { id: 'a_dragon5', name: '용린 갑옷', slot: 'armor', tier: 5, stats: { hp: 230, def: 32, res: 19 } },
  { id: 'a_sanctum6', name: '성역의 판금', slot: 'armor', tier: 6, stats: { hp: 330, def: 44, res: 26 } },
  { id: 'c_neck4', name: '마력석 목걸이', slot: 'accessory', tier: 4, stats: { hp: 80, res: 14, mp: 20 } },
  { id: 'c_fang5', name: '맹수의 이빨', slot: 'accessory', tier: 5, stats: { atk: 10, mag: 10, crit: 5 } },
  { id: 'c_seal6', name: '봉인의 인장', slot: 'accessory', tier: 6, stats: { hp: 150, agi: 10, crit: 6 } },
  // T7 마왕성
  { id: 'w_gram7', name: '마검 그람', slot: 'weapon', jobs: ['warrior'], tier: 7, stats: { atk: 120, def: 14, crit: 8 } },
  { id: 'w_abyss7', name: '심연의 홀', slot: 'weapon', jobs: ['mage'], tier: 7, stats: { mag: 124, mp: 80, res: 16 } },
  { id: 'w_dragonbow7', name: '흑룡의 활', slot: 'weapon', jobs: ['archer'], tier: 7, stats: { atk: 116, crit: 14, agi: 10 } },
  { id: 'w_grail7', name: '대천사의 성배', slot: 'weapon', jobs: ['priest'], tier: 7, stats: { mag: 104, mp: 95, hp: 120 } },
  { id: 'a_slayer7', name: '마왕 사냥꾼의 갑주', slot: 'armor', tier: 7, stats: { hp: 460, def: 60, res: 36 } },
  { id: 'c_crown7', name: '타락한 왕관', slot: 'accessory', tier: 7, stats: { hp: 200, atk: 14, mag: 14, crit: 8 } },
];

/** 티어별 드롭 층·상점 판매 조건 (판매 조건 = 처치해야 하는 보스 id) */
export const TIER_INFO: { tier: number; floors: [number, number]; shopAfter: string | null }[] = [
  { tier: 1, floors: [1, 5], shopAfter: null },
  { tier: 2, floors: [6, 10], shopAfter: 'morten' },
  { tier: 3, floors: [11, 20], shopAfter: 'velas' },
  { tier: 4, floors: [21, 30], shopAfter: 'swampWitch' },
  { tier: 5, floors: [31, 40], shopAfter: 'flameLord' },
  { tier: 6, floors: [41, 50], shopAfter: 'abyssWarden' },
  { tier: 7, floors: [51, 70], shopAfter: 'granit' },
];
export const tierOfFloor = (floor: number) => (TIER_INFO.find((t) => floor >= t.floors[0] && floor <= t.floors[1]) ?? TIER_INFO[TIER_INFO.length - 1]).tier;

import { SET_BASES } from './sets';
EQUIP_BASES.push(...SET_BASES);
export const EQUIP_BY_ID: Record<string, EquipBase> = Object.fromEntries(EQUIP_BASES.map((e) => [e.id, e]));

/** 장비 등급별 기본 스탯 배율 */
export const RARITY_MULT: Record<Rarity, number> = { 1: 1.0, 2: 1.2, 3: 1.45, 4: 1.75, 5: 2.1 };
/** 강화 1단계당: 장비 기본 스탯 +8% + 티어 비례 고정 보너스 */
export const ENHANCE_STEP = 0.08;
export function enhanceFlat(slot: 'weapon' | 'armor' | 'accessory', tier: number, mainKey: string): Record<string, number> {
  if (slot === 'weapon') return { [mainKey]: 1.5 * tier };
  if (slot === 'armor') return { hp: 8 * tier, def: 0.6 * tier, res: 0.4 * tier };
  return { hp: 5 * tier };
}

/** 희귀 이상 추가 옵션 후보 */
export const OPTION_POOL: Modifier[] = [
  { key: 'crit', kind: 'flat', value: 3 },
  { key: 'agi', kind: 'flat', value: 5 },
  { key: 'hp', kind: 'pct', value: 5 },
  { key: 'atk', kind: 'pct', value: 4 },
  { key: 'mag', kind: 'pct', value: 4 },
  { key: 'def', kind: 'pct', value: 6 },
  { key: 'healPower', kind: 'pct', value: 8 },
  { key: 'skillDmg', kind: 'pct', value: 5 },
  { key: 'bossDmg', kind: 'pct', value: 6 },
  { key: 'resPierce', kind: 'flat', value: 5 },
  { key: 'defPierce', kind: 'flat', value: 5 },
  { key: 'magTaken', kind: 'pct', value: -4 },
  { key: 'res', kind: 'pct', value: 6 },
];

/** 제련: 옵션 칸 3개, 깊은 티어일수록 옵션 수치 상승 */
export const OPTION_SLOTS = 3;
export const optionScale = (tier: number) => 1 + 0.2 * (tier - 1);
export function rollOption(pick: () => Modifier, tier: number, exclude: string[] = []): Modifier {
  let o = pick();
  for (let i = 0; i < 6 && exclude.includes(o.key); i++) o = pick();
  return { ...o, value: Math.round(o.value * optionScale(tier) * 10) / 10 };
}
// ───────── 잠재 · 에디셔널 등급 ─────────
export const POT_NAME = ['', '레어', '에픽', '유니크', '레전드리'];
/** 줄 등급별 수치 배율 (레어 = 기존 옵션 수치) */
export const POT_MULT = [0, 1, 1.4, 1.85, 2.4];
/** 제련 1회당 다음 등급으로 오를 확률 %, 천장(회) */
export const POT_UP = [0, 15, 5, 1.5];
export const POT_PITY = [0, 20, 50, 120];
/** 에디셔널은 잠재의 절반 수치 */
export const ADD_MULT = 0.5;
/** 부위별 잠재 옵션 (메이플식): 레어 이상 공통 / 유니크부터 / 레전드리 전용 */
type Slot = 'weapon' | 'armor' | 'accessory';
const M = (key: Modifier['key'], kind: Modifier['kind'], value: number): Modifier => ({ key, kind, value });
export const POT_POOLS: Record<Slot, [Modifier[], Modifier[], Modifier[]]> = {
  weapon: [
    [M('atk', 'pct', 4), M('mag', 'pct', 4), M('crit', 'flat', 3), M('bossDmg', 'pct', 6), M('defPierce', 'flat', 5), M('resPierce', 'flat', 5), M('skillDmg', 'pct', 5)],
    [M('critDmg', 'flat', 0.05)],
    [M('physDmg', 'pct', 4)],
  ],
  armor: [
    [M('hp', 'pct', 5), M('def', 'pct', 6), M('res', 'pct', 6), M('magTaken', 'pct', -4)],
    [M('dmgTaken', 'flat', -2)],
    [M('evade', 'flat', 2)],
  ],
  accessory: [
    [M('agi', 'flat', 5), M('crit', 'flat', 3), M('hp', 'pct', 5), M('healPower', 'pct', 8), M('goldGain', 'pct', 6), M('expGain', 'pct', 6)],
    [M('mpCost', 'pct', -5)],
    [M('itemGain', 'pct', 5)],
  ],
};
const poolOf = (g: number, slot: Slot) => { const [a, u, l] = POT_POOLS[slot]; return g >= 4 ? [...a, ...u, ...l] : g >= 3 ? [...a, ...u] : a; };
/** 잠재 한 줄: 첫 줄은 현재 등급, 나머지는 40% 확률로 같은 등급 · 아니면 한 등급 아래 */
export function rollLine(rng: { pick<T>(a: T[]): T; chance(p: number): boolean }, slot: Slot, tier: number, grade: number, idx: number, exclude: string[], add = false): Modifier {
  const g = idx === 0 || grade <= 1 || rng.chance(40) ? grade : grade - 1;
  const pool = poolOf(g, slot);
  let o = rng.pick(pool);
  for (let i = 0; i < 8 && exclude.includes(o.key); i++) o = rng.pick(pool);
  const v = o.value * optionScale(tier) * POT_MULT[g] * (add ? ADD_MULT : 1);
  return { ...o, value: Math.abs(v) < 1 ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10, g };
}
export function rollLines(rng: { pick<T>(a: T[]): T; chance(p: number): boolean }, slot: Slot, tier: number, grade: number, n: number, add = false): Modifier[] {
  const out: Modifier[] = [];
  for (let i = 0; i < n; i++) out.push(rollLine(rng, slot, tier, grade, i, out.map((o) => o.key), add));
  return out;
}
/** 고대 룬석 비용: 1회 1개 */
export const addRuneCost = (locks: number) => 1 + locks;

/** 제련 비용: 제련석 1회 1개, 골드는 티어 × 등급 비례 */
export const refineStoneCost = (locks: number) => 1 + 2 * locks;
export const refineGoldCost = (tier: number, rarity: number) => 1500 * tier * rarity;
/** 제련석 드롭 확률 % */
export const REFINE_CHANCE = { normal: 5, elite: 25, boss: 100 };

/** 강화 성공률: +1(100%) → +15(5%) */
export const ENHANCE_RATE: number[] = [100, 92, 85, 77, 70, 60, 52, 45, 37, 30, 25, 18, 12, 8, 5];
export const ENHANCE_PITY = 5; // 실패당 +5%p
export const BLESSING_BONUS = 10;
export const enhanceCost = (next: number) => ({ stone: Math.ceil(next / 2), gold: 50 * next * next });

/** 버프 물약 */
export interface PotionDef { id: string; name: string; price: number; mod: Modifier; unlockFloor: number }
export const POTIONS: PotionDef[] = [
  { id: 'p_str', name: '힘의 물약', price: 80, mod: { key: 'atk', kind: 'pct', value: 5 }, unlockFloor: 0 },
  { id: 'p_iron', name: '강철 물약', price: 80, mod: { key: 'def', kind: 'pct', value: 10 }, unlockFloor: 0 },
  { id: 'p_sage', name: '현자의 물약', price: 80, mod: { key: 'mag', kind: 'pct', value: 5 }, unlockFloor: 0 },
  { id: 'p_wind', name: '바람의 물약', price: 150, mod: { key: 'agi', kind: 'pct', value: 5 }, unlockFloor: 0 },
  { id: 'p_luck', name: '행운의 물약', price: 150, mod: { key: 'crit', kind: 'flat', value: 3 }, unlockFloor: 0 },
  { id: 'p_life', name: '생명의 물약', price: 150, mod: { key: 'hp', kind: 'pct', value: 10 }, unlockFloor: 0 },
  { id: 'p_greed', name: '탐욕의 물약', price: 400, mod: { key: 'goldGain', kind: 'pct', value: 20 }, unlockFloor: 0 },
  { id: 'p_str2', name: '대형 힘의 물약', price: 400, mod: { key: 'atk', kind: 'pct', value: 10 }, unlockFloor: 5 },
  { id: 'p_iron2', name: '대형 강철 물약', price: 400, mod: { key: 'def', kind: 'pct', value: 20 }, unlockFloor: 5 },
  { id: 'p_sage2', name: '대형 현자의 물약', price: 400, mod: { key: 'mag', kind: 'pct', value: 10 }, unlockFloor: 5 },
];
export const MAX_POTIONS = 3;
