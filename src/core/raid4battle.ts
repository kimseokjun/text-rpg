/** 4인 레이드 전투: 한 차례씩 진행 (방장 화면이 돌리고 결과를 방송) */
import { MONSTERS } from '../data/monsters';
import { R4, R4_BOSSES, R4_ROUNDS, type R4BossId, type R4Diff } from '../data/raid4';
import { addBuff, applyHpLoss, dealDamage, defRef, eff, endRound, fromCharacter, fromMonster, heal, nameUnique, pickFoe, skillInterrupt, snap, startRound, takeTurn, usableSkills, type BattleContext, type Combatant } from './combat';
import { SKILLS } from '../data/skills';
import { Rng } from './rng';
import { partyMods } from './stats';
import type { BattleEvent, Character, Modifier, RaidFx } from './types';

export interface R4Member { owner: string; ownerName: string; char: Character; mods: Modifier[] }
/** 보스 기준: 1인 전투력 BASE_POWER 파티를 상대로 맞춘 능력치를 난이도 배율(k)로 키움 */
export const R4_BASE_POWER = 125000;
export const R4_TUNE = { hp: 2.4, dmg: 13 };
/** 받는 치유 배율 · 소프트 광폭(이 라운드부터 매 라운드 보스 공격 +%) */
export const R4_PRESSURE = { heal: 0.6, enrageFrom: 12, enragePerRound: 10 };
/** 전투력은 능력치보다 빠르게 커져서 보스는 지수 0.68로 키움 */
export let R4_K_EXP = 0.68;
export const setR4Exp = (v: number) => { R4_K_EXP = v; };
const BOSS_FLOOR = 70;
/** 얼음 감옥은 이 라운드 수가 지나면 녹아서 풀림 */
const PRISON_ROUNDS = 2;

export interface R4Unit { id: string; name: string; owner?: string; ownerName?: string; jobId?: string; mid?: string; hp: number; maxHp: number; mp: number; maxMp: number; alive: boolean; boss?: boolean; frozen?: boolean; cos?: Character['cos'] }
export type WipeKind = 'interrupt' | 'dodge' | 'shield';
export interface R4BossState { id: R4BossId; phase: number; cast: { name: string; kind: WipeKind; left: number; gauge: number; max: number } | null; groggy: number; mark: string | null; enraged: boolean }
/** 회피 타임 (절대영도): 방장이 시드·단계를 정해 모두에게 보내고, 각자 맞은 횟수를 돌려받음 */
export interface R4Dodge { seed: number; level: number; owners: string[] }
export interface R4State { round: number; turn: string | null; order: string[]; units: R4Unit[]; over: boolean; win: boolean; dealt: number; maxHp: number; boss?: R4BossState; dodge?: R4Dodge | null }

