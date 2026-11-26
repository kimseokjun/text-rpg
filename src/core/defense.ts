/**
 * 용병단 랜덤 디펜스: 판 안에서 코인으로 내 단원을 무작위 소환 → 같은 단원 2기 합성(★) → 30웨이브 버티기.
 * 순수 시뮬레이션 (방장 화면이 돌리고 상태를 나눠줌). 화면·네트워크와 무관.
 */
import { Rng } from './rng';
import type { BaseJob, Character, Modifier } from './types';
import { finalStats } from './stats';
import { JOBS } from '../data/jobs';
import { refStats } from '../data/monsters';

export type DDiff = 'easy' | 'normal' | 'hard';
export const D_DIFF: Record<DDiff, { name: string; grow: number; hp: number }> = {
  easy: { name: '쉬움', grow: 1.105, hp: 1.6 },
  normal: { name: '보통', grow: 1.12, hp: 2.4 },
  hard: { name: '어려움', grow: 1.135, hp: 2.8 },
};
export const D_WAVES = 30;
export const D_WAVE_SEC = 20;
export const D_BOSS_SEC = 60;
export const D_BOSS_HP = 35;
export const D_SPAWN = 30;          // 웨이브당 일반 적 수
export const D_COLS = 6, D_ROWS = 3, D_SLOTS = D_COLS * D_ROWS;
export const D_TICK = 0.1;          // 초
export const D_MAX_STAR = 3;
export const D_GRADE_W = [0, 50, 30, 13, 5, 2]; // 일반~전설 소환 확률 %
export const D_START_COINS = 60;
export const summonCost = (n: number) => 20 + 5 * n;
export const jobUpCost = (lv: number) => 40 + 40 * lv;
export const STAR_MULT = [0, 1, 2.2, 4.8];
export const isBossWave = (w: number) => w % 10 === 0;
export const dLimit = (players: number) => 100 + 50 * (players - 1);

/** 소환 풀 한 칸: 내 단원 하나의 판 안 성능 */
export interface DDef {
  key: string; owner: string; name: string; base: BaseJob; jobId: string; grade: number; level: number;
  dmg: number; agi: number; crit: number; critDmg: number; unique: string | null;
}
export interface DUnit { id: number; owner: string; key: string; star: number; slot: number; cd: number; sk: number }
export interface DEnemy { id: number; hp: number; max: number; d: number; spd: number; boss: boolean; slow: number; stun: number }
export interface DPlayer { id: string; name: string; coins: number; summons: number; jobLv: Record<BaseJob, number>; pool: DDef[]; kills: number }
export type DFx = { k: 'shot' | 'aoe' | 'hit' | 'sum' | 'merge' | 'boss'; x: number; y: number; x2?: number; y2?: number; b?: BaseJob; t: number };
export interface DState {
  diff: DDiff; t: number; wave: number; waveT: number; spawned: number; phase: 'run' | 'win' | 'lose'; why?: string;
  players: DPlayer[]; units: DUnit[]; enemies: DEnemy[]; nextId: number; ref: number; fx: DFx[]; seed: number; bossAt: number;
}

/** 등급별 기본 위력 (일반~전설) */
export const D_GRADE_POW = [0, 100, 125, 160, 210, 280];
/** 같은 레벨 표준 장비 단원의 주 스탯 (장비·전직이 표준보다 좋으면 더 셈) */
const stdMain = (lv: number) => refStats(lv).atk * (lv <= 78 ? 1.5 + lv * 0.018 : 4.3) * 1.1;
/** 단원 → 판 안 성능: 등급 기본 위력 × 성장(레벨, 표준 대비 장비·전직 수준) */
export function toDef(owner: string, c: Character, shared: Modifier[] = []): DDef {
  const { stats, extra } = finalStats(c, shared);
  const base = JOBS[c.jobId].base;
  const main = base === 'warrior' || base === 'archer' ? stats.atk : base === 'priest' ? (stats.mag + stats.atk) / 2 : stats.mag;
  const gear = Math.sqrt(Math.min(1.8, Math.max(0.6, main / stdMain(c.level))));
  const grow = (1 + Math.min(120, c.level) / 100) * gear;
  return {
    key: `${owner}:${c.uid}`, owner, name: c.name, base, jobId: c.jobId, grade: c.grade, level: c.level,
    dmg: Math.round(D_GRADE_POW[c.grade] * grow), agi: stats.agi, crit: Math.min(60, stats.crit), critDmg: Math.min(3, 1.5 + (extra.critDmg ?? 0)), unique: c.uniqueTraitId,
  };
}

