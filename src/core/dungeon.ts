import { EQUIP_BASES, OPTION_POOL, POTIONS, REFINE_CHANCE, rollOption, tierOfFloor } from '../data/items';
import { DAILY_BY_ID, DAILY_TUNE, dailyReward } from '../data/daily';
import { RAID_DIFF, RAID_ROUNDS, raidForm, type RaidDiff } from '../data/raid';
import { CORE_CHANCE, RAID_SET, SET_BASES, SET_DROP_CHANCE, SET_RARITY, SHARD_CHANCE } from '../data/sets';
import { DIFF_TUNE, MAX_FLOOR, MONSTERS, regionOf, rewardScale, zoneOf } from '../data/monsters';
import { gainExp, newUid } from './character';
import { newReport, type Report } from './report';
import { GIMMICKS, towerBossMult, TOWER_ELITES, TOWER_LEVEL_FLOOR, TOWER_POOL, isTowerBoss, towerBoss, towerGimmick, towerTune } from '../data/tower';
import { fromCharacter, fromMonster, nameUnique, runBattle, snap, type Combatant } from './combat';
import { Rng } from './rng';
import { partyMods } from './stats';
import type { BattleEvent, Character, Equip, Modifier, Rarity } from './types';

export interface ExpeditionSettings {
  startFloor: number;      // 시작 층 (도달한 층 +1까지 선택 가능)
  mode: 'advance' | 'repeat'; // 아래로 진행 / 같은 층 반복 파밍
  repeatCount: number;     // 반복 모드 횟수
  auto: boolean;           // 자동 진행
  retreatHpPct: number;    // 파티 평균 HP가 이 % 이하면 귀환 (0 = 사용 안 함)
  retreatOnDown: boolean;  // 파티원 1명이라도 쓰러지면 귀환
  targetFloor: number;     // 도달하면 귀환
  stopBeforeBoss: boolean; // 보스 층 앞 정지
  potions: string[];       // 버프 물약 id (최대 3)
  insured?: boolean;       // 탐험 보험: 전멸해도 손실 없음
  bestFloor?: number;      // 출발 시점의 클리어 최고 층 (낮은 층 보상 감소용)
  /** 데려간 펫 효과 */
  petMods?: Modifier[];
  /** 일일 던전 */
  daily?: { id: string; stage: number };
  /** 개인 레이드 */
  raid?: { diff: RaidDiff; week: number; hpLeft: number; maxHp: number };
  /** 무한 탑 (floor = 탑 층) */
  tower?: boolean;
  /** 멀티 던전 (보상은 서버에서) */
  multi?: boolean;
  /** 멀티 전용 던전 '균열': level = 기준 층 (1~70), 10층 진행 */
  rift?: { level: number };
}

/** 최고 기록보다 낮은 층의 골드·경험치 배율: 5층 이상 아래 75%, 10층 이상 아래 50% */
export function lowFloorRate(floor: number, best = 0): number {
  const gap = best - floor;
  return gap >= 10 ? 0.5 : gap >= 5 ? 0.75 : 1;
}

export const MAX_REPEAT = 50;

export const DEFAULT_SETTINGS: ExpeditionSettings = {
  startFloor: 1, mode: 'advance', repeatCount: 10, auto: true, retreatHpPct: 30, retreatOnDown: false, targetFloor: MAX_FLOOR, stopBeforeBoss: true, potions: [],
};

export type StopReason = 'wipe' | 'timeout' | 'lowHp' | 'down' | 'target' | 'bossAhead' | 'cleared' | 'regionEnd' | 'manual';

