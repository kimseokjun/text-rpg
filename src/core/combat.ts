import { MONSTERS, defComp, difficulty, floorLevel, refStats, type MonsterDef } from '../data/monsters';
import { SKILLS } from '../data/skills';
import { JOBS } from '../data/jobs';
import { Rng } from './rng';
import { applyMods, finalStats, type Extras, zeroExtras } from './stats';
import { memberOf, type FightInfo, type Report } from './report';
import type {
  BattleEvent, BuffFlag, Character, Condition, Modifier, Passive, Row, SkillDef, SkillEffect, SkillSlot, Stats, StatusType, TargetPref,
} from './types';

/** 직업 기본 열: 전사 계열은 전열, 나머지는 후열 */
export const defaultRow = (ch: Character): Row => (JOBS[ch.jobId].base === 'warrior' ? 'front' : 'back');
export const rowOf = (ch: Character): Row => ch.row ?? defaultRow(ch);
/** 열 보정: 전열 방어·마저 +5%, 후열 공격·마력 +5% */
export const ROW_MODS: Record<Row, Modifier[]> = {
  front: [{ key: 'def', kind: 'pct', value: 5 }, { key: 'res', kind: 'pct', value: 5 }],
  back: [{ key: 'atk', kind: 'pct', value: 5 }, { key: 'mag', kind: 'pct', value: 5 }],
};
/** 적이 노릴 때 가중치 */
const ROW_AGGRO: Record<Row, number> = { front: 2.2, back: 0.6 };

// ───────── 전투 참가자 ─────────
export interface Buff { id: string; label: string; mods: Modifier[]; turns: number; flag?: BuffFlag; shield?: number }

export interface Combatant {
  id: string;
  name: string;
  side: 'party' | 'enemy';
  base: Stats;            // 전투 밖 최종 스탯
  extra: Extras;
  conditional: Modifier[];
  passives: Set<Passive>;
  hp: number; maxHp: number;
  mp: number; maxMp: number;
  buffs: Buff[];
  status: Partial<Record<StatusType, { turns: number; power: number }>>;
  taunt: number;
  slots: SkillSlot[];
  skillChance: number;    // 몬스터 전용
  attackScale: 'atk' | 'mag';
  evadeBase: number;
  tags: Set<string>;
  alive: boolean;
  // 탐험 단위로 유지되는 1회성 효과
  flags: { endureUsed?: boolean; immortalUsed?: boolean; reviveUsed?: boolean; miracleUsed?: boolean; bastionLeft?: number; phase2Done?: boolean; firstHitDone?: boolean };
  mdef?: MonsterDef;
  char?: Character;
  row?: Row;
  pref?: TargetPref;
  rampage?: number;
  lvl?: number;       // 몬스터: 층 레벨 (방어 비율 계산용)
  dmgComp?: number;   // 몬스터: 방어 비율 감소 도입에 따른 피해 보정
}

const pctOf = (c: Combatant) => (c.maxHp ? c.hp / c.maxHp : 0) * 100;

export function fromCharacter(ch: Character, partyMods: Modifier[]): Combatant {
  const row = rowOf(ch);
  const { stats, extra, mods } = finalStats(ch, [...partyMods, ...ROW_MODS[row]]);
  const maxHp = Math.round(stats.hp);
  const maxMp = Math.round(stats.mp);
  return {
    id: ch.uid, name: ch.name, side: 'party', base: stats, extra, conditional: mods.conditional,
    passives: new Set(mods.passives), hp: maxHp, maxHp, mp: maxMp, maxMp, buffs: [], status: {}, taunt: 0,
    slots: ch.skillSlots, skillChance: 100, attackScale: JOBS[ch.jobId].base === 'mage' ? 'mag' : 'atk',
    evadeBase: 0, tags: new Set(), alive: true, flags: { bastionLeft: 2 }, char: ch, row, pref: ch.target ?? 'auto',
  };
}

let monSeq = 0;
export function fromMonster(def: MonsterDef, floor: number, tune?: number): Combatant {
  const ref = refStats(floorLevel(floor));
  const d = difficulty(floor, tune);
  const st = def.stats;
  const base: Stats = {
    hp: st.hp * ref.hp * d.hp, mp: 0, atk: st.atk * ref.atk * d.dmg, mag: st.mag * ref.mag * d.dmg, def: st.def * ref.def, res: st.res * ref.res,
    agi: st.agi * ref.agi, crit: st.crit,
  };
  const maxHp = Math.round(base.hp);
  return {
    id: `${def.id}#${monSeq++}`, name: def.name, side: 'enemy', base, extra: zeroExtras(), conditional: [],
    hp: maxHp, maxHp, mp: 0, maxMp: 0, buffs: [], status: {}, taunt: 0, slots: def.skills, skillChance: def.skillChance,
    attackScale: def.attackScale, evadeBase: def.evade ?? 0, tags: new Set(def.tags), alive: true, flags: {}, mdef: def,
    passives: new Set(def.passives ?? []), lvl: floorLevel(floor), dmgComp: defComp(floor),
  };
}

