import type { EquipBase, Modifier } from '../core/types';

/** 마왕성 세트 장비: 재료(군단장의 핵·어둠의 파편)는 공통, 원하는 세트를 제작소에서 */
export interface SetDef { id: string; name: string; desc: string; two: Modifier[]; three: Modifier[]; twoText: string; threeText: string }
const pct = (key: any, value: number): Modifier => ({ key, kind: 'pct', value });
const flat = (key: any, value: number): Modifier => ({ key, kind: 'flat', value });
export const SETS: SetDef[] = [
  { id: 'ash', name: '잿빛 수문장', desc: '무너진 성문을 천 년간 지킨 수문장의 유품. 결계의 잿빛이 스며 있다.',
    two: [pct('def', 15), pct('res', 15)], twoText: '방어·마저 +15%',
    three: [pct('dmgTaken', -12), pct('hp', 10)], threeText: '받는 피해 -12%, 최대 HP +10%' },
  { id: 'blood', name: '혈월', desc: '붉은 달이 뜨는 밤, 피의 백작이 내린 저주받은 무구.',
    two: [pct('atk', 12)], twoText: '공격력 +12%',
    three: [pct('physDmg', 20), flat('crit', 8), flat('critDmg', 0.3)], threeText: '물리 피해 +20% (스킬·평타 모두), 치명 +8%p, 치명 배율 +30%p' },
  { id: 'grim', name: '금서', desc: '불타지 않는 금서의 장정으로 엮은 장비. 읽는 자의 정신을 갉아먹는다.',
    two: [pct('mag', 12), flat('resPierce', 15)], twoText: '마력 +12%, 마저 무시 15%',
    three: [pct('skillDmg', 25), pct('mpCost', -20)], threeText: '스킬 데미지 +25%, MP 소모 -20%' },
  { id: 'demon', name: '마왕', desc: '옥좌의 그림자에서 벼려낸 마왕의 무구. 착용자에게 지배의 힘을 속삭인다.',
    two: [pct('bossDmg', 20)], twoText: '보스·엘리트 피해 +20%',
    three: ['hp', 'atk', 'mag', 'def', 'res', 'agi'].map((k) => pct(k, 10)), threeText: '모든 스탯 +10%' },
  { id: 'hunter', name: '군단장 사냥꾼', desc: '벨리알을 쫓는 사냥꾼들의 장비. 벨리알의 파편으로 벼려내, 군단장 앞에서만 진가를 드러낸다.',
    two: [pct('raidDmg', 30)], twoText: '레이드 보스 피해 +30%',
    three: [pct('raidDmg', 40), pct('dmgTaken', -10)], threeText: '레이드 보스 피해 추가 +40% (총 +70%), 받는 피해 -10%' },
];
export const SET_BY_ID = Object.fromEntries(SETS.map((s) => [s.id, s]));
export const SET_TIER = 8;