export const RIFT_FLOORS = 10;
/** 균열 난이도 배율 (src/cli/rifttest.ts): 기준 층 표준 파티가 완주 약 60% */
export const RIFT_TUNE = { normal: 0.6, elite: 0.5, boss: 0.8 };
/** 구역별 보정 (src/cli/rifttune.ts) */
export const RIFT_ZONE_K: Record<string, number> = {catacomb:  1.74,  mine:  0.67,  frost:  0.68,  nest:  0.63,  rift:  0.55,  wall:  0.9,  library:  0.85,  temple:  0.43,  swamp:  0.67,  lava:  0.7,  sunken:  0.8,  core:  0.59,  blood:  0.62,  throne:  0.6};
export interface Loot { gold: number; exp: number; stones: number; blessings: number; refineStones: number; shards: number; cores: number; cardPacks?: number; equips: Equip[] }

export interface FloorResult { floor: number; win: boolean; log: BattleEvent[]; story?: string }

/** 한 번의 던전 탐험. UI는 runFloor()를 한 층씩 호출하고, 자동 모드는 runAuto() */
export class Expedition {
  readonly party: Combatant[];
  floor: number;
  loot: Loot = { gold: 0, exp: 0, stones: 0, blessings: 0, refineStones: 0, shards: 0, cores: 0, equips: [] };
  bossesKilled: string[] = [];
  report: Report;
  floorsCleared = 0;
  finished = false;
  private goldMult: number;
  private itemMult: number;

  constructor(readonly chars: Character[], readonly settings: ExpeditionSettings, readonly rng: Rng, hpPct: Record<string, number> = {}) {
    const potionMods: Modifier[] = settings.potions
      .slice(0, 3)
      .map((id) => POTIONS.find((p) => p.id === id)?.mod)
      .filter(Boolean) as Modifier[];
    const shared = [...partyMods(chars), ...potionMods, ...(settings.petMods ?? [])];
    this.party = chars.map((c) => fromCharacter(c, shared));
    // 시작 HP 지정 (현재 게임에서는 미사용: 마을 귀환 시 전원 회복)
    for (const p of this.party) {
      const pct = hpPct[p.id];
      if (pct === undefined) continue;
      p.hp = Math.round((p.maxHp * pct) / 100);
      if (p.hp <= 0) { p.hp = 0; p.alive = false; }
    }
    const ex = this.party[0].extra; // 파티 공용 효과는 모두에게 동일하게 들어감
    this.goldMult = 1 + ex.goldGain / 100;
    this.itemMult = 1 + ex.itemGain / 100;
    this.floor = settings.startFloor;
    this.report = newReport(this.party.map((p) => ({ id: p.id, name: p.name })));
  }

  get aliveParty() { return this.party.filter((c) => c.alive); }
  /** 탐험 후 캐릭터별 HP % */
  hpAfter(): Record<string, number> {
    return Object.fromEntries(this.party.map((p) => [p.id, p.alive ? Math.max(1, Math.round((p.hp / p.maxHp) * 100)) : 0]));
  }
  get avgHpPct() {
    return (this.party.reduce((s, c) => s + (c.alive ? c.hp / c.maxHp : 0), 0) / this.party.length) * 100;
  }
  isBossFloor(f = this.floor) { if (this.settings.tower) return isTowerBoss(f); if (this.settings.rift) return f === 5 || f === RIFT_FLOORS; return !!this.settings.raid || (!this.settings.daily && zoneOf(f).boss.floor === f); }
  /** 레이드 결과 */
  raidDealt = 0;
  raidKilled = false;
  get daily() { return this.settings.daily ? DAILY_BY_ID[this.settings.daily.id] : undefined; }

