/** 4인 레이드 전투: 한 차례씩 진행 (방장 화면이 돌리고 결과를 방송) */
import { MONSTERS } from '../data/monsters';
import { R4, R4_ROUNDS, type R4Diff } from '../data/raid4';
import { addBuff, applyHpLoss, dealDamage, defRef, eff, endRound, fromCharacter, fromMonster, nameUnique, pickFoe, skillInterrupt, snap, startRound, takeTurn, usableSkills, type BattleContext, type Combatant } from './combat';
import { SKILLS } from '../data/skills';
import { Rng } from './rng';
import { partyMods } from './stats';
import type { BattleEvent, Character, Modifier, RaidFx } from './types';

export interface R4Member { owner: string; ownerName: string; char: Character; mods: Modifier[] }
/** 보스 기준: 1인 전투력 BASE_POWER 파티를 상대로 맞춘 능력치를 난이도 배율(k)로 키움 */
export const R4_BASE_POWER = 125000;
export const R4_TUNE = { hp: 2.1, dmg: 4.6 };
/** 전투력은 능력치보다 빠르게 커져서 보스는 지수 0.8로 키움 */
export let R4_K_EXP = 0.68;
export const setR4Exp = (v: number) => { R4_K_EXP = v; };
const BOSS_FLOOR = 70;

export interface R4Unit { id: string; name: string; owner?: string; ownerName?: string; jobId?: string; hp: number; maxHp: number; mp: number; maxMp: number; alive: boolean; boss?: boolean }
export interface R4BossState { phase: number; cast: { name: string; left: number; gauge: number; max: number } | null; groggy: number; mark: string | null; enraged: boolean }
export interface R4State { round: number; turn: string | null; order: string[]; units: R4Unit[]; over: boolean; win: boolean; dealt: number; maxHp: number; boss?: R4BossState }

// ───────── 보스 기믹 (아바돈) ─────────
/** 페이즈: HP 70% · 40% · 15% 아래로 내려갈 때 넘어가며 바로 전멸기 시전 */
const PHASE_AT = [100, 70, 40, 15];
/** 전멸기 「심연의 붕괴」: 시전 2턴, 무력화 게이지(페이즈별), 주기(보스 턴) */
export const WIPE = { name: '심연의 붕괴', castTurns: 2, gauge: [0, 0, 100, 120, 150], every: [0, 99, 5, 4, 3], hpPct: 150 };
type Pat = 'smash' | 'breath' | 'mark' | 'summon' | 'curse';
const ROT: Pat[][] = [[], ['smash', 'breath', 'mark', 'smash', 'summon'], ['smash', 'curse', 'mark', 'breath', 'summon'], ['breath', 'mark', 'smash', 'curse', 'summon', 'smash'], ['breath', 'smash', 'mark', 'breath']];
export const BOSS_PAT = { smash: 2.4, breath: 0.85, markPct: 60, cursePct: 5, adds: 2, addHpPct: 2.5, enragePct: 30, groggyDmg: 50 };

