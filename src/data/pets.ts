import type { Grade, Modifier } from '../core/types';
import type { Rng } from '../core/rng';

/** 펫: 출전 파티 전원에게 효과. 등급별 기본 % + 성(★)당 +1%p */
export interface PetKind { id: string; name: string; desc: string; mods: (v: number) => Modifier[] }
const party = { scope: 'party' as const };
export const PET_KINDS: PetKind[] = [
  { id: 'turtle', name: '방패 거북', desc: '파티 방어력·마법 저항', mods: (v) => [{ key: 'def', kind: 'pct', value: v, ...party }, { key: 'res', kind: 'pct', value: v, ...party }] },
  { id: 'fox', name: '화염 여우', desc: '파티 공격력', mods: (v) => [{ key: 'atk', kind: 'pct', value: v, ...party }] },
  { id: 'owl', name: '별 부엉이', desc: '파티 마력', mods: (v) => [{ key: 'mag', kind: 'pct', value: v, ...party }] },
  { id: 'bear', name: '숲 곰', desc: '파티 최대 HP', mods: (v) => [{ key: 'hp', kind: 'pct', value: v, ...party }] },
  { id: 'hawk', name: '바람 매', desc: '파티 치명타·민첩', mods: (v) => [{ key: 'crit', kind: 'flat', value: Math.round(v / 2), ...party }, { key: 'agi', kind: 'pct', value: v, ...party }] },
  { id: 'fairy', name: '빛 요정', desc: '파티 회복량', mods: (v) => [{ key: 'healPower', kind: 'pct', value: Math.round(v * 1.5), ...party }] },
];
export const PET_BY_ID = Object.fromEntries(PET_KINDS.map((p) => [p.id, p]));
export const PET_GRADE_PCT: Record<Grade, number> = { 1: 3, 2: 5, 3: 8, 4: 12, 5: 18 };
export const PET_MAX_STARS = 5;
export const PET_GRADE_NAME: Record<Grade, string> = { 1: '일반', 2: '고급', 3: '희귀', 4: '영웅', 5: '전설' };

export interface Pet { uid: string; kind: string; grade: Grade; stars: number; evo?: boolean }
/** 진화: 전설 ★5 → 효과 ×1.5 + 파티 HP +5% */
export const petValue = (p: Pet) => Math.round((PET_GRADE_PCT[p.grade] + p.stars) * (p.evo ? 1.5 : 1));
export const PET_EVO_GOLD = 500000;
export const petMods = (p: Pet | undefined): Modifier[] => (p ? [...PET_BY_ID[p.kind].mods(petValue(p)), ...(p.evo && p.kind !== 'bear' ? [{ key: 'hp' as const, kind: 'pct' as const, value: 5, scope: 'party' as const }] : p.evo ? [{ key: 'def' as const, kind: 'pct' as const, value: 5, scope: 'party' as const }] : [])] : []);
export function petEffectText(p: Pet) {
  return petMods(p).map((m) => `${({ def: '방어', res: '마저', atk: '공격', mag: '마력', hp: 'HP', crit: '치명', agi: '민첩', healPower: '회복량' } as Record<string, string>)[m.key]} +${m.value}${m.kind === 'pct' ? '%' : '%p'}`).join(' · ');
}
export function petName(p: Pet) {
  return `${p.evo ? '✦ ' : ''}${PET_BY_ID[p.kind].name}`;
}

/** 펫 알 */
export const EGG_PRICE = 5000;
export const EGG_ODDS: Record<Grade, number> = { 1: 50, 2: 30, 3: 14, 4: 5, 5: 1 };
export const petSellPrice = (p: Pet) => [0, 500, 1500, 5000, 15000, 50000][p.grade] * (1 + p.stars);
export function hatch(rng: Rng, minGrade: Grade = 1): Omit<Pet, 'uid'> {
  const grades = ([1, 2, 3, 4, 5] as Grade[]).filter((g) => g >= minGrade);
  const grade = rng.weighted(grades, (g) => EGG_ODDS[g]);
  return { kind: rng.pick(PET_KINDS).id, grade, stars: 0 };
}