// ───────── 판 모양: 플레이어마다 6×3 판, 적은 바깥 테두리를 돈다 ─────────
export function dSize(n: number) { return { w: n * D_COLS + (n - 1) + 2, h: D_ROWS + 2 }; }
export function slotXY(st: DState, owner: string, slot: number) {
  const p = Math.max(0, st.players.findIndex((x) => x.id === owner));
  return { x: 1 + p * (D_COLS + 1) + (slot % D_COLS) + 0.5, y: 1 + Math.floor(slot / D_COLS) + 0.5 };
}
export function pathLen(st: DState) { const { w, h } = dSize(st.players.length); return 2 * (w - 1) + 2 * (h - 1); }
export function enemyXY(st: DState, d: number) {
  const { w, h } = dSize(st.players.length);
  const a = w - 1, b = h - 1, L = 2 * (a + b);
  let s = ((d % L) + L) % L;
  if (s < a) return { x: 0.5 + s, y: 0.5 };
  s -= a; if (s < b) return { x: 0.5 + a, y: 0.5 + s };
  s -= b; if (s < a) return { x: 0.5 + a - s, y: 0.5 + b };
  s -= a; return { x: 0.5, y: 0.5 + b - s };
}

const RANGE: Record<BaseJob, number> = { warrior: 2.3, archer: 4.2, mage: 3.4, priest: 2.6 };
const INTERVAL: Record<BaseJob, number> = { warrior: 1.0, archer: 0.6, mage: 1.4, priest: 1.2 };
const JOB_DMG: Record<BaseJob, number> = { warrior: 1.1, archer: 1, mage: 0.9, priest: 0.55 };

export function newDefense(players: { id: string; name: string; pool: DDef[] }[], diff: DDiff, seed = Date.now() % 1e9): DState {
  const ref = 100;
  return {
    diff, t: 0, wave: 1, waveT: 0, spawned: 0, phase: 'run', players: players.map((p) => ({ ...p, coins: D_START_COINS, summons: 0, jobLv: { warrior: 0, mage: 0, archer: 0, priest: 0 }, kills: 0 })),
    units: [], enemies: [], nextId: 1, ref, fx: [], seed, bossAt: 0,
  };
}
const rngOf = (st: DState) => { const r = new Rng(st.seed); st.seed = (st.seed * 1103515245 + 12345 + st.t * 7) % 2147483647; return r; };
const defOf = (st: DState, u: DUnit) => st.players.find((p) => p.id === u.owner)?.pool.find((d) => d.key === u.key);
const enemyHp = (st: DState, w: number) => Math.round(st.ref * 1.1 * D_DIFF[st.diff].hp * Math.pow(D_DIFF[st.diff].grow, w - 1) * (1 + 0.2 * (st.players.length - 1)));