/** 버프·조건부 효과를 반영한 현재 스탯 */
function eff(c: Combatant): { stats: Stats; extra: Extras } {
  const mods: Modifier[] = c.buffs.flatMap((b) => b.mods);
  const hp = pctOf(c);
  for (const m of c.conditional) {
    if ((m.when === 'selfHpBelow30' && hp <= 30) || (m.when === 'selfHpBelow50' && hp <= 50)) mods.push(m);
  }
  if (c.passives.has('berserkScale')) mods.push({ key: 'atk', kind: 'pct', value: Math.min(50, 100 - hp) });
  const { stats, extra } = applyMods(c.base, mods);
  for (const k of Object.keys(extra) as (keyof Extras)[]) extra[k] += c.extra[k];
  return { stats, extra };
}

/** 같은 이름의 적에게 A, B, C… 붙이기 (UI에서 구분용) */
export function nameUnique(list: Combatant[]) {
  const by: Record<string, Combatant[]> = {};
  for (const c of list) {
    const base = c.mdef?.name ?? c.name;
    (by[base] ??= []).push(c);
  }
  for (const [base, arr] of Object.entries(by)) {
    if (arr.length < 2) continue;
    arr.forEach((c, i) => { if (c.name === base || !c.name.startsWith(base + ' ')) c.name = `${base} ${'ABCDEFGHIJ'[i]}`; });
  }
}

export const snap = (c: Combatant) => ({
  name: c.name, hp: Math.round(c.hp), maxHp: c.maxHp, boss: c.tags.has('boss'), elite: c.tags.has('elite'), id: c.mdef?.id, tags: [...c.tags], ...(c.char && c.side === 'enemy' ? { job: c.char.jobId } : {}),
});

// ───────── 전투 ─────────
export interface BattleContext {
  rng: Rng;
  log: BattleEvent[];
  party: Combatant[];
  enemies: Combatant[];
  round: number;
  hasBoss: boolean;
  floor: number;
  /** 라운드 상한 (레이드 10) */
  maxRounds?: number;
  rep?: Report;
  cur?: { c: Combatant; label: string };
  hit?: { mag: boolean; bulwark: boolean };
  /** 친구 결투: 양쪽 모두 캐릭터 → 같은 규칙 */
  pvp?: boolean;
}

const alive = (list: Combatant[]) => list.filter((c) => c.alive);
const allies = (ctx: BattleContext, c: Combatant) => (c.side === 'party' ? ctx.party : ctx.enemies);
const foes = (ctx: BattleContext, c: Combatant) => (c.side === 'party' ? ctx.enemies : ctx.party);

const MAX_ROUNDS = 60;
/** 결투에선 피해를 줄여 한두 턴 만에 끝나지 않게 */
export const PVP_DMG = 0.6;
export const PVP_HEAL = 0.5;

export function runBattle(ctx: BattleContext): boolean {
  const { rng, log } = ctx;
  for (const e of ctx.enemies) {
    if (e.passives.has('bulwark')) log.push({ t: 'special', who: e.name, text: '수하들의 결계가 보스를 감싼다 (수하가 살아있는 동안 보스 피해 -70%)' });
    if (e.passives.has('rampage')) log.push({ t: 'special', who: e.name, text: '시간이 갈수록 광폭해진다 (라운드마다 공격 +12%)' });
    if (e.passives.has('mender')) log.push({ t: 'special', who: e.name, text: '살아있는 동안 매 라운드 보스 HP 9%를 치유한다' });
  }
  const limit = ctx.maxRounds ?? MAX_ROUNDS;
  if (ctx.rep) {
    const boss = ctx.enemies.find((e) => e.tags.has('boss'));
    ctx.rep.cur = { floor: ctx.floor, boss: !!boss, win: false, rounds: 0, limit, bulwark: ctx.enemies.some((e) => e.passives.has('bulwark')), rampage: ctx.enemies.some((e) => e.passives.has('rampage')), mender: ctx.enemies.some((e) => e.passives.has('mender')), dealt: 0, bulwarkDmg: 0, enemyHealed: 0, bossName: boss?.mdef?.name };
    ctx.rep.fights.push(ctx.rep.cur);
    ctx.rep.firstDeath = undefined; // 진단은 마지막 싸움 기준
  }
  for (ctx.round = 1; ctx.round <= limit; ctx.round++) {
    const order = startRound(ctx);
    for (const c of order) {
      if (!c.alive) continue;
      if (!alive(ctx.party).length || !alive(ctx.enemies).length) break;
      takeTurn(ctx, c);
    }
    if (!alive(ctx.enemies).length || !alive(ctx.party).length) break;
    endOfRound(ctx);
    if (!alive(ctx.enemies).length || !alive(ctx.party).length) break;
  }
  const win = !alive(ctx.enemies).length && alive(ctx.party).length > 0;
  log.push({ t: 'result', win, rounds: Math.min(ctx.round, limit) });
  if (ctx.rep?.cur) { ctx.rep.cur.win = win; ctx.rep.cur.rounds = Math.min(ctx.round, limit); ctx.rep.cur = undefined; }
  // 전투 종료 시 버프·상태이상 해제
  for (const c of ctx.party) { c.buffs = []; c.status = {}; c.taunt = 0; }
  return win;
}