  /** 현재 층 진행 (3웨이브 또는 보스) */
  runFloor(): FloorResult {
    if (this.settings.raid) return this.runRaid();
    if (this.settings.tower) return this.runTower();
    if (this.settings.rift) return this.runRift();
    const log: BattleEvent[] = [];
    const f = this.floor;
    const zone = zoneOf(f);
    let story: string | undefined;
    const waves = this.isBossFloor() ? 1 : 3;

    for (let w = 1; w <= waves; w++) {
      let enemies: Combatant[];
      let elite = false;
      const dd = this.daily;
      if (dd) {
        // 일일 던전: 웨이브마다 2~4마리, 마지막 웨이브에 수호자(엘리트)
        const n = this.rng.int(2, Math.min(4, 2 + Math.ceil(this.settings.daily!.stage / 4)));
        const tune = DAILY_TUNE[dd.id]?.[this.settings.daily!.stage - 1] ?? 1;
        enemies = Array.from({ length: n }, () => fromMonster(MONSTERS[this.rng.pick(dd.pool)], f, tune));
        if (w === waves) { elite = true; enemies[0] = fromMonster(MONSTERS[dd.elite], f, tune); }
      } else if (this.isBossFloor()) {
        enemies = [fromMonster(MONSTERS[zone.boss.id], f), ...zone.boss.adds.map((id) => fromMonster(MONSTERS[id], f))];
      } else {
        const maxCount = Math.min(4, 1 + Math.ceil((f - zone.floors[0] + 1) / 2));
        const n = this.rng.int(f - zone.floors[0] < 2 ? 1 : 2, maxCount);
        enemies = Array.from({ length: n }, () => fromMonster(MONSTERS[this.rng.weighted(zone.pool, (p) => p.weight).id], f));
        if (this.rng.chance(10)) {
          elite = true;
          enemies[0] = fromMonster(MONSTERS[zone.elite], f);
        }
      }
      nameUnique(enemies);
      log.push({ t: 'wave', floor: f, wave: w, enemies: enemies.map(snap), elite, boss: this.isBossFloor() });
      const ctx = { rng: this.rng, log, party: this.party, enemies, round: 0, hasBoss: this.isBossFloor(), floor: f, rep: this.report };
      const win = runBattle(ctx);
      if (!this.daily) this.collect(ctx.enemies.filter((e) => !e.alive), f);
      if (!win) {
        this.finish(this.party.some((c) => c.alive) ? 'timeout' : 'wipe');
        return { floor: f, win: false, log };
      }
    }
    if (this.daily) {
      const r = dailyReward(this.daily, this.settings.daily!.stage, rewardScale(f));
      this.loot.gold += Math.round(r.gold * this.goldMult); this.loot.exp += r.exp; this.loot.stones += r.stones; this.loot.blessings += r.blessings;
      this.loot.refineStones += r.refineStones; this.loot.shards += r.shards; this.loot.cores += r.cores;
    }
    if (this.isBossFloor()) {
      const boss = MONSTERS[zone.boss.id];
      this.bossesKilled.push(boss.id);
      story = boss.story;
    }
    this.floorsCleared++;
    this.floorRegen();
    return { floor: f, win: true, log, story };
  }

  /** 층 클리어 시 HP·MP 회복 (기본 15% + 신앙/근성, 여명의 기도) */
  private floorRegen() {
    const dawn = this.party.some((c) => c.alive && c.passives.has('dawnPrayer'));
    for (const c of this.aliveParty) {
      const pct = 15 + c.extra.floorRegen + (dawn ? 30 : 0);
      c.hp = Math.min(c.maxHp, c.hp + (c.maxHp * pct) / 100);
      c.mp = Math.min(c.maxMp, c.mp + (c.maxMp * pct) / 100);
    }
  }

