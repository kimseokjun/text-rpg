import { setBonusMods } from '../data/sets';
import { BASE_LV1, GROWTH, JOBS } from '../data/jobs';
import { EQUIP_BY_ID, ENHANCE_STEP, RARITY_MULT, enhanceFlat } from '../data/items';
import { TRAITS } from '../data/traits';
import type { Character, Equip, ExtraKey, Grade, Modifier, Passive, StatKey, Stats } from './types';

export const STAT_KEYS: StatKey[] = ['hp', 'mp', 'atk', 'mag', 'def', 'res', 'agi', 'crit'];
const STAT_SET = new Set<string>(STAT_KEYS);
export const isStat = (k: string): k is StatKey => STAT_SET.has(k);

export const GRADE_GROWTH: Record<Grade, number> = { 1: 1.0, 2: 1.15, 3: 1.3, 4: 1.5, 5: 1.75 };
/** 각성 단계별 전 스탯 % (3단계는 특성 추가, 5단계는 특성 1.5배 + 성장률 +10%p) */
export const AWAKEN_STAT_PCT = [0, 5, 10, 10, 15, 15];
export const MAX_LEVEL = 100;

export const expToNext = (level: number) => Math.round(20 * Math.pow(level, 1.5));

export const zeroStats = (): Stats => ({ hp: 0, mp: 0, atk: 0, mag: 0, def: 0, res: 0, agi: 0, crit: 0 });

export function growthRate(c: Character): number {
  return GRADE_GROWTH[c.grade] + (c.awakening >= 5 ? 0.1 : 0);
}

/** 레벨·직업·등급으로 결정되는 기본 스탯 */
export function baseStats(c: Character): Stats {
  const job = JOBS[c.jobId];
  const g = growthRate(c);
  const out = zeroStats();
  for (const k of STAT_KEYS) {
    out[k] = (BASE_LV1[k] + GROWTH[k] * (c.level - 1) * g) * job.aptitude[k] + (c.bonusPoints[k] ?? 0);
  }
  return out;
}

export function equipStats(e: Equip): Partial<Stats> {
  const base = EQUIP_BY_ID[e.baseId];
  const mult = RARITY_MULT[e.rarity] * (1 + ENHANCE_STEP * e.enhance);
  const out: Partial<Stats> = {};
  for (const [k, v] of Object.entries(base.stats) as [StatKey, number][]) out[k] = v * mult;
  if (e.enhance > 0) {
    const main = (base.stats.mag ?? 0) > (base.stats.atk ?? 0) ? 'mag' : 'atk';
    for (const [k, v] of Object.entries(enhanceFlat(base.slot, base.tier, main)) as [StatKey, number][]) out[k] = (out[k] ?? 0) + v * e.enhance;
  }
  return out;
}

export interface CharMods {
  self: Modifier[];       // 본인에게만
  party: Modifier[];      // 파티 전체에
  conditional: Modifier[]; // 전투 중 조건부
  passives: Passive[];
}

/** 직업 패시브·특성·장비 옵션에서 효과 수집 */
export function collectMods(c: Character): CharMods {
  const res: CharMods = { self: [], party: [], conditional: [], passives: [] };
  const push = (m: Modifier, mult = 1) => {
    const mm = { ...m, value: m.value * mult };
    if (mm.when) res.conditional.push(mm);
    else if (mm.scope === 'party') res.party.push(mm);
    else res.self.push(mm);
  };
  const job = JOBS[c.jobId];
  for (const p of job.passives) {
    if (p.level > c.level) continue;
    p.mods?.forEach((m) => push(m));
    if (p.passive) res.passives.push(p.passive);
  }
  const traitMult = c.awakening >= 5 ? 1.5 : 1;
  for (const id of c.traitIds) TRAITS[id]?.mods?.forEach((m) => push(m, traitMult));
  if (c.uniqueTraitId) {
    const t = TRAITS[c.uniqueTraitId];
    t?.mods?.forEach((m) => push(m, traitMult));
    if (t?.passive) res.passives.push(t.passive);
  }
  for (const e of Object.values(c.equipment)) e?.options.forEach((m) => push(m));
  // 세트 효과
  const sets: Record<string, number> = {};
  for (const e of Object.values(c.equipment)) { const st = e && EQUIP_BY_ID[e.baseId]?.set; if (st) sets[st] = (sets[st] ?? 0) + 1; }
  setBonusMods(sets).forEach((m) => push(m));
  if (c.awakening > 0) {
    const a = AWAKEN_STAT_PCT[c.awakening];
    for (const k of STAT_KEYS) if (k !== 'crit') res.self.push({ key: k, kind: 'pct', value: a });
  }
  return res;
}

export type Extras = Record<ExtraKey, number>;
export const zeroExtras = (): Extras => ({
  goldGain: 0, itemGain: 0, expGain: 0, healPower: 0, skillDmg: 0, normalDmg: 0, mpCost: 0,
  floorRegen: 0, dmgTaken: 0, evade: 0, critDmg: 0, aggro: 0, hireCost: 0,
  bossDmg: 0, resPierce: 0, defPierce: 0, magTaken: 0, raidDmg: 0,
});

/** 기본값 + 장비 + Modifier 적용 → 최종 스탯 */
export function applyMods(base: Stats, mods: Modifier[]): { stats: Stats; extra: Extras } {
  const flat = zeroStats();
  const pct = zeroStats();
  const extra = zeroExtras();
  for (const m of mods) {
    if (isStat(m.key)) (m.kind === 'flat' ? flat : pct)[m.key] += m.value;
    else extra[m.key as ExtraKey] += m.value;
  }
  const stats = zeroStats();
  for (const k of STAT_KEYS) stats[k] = Math.max(0, (base[k] + flat[k]) * (1 + pct[k] / 100));
  return { stats, extra };
}

export function finalStats(c: Character, extraMods: Modifier[] = []) {
  const base = baseStats(c);
  for (const e of Object.values(c.equipment)) {
    if (!e) continue;
    for (const [k, v] of Object.entries(equipStats(e)) as [StatKey, number][]) base[k] += v;
  }
  const mods = collectMods(c);
  const { stats, extra } = applyMods(base, [...mods.self, ...extraMods]);
  return { stats, extra, mods };
}

/** 파티 전원이 공유하는 효과 (party 스코프 특성·패시브) */
export function partyMods(chars: Character[]): Modifier[] {
  return chars.flatMap((c) => collectMods(c).party);
}
