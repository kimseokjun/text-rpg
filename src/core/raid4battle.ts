/** 4인 레이드 전투: 한 차례씩 진행 (방장 화면이 돌리고 결과를 방송) */
import { MONSTERS } from '../data/monsters';
import { R4, R4_ROUNDS, type R4Diff } from '../data/raid4';
import { defRef, endRound, fromCharacter, fromMonster, snap, startRound, takeTurn, usableSkills, type BattleContext, type Combatant } from './combat';
import { Rng } from './rng';
import { partyMods } from './stats';
import type { BattleEvent, Character, Modifier } from './types';

export interface R4Member { owner: string; ownerName: string; char: Character; mods: Modifier[] }
/** 보스 기준: 1인 전투력 BASE_POWER 파티를 상대로 맞춘 능력치를 난이도 배율(k)로 키움 */
export const R4_BASE_POWER = 125000;
export const R4_TUNE = { hp: 2.3, dmg: 3.6 };
/** 전투력은 능력치보다 빠르게 커져서 보스는 지수 0.8로 키움 */
export let R4_K_EXP = 0.68;
export const setR4Exp = (v: number) => { R4_K_EXP = v; };
const BOSS_FLOOR = 70;

export interface R4Unit { id: string; name: string; owner?: string; ownerName?: string; jobId?: string; hp: number; maxHp: number; mp: number; maxMp: number; alive: boolean; boss?: boolean }
export interface R4State { round: number; turn: string | null; order: string[]; units: R4Unit[]; over: boolean; win: boolean; dealt: number; maxHp: number }

export function makeR4Boss(diff: R4Diff, tune = R4_TUNE): Combatant {
  const k = Math.pow(R4[diff].power / R4_BASE_POWER, R4_K_EXP);
  const b = fromMonster(MONSTERS.abyssKing, BOSS_FLOOR);
  const base = { ...b.base };
  b.base = { ...base, hp: base.hp * k * tune.hp, atk: base.atk * k * tune.dmg, mag: base.mag * k * tune.dmg, def: base.def * k, res: base.res * k };
  b.maxHp = b.hp = Math.round(b.base.hp);
  // 방어 비율 계산 기준 레벨도 같이 올려 파티 방어력이 커진 만큼 피해가 줄지 않게
  b.lvl = Math.round(1 + (defRef(b.lvl ?? 70) * k - 7) / 1.84);
  b.dmgComp = 1;
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
    if (c.alive) takeTurn(this.ctx, c, choice);
    this.idx++;
    if (this.check()) return;
    this.skipDead();
  }
  /** 마지막 방송 이후 새 기록 */
  drain(): BattleEvent[] { const out = this.ctx.log.slice(this.cursor); this.cursor = this.ctx.log.length; return out; }
  state(): R4State {
    const u = (c: Combatant): R4Unit => ({ id: c.id, name: c.name, owner: this.owners[c.id]?.owner, ownerName: this.owners[c.id]?.ownerName, jobId: c.char?.jobId, hp: Math.max(0, Math.round(c.hp)), maxHp: c.maxHp, mp: Math.round(c.mp), maxMp: c.maxMp, alive: c.alive, boss: c === this.boss });
    return {
      round: Math.min(this.ctx.round, R4_ROUNDS), turn: this.current?.id ?? null, order: this.order.slice(this.idx).filter((c) => c.alive).map((c) => c.id),
      units: [...this.ctx.party, ...this.ctx.enemies].map(u), over: this.over, win: this.win, dealt: Math.round(this.boss.maxHp - Math.max(0, this.boss.hp)), maxHp: this.boss.maxHp,
    };
  }
  /** 자동으로 끝까지 (시뮬레이션용) */
  runAuto() { let g = 0; while (!this.over && g++ < 5000) this.step(); return this; }
}