/** 라운드 시작: 'round' 기록 + 행동 순서 (수동 전투용으로도 사용) */
export function startRound(ctx: BattleContext): Combatant[] {
  const { rng, log } = ctx;
  log.push({ t: 'round', n: ctx.round });
  const speed = (l: Combatant[]) => l.map((c) => ({ c, k: eff(c).stats.agi * rng.range(0.9, 1.1) + (ctx.round === 1 && c.passives.has('skyBow') ? 1e6 : 0) })).sort((a, b) => b.k - a.k);
  if (ctx.pvp) {
    // 결투: 양 진영이 한 명씩 번갈아 행동. 진영 안 순서는 민첩, 선공은 가장 빠른 캐릭터가 있는 쪽
    const p = speed(alive(ctx.party)), e = speed(alive(ctx.enemies));
    const [first, second] = (p[0]?.k ?? 0) >= (e[0]?.k ?? 0) ? [p, e] : [e, p];
    const order: Combatant[] = [];
    for (let i = 0; i < Math.max(first.length, second.length); i++) { if (first[i]) order.push(first[i].c); if (second[i]) order.push(second[i].c); }
    return order;
  }
  return speed([...alive(ctx.party), ...alive(ctx.enemies)]).map((x) => x.c);
}
/** 한 명의 차례: 기절 처리 → 행동(forced = 직접 고른 스킬 id 또는 'attack') → 부가 공격 */
export function takeTurn(ctx: BattleContext, c: Combatant, forced?: string) {
  const { log } = ctx;
  c.flags.firstHitDone = false;
  if (c.status.stun) {
    log.push({ t: 'stunned', who: c.name });
    delete c.status.stun;
    return;
  }
  act(ctx, c, forced);
  // 늑대 소환: 추가 공격 (야수왕 패시브면 2배)
  if (c.alive && c.buffs.some((b) => b.flag === 'extraHit')) {
    const t = pickFoe(ctx, c);
    if (t) {
      log.push({ t: 'special', who: c.name, text: '늑대가 함께 달려든다!' });
      dealDamage(ctx, c, t, { type: 'damage', scale: 'atk', power: c.passives.has('packLeader') ? 1.2 : 0.6, target: 'single' }, true);
    }
  }
  // 해골 군단: 해골 2구 추가 공격
  if (c.alive && c.buffs.some((b) => b.flag === 'skeletons')) {
    log.push({ t: 'special', who: c.name, text: '해골 군단이 진격한다!' });
    for (let i = 0; i < 2; i++) {
      const t = pickFoe(ctx, c);
      if (t) dealDamage(ctx, c, t, { type: 'damage', scale: 'mag', power: 0.5, target: 'single' }, true);
    }
  }
  // 별의 계시
  if (c.alive && c.passives.has('starOracle') && ctx.round % 3 === 0 && alive(ctx.enemies).length) {
    log.push({ t: 'special', who: c.name, text: '별의 계시! 하늘에서 별빛이 쏟아진다' });
    for (const t of alive(foes(ctx, c))) dealDamage(ctx, c, t, { type: 'damage', scale: 'mag', power: 2.0, target: 'all' }, false);
  }
}
/** 수동 전투: 이 캐릭터가 지금 쓸 수 있는 스킬 (MP·사용 가능 여부) */
export function usableSkills(ctx: BattleContext, c: Combatant): { skillId: string; name: string; mp: number; ok: boolean; why?: string }[] {
  return c.slots.map((slot) => {
    const sk = SKILLS[slot.skillId];
    if (!sk) return null;
    const cost = mpCost(ctx, c, sk);
    const why = c.mp < cost ? 'MP 부족' : !skillUsable(ctx, c, sk) ? '지금은 못 써요' : isActive(ctx, c, sk) ? '이미 걸려 있어요' : undefined;
    return { skillId: slot.skillId, name: sk.name, mp: cost, ok: c.mp >= cost && skillUsable(ctx, c, sk), why };
  }).filter(Boolean) as { skillId: string; name: string; mp: number; ok: boolean; why?: string }[];
}
export const endRound = (ctx: BattleContext) => endOfRound(ctx);