  /** 무한 탑: 층마다 한 번 싸움, 기믹 적용, 이기면 전원 완전 회복 */
  towerCleared = 0;
  private runTower(): FloorResult {
    const log: BattleEvent[] = [];
    const t = this.floor, tune = towerTune(t), F = TOWER_LEVEL_FLOOR;
    const rng = new Rng(t * 7919 + 13); // 층 구성은 고정 (기믹·몬스터 같음)
    let enemies: Combatant[];
    if (isTowerBoss(t)) {
      const b = towerBoss(t);
      enemies = [fromMonster(MONSTERS[b.id], F, tune * towerBossMult(t)), ...b.adds.map((id) => fromMonster(MONSTERS[id], F, tune * towerBossMult(t)))];
    } else {
      const n = Math.min(4, 2 + Math.floor(t / 15) + rng.int(0, 1));
      enemies = [fromMonster(MONSTERS[rng.pick(TOWER_ELITES)], F, tune * 0.6), ...Array.from({ length: n - 1 }, () => fromMonster(MONSTERS[rng.pick(TOWER_POOL)], F, tune))];
    }
    const g = towerGimmick(t);
    g.apply(enemies);
    nameUnique(enemies);
    log.push({ t: 'wave', floor: t, wave: 1, enemies: enemies.map(snap), elite: !isTowerBoss(t), boss: isTowerBoss(t) });
    log.push({ t: 'special', who: `${t}층`, text: `${g.icon} ${g.name} — ${g.desc}` });
    const ctx = { rng: this.rng, log, party: this.party, enemies, round: 0, hasBoss: enemies.some((e) => e.tags.has('boss')), floor: F, rep: this.report };
    const win = runBattle(ctx);
    if (!win) { this.finish(this.party.some((c) => c.alive) ? 'timeout' : 'wipe'); return { floor: t, win: false, log }; }
    this.towerCleared = t;
    this.floorsCleared++;
    for (const c of this.party) { c.alive = true; c.hp = c.maxHp; c.mp = c.maxMp; c.status = {}; }
    return { floor: t, win: true, log };
  }

  /** 균열 (멀티 전용): 기준 층 몬스터로 10층, 5층 정예 · 10층 보스, 3층부터 무작위 기믹 */
  private runRift(): FloorResult {
    const log: BattleEvent[] = [];
    const t = this.floor, F = this.settings.rift!.level;
    const zone = zoneOf(F);
    const norm = Array.from({ length: zone.floors[1] - zone.floors[0] }, (_, i) => DIFF_TUNE[zone.floors[0] + i] ?? 1);
    const baseTune = norm.reduce((a, b) => a + b, 0) / Math.max(1, norm.length);
    const K = RIFT_ZONE_K[zone.id] ?? 1;
    const ramp = RIFT_TUNE.normal * K * (1 + 0.04 * (t - 1));
    let enemies: Combatant[];
    if (t === RIFT_FLOORS) {
      const bt = (DIFF_TUNE[zone.boss.floor] ?? 1) * RIFT_TUNE.boss * K;
      enemies = [fromMonster(MONSTERS[zone.boss.id], F, bt), ...zone.boss.adds.map((id) => fromMonster(MONSTERS[id], F, bt))];
    } else if (t === 5) {
      enemies = [fromMonster(MONSTERS[zone.elite], F, baseTune * RIFT_TUNE.elite * K), fromMonster(MONSTERS[zone.elite], F, baseTune * RIFT_TUNE.elite * K), fromMonster(MONSTERS[this.rng.weighted(zone.pool, (p) => p.weight).id], F, baseTune * ramp)];
    } else {
      const n = this.rng.int(2, t >= 6 ? 4 : 3);
      enemies = Array.from({ length: n }, () => fromMonster(MONSTERS[this.rng.weighted(zone.pool, (p) => p.weight).id], F, baseTune * ramp));
      if (this.rng.chance(15)) enemies[0] = fromMonster(MONSTERS[zone.elite], F, baseTune * RIFT_TUNE.elite * K);
    }
    const g = t >= 3 && t !== RIFT_FLOORS ? GIMMICKS[1 + this.rng.int(0, GIMMICKS.length - 2)] : null;
    if (g) g.apply(enemies);
    nameUnique(enemies);
    log.push({ t: 'wave', floor: t, wave: 1, enemies: enemies.map(snap), elite: t === 5, boss: t === RIFT_FLOORS });
    if (g) log.push({ t: 'special', who: `균열 ${t}층`, text: `${g.icon} ${g.name} — ${g.desc}` });
    const ctx = { rng: this.rng, log, party: this.party, enemies, round: 0, hasBoss: enemies.some((e) => e.tags.has('boss')), floor: F, rep: this.report };
    const win = runBattle(ctx);
    this.collect(ctx.enemies.filter((e) => !e.alive), F);
    if (!win) { this.finish(this.party.some((c) => c.alive) ? 'timeout' : 'wipe'); return { floor: t, win: false, log }; }
    // 신비 카드 팩: 층마다 20%, 5층 정예·10층 보스 확정
    this.loot.cardPacks = (this.loot.cardPacks ?? 0) + (t === 5 || t === RIFT_FLOORS ? 1 : this.rng.chance(20) ? 1 : 0);
    if (t === RIFT_FLOORS) {
      this.loot.cardPacks += 1;
      this.loot.gold += Math.round(600 * rewardScale(F) * this.goldMult);
      this.loot.refineStones += 3;
      this.loot.stones += 2 + Math.floor(F / 10);
      if (F > 50) this.loot.cores += 30;
      log.push({ t: 'special', who: '균열', text: '균열을 끝까지 돌파했다! 완주 보상 획득' });
    }
    this.floorsCleared++;
    if (t === 5) { for (const c of this.party) { if (!c.alive) { c.alive = true; c.hp = 0; } c.hp = c.maxHp; c.mp = c.maxMp; c.status = {}; } log.push({ t: 'special', who: '균열', text: '정예를 쓰러뜨리고 숨을 고른다 (전원 회복)' }); }
    else this.floorRegen();
    return { floor: t, win: true, log };
  }

