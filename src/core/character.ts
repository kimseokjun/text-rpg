import { ADVANCE_AT, JOBS, TIER_CAP, advanceOptions } from '../data/jobs';
import { SKILLS } from '../data/skills';
import { COMMON_TRAITS } from '../data/traits';
import type { MercDef } from '../data/mercenaries';
import { Rng } from './rng';
import { expToNext, MAX_LEVEL } from './stats';
import type { Character, JobId, SkillSlot } from './types';

let uidSeq = 0;
export const newUid = (p: string) => `${p}_${Date.now().toString(36)}_${(uidSeq++).toString(36)}`;

export function unlockedSkills(c: Character): string[] {
  return JOBS[c.jobId].skills.filter((s) => s.level <= c.level).map((s) => s.skillId);
}

/** 기본 우선순위: 회복/보호 → 버프 → 광역 → 단일 강공 */
const PRIORITY = [
  'heavensGrace', 'grandHeal', 'titanWall', 'aegis', 'sanctuary', 'greatHeal', 'heal', 'manaShield', 'vowOfImmortality', 'taunt', 'beastRoar', 'bless', 'curse', 'ironWall',
  'deathCurse', 'armyOfDead', 'skeletonLegion', 'summonWolf', 'starfall', 'judgmentDay', 'dragonBreath', 'carnage', 'chainLightning', 'warCry', 'stampede',
  'divineArrow', 'galeShot', 'holyBlade', 'arcaneNova', 'holyJudgment', 'bloodStorm',
  'meteor', 'thunder', 'sweep', 'trap', 'skyArrow', 'vitalShot', 'bloodStrike', 'judgment', 'drainLife',
  'poisonArrow', 'rapidFire', 'fireball', 'aimedShot', 'holyLight', 'smash',
  // 보호막은 기본 맨 끝 (원하는 위치로 올려서 사용)
  'divineBarrier', 'barrier',
];

export function defaultSkillSlots(c: Character): SkillSlot[] {
  const have = new Set(unlockedSkills(c));
  return PRIORITY.filter((id) => have.has(id)).map((id) => ({ skillId: id, condition: SKILLS[id].defaultCondition }));
}

/** 새로 해금된 스킬을 우선순위에 반영 (기존 순서는 유지) */
export function syncSkillSlots(c: Character) {
  const have = new Set(unlockedSkills(c));
  const cur = c.skillSlots.filter((s) => have.has(s.skillId));
  const curIds = new Set(cur.map((s) => s.skillId));
  for (const def of defaultSkillSlots(c)) {
    if (curIds.has(def.skillId)) continue;
    const idx = PRIORITY.indexOf(def.skillId);
    const at = cur.findIndex((s) => PRIORITY.indexOf(s.skillId) > idx);
    cur.splice(at < 0 ? cur.length : at, 0, def);
  }
  c.skillSlots = cur;
}

export function createHero(name = '주인공'): Character {
  const c: Character = {
    uid: 'hero', mercId: null, name, isHero: true, jobId: 'warrior', level: 1, exp: 0,
    grade: 2, traitIds: [], uniqueTraitId: null, awakening: 0, bonusPoints: {}, equipment: {}, skillSlots: [],
  };
  c.skillSlots = defaultSkillSlots(c);
  return c;
}

/** 고용 시 레벨: 길드 최고 레벨 -3 ~ 0 */
export function hireLevel(heroLevel: number, rng: Rng) {
  return Math.max(1, heroLevel - rng.int(0, 3));
}

export function hirePrice(def: MercDef, level: number) {
  return Math.round(def.basePrice * (1 + (level - 1) * 0.15));
}

export function createMerc(def: MercDef, level: number): Character {
  const c: Character = {
    uid: newUid('c'), mercId: def.id, name: def.name, isHero: false, jobId: def.job, level, exp: 0,
    grade: def.grade, traitIds: [...def.traits], uniqueTraitId: def.unique, awakening: 0,
    bonusPoints: {}, equipment: {}, skillSlots: [],
  };
  c.skillSlots = defaultSkillSlots(c);
  return c;
}

/** 중복 고용 → 각성. 3단계에서 특성 없으면 1개 추가 */
export function awaken(c: Character, rng: Rng): string | null {
  if (c.awakening >= 5) return null;
  c.awakening++;
  if (c.awakening === 3) {
    const pool = COMMON_TRAITS.filter((t) => !c.traitIds.includes(t));
    const t = rng.pick(pool);
    c.traitIds.push(t);
    return `${c.name} 각성 ${c.awakening}단계! 새 특성 [${t}]`;
  }
  return `${c.name} 각성 ${c.awakening}단계!`;
}

/** 지금 직업 단계의 레벨 상한 (1차 20 / 2차 50 / 3차 70 / 4차 90 / 5차 100) */
export const levelCap = (c: Character) => Math.min(MAX_LEVEL, TIER_CAP[JOBS[c.jobId].tier]);

export function gainExp(c: Character, amount: number): number {
  const cap = levelCap(c);
  if (c.level >= cap) return 0;
  c.exp += amount;
  let ups = 0;
  while (c.level < cap && c.exp >= expToNext(c.level)) {
    c.exp -= expToNext(c.level);
    c.level++;
    ups++;
  }
  // 상한에 닿으면 남은 경험치는 다음 레벨 직전까지만 보존
  if (c.level >= cap) c.exp = Math.min(c.exp, expToNext(c.level) - 1);
  if (ups) syncSkillSlots(c);
  return ups;
}

export function canAdvance(c: Character) {
  const tier = JOBS[c.jobId].tier;
  return tier < 5 && c.level >= ADVANCE_AT[tier as 1 | 2 | 3 | 4];
}

export function advanceJob(c: Character, to: JobId) {
  if (!canAdvance(c) || !advanceOptions(c.jobId).includes(to)) throw new Error('전직 불가');
  c.jobId = to;
  syncSkillSlots(c);
}