function endOfRound(ctx: BattleContext) {
  for (const side of ctx.pvp ? [ctx.party, ctx.enemies] : [ctx.party]) {
    // 기적: 쓰러진 아군 전원 부활 (탐험당 1회)
    const saint = alive(side).find((p) => p.passives.has('miracle') && !p.flags.miracleUsed);
    const fallen = side.filter((p) => !p.alive);
    if (saint && fallen.length) {
      saint.flags.miracleUsed = true;
      for (const f of fallen) { f.alive = true; f.hp = Math.round(f.maxHp * 0.3); f.status = {}; }
      ctx.log.push({ t: 'special', who: saint.name, text: `기적! ${fallen.map((f) => f.name).join(', ')}이(가) 다시 일어선다` });
    }
    // 정화: 아군 독·화상 해제
    if (alive(side).some((p) => p.passives.has('purify'))) {
      const cleansed = alive(side).filter((p) => p.status.poison || p.status.burn);
      for (const p of cleansed) { delete p.status.poison; delete p.status.burn; }
      if (cleansed.length) ctx.log.push({ t: 'special', who: alive(side).find((p) => p.passives.has('purify'))!.name, text: '정화의 빛! 독과 화상이 씻겨 나간다' });
    }
  }
  // 몬스터 기믹
  const boss = alive(ctx.enemies).find((e) => e.tags.has('boss'));
  for (const e of alive(ctx.enemies)) {
    if (e.passives.has('rampage')) {
      e.rampage = (e.rampage ?? 0) + 1;
      const v = 12 * e.rampage;
      addBuff(e, { id: 'rampage', label: '광폭', mods: [{ key: 'atk', kind: 'pct', value: v }, { key: 'mag', kind: 'pct', value: v }], turns: 999 });
      if (e.rampage % 3 === 0) ctx.log.push({ t: 'special', who: e.name, text: `점점 더 광폭해진다! (공격 +${v}%)` });
    }
    if (e.passives.has('mender') && boss && boss !== e && boss.hp < boss.maxHp) heal(ctx, e, boss, boss.maxHp * 0.09);
  }
  for (const c of [...ctx.party, ...ctx.enemies]) {
    if (!c.alive) continue;
    for (const st of ['poison', 'burn'] as const) {
      const s = c.status[st];
      if (!s) continue;
      const amount = Math.max(1, Math.round(s.power));
      applyHpLoss(ctx, c, amount, null);
      ctx.log.push({ t: 'dot', to: c.name, status: st, amount, hpLeft: Math.max(0, Math.round(c.hp)), maxHp: c.maxHp });
      if (--s.turns <= 0) delete c.status[st];
      if (!c.alive) break;
    }
    if (!c.alive) continue;
    if (c.passives.has('manaRegen3')) c.mp = Math.min(c.maxMp, c.mp + c.maxMp * 0.03);
    c.buffs = c.buffs.filter((b) => --b.turns > 0);
    if (c.taunt > 0) c.taunt--;
  }
}

// ───────── 행동 선택 ─────────
function act(ctx: BattleContext, c: Combatant, forced?: string) {
  // 보스 페이즈 2
  if (c.mdef?.phase2 && !c.flags.phase2Done && pctOf(c) <= 50) {
    c.flags.phase2Done = true;
    const v = c.mdef.phase2.atkMagPct;
    c.buffs.push({ id: 'phase2', label: '광폭화', mods: [{ key: 'atk', kind: 'pct', value: v }, { key: 'mag', kind: 'pct', value: v }], turns: 999 });
    ctx.log.push({ t: 'special', who: c.name, text: c.mdef.phase2.text });
  }

  // 직접 고른 행동 (수동 전투)
  if (forced && forced !== 'attack') {
    const sk = SKILLS[forced];
    const cost = sk ? mpCost(ctx, c, sk) : Infinity;
    if (sk && c.slots.some((x) => x.skillId === forced) && c.mp >= cost && skillUsable(ctx, c, sk)) { c.mp -= cost; useSkill(ctx, c, sk); return; }
  }
  const trySkills = forced !== 'attack' && (c.side === 'party' || ctx.rng.chance(c.skillChance));
  if (trySkills) {
    for (const slot of c.slots) {
      const sk = SKILLS[slot.skillId];
      if (!sk) continue;
      const cost = mpCost(ctx, c, sk);
      if (c.mp < cost) continue;
      if (!checkCondition(ctx, c, sk, slot.condition ?? sk.defaultCondition)) continue;
      if (!skillUsable(ctx, c, sk)) continue;
      c.mp -= cost;
      useSkill(ctx, c, sk);
      return;
    }
  }
  const t = pickFoe(ctx, c);
  if (!t) return;
  ctx.log.push({ t: 'attack', actor: c.name });
  ctx.cur = { c, label: '공격' };
  dealDamage(ctx, c, t, { type: 'damage', scale: c.attackScale, power: 1.0, target: 'single' }, true);
}

function mpCost(ctx: BattleContext, c: Combatant, sk: SkillDef) {
  if (c.side === 'enemy' && !c.char) return 0;
  if (ctx.round === 1 && c.passives.has('zeroMpFirstTurn')) return 0;
  return Math.ceil(sk.mp * (1 + eff(c).extra.mpCost / 100));
}