// ───────── 보스 기믹 ─────────
/** 페이즈: HP 70% · 40% · 15% 아래로 내려갈 때 넘어가며 바로 전멸기 시전 */
const PHASE_AT = [100, 70, 40, 15];
/** 전멸기: 시전 2턴. 끊기 게이지·보호막 크기(보스 최대 HP %)·주기(보스 턴)는 페이즈별 */
export const WIPE = { castTurns: 2, gauge: [0, 0, 100, 120, 150], shieldPct: [0, 0, 7, 8, 9], every: [0, 99, 5, 4, 3], hpPct: 150, dodgeHitPct: 35, afkHits: 3 };
type Pat = 'smash' | 'breath' | 'mark' | 'summon' | 'curse' | 'blizzard' | 'prison' | 'drain' | 'bats' | 'bleed';
const ROT: Record<R4BossId, Pat[][]> = {
  abaddon: [[], ['smash', 'breath', 'mark', 'smash', 'summon'], ['smash', 'curse', 'mark', 'breath', 'summon'], ['breath', 'mark', 'smash', 'curse', 'summon', 'smash'], ['breath', 'smash', 'mark', 'breath']],
  frost: [[], ['smash', 'blizzard', 'prison', 'smash', 'blizzard'], ['smash', 'prison', 'blizzard', 'smash', 'blizzard'], ['blizzard', 'prison', 'smash', 'blizzard', 'smash'], ['blizzard', 'smash', 'prison', 'blizzard']],
  blood: [[], ['drain', 'breath', 'bats', 'drain', 'bleed'], ['drain', 'bleed', 'bats', 'breath', 'drain'], ['breath', 'bats', 'drain', 'bleed', 'drain'], ['drain', 'breath', 'drain', 'bats']],
};
const PAT_NAME: Record<Pat, Record<R4BossId, string>> = {
  smash: { abaddon: '심연 강타', frost: '서리 강타', blood: '심연 강타' },
  breath: { abaddon: '공허의 숨결', frost: '눈보라', blood: '핏빛 파도' },
  mark: { abaddon: '심연의 표식', frost: '심연의 표식', blood: '심연의 표식' },
  summon: { abaddon: '사도 소환', frost: '사도 소환', blood: '사도 소환' },
  curse: { abaddon: '부식의 저주', frost: '부식의 저주', blood: '부식의 저주' },
  blizzard: { abaddon: '눈보라', frost: '눈보라', blood: '눈보라' },
  prison: { abaddon: '얼음 감옥', frost: '얼음 감옥', blood: '얼음 감옥' },
  drain: { abaddon: '흡혈 일격', frost: '흡혈 일격', blood: '흡혈 일격' },
  bats: { abaddon: '박쥐 떼', frost: '박쥐 떼', blood: '박쥐 떼' },
  bleed: { abaddon: '출혈', frost: '출혈', blood: '출혈' },
};
export const BOSS_PAT = { smash: 2.4, breath: 0.85, blizzard: 0.8, blizzardStun: 12, drain: 2.0, drainHeal: 50, markPct: 60, cursePct: 5, adds: 2, bats: 3, addHpPct: 2.5, batHpPct: 1.4, prisonHpPct: 2.2, enragePct: 30, groggyDmg: 50 };

export function makeR4Boss(diff: R4Diff, tune = R4_TUNE, bossId: R4BossId = 'abaddon'): Combatant {
  const def = R4_BOSSES[bossId];
  const k = Math.pow(R4[diff].power / R4_BASE_POWER, R4_K_EXP);
  const b = fromMonster(MONSTERS.abyssKing, BOSS_FLOOR);
  const base = { ...b.base };
  // 공격 기준 능력치를 보스에 맞게 (아바돈 = 마력, 나머지 = 공격력)
  const strong = Math.max(base.atk, base.mag);
  const bossHp = { abaddon: 1, frost: 0.97, blood: 0.94 }[bossId];
  b.base = { ...base, hp: base.hp * k * tune.hp * bossHp, atk: strong * k * tune.dmg, mag: strong * k * tune.dmg, def: base.def * k, res: base.res * k };
  b.maxHp = b.hp = Math.round(b.base.hp);
  b.attackScale = def.attackScale;
  b.name = def.name;
  b.mdef = { ...MONSTERS.abyssKing, id: def.sprite, name: def.name, tags: ['boss', 'raid', ...def.tags] as typeof MONSTERS.abyssKing.tags };
  b.tags = new Set(['boss', 'raid', ...def.tags]);
  // 방어 비율 계산 기준 레벨도 같이 올려 파티 방어력이 커진 만큼 피해가 줄지 않게
  b.lvl = Math.round(1 + (defRef(b.lvl ?? 70) * k - 7) / 1.84);
  b.dmgComp = 1;
  // 누적 광폭 대신 페이즈·광폭화 기믹으로
  b.passives.delete('rampage');
  return b;
}