  /** 레이드: 보스 1 + 형태별 수하, 10라운드, 이어지는 HP */
  private runRaid(): FloorResult {
    const log: BattleEvent[] = [];
    const r = this.settings.raid!;
    const d = RAID_DIFF[r.diff], form = raidForm(r.week);
    const f = d.floor;
    const boss = fromMonster(MONSTERS[form.monster], f, d.tune);
    boss.maxHp = r.maxHp;
    boss.hp = r.hpLeft;
    const enemies = [boss, ...form.adds.map((id) => fromMonster(MONSTERS[id], f, d.tune))];
    nameUnique(enemies);
    log.push({ t: 'wave', floor: f, wave: 1, enemies: enemies.map(snap), elite: false, boss: true });
    log.push({ t: 'special', who: boss.name, text: `${RAID_ROUNDS}라운드 안에 최대한 많은 피해를 입혀라! (남은 HP ${Math.round((r.hpLeft / r.maxHp) * 100)}%)` });
    const ctx = { rng: this.rng, log, party: this.party, enemies, round: 0, hasBoss: true, floor: f, maxRounds: RAID_ROUNDS, rep: this.report };
    runBattle(ctx);
    this.raidDealt = Math.max(0, Math.round(r.hpLeft - Math.max(0, boss.hp)));
    this.raidKilled = !boss.alive;
    const wiped = this.party.every((p) => !p.alive);
    log.push({ t: 'special', who: '레이드', text: this.raidKilled ? `벨리알 처치! 총 ${this.raidDealt.toLocaleString('ko-KR')} 피해` : `${wiped ? '파티 전멸' : '시간 종료'} — 이번 도전 ${this.raidDealt.toLocaleString('ko-KR')} 피해 (${((this.raidDealt / r.maxHp) * 100).toFixed(1)}%)` });
    this.finish(wiped && !this.raidKilled ? 'wipe' : 'target');
    return { floor: this.floor, win: this.raidKilled, log };
  }