function checkCondition(ctx: BattleContext, c: Combatant, sk: SkillDef, cond?: Condition): boolean {
  if (!cond || cond.type === 'always') return true;
  switch (cond.type) {
    case 'allyHpBelow': return alive(allies(ctx, c)).some((a) => pctOf(a) < cond.pct);
    case 'selfHpBelow': return pctOf(c) < cond.pct;
    case 'enemyCount': return alive(foes(ctx, c)).length >= cond.min;
    case 'bossOnly': return ctx.hasBoss;
    case 'notActive': return !isActive(ctx, c, sk);
  }
}

/** 같은 버프/디버프/도발이 이미 걸려있는지 */
function isActive(ctx: BattleContext, c: Combatant, sk: SkillDef): boolean {
  for (const e of sk.effects) {
    if (e.type === 'buff') {
      const targets = e.target === 'self' ? [c] : alive(allies(ctx, c));
      if (targets.some((t) => t.buffs.some((b) => b.id === sk.id))) return true;
    }
    if (e.type === 'debuff' && alive(foes(ctx, c)).every((t) => t.buffs.some((b) => b.id === sk.id))) return true;
    if (e.type === 'taunt' && c.taunt > 0) return true;
    // 보호막: 아군 누구에게든 남아 있으면 다시 쓰지 않음
    if (e.type === 'shield' && alive(allies(ctx, c)).some((t) => t.buffs.some((b) => b.id === 'shield' && (b.shield ?? 0) > 0))) return true;
  }
  return false;
}

function skillUsable(ctx: BattleContext, c: Combatant, sk: SkillDef): boolean {
  for (const e of sk.effects) {
    if (e.type === 'damage' && e.hpCostPct && pctOf(c) < 35) return false;
    if (e.type === 'summon') {
      if (alive(ctx.enemies).length >= 5) return false;
      if (!(ctx.round === 1 || ctx.round % 4 === 1)) return false;
    }
    if (e.type === 'heal' && !alive(allies(ctx, c)).some((a) => pctOf(a) < 90)) return false;
  }
  return true;
}

// ───────── 대상 선택 ─────────
function pickFoe(ctx: BattleContext, c: Combatant, prefer?: 'lowest'): Combatant | undefined {
  const list = alive(foes(ctx, c));
  if (!list.length) return;
  const lowest = (l: Combatant[]) => l.reduce((a, b) => (pctOf(a) <= pctOf(b) ? a : b));
  if (c.side === 'party' && !ctx.pvp) {
    // 우선순위: 보스 우선 = 보스 → 엘리트, 잡몹 우선 = 보스 아닌 적, 자동 = HP 비율 낮은 적
    if (c.pref === 'boss') {
      const big = list.filter((e) => e.tags.has('boss'));
      const pool = big.length ? big : list.filter((e) => e.tags.has('elite'));
      if (pool.length) return lowest(pool);
    } else if (c.pref === 'adds') {
      const small = list.filter((e) => !e.tags.has('boss'));
      if (small.length) return lowest(small);
    }
    return lowest(list);
  }
  if (prefer === 'lowest') return lowest(list);
  const taunter = list.find((p) => p.taunt > 0);
  if (taunter) return taunter;
  const avgDef = list.reduce((s, p) => s + p.base.def, 0) / list.length || 1;
  return ctx.rng.weighted(list, (p) => (1 + (0.5 * eff(p).stats.def) / avgDef) * (1 + eff(p).extra.aggro / 100) * ROW_AGGRO[p.row ?? 'back']);
}