export class Raid4Battle {
  ctx: BattleContext;
  boss: Combatant;
  owners: Record<string, { owner: string; ownerName: string }> = {};
  order: Combatant[] = [];
  idx = 0;
  over = false;
  win = false;
  cursor = 0; // 로그 방송 위치
  // 보스 기믹 상태
  phase = 1;
  cast: R4BossState['cast'] = null;
  groggy = 0;
  mark: Combatant | null = null;
  enraged = false;
  sinceWipe = 0;
  rot = 0;
  /** 얼음 감옥: 갇힌 파티원 id → 감옥 */
  prisons = new Map<string, Combatant>();
  /** 감옥이 생긴 라운드 · 직전에 갇혔던 사람 (연속 지목 금지) */
  prisonAt = new Map<string, number>();
  lastPrisoner: string | null = null;
  /** 회피 타임 진행 중이면 결과가 올 때까지 멈춤 */
  dodge: R4Dodge | null = null;
  /** 자동 선택 때 끊기 스킬을 쓸 확률 % (사람이 자리 비웠을 때) */
  autoInterrupt = 70;
  /** 시뮬레이션: 회피 타임에 맞는 평균 횟수 */
  simDodgeHits = 1;

  constructor(members: R4Member[], readonly diff: R4Diff, seed: number, tune = R4_TUNE, readonly bossId: R4BossId = 'abaddon') {
    const shared = partyMods(members.map((m) => m.char));
    const party = members.map((m) => {
      const c = fromCharacter(m.char, [...shared, ...m.mods]);
      c.id = `${m.owner.slice(0, 8)}_${c.id}`;
      this.owners[c.id] = { owner: m.owner, ownerName: m.ownerName };
      return c;
    });
    // 이름이 겹치면 주인 이름을 붙임 (기록·체력바가 이름 기준)
    const seen = new Set<string>();
    for (const c of party) { if (seen.has(c.name)) c.name = `${c.name}(${this.owners[c.id].ownerName})`; seen.add(c.name); }
    this.boss = makeR4Boss(diff, tune, bossId);
    this.ctx = { rng: new Rng(seed), log: [], party, enemies: [this.boss], round: 0, hasBoss: true, floor: BOSS_FLOOR, maxRounds: R4_ROUNDS, partyHealMult: R4_PRESSURE.heal };
    const def = R4_BOSSES[bossId];
    this.ctx.log.push({ t: 'wave', floor: 0, wave: 1, enemies: [snap(this.boss)], elite: false, boss: true });
    this.ctx.log.push({ t: 'special', who: this.boss.name, text: `${def.greet} (${R4[diff].name} · ${R4_ROUNDS}라운드 안에 쓰러뜨려라)` });
    const how = { interrupt: '기절·침묵 스킬로 무력화 게이지를 깎아 끊으세요!', dodge: '회피 타임에 직접 캐릭터를 움직여 얼음을 피하세요! (↑ 점프 · ↓ 숙이기 · ←→ 이동)', shield: '피의 보호막을 2턴 안에 깨세요! 딜을 몰아주세요' }[def.wipe.kind];
    this.fx('phase', `HP 70%·40%·15%마다 전멸기 「${def.wipe.name}」. ${how}`);
    this.nextRound();
  }