  private collect(dead: Combatant[], f: number) {
    for (const m of dead) {
      const d = m.mdef!;
      const elite = d.tags.includes('elite'), boss = d.tags.includes('boss');
      // 보스는 기본 보상이 커서 스케일을 완만하게
      const sc = boss ? Math.sqrt(rewardScale(f)) : rewardScale(f);
      const low = lowFloorRate(f, this.settings.bestFloor);
      this.loot.exp += d.exp * sc * low;
      this.loot.gold += d.gold * sc * this.goldMult * low;
      if (boss) { this.loot.stones += 3 + Math.floor(f / 2); this.loot.blessings += 1 + Math.floor(f / 20); }
      else if (elite) { if (this.rng.chance(STONE_CHANCE(f).elite)) this.loot.stones += 1; if (this.rng.chance(BLESS_CHANCE(f).elite)) this.loot.blessings += 1; }
      else if (this.rng.chance(STONE_CHANCE(f).normal)) this.loot.stones += 1 + Math.floor(f / 15);
      if (this.rng.chance(boss ? REFINE_CHANCE.boss : elite ? REFINE_CHANCE.elite : REFINE_CHANCE.normal)) this.loot.refineStones += boss && this.floor > 50 ? 2 : 1;
      // 마왕성: 세트 재료·세트 장비
      if (f > 50) {
        const k = boss ? 'boss' : elite ? 'elite' : 'normal';
        if (this.rng.chance(SHARD_CHANCE[k])) this.loot.cores += boss ? 5 + this.rng.int(0, 3) : elite ? 1 + this.rng.int(0, 2) : 1;
        if (this.rng.chance(CORE_CHANCE[k])) this.loot.cores += 10 * (boss ? 2 + this.rng.int(0, 1) : 1);
        if (this.rng.chance(SET_DROP_CHANCE[k] * this.itemMult)) this.loot.equips.push(rollSetEquip(this.rng));
      }
      const dropChance = (boss ? DROP_CHANCE.boss : elite ? DROP_CHANCE.elite : DROP_CHANCE.normal) * this.itemMult;
      if (this.rng.chance(dropChance)) this.loot.equips.push(rollEquip(this.rng, f, boss ? 3 : 1));
    }
  }

  /** 자동 진행 판단. null이면 계속 */
  autoStopReason(): StopReason | null {
    const s = this.settings;
    if (s.mode === 'repeat') {
      if (s.retreatOnDown && this.party.some((c) => !c.alive)) return 'down';
      if (s.retreatHpPct > 0 && this.avgHpPct <= s.retreatHpPct) return 'lowHp';
      if (this.floorsCleared >= Math.min(MAX_REPEAT, s.repeatCount)) return 'target';
      return null;
    }
    if (this.settings.daily) return 'target';
    if (this.settings.tower) return null;
    if (this.settings.rift) return this.floor >= RIFT_FLOORS ? 'target' : null;
    if (this.floor >= MAX_FLOOR) return 'cleared';
    if (this.floor >= (regionOf(s.startFloor).floors?.[1] ?? MAX_FLOOR)) return 'regionEnd';
    if (this.floor >= s.targetFloor) return 'target';
    if (s.retreatOnDown && this.party.some((c) => !c.alive)) return 'down';
    if (s.retreatHpPct > 0 && this.avgHpPct <= s.retreatHpPct) return 'lowHp';
    if (s.stopBeforeBoss && this.isBossFloor(this.floor + 1)) return 'bossAhead';
    return null;
  }

  get repeating() { return this.settings.mode === 'repeat'; }
  /** 다음 층으로 (반복 모드면 같은 층 다시) */
  next() { if (!this.repeating) this.floor++; }
  /** 이번 탐험에서 끝까지 클리어한 가장 깊은 층 */
  reachedFloor() {
    if ((this.stopReason === 'wipe' || this.stopReason === 'timeout') && (!this.repeating || this.floorsCleared === 0)) return this.floor - 1;
    return this.floor;
  }