// ───────── 스킬 사용 ─────────
function useSkill(ctx: BattleContext, c: Combatant, sk: SkillDef) {
  ctx.log.push({ t: 'skill', actor: c.name, skill: sk.name });
  ctx.cur = { c, label: sk.name };
  let singleTarget: Combatant | undefined;
  for (const e of sk.effects) {
    switch (e.type) {
      case 'damage': {
        if (e.hpCostPct) applyHpLoss(ctx, c, Math.round((c.maxHp * e.hpCostPct) / 100), null);
        if (!c.alive) return;
        const rowFoes = (r: Row) => { const l = alive(foes(ctx, c)); const m = l.filter((x) => (x.row ?? 'back') === r); return m.length ? m : l; };
        const targets = e.target === 'all'
          ? alive(foes(ctx, c))
          : e.target === 'front' || e.target === 'back' ? rowFoes(e.target)
          : [singleTarget ?? (singleTarget = pickFoe(ctx, c, sk.id === 'm_backstab' ? 'lowest' : undefined))].filter(Boolean) as Combatant[];
        for (const t of targets) for (let i = 0; i < (e.hits ?? 1); i++) if (t.alive) dealDamage(ctx, c, t, e, false);
        break;
      }
      case 'heal': {
        const pool = alive(allies(ctx, c));
        const targets = e.target === 'party' ? pool : [pool.reduce((a, b) => (pctOf(a) <= pctOf(b) ? a : b))];
        const power = 1 + eff(c).extra.healPower / 100;
        for (const t of targets) heal(ctx, c, t, (t.maxHp * e.pctMaxHp * power) / 100);
        break;
      }
      case 'shield': {
        const pool = alive(allies(ctx, c));
        const targets = e.target === 'party' ? pool : [pool.reduce((a, b) => (pctOf(a) <= pctOf(b) ? a : b))];
        const power = 1 + eff(c).extra.healPower / 100;
        for (const t of targets) {
          const amount = Math.round((t.maxHp * e.pctMaxHp * power) / 100);
          const cur = t.buffs.find((b) => b.id === 'shield');
          // 기존 보호막보다 클 때만 갱신
          if (!cur || (cur.shield ?? 0) < amount) addBuff(t, { id: 'shield', label: sk.name, mods: [], turns: e.turns, shield: amount });
        }
        ctx.log.push({ t: 'status', to: e.target === 'party' ? '아군 전체' : targets[0]?.name ?? '', status: 'buff', label: `${sk.name} (보호막)` });
        break;
      }
      case 'buff': {
        const targets = e.target === 'self' ? [c] : alive(allies(ctx, c));
        for (const t of targets) addBuff(t, { id: sk.id, label: sk.name, mods: e.mods, turns: e.turns, flag: e.flag });
        if (!sk.effects.some((x) => x.type === 'taunt')) ctx.log.push({ t: 'status', to: e.target === 'self' ? c.name : '아군 전체', status: 'buff', label: sk.name });
        break;
      }
      case 'debuff': {
        const targets = e.target === 'all' ? alive(foes(ctx, c)) : [singleTarget ?? (singleTarget = pickFoe(ctx, c))].filter(Boolean) as Combatant[];
        for (const t of targets) {
          if (e.mods.length) addBuff(t, { id: sk.id, label: sk.name, mods: e.mods, turns: e.turns });
          if (e.status) applyStatus(ctx, c, t, e.status);
        }
        if (e.mods.length) ctx.log.push({ t: 'status', to: e.target === 'all' ? (c.side === 'party' ? '적 전체' : '아군 전체') : targets[0]?.name ?? '', status: 'debuff', label: sk.name });
        break;
      }
      case 'taunt':
        c.taunt = e.turns;
        ctx.log.push({ t: 'status', to: c.name, status: 'taunt', label: '도발' });
        break;
      case 'summon': {
        const def = MONSTERS[e.monsterId];
        const summoned: Combatant[] = [];
        for (let i = 0; i < e.count; i++) {
          const m = fromMonster(def, ctx.floor);
          ctx.enemies.push(m);
          summoned.push(m);
        }
        nameUnique(ctx.enemies);
        ctx.log.push({ t: 'summon', who: c.name, summoned: summoned.map(snap) });
        break;
      }
    }
  }
}

function addBuff(t: Combatant, b: Buff) {
  t.buffs = t.buffs.filter((x) => x.id !== b.id);
  t.buffs.push({ ...b });
}

function applyStatus(ctx: BattleContext, src: Combatant, t: Combatant, s: { type: StatusType; turns: number; chance: number }) {
  if (!t.alive || !ctx.rng.chance(s.chance)) return;
  if (s.type === 'stun' && t.tags.has('boss')) return; // 보스 기절 면역
  const st = eff(src).stats;
  const power = s.type === 'poison' ? st.atk * 0.35 : s.type === 'burn' ? Math.max(st.mag, st.atk) * 0.35 : 0;
  t.status[s.type] = { turns: s.turns, power };
  const label = { poison: '독', burn: '화상', stun: '기절' }[s.type];
  ctx.log.push({ t: 'status', to: t.name, status: s.type, label });
}