const W = (set: string, job: any, name: string, stats: EquipBase['stats']): EquipBase => ({ id: `s_${set}_${job}`, name, slot: 'weapon', jobs: [job], tier: SET_TIER, stats, set });
export const SET_BASES: EquipBase[] = [
  W('ash', 'warrior', '잿빛 수문장의 대검', { atk: 150, def: 30, hp: 150 }),
  W('ash', 'mage', '잿빛 결계봉', { mag: 150, res: 40, hp: 150 }),
  W('ash', 'archer', '잿빛 감시자의 활', { atk: 140, def: 20, crit: 14 }),
  W('ash', 'priest', '잿빛 봉인 성물', { mag: 130, hp: 250, res: 30 }),
  { id: 's_ash_armor', name: '잿빛 수문장의 갑주', slot: 'armor', tier: SET_TIER, stats: { hp: 700, def: 90, res: 60 }, set: 'ash' },
  { id: 's_ash_acc', name: '잿빛 결계 인장', slot: 'accessory', tier: SET_TIER, stats: { hp: 350, def: 30, res: 30 }, set: 'ash' },
  W('blood', 'warrior', '혈월의 처형검', { atk: 175, crit: 16 }),
  W('blood', 'mage', '혈월의 홀', { mag: 170, crit: 10 }),
  W('blood', 'archer', '혈월의 장궁', { atk: 165, crit: 22, agi: 14 }),
  W('blood', 'priest', '혈월의 성배', { mag: 150, mp: 120, crit: 8 }),
  { id: 's_blood_armor', name: '혈월의 갑주', slot: 'armor', tier: SET_TIER, stats: { hp: 560, def: 70, res: 40, atk: 20 }, set: 'blood' },
  { id: 's_blood_acc', name: '혈월의 목걸이', slot: 'accessory', tier: SET_TIER, stats: { hp: 240, atk: 30, crit: 10 }, set: 'blood' },
  W('grim', 'warrior', '금서의 마검', { atk: 155, mag: 60, res: 30 }),
  W('grim', 'mage', '금서의 지팡이', { mag: 185, mp: 140, res: 24 }),
  W('grim', 'archer', '금서의 활', { atk: 150, mag: 40, crit: 14 }),
  W('grim', 'priest', '금서의 경전', { mag: 160, mp: 150, res: 30 }),
  { id: 's_grim_armor', name: '금서의 로브', slot: 'armor', tier: SET_TIER, stats: { hp: 520, def: 55, res: 80, mag: 20 }, set: 'grim' },
  { id: 's_grim_acc', name: '금서의 반지', slot: 'accessory', tier: SET_TIER, stats: { hp: 220, mag: 34, mp: 80 }, set: 'grim' },
  W('demon', 'warrior', '마왕의 검', { atk: 165, def: 20, crit: 12, hp: 100 }),
  W('demon', 'mage', '마왕의 홀', { mag: 175, mp: 100, res: 20, hp: 100 }),
  W('demon', 'archer', '마왕의 활', { atk: 158, crit: 18, agi: 14, hp: 100 }),
  W('demon', 'priest', '타락한 성배', { mag: 150, mp: 120, hp: 220 }),
  { id: 's_demon_armor', name: '마왕의 갑주', slot: 'armor', tier: SET_TIER, stats: { hp: 640, def: 78, res: 52 }, set: 'demon' },
  { id: 's_demon_acc', name: '마왕의 왕관', slot: 'accessory', tier: SET_TIER, stats: { hp: 280, atk: 22, mag: 22, crit: 10 }, set: 'demon' },
  W('hunter', 'warrior', '사냥꾼의 참수도', { atk: 140, def: 20, hp: 120 }),
  W('hunter', 'mage', '사냥꾼의 봉인장', { mag: 145, mp: 100, res: 20 }),
  W('hunter', 'archer', '사냥꾼의 석궁', { atk: 135, crit: 16, agi: 10 }),
  W('hunter', 'priest', '사냥꾼의 성표', { mag: 125, mp: 110, hp: 180 }),
  { id: 's_hunter_armor', name: '사냥꾼의 가죽 갑옷', slot: 'armor', tier: SET_TIER, stats: { hp: 560, def: 64, res: 48 }, set: 'hunter' },
  { id: 's_hunter_acc', name: '사냥꾼의 송곳니 목걸이', slot: 'accessory', tier: SET_TIER, stats: { hp: 240, atk: 18, mag: 18, crit: 8 }, set: 'hunter' },
];
/** 레이드 장비 제작 (벨리알의 파편) */
export const RAID_SET = 'hunter';
export const RAID_CRAFT_COST: Record<'weapon' | 'armor' | 'accessory', { scales: number; gold: number }> = {
  weapon: { scales: 120, gold: 150000 },
  armor: { scales: 100, gold: 120000 },
  accessory: { scales: 80, gold: 100000 },
};

/** 재료 드롭 (마왕성 51층~) */
export const SHARD_CHANCE = { normal: 20, elite: 100, boss: 100 };
export const CORE_CHANCE = { normal: 0, elite: 15, boss: 100 };
export const SET_DROP_CHANCE = { normal: 0, elite: 3, boss: 15 };
/** 제작 비용 */
export const CRAFT_COST: Record<'weapon' | 'armor' | 'accessory', { cores: number; shards: number; gold: number }> = {
  weapon: { cores: 200, shards: 0, gold: 200000 },
  armor: { cores: 160, shards: 0, gold: 150000 },
  accessory: { cores: 120, shards: 0, gold: 120000 },
};
/** 제작·드롭 등급: 영웅 70% / 전설 30% */
export const SET_RARITY = { 4: 70, 5: 30 } as const;
/** 착용 세트 수 → 활성 효과 */
export function setBonusMods(counts: Record<string, number>): Modifier[] {
  const out: Modifier[] = [];
  for (const [id, n] of Object.entries(counts)) {
    const s = SET_BY_ID[id];
    if (!s) continue;
    if (n >= 2) out.push(...s.two);
    if (n >= 3) out.push(...s.three);
  }
  return out;
}