  finish(reason: StopReason) {
    if (this.finished) return;
    this.finished = true;
    if (reason === 'wipe' && !this.settings.insured) {
      // 전멸: 골드·장비 절반 손실, 경험치는 유지
      this.loot.gold *= 0.5;
      this.loot.equips = this.loot.equips.filter(() => this.rng.chance(50));
    }
    this.loot.gold = Math.round(this.loot.gold);
    this.loot.exp = Math.round(this.loot.exp);
    this.stopReason = reason;
  }
  stopReason: StopReason | null = null;

  /** 자동 진행. decideBoss: 보스 앞에서 도전할지 (기본: 도전) */
  runAuto(decideBoss: (exp: Expedition) => boolean = () => true, onFloor?: (r: FloorResult) => void) {
    while (!this.finished) {
      const r = this.runFloor();
      onFloor?.(r);
      if (!r.win) break;
      const reason = this.autoStopReason();
      if (reason === 'bossAhead' && decideBoss(this)) { this.next(); continue; }
      if (reason) { this.finish(reason); break; }
      this.next();
    }
    return this;
  }

  /** 탐험 결과를 캐릭터에 반영 (경험치 분배). 레벨업 수 반환 */
  applyExp(): Record<string, number> {
    const n = this.chars.length;
    const share = (this.loot.exp / n) * (1 + 0.2 * (n - 1));
    const ups: Record<string, number> = {};
    this.chars.forEach((c, i) => {
      ups[c.uid] = gainExp(c, Math.round(share * (1 + this.party[i].extra.expGain / 100)));
    });
    return ups;
  }
}

// ───────── 장비 드롭 ─────────
/** 층별 장비 등급 가중치 (같은 티어 구간 안에서 깊을수록 상위 등급) */
export function rarityWeights(floor: number): number[] {
  const band = (floor - 1) % 10;
  return [55 - band * 3, 27, 12 + band, 5 + band * 0.8, 1 + band * 0.3].map((x) => Math.max(0.1, x));
}
/** 드롭 확률 표 (확률 공개용) */
export const DROP_CHANCE = { normal: 3, elite: 30, boss: 100 };
export const STONE_CHANCE = (floor: number) => ({ normal: 6 + floor * 0.2, elite: 60, bossCount: 3 + Math.floor(floor / 2) });
export const BLESS_CHANCE = (floor: number) => ({ elite: 8, bossCount: 1 + Math.floor(floor / 20) });
/** 세트 장비: 세트·부위 무작위 (지정 가능), 영웅 70% / 전설 30% */
export function rollSetEquip(rng: Rng, setId?: string, baseId?: string): Equip {
  const base = baseId ? EQUIP_BASES.find((b) => b.id === baseId)! : rng.pick(SET_BASES.filter((b) => (setId ? b.set === setId : b.set !== RAID_SET)));
  const r = rng.weighted([4, 5] as Rarity[], (x) => SET_RARITY[x as 4 | 5]);
  const options: Modifier[] = [];
  for (let i = 0; i < r - 2; i++) options.push(rollOption(() => rng.pick(OPTION_POOL), base.tier, options.map((o) => o.key)));
  return { uid: newUid('e'), baseId: base.id, rarity: r, enhance: 0, failStack: 0, options };
}
export function rollEquip(rng: Rng, floor: number, minRarity: Rarity = 1): Equip {
  const tier = tierOfFloor(floor);
  const cands = EQUIP_BASES.filter((b) => b.tier === tier);
  const base = rng.pick(cands);
  // 깊은 층일수록 상위 등급
  const w = rarityWeights(floor);
  let r = (rng.weighted([1, 2, 3, 4, 5] as Rarity[], (x) => w[x - 1]));
  if (r < minRarity) r = minRarity;
  const options: Modifier[] = [];
  const optCount = r >= 3 ? r - 2 : 0;
  for (let i = 0; i < optCount; i++) options.push(rollOption(() => rng.pick(OPTION_POOL), tier, options.map((o) => o.key)));
  return { uid: newUid('e'), baseId: base.id, rarity: r, enhance: 0, failStack: 0, options };
}
