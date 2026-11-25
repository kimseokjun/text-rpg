import type { Modifier, Passive } from '../core/types';

export interface TraitDef {
  id: string;
  name: string;
  kind: 'positive' | 'mixed' | 'hero' | 'legend';
  desc: string;
  mods?: Modifier[];
  passive?: Passive;
}

const pct = (key: any, value: number, extra: Partial<Modifier> = {}): Modifier => ({ key, kind: 'pct', value, ...extra });
const flat = (key: any, value: number, extra: Partial<Modifier> = {}): Modifier => ({ key, kind: 'flat', value, ...extra });

const list: TraitDef[] = [
  // 긍정
  { id: '강인함', name: '강인함', kind: 'positive', desc: '최대 HP +10%', mods: [pct('hp', 10)] },
  { id: '집중력', name: '집중력', kind: 'positive', desc: '스킬 데미지 +10%', mods: [pct('skillDmg', 10)] },
  { id: '날쌘 발', name: '날쌘 발', kind: 'positive', desc: '민첩 +10%', mods: [pct('agi', 10)] },
  { id: '예리함', name: '예리함', kind: 'positive', desc: '치명타율 +5%p', mods: [flat('crit', 5)] },
  { id: '헌신', name: '헌신', kind: 'positive', desc: '회복량 +15%', mods: [pct('healPower', 15)] },
  { id: '마나 친화', name: '마나 친화', kind: 'positive', desc: '스킬 MP 소모 -15%', mods: [pct('mpCost', -15)] },
  { id: '근성', name: '근성', kind: 'positive', desc: '층 클리어 회복량 +5%p', mods: [flat('floorRegen', 5)] },
  { id: '빠른 습득', name: '빠른 습득', kind: 'positive', desc: '경험치 +15%', mods: [pct('expGain', 15)] },
  // 양날
  { id: '용감함', name: '용감함', kind: 'mixed', desc: '방어력 +10%, 적에게 더 자주 공격받음', mods: [pct('def', 10), pct('aggro', 50)] },
  { id: '겁쟁이', name: '겁쟁이', kind: 'mixed', desc: 'HP 30% 이하 시 회피 +20%, 공격력 -10%',
    mods: [flat('evade', 20, { when: 'selfHpBelow30' }), pct('atk', -10)] },
  { id: '광기', name: '광기', kind: 'mixed', desc: '공격력 +15%, 받는 피해 +10%', mods: [pct('atk', 15), pct('dmgTaken', 10)] },
  { id: '신중함', name: '신중함', kind: 'mixed', desc: '방어력 +15%, 민첩 -10%', mods: [pct('def', 15), pct('agi', -10)] },
  { id: '도박꾼', name: '도박꾼', kind: 'mixed', desc: '치명타율 +10%p, 일반 데미지 -10%', mods: [flat('crit', 10), pct('normalDmg', -10)] },
  { id: '구두쇠', name: '구두쇠', kind: 'mixed', desc: '고용가 -30%, 파티 골드 획득 -10%',
    mods: [pct('hireCost', -30), pct('goldGain', -10, { scope: 'party' })] },
  // 영웅 고유
  { id: '불사의 의지', name: '불사의 의지', kind: 'hero', desc: '탐험당 1회, 쓰러질 때 HP 30%로 버팀', passive: 'immortalWill' },
  { id: '전장의 지휘관', name: '전장의 지휘관', kind: 'hero', desc: '파티 전체 공격력 +8%', mods: [pct('atk', 8, { scope: 'party' })] },
  { id: '성녀의 가호', name: '성녀의 가호', kind: 'hero', desc: '파티 전체 받는 피해 -8%', mods: [pct('dmgTaken', -8, { scope: 'party' })] },
  { id: '마도의 극의', name: '마도의 극의', kind: 'hero', desc: '첫 턴 스킬 MP 소모 0', passive: 'zeroMpFirstTurn' },
  { id: '황금손', name: '황금손', kind: 'hero', desc: '파티 골드·아이템 획득 +25%',
    mods: [pct('goldGain', 25, { scope: 'party' }), pct('itemGain', 25, { scope: 'party' })] },
  // 전설 고유
  { id: '최후의 방벽', name: '최후의 방벽', kind: 'legend', desc: '아군이 쓰러질 공격을 대신 맞음 (탐험당 2회)', passive: 'lastBastion' },
  { id: '별의 계시', name: '별의 계시', kind: 'legend', desc: '3턴마다 마력 200% 광역 마법 추가 발동', passive: 'starOracle' },
  { id: '천궁', name: '천궁', kind: 'legend', desc: '첫 턴 무조건 선공, 매 턴 첫 공격 치명타 확정', passive: 'skyBow' },
  { id: '여명의 기도', name: '여명의 기도', kind: 'legend', desc: '층 클리어마다 파티 HP 30% 추가 회복', passive: 'dawnPrayer' },
  { id: '마법 거부', name: '마법 거부', kind: 'legend', desc: '받는 마법 피해 -25%, 파티 받는 마법 피해 -10%. 마법 보스의 천적',
    mods: [pct('magTaken', -25), pct('magTaken', -10, { scope: 'party' })] },
  { id: '마력 관통', name: '마력 관통', kind: 'legend', desc: '적 마법 저항 40% 무시, 보스·엘리트 피해 +10%. 마법 저항 높은 적의 천적',
    mods: [flat('resPierce', 40), pct('bossDmg', 10)] },
  { id: '용 사냥꾼', name: '용 사냥꾼', kind: 'legend', desc: '보스·엘리트에게 주는 피해 +35%. 보스 우선 공격과 찰떡', mods: [pct('bossDmg', 35)] },
  { id: '정화의 빛', name: '정화의 빛', kind: 'legend', desc: '매 라운드 끝 파티의 독·화상 해제, 회복량 +15%', mods: [pct('healPower', 15)], passive: 'purify' },
];

export const TRAITS: Record<string, TraitDef> = Object.fromEntries(list.map((t) => [t.id, t]));
export const POSITIVE_TRAITS = list.filter((t) => t.kind === 'positive').map((t) => t.id);
export const MIXED_TRAITS = list.filter((t) => t.kind === 'mixed').map((t) => t.id);
export const COMMON_TRAITS = [...POSITIVE_TRAITS, ...MIXED_TRAITS];