// ───────── 데미지 / 회복 ─────────
/** 방어 비율 감소: 피해 × K/(K+방어), K = 공격자 레벨 기준 방어력 × DEF_K */
export const DEF_K = 1.2;
export const defRef = (level: number) => 7 + 1.84 * (level - 1);
export const mitigation = (def: number, level: number) => { const k = DEF_K * defRef(level); return k / (k + Math.max(0, def)); };
function dealDamage(ctx: BattleContext, a: Combatant, t: Combatant, e: Extract<SkillEffect, { type: 'damage' }>, isNormal: boolean) {
  const { rng, log } = ctx;
  const sa = eff(a), st = eff(t);
  const scaleVal = e.scale === 'atk' ? sa.stats.atk : e.scale === 'mag' ? sa.stats.mag : sa.stats.atk + sa.stats.mag;
  let raw = scaleVal * e.power * (1 + (isNormal ? sa.extra.normalDmg : sa.extra.skillDmg) / 100);
  if (sa.extra.physDmg && e.scale !== 'mag') raw *= 1 + (e.scale === 'atk' ? sa.extra.physDmg : sa.extra.physDmg / 2) / 100;
  if (e.undeadBonus && (t.tags.has('undead') || t.tags.has('demon'))) raw *= 1 + e.undeadBonus;
  if (sa.extra.bossDmg && (t.tags.has('boss') || t.tags.has('elite'))) raw *= 1 + sa.extra.bossDmg / 100;
  if (sa.extra.raidDmg && t.tags.has('raid')) raw *= 1 + sa.extra.raidDmg / 100;
  const pierceDef = 1 - Math.min(80, sa.extra.defPierce) / 100, pierceRes = 1 - Math.min(80, sa.extra.resPierce) / 100;
  const defVal = e.scale === 'atk' ? st.stats.def * pierceDef : e.scale === 'mag' ? st.stats.res * pierceRes : (st.stats.def * pierceDef + st.stats.res * pierceRes) / 2;

  // 회피
  const evade = Math.min(50, st.extra.evade + t.evadeBase + Math.max(0, (st.stats.agi - sa.stats.agi) * 0.3));
  const sure = e.guaranteedCrit || (a.passives.has('skyBow') && !a.flags.firstHitDone);
  if (!sure && rng.chance(evade)) {
    log.push({ t: 'evade', from: a.name, to: t.name });
    return;
  }
  // 파티원이 맞을 때: 방어·마저 비율 감소 (몬스터 레벨 기준) / 몬스터가 맞을 때: 기존 차감식
  let dmg = (t.side === 'party' || (ctx.pvp && t.char) ? raw * mitigation(defVal, a.lvl ?? a.char?.level ?? 1) * (a.dmgComp ?? 1) : Math.max(raw * 0.15, raw - defVal * 0.5)) * rng.range(0.9, 1.1);
  if (ctx.pvp) dmg *= PVP_DMG;
  const crit = sure || rng.chance(sa.stats.crit + (e.critBonus ?? 0));
  a.flags.firstHitDone = true;
  if (crit) dmg *= 1.5 + sa.extra.critDmg;
  dmg *= Math.max(0.2, 1 + st.extra.dmgTaken / 100);
  if (e.scale === 'mag') dmg *= Math.max(0.3, 1 + st.extra.magTaken / 100);
  // 결계: 다른 적이 살아있으면 피해 -70%
  const bw = t.passives.has('bulwark') && alive(allies(ctx, t)).some((x) => x !== t);
  if (bw) dmg *= 0.3;
  ctx.hit = { mag: e.scale === 'mag' || (e.scale !== 'atk' && a.attackScale === 'mag'), bulwark: bw };
  dmg = Math.max(1, Math.round(dmg));

  const dealt = applyHpLoss(ctx, t, dmg, a, crit);
  ctx.hit = undefined;
  if (!t.alive && a.alive && a.passives.has('soulHarvest')) a.mp = Math.min(a.maxMp, a.mp + a.maxMp * 0.1);
  if (e.lifestealPct && a.alive && dealt > 0) heal(ctx, a, a, (dealt * e.lifestealPct) / 100);
  if (e.status && t.alive) applyStatus(ctx, a, t, e.status);
}

