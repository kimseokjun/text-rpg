import { BLESSING_BONUS, ENHANCE_PITY, ENHANCE_RATE, enhanceCost } from '../data/items';
import { MERCENARIES, MERC_BY_ID, type MercDef } from '../data/mercenaries';
import { awaken, createMerc, hireLevel, hirePrice } from './character';
import { Rng } from './rng';
import { finalStats } from './stats';
import type { Character, Equip, Grade } from './types';

// ───────── 길드 모집판 ─────────
export const BOARD_SIZE = 5;
export const GRADE_RATE: Record<Grade, number> = { 1: 54, 2: 30, 3: 12, 4: 3, 5: 1 };

export interface Candidate { mercId: string; level: number; price: number }

/** 길드 레벨이 오르면 상위 등급 확률 소폭 상승 */
export function gradeWeights(guildLevel: number): Record<Grade, number> {
  const b = (guildLevel - 1) * 0.5;
  return { 1: Math.max(30, 54 - b * 3), 2: 30, 3: 12 + b * 1.5, 4: 3 + b, 5: 0.4 + b * 0.2 };
}

export function rollCandidate(rng: Rng, heroLevel: number, guildLevel = 1, roster: Character[] = []): Candidate {
  const w = gradeWeights(guildLevel);
  const grade = rng.weighted([1, 2, 3, 4, 5] as Grade[], (g) => w[g]);
  const def = rng.pick(MERCENARIES.filter((m) => m.grade === grade));
  const level = hireLevel(heroLevel, rng);
  const owned = roster.find((c) => c.mercId === def.id);
  // 이미 보유 → 각성용: 가격은 기본가 기준
  const price = owned ? def.basePrice : hirePrice(def, level);
  return { mercId: def.id, level, price };
}

export function rollBoard(rng: Rng, heroLevel: number, guildLevel = 1, roster: Character[] = []): Candidate[] {
  return Array.from({ length: BOARD_SIZE }, () => rollCandidate(rng, heroLevel, guildLevel, roster));
}

export const refreshSlotCost = (heroLevel: number) => 30 + heroLevel * 10;
export const rosterLimit = (guildLevel: number) => 6 + (guildLevel - 1) * 2;

export type HireResult =
  | { ok: true; kind: 'hired'; character: Character }
  | { ok: true; kind: 'awakened'; character: Character; message: string }
  | { ok: false; reason: string };

export function hire(cand: Candidate, roster: Character[], gold: number, guildLevel: number, rng: Rng): HireResult & { cost?: number } {
  const def: MercDef = MERC_BY_ID[cand.mercId];
  const owned = roster.find((c) => c.mercId === def.id);
  // 파티에 구두쇠가 있으면 고용가 할인
  const discount = Math.min(...roster.map((c) => finalStats(c).extra.hireCost), 0);
  const cost = Math.round(cand.price * (1 + discount / 100));
  if (gold < cost) return { ok: false, reason: '골드가 부족합니다' };
  if (owned) {
    const msg = awaken(owned, rng);
    if (!msg) return { ok: false, reason: `${owned.name}은(는) 이미 최대 각성입니다` };
    return { ok: true, kind: 'awakened', character: owned, message: msg, cost };
  }
  if (roster.length >= rosterLimit(guildLevel)) return { ok: false, reason: '보유 인원이 가득 찼습니다' };
  return { ok: true, kind: 'hired', character: createMerc(def, cand.level), cost };
}

// ───────── 대장간 강화 ─────────
export interface EnhanceResult { success: boolean; rate: number; equip: Equip }

export function enhanceRate(e: Equip, useBlessing: boolean) {
  const base = ENHANCE_RATE[e.enhance] ?? 0;
  return Math.min(100, base + e.failStack * ENHANCE_PITY + (useBlessing ? BLESSING_BONUS : 0));
}

/** 실패해도 단계 하락·파괴 없음. 재료만 소모, 천장 누적 */
export function enhance(e: Equip, rng: Rng, useBlessing = false): EnhanceResult {
  if (e.enhance >= 15) throw new Error('최대 강화');
  const rate = enhanceRate(e, useBlessing);
  const success = rng.chance(rate);
  if (success) { e.enhance++; e.failStack = 0; } else e.failStack++;
  return { success, rate, equip: e };
}
export { enhanceCost };