// ───────── 플레이어 행동 ─────────
export type DAction = { a: 'summon' } | { a: 'merge'; u: number; v: number } | { a: 'sell'; u: number } | { a: 'up'; job: BaseJob } | { a: 'gift'; to: string; n: number } | { a: 'move'; u: number; slot: number } | { a: 'promote'; us: number[] } | { a: 'automerge' };
export function act(st: DState, who: string, x: DAction): string | null {
  if (st.phase !== 'run') return '게임이 끝났어요';
  const p = st.players.find((q) => q.id === who);
  if (!p) return '참가자가 아니에요';
  const mine = (id: number) => st.units.find((u) => u.id === id && u.owner === who);
  const freeSlot = () => { const used = new Set(st.units.filter((u) => u.owner === who).map((u) => u.slot)); for (let i = 0; i < D_SLOTS; i++) if (!used.has(i)) return i; return -1; };
  switch (x.a) {
    case 'summon': {
      const cost = summonCost(p.summons);
      if (p.coins < cost) return `코인이 부족해요 (${cost})`;
      const slot = freeSlot();
      if (slot < 0) return '판이 꽉 찼어요. 합성하거나 팔아주세요';
      const def = pickDef(rngOf(st), p.pool);
      if (!def) return '소환할 단원이 없어요';
      p.coins -= cost; p.summons++;
      const u: DUnit = { id: st.nextId++, owner: who, key: def.key, star: 1, slot, cd: 0, sk: 0 };
      st.units.push(u);
      const xy = slotXY(st, who, slot); st.fx.push({ k: 'sum', ...xy, t: st.t });
      return null;
    }
    case 'merge': {
      const a = mine(x.u), b = mine(x.v);
      if (!a || !b || a === b) return '합성할 단원을 골라주세요';
      if (a.key !== b.key || a.star !== b.star) return '같은 단원·같은 별끼리만 합성돼요';
      if (a.star >= D_MAX_STAR) return `★${D_MAX_STAR}은 승급 합성(★${D_MAX_STAR} 3기)으로 올려요`;
      b.star++; st.units = st.units.filter((u) => u !== a);
      const xy = slotXY(st, who, b.slot); st.fx.push({ k: 'merge', ...xy, t: st.t });
      return null;
    }
    case 'automerge': {
      let n = 0;
      for (let again = true; again;) {
        again = false;
        const list = st.units.filter((u) => u.owner === who && u.star < D_MAX_STAR).sort((a, b) => a.star - b.star);
        for (let i = 0; i < list.length && !again; i++) for (let j = i + 1; j < list.length; j++) if (list[i].key === list[j].key && list[i].star === list[j].star) { act(st, who, { a: 'merge', u: list[i].id, v: list[j].id }); n++; again = true; break; }
      }
      return n ? null : '합성할 짝이 없어요';
    }
    case 'promote': {
      const us = x.us.map(mine);
      if (us.length !== 3 || us.some((u) => !u) || new Set(x.us).size !== 3) return `★${D_MAX_STAR} 단원 3기를 골라주세요`;
      const ds = us.map((u) => defOf(st, u!));
      if (us.some((u) => u!.star !== D_MAX_STAR) || ds.some((d) => !d || d.grade !== ds[0]!.grade)) return `같은 등급 ★${D_MAX_STAR} 3기가 필요해요`;
      const up = p.pool.filter((d) => d.grade === ds[0]!.grade + 1);
      if (!up.length) return '한 단계 위 등급 단원이 없어요';
      const slot = us[0]!.slot;
      st.units = st.units.filter((u) => !us.includes(u));
      const def = rngOf(st).pick(up);
      st.units.push({ id: st.nextId++, owner: who, key: def.key, star: 1, slot, cd: 0, sk: 0 });
      const xy = slotXY(st, who, slot); st.fx.push({ k: 'merge', ...xy, t: st.t });
      return null;
    }
    case 'sell': {
      const u = mine(x.u);
      if (!u) return '팔 단원을 골라주세요';
      st.units = st.units.filter((v) => v !== u);
      p.coins += 10 * u.star;
      return null;
    }
    case 'move': {
      const u = mine(x.u);
      if (!u || x.slot < 0 || x.slot >= D_SLOTS) return '옮길 칸을 골라주세요';
      const other = st.units.find((v) => v.owner === who && v.slot === x.slot);
      if (other) other.slot = u.slot;
      u.slot = x.slot;
      return null;
    }
    case 'up': {
      const lv = p.jobLv[x.job];
      const cost = jobUpCost(lv);
      if (p.coins < cost) return `코인이 부족해요 (${cost})`;
      p.coins -= cost; p.jobLv[x.job] = lv + 1;
      return null;
    }
    case 'gift': {
      const to = st.players.find((q) => q.id === x.to);
      const n = Math.floor(x.n);
      if (!to || to === p || n <= 0) return '보낼 사람을 골라주세요';
      if (p.coins < n) return '코인이 부족해요';
      p.coins -= n; to.coins += n;
      return null;
    }
  }
  return null;
}
export function pickDef(rng: Rng, pool: DDef[]): DDef | null {
  if (!pool.length) return null;
  const grades = [...new Set(pool.map((d) => d.grade))];
  const g = rng.weighted(grades, (x) => D_GRADE_W[x] ?? 1);
  return rng.pick(pool.filter((d) => d.grade === g));
}