/** 피해 적용 (마나 실드·최후의 방벽·불굴·반사·부활 처리). 실제 깎인 HP 반환 */
function applyHpLoss(ctx: BattleContext, t: Combatant, dmg: number, src: Combatant | null, crit = false): number {
  const { log } = ctx;
  // 최후의 방벽: 아군이 쓰러질 공격을 대신 맞음
  if (src && (t.side === 'party' || (ctx.pvp && t.char)) && dmg >= t.hp) {
    const guard = alive(allies(ctx, t)).find((g) => g !== t && g.passives.has('lastBastion') && (g.flags.bastionLeft ?? 0) > 0 && g.hp > dmg);
    if (guard) {
      guard.flags.bastionLeft!--;
      log.push({ t: 'special', who: guard.name, text: `최후의 방벽! ${t.name} 대신 공격을 받아낸다` });
      t = guard;
    }
  }
  // 보호막
  const sh = t.buffs.find((b) => b.id === 'shield' && (b.shield ?? 0) > 0);
  if (sh && dmg > 0) {
    const absorbed = Math.min(sh.shield!, dmg);
    sh.shield! -= absorbed;
    dmg -= absorbed;
    if (ctx.rep && t.side === 'party') { const m = memberOf(ctx.rep, t.id); if (m) m.shielded += absorbed; }
    if (sh.shield! <= 0) t.buffs = t.buffs.filter((b) => b !== sh);
    if (sh.shield! <= 0 || dmg <= 0) log.push({ t: 'special', who: t.name, text: sh.shield! <= 0 ? `보호막이 ${Math.round(absorbed)} 피해를 막고 깨졌다` : `보호막이 ${Math.round(absorbed)} 피해를 모두 막았다` });
  }
  // 마나 실드
  if (t.buffs.some((b) => b.flag === 'manaShield') && t.mp > 0) {
    const absorbed = Math.min(t.mp, dmg);
    t.mp -= absorbed;
    dmg -= absorbed;
    if (absorbed) log.push({ t: 'special', who: t.name, text: `마나 실드가 ${Math.round(absorbed)} 피해를 흡수` });
  }
  const before = t.hp;
  t.hp -= dmg;
  if (ctx.rep) record(ctx, ctx.rep, t, src, Math.max(0, Math.min(before, dmg)));
  if (src) log.push({ t: 'damage', from: src.name, to: t.name, amount: dmg, crit, hpLeft: Math.max(0, Math.round(t.hp)), maxHp: t.maxHp });

  if (t.hp <= 0) {
    if (t.passives.has('endure') && !t.flags.endureUsed) {
      t.flags.endureUsed = true; t.hp = 1;
      log.push({ t: 'special', who: t.name, text: '불굴! HP 1로 버텨낸다' });
    } else if (t.passives.has('immortalWill') && !t.flags.immortalUsed) {
      t.flags.immortalUsed = true; t.hp = Math.round(t.maxHp * 0.3);
      log.push({ t: 'special', who: t.name, text: '불사의 의지! 다시 일어선다' });
    } else {
      t.hp = 0; t.alive = false;
      log.push({ t: 'death', who: t.name, side: t.side });
      if (ctx.rep && t.side === 'party') recordDeath(ctx, ctx.rep, t, src);
      const reviver = alive(allies(ctx, t)).find((r) => r.passives.has('revive') && !r.flags.reviveUsed);
      if (reviver && (t.side === 'party' || (ctx.pvp && t.char))) {
        reviver.flags.reviveUsed = true;
        t.alive = true; t.hp = Math.round(t.maxHp * 0.3); t.status = {};
        log.push({ t: 'special', who: reviver.name, text: `부활! ${t.name}이(가) 다시 일어선다` });
      }
    }
  }
  // 방패 반격
  if (src && src.alive && src !== t && t.passives.has('reflect30') && dmg > 0) {
    // 받은 피해의 30%, 단 공격자 최대 HP의 12%까지 (강한 딜러가 스스로 죽지 않게)
    const r = Math.max(1, Math.round(Math.min(dmg * 0.3, src.maxHp * 0.12)));
    log.push({ t: 'special', who: t.name, text: `방패 반격! ${src.name}에게 ${r} 피해` });
    applyHpLoss(ctx, src, r, null);
  }
  return Math.max(0, before - Math.max(0, t.hp));
}

function heal(ctx: BattleContext, src: Combatant, t: Combatant, amount: number) {
  if (!t.alive) return;
  if (ctx.pvp) amount *= PVP_HEAL;
  const v = Math.round(Math.min(amount, t.maxHp - t.hp));
  t.hp += v;
  if (ctx.rep) {
    if (t.side === 'party' && src.side === 'party') { const m = memberOf(ctx.rep, src.id); if (m) m.healed += v; }
    else if (t.side === 'enemy' && src !== t && ctx.rep.cur) ctx.rep.cur.enemyHealed += v;
  }
  ctx.log.push({ t: 'heal', from: src.name, to: t.name, amount: v, hpLeft: Math.round(t.hp), maxHp: t.maxHp });
}

// ───────── 전투 리포트 기록 ─────────
const srcLabel = (ctx: BattleContext, src: Combatant | null) => {
  if (!src) return '중독·화상 (지속 피해)';
  const name = src.mdef?.name ?? src.name;
  return `${name} · ${ctx.cur?.c === src ? ctx.cur.label : '반격'}`;
};
function record(ctx: BattleContext, r: Report, t: Combatant, src: Combatant | null, dmg: number) {
  if (dmg <= 0) return;
  if (t.side === 'party') {
    const m = memberOf(r, t.id);
    if (m) { m.taken += dmg; if (src && ctx.hit?.mag) m.takenMag += dmg; }
    const k = srcLabel(ctx, src);
    r.hitters[k] = (r.hitters[k] ?? 0) + dmg;
  } else if (src && src.side === 'party') {
    const m = memberOf(r, src.id);
    if (m) m.dealt += dmg;
    if (r.cur) { r.cur.dealt += dmg; if (ctx.hit?.bulwark) r.cur.bulwarkDmg += dmg; }
  }
}
function recordDeath(ctx: BattleContext, r: Report, t: Combatant, src: Combatant | null) {
  const m = memberOf(r, t.id);
  if (m) m.deaths++;
  const k = srcLabel(ctx, src);
  r.killers[k] = (r.killers[k] ?? 0) + 1;
  if (!r.firstDeath) r.firstDeath = { name: t.name, by: k, round: ctx.round, floor: ctx.floor };
}