export function makeR4Boss(diff: R4Diff, tune = R4_TUNE): Combatant {
  const k = Math.pow(R4[diff].power / R4_BASE_POWER, R4_K_EXP);
  const b = fromMonster(MONSTERS.abyssKing, BOSS_FLOOR);
  const base = { ...b.base };
  b.base = { ...base, hp: base.hp * k * tune.hp, atk: base.atk * k * tune.dmg, mag: base.mag * k * tune.dmg, def: base.def * k, res: base.res * k };
  b.maxHp = b.hp = Math.round(b.base.hp);
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
  /** 자동 선택 때 끊기 스킬을 쓸 확률 % (사람이 자리 비웠을 때) */
  autoInterrupt = 70;

  constructor(members: R4Member[], readonly diff: R4Diff, seed: number, tune = R4_TUNE) {
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
    this.boss = makeR4Boss(diff, tune);
    this.ctx = { rng: new Rng(seed), log: [], party, enemies: [this.boss], round: 0, hasBoss: true, floor: BOSS_FLOOR, maxRounds: R4_ROUNDS };
    this.ctx.log.push({ t: 'wave', floor: 0, wave: 1, enemies: [snap(this.boss)], elite: false, boss: true });
    this.ctx.log.push({ t: 'special', who: this.boss.name, text: `"심연의 문턱까지 온 걸 칭찬해주마." (${R4[diff].name} · ${R4_ROUNDS}라운드 안에 쓰러뜨려라)` });
    this.fx('phase', 'HP 70%·40%·15%마다 전멸기 「심연의 붕괴」를 시전해요. 기절·침묵 스킬로 무력화 게이지를 깎아 끊으세요!');
    this.nextRound();
  }

  private alive = (l: Combatant[]) => l.filter((c) => c.alive);
  private nextRound() {
    this.ctx.round++;
    if (this.ctx.round > R4_ROUNDS) return this.finish(false);
    this.order = startRound(this.ctx);
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
  /** 지금 차례인 캐릭터 */
  get current(): Combatant | null { return this.over ? null : this.order[this.idx] ?? null; }
  /** 지금 차례가 사람이 고를 차례인가 (파티원, 살아있고 기절 아님) */
  get needsChoice() { const c = this.current; return !!c && c.side === 'party' && c.alive && !c.status.stun; }
  ownerOf(c: Combatant) { return this.owners[c.id]?.owner; }
  skillsOf(c: Combatant) { return usableSkills(this.ctx, c); }
  /** 한 차례 진행. choice = 스킬 id / 'attack' / undefined(자동) */
  step(choice?: string) {
    const c = this.current;
    if (!c) return;
    if (c === this.boss) { if (c.alive) this.bossTurn(); }
    else if (c.alive) {
      // 자리 비움(자동)이어도 시전 중이면 끊기 스킬을 먼저 시도
      if (choice === undefined && this.cast && c.side === 'party' && this.ctx.rng.chance(this.autoInterrupt)) {
        const cut = usableSkills(this.ctx, c).filter((k) => k.ok && k.interrupt > 0).sort((a, b) => b.interrupt - a.interrupt)[0];
        if (cut) choice = cut.skillId;
      }
      const before = this.ctx.log.length;
      takeTurn(this.ctx, c, choice);
      if (c.side === 'party') this.checkInterrupt(c, before);
    }
    this.idx++;
    if (this.check()) return;
    this.skipDead();
  }
  private fx(kind: RaidFx, text: string, extra: { target?: string; value?: number } = {}) { this.ctx.log.push({ t: 'raid', kind, text, who: this.boss.name, ...extra }); }
  /** 파티원이 방금 쓴 스킬로 시전 게이지 깎기 */
  private checkInterrupt(c: Combatant, from: number) {
    if (!this.cast || !this.boss.alive) return;
    const used = this.ctx.log.slice(from).find((e) => e.t === 'skill' && e.actor === c.name) as { skill: string } | undefined;
    if (!used) return;
    const sk = c.slots.map((s) => SKILLS[s.skillId]).find((s) => s?.name === used.skill);
    const v = sk ? skillInterrupt(sk) : 0;
    if (!v) return;
    this.cast.gauge = Math.max(0, this.cast.gauge - v);
    this.fx('interrupt', `${c.name}의 ${sk!.name}! 무력화 게이지 -${v} (${this.cast.gauge}/${this.cast.max})`, { target: c.name, value: this.cast.gauge });
    if (this.cast.gauge > 0) return;
    // 무력화 성공: 시전 취소 + 그로기
    this.cast = null; this.sinceWipe = 0; this.groggy = 1;
    addBuff(this.boss, { id: 'groggy', label: '그로기', mods: [{ key: 'dmgTaken', kind: 'flat', value: BOSS_PAT.groggyDmg }], turns: 2 });
    this.fx('break', `무력화 성공! ${this.boss.name}이(가) 휘청인다 (다음 행동 불가 · 받는 피해 +${BOSS_PAT.groggyDmg}%)`);
  }
  private alivePartyList() { return this.ctx.party.filter((p) => p.alive); }
  /** 보스 차례: 표식 폭발 → 그로기/시전 진행 → 페이즈 전환 → 패턴 */
  private bossTurn() {
    const b = this.boss, ctx = this.ctx;
    ctx.cur = { c: b, label: '심연의 기술' };
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
      if (this.cast.left > 0) { this.fx('castTick', `「${this.cast.name}」 시전 중… (${this.cast.left}턴 남음 · 게이지 ${this.cast.gauge}/${this.cast.max})`, { value: this.cast.gauge }); return; }
      this.cast = null; this.sinceWipe = 0;
      this.fx('wipe', `「${WIPE.name}」! 심연이 모든 것을 집어삼킨다`);
      ctx.cur = { c: b, label: WIPE.name };
      for (const p of this.alivePartyList()) {
        const guard = eff(p).stats.def > p.base.def * 1.15 ? 0.75 : 1; // 방어 버프가 있으면 25% 덜 받음
        applyHpLoss(ctx, p, Math.round(p.maxHp * WIPE.hpPct / 100 * guard), b);
      }
      return;
    }
    const pct = (b.hp / b.maxHp) * 100;
    const ph = PHASE_AT.filter((x) => pct <= x).length;
    if (ph > this.phase) {
      this.phase = ph;
      if (ph === 4 && !this.enraged) {
        this.enraged = true;
        addBuff(b, { id: 'enrage', label: '광폭화', mods: [{ key: 'atk', kind: 'pct', value: BOSS_PAT.enragePct }, { key: 'mag', kind: 'pct', value: BOSS_PAT.enragePct }], turns: 999 });
        this.fx('enrage', `"버러지들이 감히…!" ${b.name}이(가) 광폭해진다 (공격 +${BOSS_PAT.enragePct}%)`);
      } else this.fx('phase', `${b.name}의 힘이 깨어난다 (페이즈 ${ph})`);
      return this.startCast();
    }
    this.sinceWipe++;
    if (this.phase >= 2 && this.sinceWipe >= WIPE.every[this.phase]) return this.startCast();
    const rot = ROT[this.phase];
    let pat = rot[this.rot++ % rot.length];
    if (pat === 'summon' && ctx.enemies.some((e) => e !== b && e.alive)) pat = 'breath';
    this.pattern(pat);
  }
  private startCast() {
    this.cast = { name: WIPE.name, left: WIPE.castTurns, gauge: WIPE.gauge[this.phase], max: WIPE.gauge[this.phase] };
    this.fx('cast', `${this.boss.name}이(가) 「${WIPE.name}」을(를) 준비한다! ${WIPE.castTurns}턴 안에 무력화 게이지(${this.cast.max})를 기절·침묵으로 깎아라`, { value: this.cast.gauge });
  }
  private pattern(p: Pat) {
    const b = this.boss, ctx = this.ctx;
    const name = { smash: '심연 강타', breath: '공허의 숨결', mark: '심연의 표식', summon: '사도 소환', curse: '부식의 저주' }[p];
    ctx.log.push({ t: 'skill', actor: b.name, skill: name });
    ctx.cur = { c: b, label: name };
    switch (p) {
      case 'smash': {
        const t = pickFoe(ctx, b);
        if (t) { this.fx('smash', `${t.name}을(를) 내려찍는다`, { target: t.name }); dealDamage(ctx, b, t, { type: 'damage', scale: b.attackScale, power: BOSS_PAT.smash, target: 'single' }, false); }
        break;
      }
      case 'breath':
        this.fx('breath', '공허의 숨결이 파티 전체를 덮친다');
        for (const t of this.alivePartyList()) dealDamage(ctx, b, t, { type: 'damage', scale: b.attackScale, power: BOSS_PAT.breath, target: 'all' }, false);
        break;
      case 'mark': {
        const list = this.alivePartyList();
        const back = list.filter((x) => x.row === 'back');
        const t = ctx.rng.pick(back.length ? back : list);
        if (t) { this.mark = t; this.fx('mark', `${t.name}에게 심연의 표식! 다음 보스 차례에 최대 HP ${BOSS_PAT.markPct}% 폭발 — 회복·보호막으로 대비하세요`, { target: t.name }); }
        break;
      }
      case 'summon': {
        const adds: Combatant[] = [];
        for (let i = 0; i < BOSS_PAT.adds; i++) {
          const m = fromMonster(MONSTERS.voidWraith, BOSS_FLOOR);
          m.mdef = { ...MONSTERS.voidWraith, name: '심연의 사도' }; m.name = '심연의 사도';
          m.maxHp = m.hp = Math.round(b.maxHp * BOSS_PAT.addHpPct / 100);
          m.base = { ...m.base, atk: b.base.atk * 0.22, mag: b.base.mag * 0.22, def: b.base.def * 0.5, res: b.base.res * 0.5, agi: b.base.agi };
          m.lvl = b.lvl; m.dmgComp = 1;
          m.tags.add('priority'); m.tags.add('raid');
          ctx.enemies.push(m); adds.push(m);
        }
        nameUnique(ctx.enemies);
        b.passives.add('bulwark');
        ctx.log.push({ t: 'summon', who: b.name, summoned: adds.map(snap) });
        this.fx('summon', `사도 ${adds.length}명이 나타나 ${b.name}을(를) 감싼다 (사도가 있는 동안 보스 피해 -70% · 단일 공격은 사도를 먼저 노려요)`);
        break;
      }
      case 'curse':
        this.fx('curse', `부식의 저주! 파티 전원 3라운드 동안 매 라운드 최대 HP ${BOSS_PAT.cursePct}% 피해`);
        for (const t of this.alivePartyList()) t.status.poison = { turns: 3, power: Math.round(t.maxHp * BOSS_PAT.cursePct / 100) };
        break;
    }
  }
  /** 마지막 방송 이후 새 기록 */
  drain(): BattleEvent[] { const out = this.ctx.log.slice(this.cursor); this.cursor = this.ctx.log.length; return out; }
  state(): R4State {
    const u = (c: Combatant): R4Unit => ({ id: c.id, name: c.name, owner: this.owners[c.id]?.owner, ownerName: this.owners[c.id]?.ownerName, jobId: c.char?.jobId, hp: Math.max(0, Math.round(c.hp)), maxHp: c.maxHp, mp: Math.round(c.mp), maxMp: c.maxMp, alive: c.alive, boss: c === this.boss });
    return {
      round: Math.min(this.ctx.round, R4_ROUNDS), turn: this.current?.id ?? null, order: this.order.slice(this.idx).filter((c) => c.alive).map((c) => c.id),
      units: [...this.ctx.party, ...this.ctx.enemies].map(u), over: this.over, win: this.win, dealt: Math.round(this.boss.maxHp - Math.max(0, this.boss.hp)), maxHp: this.boss.maxHp,
      boss: { phase: this.phase, cast: this.cast ? { ...this.cast } : null, groggy: this.groggy, mark: this.mark?.alive ? this.mark.id : null, enraged: this.enraged },
    };
  }
  /** 자동으로 끝까지 (시뮬레이션용) */
  runAuto() { let g = 0; while (!this.over && g++ < 5000) this.step(); return this; }
}