// ───────── 한 틱 진행 ─────────
export function step(st: DState) {
  if (st.phase !== 'run') return;
  const rng = rngOf(st);
  st.t += D_TICK; st.waveT += D_TICK;
  st.fx = st.fx.filter((f) => st.t - f.t < 0.5);
  const L = pathLen(st);
  const boss = isBossWave(st.wave);
  // 적 생성
  if (boss) {
    if (st.spawned === 0) {
      const hp = Math.round((enemyHp(st, st.wave) / (1 + 0.2 * (st.players.length - 1))) * D_BOSS_HP);
      st.enemies.push({ id: st.nextId++, hp, max: hp, d: 0, spd: 0.55, boss: true, slow: 0, stun: 0 });
      st.spawned = 1; st.bossAt = st.t;
      st.fx.push({ k: 'boss', x: 0.5, y: 0.5, t: st.t });
    }
  } else {
    const want = Math.min(D_SPAWN, Math.floor((st.waveT / (D_WAVE_SEC * 0.8)) * D_SPAWN));
    while (st.spawned < want) {
      const hp = enemyHp(st, st.wave);
      st.enemies.push({ id: st.nextId++, hp, max: hp, d: 0, spd: 1.1 + st.wave * 0.012, boss: false, slow: 0, stun: 0 });
      st.spawned++;
    }
  }
  // 이동
  for (const e of st.enemies) {
    if (e.stun > st.t) continue;
    e.d = (e.d + e.spd * (e.slow > st.t ? 0.6 : 1) * D_TICK) % (L * 1000);
  }
  // 공격
  const aura = new Map<number, number>();
  const globalAura = 1 + 0.05 * st.units.filter((u) => { const d = defOf(st, u); return d && (d.unique === '전장의 지휘관' || d.unique === '성녀의 가호'); }).length;
  for (const u of st.units) {
    const d = defOf(st, u);
    if (d?.base !== 'priest') continue;
    for (const v of st.units) if (v.owner === u.owner && v !== u && Math.abs((v.slot % D_COLS) - (u.slot % D_COLS)) <= 1 && Math.abs(Math.floor(v.slot / D_COLS) - Math.floor(u.slot / D_COLS)) <= 1) aura.set(v.id, Math.max(aura.get(v.id) ?? 1, 1 + 0.15 * u.star));
  }
  const pos = new Map(st.enemies.map((e) => [e.id, enemyXY(st, e.d)]));
  for (const u of st.units) {
    u.cd -= D_TICK; u.sk -= D_TICK;
    if (u.cd > 0) continue;
    const d = defOf(st, u); if (!d) continue;
    const p = st.players.find((q) => q.id === u.owner)!;
    const at = slotXY(st, u.owner, u.slot);
    const r = RANGE[d.base];
    let tgt: DEnemy | null = null, best = -1;
    for (const e of st.enemies) {
      if (e.hp <= 0) continue;
      const q = pos.get(e.id)!;
      if (Math.hypot(q.x - at.x, q.y - at.y) > r) continue;
      const pr = (e.boss ? 1e9 : 0) + e.d;
      if (pr > best) { best = pr; tgt = e; }
    }
    if (!tgt) continue;
    u.cd = INTERVAL[d.base] / (1 + Math.min(0.6, d.agi / 400));
    let dmg = d.dmg * JOB_DMG[d.base] * STAR_MULT[u.star] * (1 + 0.1 * p.jobLv[d.base]) * (aura.get(u.id) ?? 1) * globalAura;
    if (d.grade === 5 && d.unique !== '전장의 지휘관' && d.unique !== '성녀의 가호') dmg *= 1.3;
    if (d.base === 'archer' && tgt.boss) dmg *= 1.3;
    if (rng.chance(d.crit)) dmg *= d.critDmg;
    const tq = pos.get(tgt.id)!;
    st.fx.push({ k: 'shot', x: at.x, y: at.y, x2: tq.x, y2: tq.y, b: d.base, t: st.t });
    const hitOne = (e: DEnemy, v: number) => { if (e.hp <= 0) return; e.hp -= v; if (e.hp <= 0) kill(st, e, p, d); };
    if (d.base === 'mage') {
      const skill = u.sk <= 0;
      if (skill) u.sk = 6;
      const rad = skill ? 1.6 : 0.9, mult = skill ? 3 : 1;
      for (const e of st.enemies) { const q = pos.get(e.id)!; if (Math.hypot(q.x - tq.x, q.y - tq.y) <= rad) hitOne(e, dmg * (e === tgt ? 1 : 0.7) * mult); }
      st.fx.push({ k: 'aoe', x: tq.x, y: tq.y, x2: rad, t: st.t });
    } else {
      hitOne(tgt, dmg);
      if (d.base === 'warrior') { tgt.slow = st.t + 1; if (rng.chance(8 + 2 * u.star) && !tgt.boss) tgt.stun = st.t + 0.6; }
    }
  }
  st.enemies = st.enemies.filter((e) => e.hp > 0);
  // 승패
  const limit = dLimit(st.players.length);
  if (st.enemies.length > limit) { st.phase = 'lose'; st.why = `적이 ${limit}마리를 넘었어요`; return; }
  if (boss) {
    const alive = st.enemies.some((e) => e.boss);
    if (!alive) {
      for (const p of st.players) p.coins += 50;
      if (st.wave >= D_WAVES) { st.phase = 'win'; return; }
      nextWave(st);
    } else if (st.t - st.bossAt > D_BOSS_SEC) { st.phase = 'lose'; st.why = `${st.wave}웨이브 보스를 ${D_BOSS_SEC}초 안에 못 잡았어요`; }
  } else if (st.waveT >= D_WAVE_SEC) nextWave(st);
}
function nextWave(st: DState) {
  for (const p of st.players) p.coins += 10 + st.wave;
  st.wave++; st.waveT = 0; st.spawned = 0;
}
function kill(st: DState, e: DEnemy, p: DPlayer, d: DDef) {
  p.kills++;
  p.coins += (e.boss ? 0 : 1) + (d.unique === '황금손' ? 1 : 0);
}
export const bossLeft = (st: DState) => (isBossWave(st.wave) ? Math.max(0, D_BOSS_SEC - (st.t - st.bossAt)) : 0);