  get def() { return R4_BOSSES[this.bossId]; }
  private alive = (l: Combatant[]) => l.filter((c) => c.alive);
  private nextRound() {
    this.ctx.round++;
    if (this.ctx.round > R4_ROUNDS) return this.finish(false);
    // 소프트 광폭: 오래 끌수록 보스가 점점 강해짐
    const over = this.ctx.round - R4_PRESSURE.enrageFrom + 1;
    if (over > 0 && R4_PRESSURE.enragePerRound > 0) {
      const v = over * R4_PRESSURE.enragePerRound;
      this.boss.buffs = this.boss.buffs.filter((x) => x.id !== 'fury');
      addBuff(this.boss, { id: 'fury', label: `분노 +${v}%`, mods: [{ key: 'atk', kind: 'pct', value: v }, { key: 'mag', kind: 'pct', value: v }], turns: 999 });
      if (over === 1) this.fx('enrage', `${this.boss.name}이(가) 점점 분노한다! (${R4_PRESSURE.enrageFrom}라운드부터 매 라운드 공격 +${R4_PRESSURE.enragePerRound}%)`);
    }
    this.order = startRound(this.ctx);
    this.releasePrisons();
    this.idx = 0;
    this.skipDead();
  }
  private skipDead() {
    while (this.idx < this.order.length && !this.order[this.idx].alive) this.idx++;
    if (this.idx >= this.order.length && !this.over) {
      endRound(this.ctx);
      if (this.check()) return;
      this.nextRound();
    }
  }
  private check() {
    if (!this.boss.alive) { this.finish(true); return true; }
    if (!this.alive(this.ctx.party).length) { this.finish(false); return true; }
    return false;
  }
  private finish(win: boolean) {
    if (this.over) return;
    this.over = true; this.win = win;
    this.ctx.log.push({ t: 'result', win, rounds: Math.min(this.ctx.round, R4_ROUNDS) });
  }
  /** 지금 차례인 캐릭터 (회피 타임 중엔 없음) */
  get current(): Combatant | null { return this.over || this.dodge ? null : this.order[this.idx] ?? null; }
  /** 지금 차례가 사람이 고를 차례인가 (파티원, 살아있고 기절·감옥 아님) */
  get needsChoice() { const c = this.current; return !!c && c.side === 'party' && c.alive && !c.status.stun && !this.frozen(c); }
  ownerOf(c: Combatant) { return this.owners[c.id]?.owner; }
  skillsOf(c: Combatant) { return usableSkills(this.ctx, c); }
  private frozen(c: Combatant) { const p = this.prisons.get(c.id); return !!p && p.alive; }
  /** 한 차례 진행. choice = 스킬 id / 'attack' / undefined(자동) */
  step(choice?: string) {
    const c = this.current;
    if (!c) return;
    if (c === this.boss) { if (c.alive) this.bossTurn(); }
    else if (c.tags.has('prison')) { /* 얼음 감옥은 행동하지 않음 */ }
    else if (c.alive && this.frozen(c)) this.ctx.log.push({ t: 'stunned', who: c.name });
    else if (c.alive) {
      // 자리 비움(자동)이어도 끊기 시전 중이면 끊기 스킬을 먼저 시도
      if (choice === undefined && this.cast?.kind === 'interrupt' && c.side === 'party' && this.ctx.rng.chance(this.autoInterrupt)) {
        const cut = usableSkills(this.ctx, c).filter((k) => k.ok && k.interrupt > 0).sort((a, b) => b.interrupt - a.interrupt)[0];
        if (cut) choice = cut.skillId;
      }
      const before = this.ctx.log.length;
      takeTurn(this.ctx, c, choice);
      if (c.side === 'party') { this.checkInterrupt(c, before); this.checkShield(); }
    }
    this.releasePrisons();
    this.idx++;
    if (this.check()) return;
    this.skipDead();
  }
  private fx(kind: RaidFx, text: string, extra: { target?: string; value?: number } = {}) { this.ctx.log.push({ t: 'raid', kind, text, who: this.boss.name, ...extra }); }
  private stagger(text: string) {
    this.cast = null; this.sinceWipe = 0; this.groggy = 1;
    addBuff(this.boss, { id: 'groggy', label: '그로기', mods: [{ key: 'dmgTaken', kind: 'flat', value: BOSS_PAT.groggyDmg }], turns: 2 });
    this.fx('break', `${text} ${this.boss.name}이(가) 휘청인다 (다음 행동 불가 · 받는 피해 +${BOSS_PAT.groggyDmg}%)`);
  }
  /** 파티원이 방금 쓴 스킬로 시전 게이지 깎기 (끊기형) */
  private checkInterrupt(c: Combatant, from: number) {
    if (this.cast?.kind !== 'interrupt' || !this.boss.alive) return;
    const used = this.ctx.log.slice(from).find((e) => e.t === 'skill' && e.actor === c.name) as { skill: string } | undefined;
    if (!used) return;
    const sk = c.slots.map((s) => SKILLS[s.skillId]).find((s) => s?.name === used.skill);
    const v = sk ? skillInterrupt(sk) : 0;
    if (!v) return;
    this.cast.gauge = Math.max(0, this.cast.gauge - v);
    this.fx('interrupt', `${c.name}의 ${sk!.name}! 무력화 게이지 -${v} (${this.cast.gauge}/${this.cast.max})`, { target: c.name, value: this.cast.gauge });
    if (this.cast.gauge <= 0) this.stagger('무력화 성공!');
  }
  /** 보호막형: 보스 보호막이 다 깨졌으면 그로기 */
  private checkShield() {
    if (this.cast?.kind !== 'shield' || !this.boss.alive) return;
    const sh = this.boss.buffs.find((b) => b.id === 'shield');
    const left = Math.max(0, Math.round(sh?.shield ?? 0));
    if (left !== this.cast.gauge) { this.cast.gauge = left; this.fx('interrupt', `피의 보호막 ${left}/${this.cast.max}`, { value: left }); }
    if (left <= 0) this.stagger('피의 보호막이 깨졌다!');
  }
  /** 감옥이 부서지면 풀어줌 */
  private releasePrisons() {
    for (const [id, p] of this.prisons) {
      const c = this.ctx.party.find((x) => x.id === id);
      // 정화로 풀렸거나 · 2라운드가 지나 녹았으면 감옥도 사라짐
      const cleansed = p.alive && c && !c.tags.has('frozen');
      const melted = p.alive && this.ctx.round - (this.prisonAt.get(id) ?? this.ctx.round) >= PRISON_ROUNDS;
      if (cleansed || melted) { p.alive = false; p.hp = 0; }
      if (p.alive) continue;
      this.prisons.delete(id); this.prisonAt.delete(id);
      c?.tags.delete('frozen');
      if (c?.alive) this.fx('summon', cleansed ? `정화의 빛! ${c.name}이(가) 얼음 감옥에서 풀려났다` : melted ? `얼음 감옥이 녹아 ${c.name}이(가) 풀려났다` : `얼음 감옥이 부서지며 ${c.name}이(가) 풀려났다!`, { target: c.name });
    }
  }
  private alivePartyList() { return this.ctx.party.filter((p) => p.alive); }
  /** 보스 차례: 표식 폭발 → 그로기/시전 진행 → 페이즈 전환 → 패턴 */
  private bossTurn() {
    const b = this.boss, ctx = this.ctx;
    ctx.cur = { c: b, label: '보스 기술' };
    if (this.mark) {
      const m = this.mark; this.mark = null;
      if (m.alive) {
        this.fx('markHit', `심연의 표식이 ${m.name}에게서 폭발한다!`, { target: m.name });
        ctx.cur = { c: b, label: '심연의 표식' };
        applyHpLoss(ctx, m, Math.round(m.maxHp * BOSS_PAT.markPct / 100), b);
        if (this.check()) return;
      }
    }
    if (this.groggy > 0) { this.groggy--; this.fx('groggy', `${b.name}이(가) 무릎 꿇은 채 움직이지 못한다`); return; }
    if (this.cast) {
      this.cast.left--;
      if (this.cast.left > 0) {
        const what = this.cast.kind === 'interrupt' ? ` · 게이지 ${this.cast.gauge}/${this.cast.max}` : this.cast.kind === 'shield' ? ` · 보호막 ${this.cast.gauge}/${this.cast.max}` : ' · 회피 준비!';
        this.fx('castTick', `「${this.cast.name}」 시전 중… (${this.cast.left}턴 남음${what})`, { value: this.cast.gauge });
        return;
      }
      const kind = this.cast.kind;
      this.cast = null; this.sinceWipe = 0;
      if (kind === 'dodge') {
        this.dodge = { seed: ctx.rng.int(1, 1e9), level: this.phase, owners: [...new Set(this.alivePartyList().map((p) => this.owners[p.id]?.owner).filter(Boolean))] as string[] };
        this.fx('dodge', `「${this.def.wipe.name}」! 날아오는 얼음을 피하라 (8초)`, { value: this.phase });
        return;
      }
      b.buffs = b.buffs.filter((x) => x.id !== 'shield');
      this.wipeAll(1);
      return;
    }
    const pct = (b.hp / b.maxHp) * 100;
    const ph = PHASE_AT.filter((x) => pct <= x).length;
    if (ph > this.phase) {
      this.phase = ph;
      if (ph === 4 && !this.enraged) {
        this.enraged = true;
        addBuff(b, { id: 'enrage', label: '광폭화', mods: [{ key: 'atk', kind: 'pct', value: BOSS_PAT.enragePct }, { key: 'mag', kind: 'pct', value: BOSS_PAT.enragePct }], turns: 999 });
        this.fx('enrage', `${this.def.enrage} ${b.name}이(가) 광폭해진다 (공격 +${BOSS_PAT.enragePct}%)`);
      } else this.fx('phase', `${b.name}의 힘이 깨어난다 (페이즈 ${ph})`);
      return this.startCast();
    }
    this.sinceWipe++;
    if (this.phase >= 2 && this.sinceWipe >= WIPE.every[this.phase]) return this.startCast();
    const rot = ROT[this.bossId][this.phase];
    let pat = rot[this.rot++ % rot.length];
    const adds = ctx.enemies.some((e) => e !== b && e.alive && !e.tags.has('prison'));
    if ((pat === 'summon' || pat === 'bats') && adds) pat = this.bossId === 'frost' ? 'blizzard' : 'breath';
    if (pat === 'prison' && (this.prisons.size || this.alivePartyList().length < 2)) pat = 'smash';
    this.pattern(pat);
  }
  /** 전멸기 적중: 파티 전원 최대 HP × 배율 (방어 버프면 25% 덜 받음) */
  private wipeAll(mult: number) {
    const b = this.boss, ctx = this.ctx;
    this.fx('wipe', `「${this.def.wipe.name}」! 모든 것을 집어삼킨다`);
    ctx.cur = { c: b, label: this.def.wipe.name };
    for (const p of this.alivePartyList()) {
      const guard = eff(p).stats.def > p.base.def * 1.15 ? 0.75 : 1;
      applyHpLoss(ctx, p, Math.round(p.maxHp * WIPE.hpPct / 100 * guard * mult), b);
    }
  }
  private startCast() {
    const kind = this.def.wipe.kind, name = this.def.wipe.name;
    const max = kind === 'interrupt' ? WIPE.gauge[this.phase] : kind === 'shield' ? Math.round(this.boss.maxHp * WIPE.shieldPct[this.phase] / 100) : 0;
    this.cast = { name, kind, left: WIPE.castTurns, gauge: max, max };
    if (kind === 'shield') {
      // 박쥐가 있으면 흩어지고 보호막을 두름
      for (const e of this.ctx.enemies) if (e !== this.boss && e.alive && !e.tags.has('prison')) { e.alive = false; e.hp = 0; }
      addBuff(this.boss, { id: 'shield', label: '피의 보호막', mods: [], turns: 99, shield: max });
    }
    const how = { interrupt: `${WIPE.castTurns}턴 안에 무력화 게이지(${max})를 기절·침묵으로 깎아라`, dodge: `${WIPE.castTurns}턴 뒤 회피 타임! 직접 움직여 얼음을 피하라`, shield: `${WIPE.castTurns}턴 안에 피의 보호막(${max})을 깨라` }[kind];
    this.fx('cast', `${this.boss.name}이(가) 「${name}」을(를) 준비한다! ${how}`, { value: max });
  }
  /** 회피 타임 결과: 주인별 맞은 횟수 (안 온 사람은 AFK 처리) */
  resolveDodge(hits: Record<string, number>) {
    if (!this.dodge) return;
    const ctx = this.ctx, b = this.boss;
    this.dodge = null;
    ctx.cur = { c: b, label: this.def.wipe.name };
    this.fx('wipe', `「${this.def.wipe.name}」의 냉기가 휩쓸고 지나간다`);
    for (const p of this.alivePartyList()) {
      const o = this.owners[p.id]?.owner;
      const n = Math.max(0, Math.min(6, Math.round(o && hits[o] !== undefined ? hits[o] : WIPE.afkHits)));
      if (!n) { this.fx('interrupt', `${p.name} 완벽 회피!`, { target: p.name, value: 0 }); continue; }
      applyHpLoss(ctx, p, Math.round(p.maxHp * WIPE.dodgeHitPct * n / 100), b);
    }
    if (this.check()) return;
    // 회피 타임이 끝나면 보스 차례가 끝난 뒤부터 이어감
    this.skipDead();
  }
  private pattern(p: Pat) {
    const b = this.boss, ctx = this.ctx;
    const name = PAT_NAME[p][this.bossId];
    ctx.log.push({ t: 'skill', actor: b.name, skill: name });
    ctx.cur = { c: b, label: name };
    switch (p) {
      case 'smash': {
        const t = pickFoe(ctx, b);
        if (t) { this.fx('smash', `${t.name}을(를) 내려찍는다`, { target: t.name }); dealDamage(ctx, b, t, { type: 'damage', scale: b.attackScale, power: BOSS_PAT.smash, target: 'single' }, false); }
        break;
      }
      case 'breath':
        this.fx('breath', `${name}가 파티 전체를 덮친다`);
        for (const t of this.alivePartyList()) dealDamage(ctx, b, t, { type: 'damage', scale: b.attackScale, power: BOSS_PAT.breath, target: 'all' }, false);
        break;
      case 'blizzard':
        this.fx('breath', '눈보라가 몰아친다');
        for (const t of this.alivePartyList()) dealDamage(ctx, b, t, { type: 'damage', scale: b.attackScale, power: BOSS_PAT.blizzard, target: 'all', status: { type: 'stun', turns: 1, chance: BOSS_PAT.blizzardStun } }, false);
        break;
      case 'drain': {
        const t = pickFoe(ctx, b);
        if (!t) break;
        this.fx('smash', `${t.name}의 피를 빨아들인다`, { target: t.name });
        const before = t.hp;
        dealDamage(ctx, b, t, { type: 'damage', scale: b.attackScale, power: BOSS_PAT.drain, target: 'single' }, false);
        const got = Math.max(0, before - Math.max(0, t.hp));
        if (got > 0) heal(ctx, b, b, got * BOSS_PAT.drainHeal / 100);
        break;
      }
      case 'mark': {
        const list = this.alivePartyList();
        const back = list.filter((x) => x.row === 'back');
        const t = ctx.rng.pick(back.length ? back : list);
        if (t) { this.mark = t; this.fx('mark', `${t.name}에게 심연의 표식! 다음 보스 차례에 최대 HP ${BOSS_PAT.markPct}% 폭발 — 회복·보호막으로 대비하세요`, { target: t.name }); }
        break;
      }
      case 'prison': {
        const all = this.alivePartyList().filter((x) => !this.prisons.has(x.id));
        const list = all.filter((x) => x.id !== this.lastPrisoner).length ? all.filter((x) => x.id !== this.lastPrisoner) : all;
        const back = list.filter((x) => x.row === 'back');
        const t = ctx.rng.pick(back.length ? back : list);
        if (!t) break;
        const m = this.makeAdd('iceSpirit', 'icePrison', '얼음 감옥', BOSS_PAT.prisonHpPct);
        m.tags.add('prison'); m.base = { ...m.base, atk: 0, mag: 0 };
        this.prisons.set(t.id, m); this.prisonAt.set(t.id, ctx.round); this.lastPrisoner = t.id;
        t.tags.add('frozen');
        nameUnique(ctx.enemies);
        ctx.log.push({ t: 'summon', who: b.name, summoned: [snap(m)] });
        this.fx('mark', `${t.name}이(가) 얼음 감옥에 갇혔다! 감옥을 부수거나 성직자 「정화」로 풀 수 있어요 · 2라운드 뒤엔 녹아요`, { target: t.name });
        break;
      }
      case 'summon': case 'bats': {
        const bats = p === 'bats';
        const adds: Combatant[] = [];
        for (let i = 0; i < (bats ? BOSS_PAT.bats : BOSS_PAT.adds); i++) adds.push(bats ? this.makeAdd('vampireBat', 'vampireBat', '흡혈 박쥐', BOSS_PAT.batHpPct, 0.15) : this.makeAdd('voidWraith', 'voidWraith', '심연의 사도', BOSS_PAT.addHpPct, 0.22));
        nameUnique(ctx.enemies);
        b.passives.add('bulwark');
        ctx.log.push({ t: 'summon', who: b.name, summoned: adds.map(snap) });
        this.fx('summon', `${bats ? '박쥐 떼' : `사도 ${adds.length}명`}가 나타나 ${b.name}을(를) 감싼다 (살아있는 동안 보스 피해 -70% · 단일 공격은 먼저 노려요)`);
        break;
      }
      case 'curse': case 'bleed':
        this.fx('curse', `${name}! 파티 전원 3라운드 동안 매 라운드 최대 HP ${BOSS_PAT.cursePct}% 피해`);
        for (const t of this.alivePartyList()) t.status.poison = { turns: 3, power: Math.round(t.maxHp * BOSS_PAT.cursePct / 100) };
        break;
    }
  }
  private makeAdd(monId: string, sprite: string, name: string, hpPct: number, dmg = 0.2) {
    const b = this.boss;
    const m = fromMonster(MONSTERS[monId], BOSS_FLOOR);
    m.mdef = { ...MONSTERS[monId], id: sprite, name };
    m.name = name;
    m.maxHp = m.hp = Math.round(b.maxHp * hpPct / 100);
    m.base = { ...m.base, atk: b.base.atk * dmg, mag: b.base.mag * dmg, def: b.base.def * 0.5, res: b.base.res * 0.5, agi: b.base.agi };
    m.lvl = b.lvl; m.dmgComp = 1;
    m.tags.add('priority'); m.tags.add('raid');
    this.ctx.enemies.push(m);
    return m;
  }
  /** 마지막 방송 이후 새 기록 */
  drain(): BattleEvent[] { const out = this.ctx.log.slice(this.cursor); this.cursor = this.ctx.log.length; return out; }
  state(): R4State {
    const u = (c: Combatant): R4Unit => ({ id: c.id, name: c.name, owner: this.owners[c.id]?.owner, ownerName: this.owners[c.id]?.ownerName, jobId: c.char?.jobId, mid: c.mdef?.id, hp: Math.max(0, Math.round(c.hp)), maxHp: c.maxHp, mp: Math.round(c.mp), maxMp: c.maxMp, alive: c.alive, boss: c === this.boss, frozen: this.frozen(c) || undefined, cos: c.char?.cos });
    return {
      round: Math.min(this.ctx.round, R4_ROUNDS), turn: this.current?.id ?? null, order: this.order.slice(this.idx).filter((c) => c.alive).map((c) => c.id),
      units: [...this.ctx.party, ...this.ctx.enemies].map(u), over: this.over, win: this.win, dealt: Math.round(this.boss.maxHp - Math.max(0, this.boss.hp)), maxHp: this.boss.maxHp,
      boss: { id: this.bossId, phase: this.phase, cast: this.cast ? { ...this.cast } : null, groggy: this.groggy, mark: this.mark?.alive ? this.mark.id : null, enraged: this.enraged },
      dodge: this.dodge,
    };
  }
  /** 자동으로 끝까지 (시뮬레이션용: 회피 타임은 simDodgeHits 근처로 무작위) */
  runAuto() {
    let g = 0;
    while (!this.over && g++ < 5000) {
      if (this.dodge) {
        const hits: Record<string, number> = {};
        for (const o of this.dodge.owners) hits[o] = Math.max(0, Math.round(this.simDodgeHits + this.ctx.rng.range(-1, 1)));
        this.resolveDodge(hits);
      } else this.step();
    }
    return this;
  }
}