/** 자동 플레이 (밸런스 시뮬레이션용): 소환 → 합성 → 남으면 직업 강화 */
export function autoPlay(st: DState, who: string) {
  const p = st.players.find((q) => q.id === who)!;
  for (let k = 0; k < 6; k++) {
    if (act(st, who, { a: 'summon' }) === null) continue;
    if (act(st, who, { a: 'automerge' }) === null) continue;
    const s3 = st.units.filter((u) => u.owner === who && u.star === D_MAX_STAR);
    const byG = new Map<number, DUnit[]>();
    for (const u of s3) { const g = defOf(st, u)?.grade ?? 0; byG.set(g, [...(byG.get(g) ?? []), u]); }
    const trio = [...byG.values()].find((l) => l.length >= 3);
    if (trio && act(st, who, { a: 'promote', us: trio.slice(0, 3).map((u) => u.id) }) === null) continue;
    const jobs = [...new Set(st.units.filter((u) => u.owner === who).map((u) => defOf(st, u)!.base))];
    const j = jobs.sort((a, b) => p.jobLv[a] - p.jobLv[b])[0];
    if (j && p.coins > jobUpCost(p.jobLv[j]) + summonCost(p.summons) && act(st, who, { a: 'up', job: j }) === null) continue;
    break;
  }
}
