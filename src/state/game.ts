import { advanceJob, canAdvance, createHero, gainExp, levelCap, newUid, syncSkillSlots } from '../core/character';
import { expToNext, finalStats, partyMods } from '../core/stats';
import { COMMON_TRAITS } from '../data/traits';
import { DEFAULT_SETTINGS, Expedition, type ExpeditionSettings, rollEquip, rollSetEquip } from '../core/dungeon';
import { Rng } from '../core/rng';
import { enhance as doEnhance, enhanceCost, hire as doHire, refreshSlotCost, rollBoard, rollCandidate, rosterLimit, type Candidate } from '../core/town';
import { GRADE_NAME, RARITY_NAME, TARGET_NAME, type Grade, type Character, type Equip, type Modifier, type EquipSlot, EQUIP_SLOTS, wornSlots, type JobId, type Rarity, type Row, type TargetPref } from '../core/types';
import { EQUIP_BASES, EQUIP_BY_ID, OPTION_POOL, OPTION_SLOTS, POTIONS, MAX_POTIONS, RARITY_MULT, TIER_INFO, refineGoldCost, refineStoneCost, rollOption, rollLine, rollLines, POT_NAME, POT_UP, POT_PITY, addRuneCost } from '../data/items';
import { MAX_FLOOR, MONSTERS, floorName, regionOf } from '../data/monsters';
import { R4, r4Reward, r4Today, type R4Diff } from '../data/raid4';
import { ATTEND, CHESTS, MISSIONS, dRewardText, type DReward } from '../data/missions';
import { CRAFT_COST, MYTH_CRAFT_COST, MYTH_SET, RAID_CRAFT_COST, RAID_SET } from '../data/sets';
import { DAILY_BY_ID, DAILY_LIMIT, dailyReward, kstDate, type DailyDef } from '../data/daily';
import { rewardScale } from '../data/monsters';
import { MILESTONES, MILESTONE_SCALES, RAID_DIFF, RAID_DIFF_NAME, RAID_LIMIT, attemptReward, raidMaxHp, raidWeek, type RaidDiff } from '../data/raid';
import { EGG_PRICE, PET_BY_ID, PET_GRADE_NAME, PET_MAX_STARS, hatch, petMods, petSellPrice, type Pet } from '../data/pets';
import { charPower, partyPower } from '../core/power';
import { JOBS } from '../data/jobs';
import { AWAKEN_COST, CARD_BY_ID, CARD_SETS, DECK_SIZE, cardValue, MAX_AWAKEN, cardMods, openPack, type OwnedCard } from '../data/cards';
import { MERC_BY_ID } from '../data/mercenaries';
import { QUESTS, rewardText, type QuestView } from '../data/quests';
import { TOWER_UNLOCK, towerGimmick, towerReward } from '../data/tower';
import { rowOf } from '../core/combat';
import { diagnose, type Report } from '../core/report';

export const SAVE_VERSION = 1;

export interface GameState {
  v: number;
  heroName: string;
  gold: number;
  stones: number;
  blessings: number;
  refineStones: number;
  /** 줍자마자 자동 처리: 체크한 등급은 가방에 안 넣고 분해/판매 */
  autoLoot?: { on: boolean; rarities: Rarity[]; mode: 'dismantle' | 'sell' };
  /** 방치 보상: 마지막으로 받은 시각(ms) */
  idleAt?: number;
  /** 친구 용병: 오늘(KST) 빌린 단원 (복사본) */
  guest?: { date: string; owner: string; ownerName: string; char: Character; on: boolean };
  /** 출석: 마지막 출석 날짜(KST), 누적 일수 */
  att?: { last: string; n: number };
  /** 일일 미션: 날짜, 그날 시작 때 카운터, 받은 상자 */
  dm?: { date: string; base: Record<string, number>; chests: number[] };
  /** 신화의 정수: 4인 레이드 보상, 신화 장비 재료 */
  mythEss?: number;
  /** 4인 레이드: 날짜(KST)별 난이도 보상 수령 */
  r4?: { date: string; done: string[] };
  /** 고대 룬석: 에디셔널 잠재 재료 */
  runes?: number;
  pets: Pet[];
  /** 일일 던전: 날짜(KST)별 사용 횟수, 클리어한 최고 단계 */
  daily: { date: string; used: Record<string, number>; cleared: Record<string, number> };
  /** 개인 레이드: 주차·형태별 누적 피해, 하루 도전 횟수, 받은 구간 보상 */
  raid: { week: number; date: string; used: number; dmg: Partial<Record<RaidDiff, number>>; claimed: Partial<Record<RaidDiff, number[]>>; everKilled: Partial<Record<RaidDiff, boolean>>; best: number };
  /** 세트 재료 */
  shards: number;
  coreMerged?: boolean;
  codex?: string[];
  cards?: Record<string, OwnedCard>;
  deck?: string[];
  cardPacks?: number;
  cnt?: Record<string, number>;
  questIdx?: number;
  tower?: { best: number; claimed: number };
  cores: number;
  /** 레이드 재료: 벨리알의 파편 */
  scales: number;
  activePet: string | null;
  roster: Character[];
  party: string[];               // 출전 uid (최대 4, 주인공 포함 권장)
  board: (Candidate | null)[];
  boardLocks: boolean[];         // 모집판 잠금 (전체 교체에서 제외)
  guildLevel: number;
  inventory: Equip[];
  potions: Record<string, number>;
  maxFloor: number;              // 도달한 최고 층
  bossesKilled: string[];
  settings: ExpeditionSettings;
  news: string[];
  seed: number;
  day: number;
  deals: { equip: Equip; price: number; sold?: boolean }[];  // 잡화점 오늘의 상점 (10칸)
  shopDay?: string;  // 오늘의 상점 날짜(KST)
  packBought?: number;  // 오늘 상점에서 산 카드 팩 수
  stoneStock: number;                        // 오늘 남은 강화석 판매량
}

export const PARTY_MAX = 4;

export const STONE_STOCK = 20;

export function newGame(heroName: string): GameState {
  const hero = createHero(heroName || '용사');
  const rng = new Rng(Date.now());
  hero.equipment.weapon = { uid: 'start_w', baseId: 'w_sword1', rarity: 1, enhance: 0, failStack: 0, options: [] };
  hero.equipment.armor = { uid: 'start_a', baseId: 'a_cloth1', rarity: 1, enhance: 0, failStack: 0, options: [] };
  return {
    v: SAVE_VERSION, heroName: hero.name, gold: 400, stones: 2, blessings: 0, refineStones: 0, pets: [], activePet: null, shards: 0, cores: 0, scales: 0, coreMerged: true, daily: { date: '', used: {}, cleared: {} }, raid: { week: 0, date: '', used: 0, dmg: {}, claimed: {}, everKilled: {}, best: 0 },
    roster: [hero], party: [hero.uid], board: rollBoard(rng, 1, 1, [hero]), boardLocks: [false, false, false, false, false], guildLevel: 1,
    inventory: [], potions: { p_str: 1 }, maxFloor: 0, bossesKilled: [],
    settings: { ...DEFAULT_SETTINGS }, news: ['마을 지하 묘지에서 마물이 올라오기 시작했다. 길드에서 동료를 모아 던전으로 향하자.'],
    seed: Math.floor(rng.next() * 1e9), day: 1, deals: [], stoneStock: STONE_STOCK,
  };
}

/** 매 행동마다 다른 시드 */
export function rngOf(s: GameState) { return new Rng(s.seed++); }
const news = (s: GameState, msg: string) => { s.news.unshift(msg); s.news.length = Math.min(s.news.length, 30); };

export const hero = (s: GameState) => s.roster.find((c) => c.isHero);
/** 길드 기준 레벨: 단원 중 최고 레벨 (모집 레벨·새로고침 비용 기준) */
export const leadLevel = (s: GameState) => Math.max(1, ...s.roster.map((c) => c.level));
export const byUid = (s: GameState, uid: string) => s.roster.find((c) => c.uid === uid);
export const partyChars = (s: GameState) => s.party.map((u) => byUid(s, u)).filter(Boolean) as Character[];
/** 시작 가능한 층: 1 ~ (클리어한 최고 층 + 1) */
export const maxStartFloor = (s: GameState) => Math.min(MAX_FLOOR, s.maxFloor + 1);

export type Result = { ok: true; msg?: string } | { ok: false; msg: string };
const fail = (msg: string): Result => ({ ok: false, msg });

// ───────── 길드 ─────────
export function refreshSlot(s: GameState, i: number): Result {
  const cost = refreshSlotCost(leadLevel(s));
  if (s.gold < cost) return fail('골드가 부족합니다');
  s.gold -= cost;
  s.board[i] = rollCandidate(rngOf(s), leadLevel(s), s.guildLevel, s.roster);
  return { ok: true };
}

export function toggleLock(s: GameState, i: number) {
  s.boardLocks[i] = !s.boardLocks[i];
}

/** 잠기지 않은 칸만 한 번에 교체 */
export const refreshAllCost = (s: GameState) => refreshSlotCost(leadLevel(s)) * s.board.filter((_, i) => !s.boardLocks[i]).length;
export function refreshAll(s: GameState): Result {
  const n = s.board.filter((_, i) => !s.boardLocks[i]).length;
  if (!n) return fail('모든 칸이 잠겨 있어요');
  const cost = refreshAllCost(s);
  if (s.gold < cost) return fail('골드가 부족합니다');
  s.gold -= cost;
  const r = rngOf(s);
  s.board = s.board.map((c, i) => (s.boardLocks[i] ? c : rollCandidate(r, leadLevel(s), s.guildLevel, s.roster)));
  return { ok: true, msg: `${n}칸 교체` };
}

/** 자동 교체: 잠기지 않은 칸 중에 minGrade 이상이 나올 때까지 전체 교체 (최대 maxTries번, 골드 한도). 찾으면 그 칸을 잠금 */
export function autoRefresh(s: GameState, minGrade: Grade, maxTries: number): Result & { tries?: number; spent?: number; found?: string } {
  const hit = () => s.board.findIndex((c, i) => !s.boardLocks[i] && c && MERC_BY_ID[c.mercId].grade >= minGrade);
  if (hit() >= 0) return fail('이미 원하는 등급 지원자가 있어요. 먼저 고용하거나 잠가주세요');
  if (s.boardLocks.every(Boolean)) return fail('모든 칸이 잠겨 있어요');
  let tries = 0, spent = 0;
  while (tries < maxTries) {
    const cost = refreshAllCost(s);
    if (s.gold < cost) break;
    s.gold -= cost; spent += cost; tries++;
    const r = rngOf(s);
    s.board = s.board.map((c, i) => (s.boardLocks[i] ? c : rollCandidate(r, leadLevel(s), s.guildLevel, s.roster)));
    const i = hit();
    if (i >= 0) {
      s.boardLocks[i] = true;
      const m = MERC_BY_ID[s.board[i]!.mercId];
      return { ok: true, tries, spent, found: m.name, msg: `${tries}번 만에 ${GRADE_NAME[m.grade]} ${m.name} 등장! (${spent.toLocaleString('ko-KR')}G 사용 · 자동 잠금)` };
    }
  }
  return { ok: true, tries, spent, msg: tries ? `${tries}번 돌렸지만 못 찾았어요 (${spent.toLocaleString('ko-KR')}G 사용)${s.gold < refreshAllCost(s) ? ' · 골드 부족' : ''}` : '골드가 부족합니다' };
}

export function hireSlot(s: GameState, i: number): Result {
  const cand = s.board[i];
  if (!cand) return fail('빈 자리입니다');
  const r = doHire(cand, s.roster, s.gold, s.guildLevel, rngOf(s));
  if (!r.ok) return fail(r.reason);
  s.gold -= r.cost!;
  if (r.kind === 'hired') {
    s.roster.push(r.character);
    if (r.character.mercId) { s.codex ??= []; if (!s.codex.includes(r.character.mercId)) s.codex.push(r.character.mercId); }
    if (s.party.length < PARTY_MAX) s.party.push(r.character.uid);
    news(s, `${r.character.name}을(를) 고용했다.`);
  } else news(s, r.message);
  // 고용한 칸에는 바로 새 지원자 (무료), 잠금 해제
  s.board[i] = rollCandidate(rngOf(s), leadLevel(s), s.guildLevel, s.roster);
  s.boardLocks[i] = false;
  return { ok: true, msg: r.kind === 'hired' ? `${r.character.name} 합류!` : r.message };
}

export function dismiss(s: GameState, uid: string): Result {
  const c = byUid(s, uid);
  if (!c) return fail('단원을 찾을 수 없습니다');
  if (s.roster.length <= 1) return fail('마지막 단원은 방출할 수 없습니다');
  for (const e of Object.values(c.equipment)) if (e) s.inventory.push(e);
  s.roster = s.roster.filter((x) => x.uid !== uid);
  s.party = s.party.filter((x) => x !== uid);
  news(s, `${c.name}이(가) 길드를 떠났다.`);
  return { ok: true };
}

export function togglePartyMember(s: GameState, uid: string): Result {
  if (s.party.includes(uid)) {
    if (s.party.length === 1) return fail('최소 1명은 출전해야 합니다');
    s.party = s.party.filter((x) => x !== uid);
    return { ok: true };
  }
  if (s.party.length >= PARTY_MAX) return fail(`파티는 최대 ${PARTY_MAX}명입니다`);
  s.party.push(uid);
  return { ok: true };
}

// ───────── 일일 던전 ─────────
export function dailyState(s: GameState) {
  const today = kstDate();
  if (s.daily.date !== today) s.daily = { date: today, used: {}, cleared: s.daily.cleared ?? {} };
  return s.daily;
}
export const dailyLeft = (s: GameState, id: string) => DAILY_LIMIT - (dailyState(s).used[id] ?? 0);
export const dailyOpen = (s: GameState, d: DailyDef) => s.maxFloor >= d.unlockFloor;
export const stageOpen = (s: GameState, d: DailyDef, k: number) => dailyOpen(s, d) && s.maxFloor >= d.stageUnlock(k);
export const bump = (s: GameState, k: string, n = 1) => {
  s.cnt ??= {};
  // 날짜가 바뀐 뒤 첫 행동이면 일일 미션 기준을 먼저 잡음 (오늘 한 것부터 셈)
  if (s.dm?.date !== kstDate()) s.dm = { date: kstDate(), base: { ...s.cnt }, chests: [] };
  s.cnt[k] = (s.cnt[k] ?? 0) + n;
};
export function startDaily(s: GameState, id: string, stage: number, potions: string[]): Expedition | string {
  const d = DAILY_BY_ID[id];
  if (!d || !stageOpen(s, d, stage)) return '아직 열리지 않은 단계예요';
  if (dailyLeft(s, id) <= 0) return '오늘 입장 횟수를 다 썼어요 (자정에 초기화)';
  const ok = canDepart(s);
  if (!ok.ok) return ok.msg;
  const pots = potions.filter((p) => (s.potions[p] ?? 0) > 0).slice(0, MAX_POTIONS);
  for (const p of pots) s.potions[p]--;
  const f = d.stageFloor(stage);
  bump(s, 'daily');
  return new Expedition(withGuest(s), { ...DEFAULT_SETTINGS, startFloor: f, targetFloor: f, mode: 'advance', auto: true, retreatHpPct: 0, potions: pots, petMods: petPartyMods(s), daily: { id, stage } }, rngOf(s));
}
/** 소탕: 클리어한 단계는 전투 없이 보상 */
export function sweepDaily(s: GameState, id: string, stage: number): Result {
  const d = DAILY_BY_ID[id];
  const st = dailyState(s);
  if ((st.cleared[id] ?? 0) < stage) return fail('한 번 클리어한 단계만 소탕할 수 있어요');
  if (dailyLeft(s, id) <= 0) return fail('오늘 입장 횟수를 다 썼어요 (자정에 초기화)');
  st.used[id] = (st.used[id] ?? 0) + 1;
  const goldMult = 1 + (fromCharacterExtra(s)?.goldGain ?? 0) / 100;
  const r = dailyReward(d, stage, rewardScale(d.stageFloor(stage)));
  s.gold += Math.round(r.gold * goldMult); s.stones += r.stones; s.blessings += r.blessings; s.refineStones += r.refineStones; s.shards += r.shards; s.cores += r.cores; s.runes = (s.runes ?? 0) + r.runes;
  const ups: string[] = [];
  if (r.exp) {
    const party = partyChars(s), each = r.exp / Math.max(1, party.length);
    for (const c of party) { const lv = c.level; gainExp(c, each); syncSkillSlots(c); if (c.level > lv) ups.push(`${c.name} Lv.${c.level}`); }
  }
  const parts = [r.gold && `골드 ${r.gold.toLocaleString('ko-KR')}`, r.exp && `경험치 ${r.exp.toLocaleString('ko-KR')}`, r.stones && `강화석 ${r.stones}`, r.blessings && `축복 ${r.blessings}`, r.refineStones && `제련석 ${r.refineStones}`, r.cores && `핵 ${r.cores}`, r.runes && `고대 룬석 ${r.runes}`].filter(Boolean);
  news(s, `${d.name} ${stage}단계 소탕: ${parts.join(', ')}`);
  bump(s, 'daily');
  return { ok: true, msg: `소탕 완료! ${parts.join(' · ')}${ups.length ? ` · ${ups.join(', ')}` : ''}` };
}
const fromCharacterExtra = (s: GameState) => { const p = partyChars(s); return p.length ? finalStats(p[0], partyMods(p)).extra : null; };

// ───────── 개인 레이드 ─────────
export function raidState(s: GameState) {
  const w = raidWeek(), today = kstDate();
  if (s.raid.week !== w) s.raid = { ...s.raid, week: w, dmg: {}, claimed: {}, best: 0 };
  if (s.raid.date !== today) s.raid = { ...s.raid, date: today, used: 0 };
  return s.raid;
}
export const raidLeft = (s: GameState) => RAID_LIMIT - raidState(s).used;
export function raidOpen(s: GameState, diff: RaidDiff): boolean {
  if (s.maxFloor < 50) return false;
  if (diff === 'hard') return !!s.raid.everKilled.normal;
  if (diff === 'hell') return !!s.raid.everKilled.hard;
  return true;
}
export const raidHpLeft = (s: GameState, diff: RaidDiff) => Math.max(0, raidMaxHp(diff) - (raidState(s).dmg[diff] ?? 0));
export function startRaid(s: GameState, diff: RaidDiff, potions: string[]): Expedition | string {
  if (!raidOpen(s, diff)) return diff === 'normal' ? '마왕숲 50층을 클리어하면 열려요' : `${RAID_DIFF_NAME[diff === 'hell' ? 'hard' : 'normal']} 난이도를 처치하면 열려요`;
  if (raidLeft(s) <= 0) return '오늘 도전 횟수를 다 썼어요 (자정에 초기화)';
  const hpLeft = raidHpLeft(s, diff);
  if (hpLeft <= 0) return '이번 주 벨리알은 이미 쓰러뜨렸어요. 다음 주 월요일에 새 형태로 돌아와요';
  const ok = canDepart(s);
  if (!ok.ok) return ok.msg;
  const pots = potions.filter((p) => (s.potions[p] ?? 0) > 0).slice(0, MAX_POTIONS);
  for (const p of pots) s.potions[p]--;
  const f = RAID_DIFF[diff].floor;
  bump(s, 'raid');
  return new Expedition(partyChars(s), { ...DEFAULT_SETTINGS, startFloor: f, targetFloor: f, mode: 'advance', auto: true, retreatHpPct: 0, potions: pots, petMods: petPartyMods(s), raid: { diff, week: raidWeek(), hpLeft, maxHp: raidMaxHp(diff) } }, rngOf(s));
}
/** 레이드 결과 반영: 도전 보상 + 구간(25/50/75/처치) 보상 */
function applyRaid(s: GameState, ex: Expedition): string[] {
  const r = ex.settings.raid!;
  const st = raidState(s);
  st.used++;
  const diff = r.diff, m = RAID_DIFF[diff].mult, max = r.maxHp;
  const before = st.dmg[diff] ?? 0;
  const after = Math.min(max, before + ex.raidDealt);
  st.dmg[diff] = after;
  st.best = Math.max(st.best, ex.raidDealt);
  const lines: string[] = [];
  const ar = attemptReward(diff, ex.raidDealt / max);
  s.gold += ar.gold; s.refineStones += ar.refineStones; s.scales += ar.scales;
  lines.push(`도전 보상: 골드 ${ar.gold.toLocaleString('ko-KR')} · 제련석 ${ar.refineStones} · 벨리알의 파편 ${ar.scales}`);
  const claimed = new Set(st.claimed[diff] ?? []);
  const rng = rngOf(s);
  for (const ms of MILESTONES) {
    if (claimed.has(ms) || (after / max) * 100 < ms) continue;
    claimed.add(ms);
    const sc = MILESTONE_SCALES[ms] * m; s.scales += sc;
    if (ms === 25) { s.refineStones += 10 * m; lines.push(`25% 달성: 제련석 ${10 * m} · 벨리알의 파편 ${sc}`); }
    if (ms === 50) { s.cores += 70 * m; lines.push(`50% 달성: 군단장의 핵 ${70 * m} · 벨리알의 파편 ${sc}`); }
    if (ms === 75) { const egg = addPet(s, hatch(rng, RAID_DIFF[diff].eggMin)); lines.push(`75% 달성: 펫 알 → ${PET_GRADE_NAME[egg.grade]} ${PET_BY_ID[egg.kind].name} · 벨리알의 파편 ${sc}`); }
    if (ms === 100) {
      const e = rollSetEquip(rng); e.rarity = 5;
      s.inventory.push(e); s.cores += 5 * m; s.gold += 100000 * m;
      st.everKilled = { ...st.everKilled, [diff]: true };
      lines.push(`처치 보상: 전설 ${EQUIP_BY_ID[e.baseId].name} · 군단장의 핵 ${5 * m} · 골드 ${(100000 * m).toLocaleString('ko-KR')} · 벨리알의 파편 ${sc}`);
    }
  }
  st.claimed[diff] = [...claimed];
  news(s, `레이드(${RAID_DIFF_NAME[diff]}): 벨리알에게 ${ex.raidDealt.toLocaleString('ko-KR')} 피해${ex.raidKilled ? ' — 처치!' : ''}`);
  return lines;
}

// ───────── 제작소 (세트 장비) ─────────
export function craftSet(s: GameState, baseId: string): Result {
  const b = EQUIP_BY_ID[baseId];
  if (!b?.set) return fail('제작할 수 없는 장비예요');
  if (b.set === MYTH_SET) {
    const mc = MYTH_CRAFT_COST[b.slot];
    if ((s.mythEss ?? 0) < mc.ess) return fail(`신화의 정수가 부족해요 (${mc.ess}개 필요)`);
    if (s.gold < mc.gold) return fail('골드가 부족합니다');
    s.mythEss = (s.mythEss ?? 0) - mc.ess; s.gold -= mc.gold;
    const e = rollSetEquip(rngOf(s), b.set, b.id);
    s.inventory.push(e);
    bump(s, 'craft');
    return { ok: true, msg: `신화 장비 ${b.name} 완성! (가방에 들어갔어요)` };
  }
  if (b.set === RAID_SET) {
    const rc = RAID_CRAFT_COST[b.slot];
    if (s.scales < rc.scales) return fail(`벨리알의 파편이 부족해요 (${rc.scales}개 필요)`);
    if (s.gold < rc.gold) return fail('골드가 부족합니다');
    s.scales -= rc.scales; s.gold -= rc.gold;
    const e = rollSetEquip(rngOf(s), b.set, b.id);
    s.inventory.push(e);
    bump(s, 'craft');
  return { ok: true, msg: `${RARITY_NAME[e.rarity]} ${b.name} 완성! (가방에 들어갔어요)` };
  }
  const c = CRAFT_COST[b.slot];
  if (s.cores < c.cores) return fail(`군단장의 핵이 부족해요 (${c.cores}개 필요)`);
  if (s.gold < c.gold) return fail('골드가 부족합니다');
  s.cores -= c.cores; s.gold -= c.gold;
  const e = rollSetEquip(rngOf(s), b.set, b.id);
  s.inventory.push(e);
  bump(s, 'craft');
  return { ok: true, msg: `${RARITY_NAME[e.rarity]} ${b.name} 완성! (가방에 들어갔어요)` };
}

// ───────── 펫 우리 ─────────
export const activePet = (s: GameState) => s.pets.find((p) => p.uid === s.activePet);
export const petPartyMods = (s: GameState) => [...petMods(activePet(s)), ...cardMods(s.cards ?? {}, s.deck ?? []).mods];
/** 펫 효과까지 넣은 파티 전투력 */
export const statePower = (s: GameState) => partyPower(partyChars(s), petPartyMods(s));
function addPet(s: GameState, p: Omit<Pet, 'uid'>): Pet {
  bump(s, 'petSeq');
  const pet = { ...p, uid: `p${s.seed}_${s.cnt!.petSeq}_${Math.floor(rngOf(s).next() * 1e6)}` };
  s.pets.push(pet);
  if (!s.activePet) s.activePet = pet.uid;
  autoMergePets(s);
  return pet;
}
/** 같은 종류·등급 펫은 자동으로 합성 (★ 올리기). 동행 중인 펫이 있으면 그쪽으로. 합친 마리 수 반환 */
export function autoMergePets(s: GameState): number {
  let merged = 0;
  const groups: Record<string, Pet[]> = {};
  for (const p of s.pets) (groups[`${p.kind}:${p.grade}`] ??= []).push(p);
  for (const g of Object.values(groups)) {
    if (g.length < 2) continue;
    g.sort((a, b) => (a.uid === s.activePet ? -1 : b.uid === s.activePet ? 1 : b.stars - a.stars));
    let ti = 0;
    for (let i = 1; i < g.length; i++) {
      while (ti < i && g[ti].stars >= PET_MAX_STARS) ti++;
      if (ti >= i) continue;
      const t = g[ti], food = g[i];
      t.stars = Math.min(PET_MAX_STARS, t.stars + 1 + food.stars);
      s.pets = s.pets.filter((x) => x !== food);
      if (s.activePet === food.uid) s.activePet = t.uid;
      merged++;
    }
  }
  return merged;
}
/** 등급 이하 펫 일괄 보내기 (동행 중 제외) */
export function sellPetsUpTo(s: GameState, grade: Grade): Result {
  const list = s.pets.filter((p) => p.grade <= grade && p.uid !== s.activePet);
  if (!list.length) return fail('보낼 펫이 없어요');
  const gold = list.reduce((a, p) => a + petSellPrice(p), 0);
  s.pets = s.pets.filter((p) => !list.includes(p));
  s.gold += gold;
  return { ok: true, msg: `${list.length}마리를 보냈어요 · +${fmtG(gold)}G` };
}
export let lastHatch: { kind: string; grade: Grade }[] = [];
export function buyEggs(s: GameState, n: number): Result {
  const cost = EGG_PRICE * n;
  if (s.gold < cost) return fail('골드가 부족합니다');
  s.gold -= cost;
  const r = rngOf(s);
  const before = s.pets.length;
  const got = Array.from({ length: n }, () => addPet(s, hatch(r)));
  const merged = before + n - s.pets.length;
  const best = got.reduce((a, b) => (b.grade > a.grade ? b : a));
  lastHatch = got.map((p) => ({ kind: p.kind, grade: p.grade }));
  return { ok: true, msg: `${n === 1 ? `${PET_GRADE_NAME[best.grade]} ${PET_BY_ID[best.kind].name} 부화!` : `알 ${n}개 부화! 최고 ${PET_GRADE_NAME[best.grade]} ${PET_BY_ID[best.kind].name}`}${merged ? ` · 중복 ${merged}마리 자동 합성` : ''}` };
}
export function setActivePet(s: GameState, uid: string): Result {
  const p = s.pets.find((x) => x.uid === uid);
  if (!p) return fail('펫을 찾을 수 없습니다');
  s.activePet = uid;
  return { ok: true, msg: `${PET_BY_ID[p.kind].name}을(를) 데려갑니다` };
}
/** 같은 종류·등급 펫을 먹여 +1성 */
export function mergePet(s: GameState, uid: string): Result {
  const p = s.pets.find((x) => x.uid === uid);
  if (!p) return fail('펫을 찾을 수 없습니다');
  if (p.stars >= PET_MAX_STARS) return fail('이미 최대 성급이에요');
  const food = s.pets.filter((x) => x.uid !== uid && x.kind === p.kind && x.grade === p.grade && x.uid !== s.activePet).sort((a, b) => a.stars - b.stars)[0];
  if (!food) return fail('같은 종류·등급의 펫이 하나 더 필요해요');
  s.pets = s.pets.filter((x) => x !== food);
  p.stars = Math.min(PET_MAX_STARS, p.stars + 1 + food.stars);
  return { ok: true, msg: `${PET_BY_ID[p.kind].name} ★${p.stars}!` };
}
export function sellPet(s: GameState, uid: string): Result {
  const p = s.pets.find((x) => x.uid === uid);
  if (!p) return fail('펫을 찾을 수 없습니다');
  if (s.activePet === uid) return fail('데려가는 펫은 팔 수 없어요');
  s.pets = s.pets.filter((x) => x !== p);
  s.gold += petSellPrice(p);
  return { ok: true, msg: `${fmtG(petSellPrice(p))}G에 보냈어요` };
}
const fmtG = (n: number) => n.toLocaleString('ko-KR');

export function setRow(s: GameState, uid: string, row: Row): Result {
  const c = byUid(s, uid);
  if (!c) return fail('단원을 찾을 수 없습니다');
  c.row = row;
  return { ok: true };
}
export function setTarget(s: GameState, uid: string, t: TargetPref): Result {
  const c = byUid(s, uid);
  if (!c) return fail('단원을 찾을 수 없습니다');
  c.target = t;
  return { ok: true, msg: `${c.name}: ${TARGET_NAME[t]}` };
}

export const guildUpgradeCost = (lv: number) => 1500 * lv * lv;
export function upgradeGuild(s: GameState): Result {
  const cost = guildUpgradeCost(s.guildLevel);
  if (s.gold < cost) return fail('골드가 부족합니다');
  s.gold -= cost;
  s.guildLevel++;
  news(s, `길드가 ${s.guildLevel}레벨이 되었다. 보유 인원 ${rosterLimit(s.guildLevel)}명.`);
  return { ok: true };
}

export function advance(s: GameState, uid: string, to: JobId): Result {
  const c = byUid(s, uid);
  if (!c || !canAdvance(c)) return fail('전직 조건이 안 됩니다');
  advanceJob(c, to);
  news(s, `${c.name}이(가) ${JOBS[to].name}(으)로 전직했다!`);
  return { ok: true, msg: `${JOBS[to].name} 전직!` };
}

export function moveSkill(s: GameState, uid: string, idx: number, dir: -1 | 1) {
  const c = byUid(s, uid);
  if (!c) return;
  const j = idx + dir;
  if (j < 0 || j >= c.skillSlots.length) return;
  [c.skillSlots[idx], c.skillSlots[j]] = [c.skillSlots[j], c.skillSlots[idx]];
}

// ───────── 장비 ─────────
export function canWear(c: Character, e: Equip) {
  const b = EQUIP_BY_ID[e.baseId];
  return !b.jobs || b.jobs.includes(JOBS[c.jobId].base);
}

/** 아이템이 들어갈 칸: 반지는 빈 칸 먼저, 둘 다 차 있으면 지정 칸(없으면 1번) */
export function targetSlot(c: Character, e: Equip, want?: EquipSlot): EquipSlot {
  const opts = wornSlots(EQUIP_BY_ID[e.baseId].slot);
  if (want && opts.includes(want)) return want;
  return opts.find((x) => !c.equipment[x]) ?? opts[0];
}
/** 캐릭터가 이 장비를 끼고 있는 칸 */
export const slotOfWorn = (c: Character, e: Equip) => EQUIP_SLOTS.find((x) => c.equipment[x]?.uid === e.uid);

export function equip(s: GameState, uid: string, equipUid: string, want?: EquipSlot): Result {
  const c = byUid(s, uid);
  const idx = s.inventory.findIndex((e) => e.uid === equipUid);
  if (!c || idx < 0) return fail('장비를 찾을 수 없습니다');
  const e = s.inventory[idx];
  if (!canWear(c, e)) return fail('이 직업은 착용할 수 없습니다');
  const slot = targetSlot(c, e, want);
  s.inventory.splice(idx, 1);
  const old = c.equipment[slot];
  if (old) s.inventory.push(old);
  c.equipment[slot] = e;
  return { ok: true };
}

export function unequip(s: GameState, uid: string, slot: EquipSlot): Result {
  const c = byUid(s, uid);
  const e = c?.equipment[slot];
  if (!c || !e) return fail('장비가 없습니다');
  delete c.equipment[slot];
  s.inventory.push(e);
  return { ok: true };
}

/** 창고에서 바로 장착: 다른 사람이 끼고 있으면 벗겨서 옮김 */
export function equipTo(s: GameState, equipUid: string, uid: string, want?: EquipSlot): Result {
  const f = findEquip(s, equipUid);
  const c = byUid(s, uid);
  if (!f || !c) return fail('장비를 찾을 수 없습니다');
  if (!canWear(c, f.e)) return fail(`${c.name}은(는) 착용할 수 없습니다`);
  if (f.owner === c && (!want || c.equipment[want] === f.e)) return { ok: true };
  if (f.owner) unequip(s, f.owner.uid, slotOfWorn(f.owner, f.e)!);
  const r = equip(s, uid, equipUid, want);
  return r.ok ? { ok: true, msg: `${c.name}에게 장착` } : r;
}

// ───────── 자동 장착 (가방 장비만 사용, 다른 단원 장비는 건드리지 않음) ─────────
const EQ_SLOTS: EquipSlot[] = EQUIP_SLOTS;
export const SLOT_KO: Record<EquipSlot, string> = { weapon: '무기', hat: '모자', armor: '상의', bottom: '하의', accessory: '목걸이', ring1: '반지1', ring2: '반지2' };

/** 한 칸에 가방 장비 중 전투력이 가장 오르는 것 (없으면 null) */
function bestBagItem(s: GameState, c: Character, slot: EquipSlot): { item: Equip; gain: number } | null {
  const cur = c.equipment[slot];
  const base = charPower(c);
  let best: { item: Equip; gain: number } | null = null;
  for (const e of s.inventory) {
    if (!wornSlots(EQUIP_BY_ID[e.baseId].slot).includes(slot) || !canWear(c, e)) continue;
    c.equipment[slot] = e;
    const gain = charPower(c) - base;
    if (gain > 0 && (!best || gain > best.gain)) best = { item: e, gain };
  }
  if (cur) c.equipment[slot] = cur; else delete c.equipment[slot];
  return best;
}

export function autoEquip(s: GameState, uid: string): Result {
  const c = byUid(s, uid);
  if (!c) return fail('캐릭터를 찾을 수 없습니다');
  const before = charPower(c);
  const changed: string[] = [];
  for (const slot of EQ_SLOTS) {
    const b = bestBagItem(s, c, slot);
    if (!b) continue;
    equip(s, uid, b.item.uid, slot);
    changed.push(SLOT_KO[slot]);
  }
  if (!changed.length) return { ok: true, msg: '이미 가방 장비 중 최적이에요' };
  return { ok: true, msg: `${c.name} 전투력 ${before.toLocaleString('ko-KR')} → ${charPower(c).toLocaleString('ko-KR')} (${changed.join('·')} 교체)` };
}

/** 파티 전체: 전투력이 가장 크게 오르는 교체부터 하나씩 반복 */
export function autoEquipParty(s: GameState): Result {
  const party = partyChars(s);
  const before = partyPower(party);
  let swaps = 0;
  for (let guard = 0; guard < 50; guard++) {
    let pick: { c: Character; item: Equip; gain: number; slot: EquipSlot } | null = null;
    for (const c of party) for (const slot of EQ_SLOTS) {
      const b = bestBagItem(s, c, slot);
      if (b && (!pick || b.gain > pick.gain)) pick = { c, item: b.item, gain: b.gain, slot };
    }
    if (!pick) break;
    equip(s, pick.c.uid, pick.item.uid, pick.slot);
    swaps++;
  }
  if (!swaps) return { ok: true, msg: '이미 가방 장비 중 최적이에요' };
  const after = partyPower(party);
  return { ok: true, msg: `파티 전투력 ${before.toLocaleString('ko-KR')} → ${after.toLocaleString('ko-KR')} (${swaps}개 교체)` };
}

/** 장비 전체 해제: 한 명 */
export function unequipAll(s: GameState, uid: string): Result {
  const c = byUid(s, uid);
  if (!c) return fail('캐릭터를 찾을 수 없습니다');
  const n = Object.values(c.equipment).filter(Boolean).length;
  if (!n) return fail('끼고 있는 장비가 없어요');
  for (const sl of EQ_SLOTS) if (c.equipment[sl]) unequip(s, uid, sl);
  return { ok: true, msg: `${c.name} 장비 ${n}개를 가방에 넣었어요` };
}
/** 장비 전체 해제: 출전 파티 전원 */
export function unequipParty(s: GameState): Result {
  let n = 0;
  for (const c of partyChars(s)) for (const sl of EQ_SLOTS) if (c.equipment[sl]) { unequip(s, c.uid, sl); n++; }
  return n ? { ok: true, msg: `파티 장비 ${n}개를 가방에 넣었어요` } : fail('파티가 끼고 있는 장비가 없어요');
}

/** 장착 중이거나 가방에 있는 장비 찾기 */
export function findEquip(s: GameState, equipUid: string): { e: Equip; owner?: Character } | null {
  const inv = s.inventory.find((e) => e.uid === equipUid);
  if (inv) return { e: inv };
  for (const c of s.roster) for (const e of Object.values(c.equipment)) if (e?.uid === equipUid) return { e, owner: c };
  return null;
}

export function enhanceEquip(s: GameState, equipUid: string, useBlessing: boolean): Result & { success?: boolean } {
  const f = findEquip(s, equipUid);
  if (!f) return fail('장비를 찾을 수 없습니다');
  if (f.e.enhance >= 15) return fail('이미 최대 강화입니다');
  const cost = enhanceCost(f.e.enhance + 1);
  if (s.stones < cost.stone) return fail('강화석이 부족합니다');
  if (s.gold < cost.gold) return fail('골드가 부족합니다');
  if (useBlessing && s.blessings < 1) return fail('축복 주문서가 없습니다');
  bump(s, 'enh');
  s.stones -= cost.stone;
  s.gold -= cost.gold;
  if (useBlessing) s.blessings--;
  const r = doEnhance(f.e, rngOf(s), useBlessing);
  return r.success
    ? { ok: true, success: true, msg: `+${f.e.enhance} 강화 성공!` }
    : { ok: true, success: false, msg: `강화 실패… (다음 성공률 +${f.e.failStack * 5}%p)` };
}

export const dismantleValue = (e: Equip) => e.rarity + Math.floor(e.enhance / 3);
/** 자동 강화: target 단계가 될 때까지 (재료가 떨어지면 멈춤). 실패해도 단계 하락·파괴 없음 */
export function autoEnhance(s: GameState, equipUid: string, target: number, useBlessing: boolean): Result {
  const f = findEquip(s, equipUid);
  if (!f) return fail('장비를 찾을 수 없습니다');
  if (f.e.enhance >= target) return fail(`이미 +${f.e.enhance}이에요`);
  const start = f.e.enhance;
  let tries = 0, stones = 0, gold = 0, bless = 0, stop = '';
  while (f.e.enhance < target && tries < 500) {
    const cost = enhanceCost(f.e.enhance + 1);
    const ub = useBlessing && s.blessings > 0;
    if (s.stones < cost.stone) { stop = '강화석 부족'; break; }
    if (s.gold < cost.gold) { stop = '골드 부족'; break; }
    const r = enhanceEquip(s, equipUid, ub);
    if (!r.ok) { stop = r.msg ?? ''; break; }
    tries++; stones += cost.stone; gold += cost.gold; if (ub) bless++;
  }
  const b = EQUIP_BY_ID[f.e.baseId].name;
  const done = f.e.enhance >= target;
  return { ok: true, msg: `${b} +${start} → +${f.e.enhance}${done ? ' 달성!' : ` (${stop}로 멈춤)`} · ${tries}회 시도 · 강화석 ${stones} · ${gold.toLocaleString('ko-KR')}G${bless ? ` · 축복 ${bless}` : ''}` };
}

export function dismantle(s: GameState, equipUid: string): Result {
  const idx = s.inventory.findIndex((e) => e.uid === equipUid);
  if (idx < 0) return fail('가방에 있는 장비만 분해할 수 있습니다');
  const v = dismantleValue(s.inventory[idx]);
  s.inventory.splice(idx, 1);
  s.stones += v;
  return { ok: true, msg: `강화석 ${v}개 획득` };
}

// ───────── 상점 ─────────
export const equipPrice = (tier: number, rarity: Rarity) => Math.round(160 * tier * tier * RARITY_MULT[rarity] ** 2);
export const sellPrice = (e: Equip) => Math.round(equipPrice(EQUIP_BY_ID[e.baseId].tier, e.rarity) * 0.3 * (1 + e.enhance * 0.1));
export const shopTier = (s: GameState) => Math.max(...TIER_INFO.filter((t) => !t.shopAfter || s.bossesKilled.includes(t.shopAfter)).map((t) => t.tier));

export function sellEquip(s: GameState, equipUid: string): Result {
  const idx = s.inventory.findIndex((e) => e.uid === equipUid);
  if (idx < 0) return fail('가방에 없는 장비입니다');
  const p = sellPrice(s.inventory[idx]);
  s.inventory.splice(idx, 1);
  s.gold += p;
  return { ok: true, msg: `${p}G에 판매` };
}

// ───────── 골드 사용처 ─────────
/** 탐험에서 돌아올 때마다: 강화석 재고 채움 (+ 날짜가 바뀌었으면 오늘의 상점 갱신) */
export function refreshDaily(s: GameState) {
  s.stoneStock = STONE_STOCK;
  ensureShopDay(s);
}

// ───────── 오늘의 상점 (KST 자정마다 10칸) ─────────
export const SHOP_SLOTS = 10;
/** 등급별 가격 배수 — 전설은 비싸지만 몇 번 탐험하면 살 수 있게 */
const SHOP_PRICE_MULT: Record<Rarity, number> = { 1: 1, 2: 0.9, 3: 1.0, 4: 1.2, 5: 1.5 };
export const shopPrice = (tier: number, r: Rarity) => Math.round(equipPrice(tier, r) * SHOP_PRICE_MULT[r] / 10) * 10;

function shopEquip(rng: Rng, tier: number, r: Rarity, used: Set<string>): Equip {
  const all = EQUIP_BASES.filter((b) => b.tier === tier && !b.set);
  const cands = all.filter((b) => !used.has(b.id));
  const base = rng.pick(cands.length ? cands : all);
  used.add(base.id);
  const pot = r === 5 ? 2 : 1;
  return { uid: `shop_${Math.floor(rng.next() * 1e9).toString(36)}`, baseId: base.id, rarity: r, enhance: 0, failStack: 0, options: r >= 3 ? rollLines(rng, base.slot, tier, pot, r - 2) : [], ...(r >= 3 ? { pot } : {}) };
}

/** 오늘 날짜(KST)의 상점이 아니면 새로 채움: 전설 2~3 · 영웅 3 · 희귀 2~3 · 나머지 고급, 일부는 한 티어 아래 */
export function ensureShopDay(s: GameState) {
  const today = kstDate();
  if (s.shopDay === today && s.deals.length) return;
  const r = rngOf(s);
  const top = shopTier(s);
  const legends = r.chance(50) ? 3 : 2;
  const plan: Rarity[] = [...Array(legends).fill(5), 4, 4, 4, 3, 3, 3, 2, 2].slice(0, SHOP_SLOTS) as Rarity[];
  const used = new Set<string>();
  s.deals = plan.map((rar, i) => {
    // 전설·영웅은 현재 티어, 나머지 중 일부는 한 티어 아래(싸게 구멍 메우기용)
    const tier = rar >= 4 || top === 1 || i % 2 === 0 ? top : top - 1;
    return { equip: shopEquip(r, tier, rar, used), price: shopPrice(tier, rar), sold: false };
  });
  s.shopDay = today;
  s.packBought = 0;
}

export function buyDeal(s: GameState, i: number): Result {
  ensureShopDay(s);
  const d = s.deals[i];
  if (!d || d.sold) return fail('이미 팔린 상품입니다');
  if (s.gold < d.price) return fail('골드가 부족합니다');
  s.gold -= d.price;
  bump(s, 'buy');
  s.inventory.push({ ...d.equip, uid: `e_${s.seed++}` });
  d.sold = true;
  return { ok: true, msg: `${EQUIP_BY_ID[d.equip.baseId].name} 구매` };
}

/** 신비 카드 팩: 하루 3개, 티어에 따라 가격 상승 */
export const PACK_DAILY = 3;
export const packPrice = (s: GameState) => 1500 * shopTier(s);
export function buyPack(s: GameState, n: number): Result {
  ensureShopDay(s);
  const k = Math.min(n, PACK_DAILY - (s.packBought ?? 0));
  if (k <= 0) return fail('오늘 카드 팩은 다 팔렸어요. 내일 자정에 다시 들어와요');
  const cost = packPrice(s) * k;
  if (s.gold < cost) return fail('골드가 부족합니다');
  s.gold -= cost;
  s.packBought = (s.packBought ?? 0) + k;
  bump(s, 'buy');
  s.cardPacks = (s.cardPacks ?? 0) + k;
  return { ok: true, msg: `신비 카드 팩 ${k}개 구매 (카드 보관함에서 개봉)` };
}

export const stonePrice = (s: GameState) => 80 + 40 * shopTier(s) * shopTier(s);
export function buyStones(s: GameState, n: number): Result {
  const k = Math.min(n, s.stoneStock);
  if (k <= 0) return fail('오늘 강화석은 다 팔렸어요. 탐험에서 돌아오면 다시 들어와요');
  const cost = stonePrice(s) * k;
  if (s.gold < cost) return fail('골드가 부족합니다');
  s.gold -= cost; s.stones += k; s.stoneStock -= k;
  bump(s, 'buy');
  return { ok: true, msg: `강화석 ${k}개 구매` };
}

/** 훈련소: 골드로 1레벨 올리기 (직업 상한까지) */
export const trainCost = (c: Character) => Math.round(expToNext(c.level) * 1.5);
export function canTrain(s: GameState, c: Character): string | null {
  if (c.level >= levelCap(c)) return c.level >= 80 ? '최고 레벨이에요' : '전직해야 더 성장할 수 있어요';
  return null;
}
export function train(s: GameState, uid: string): Result {
  const c = byUid(s, uid);
  if (!c) return fail('단원을 찾을 수 없습니다');
  const no = canTrain(s, c);
  if (no) return fail(no);
  const cost = trainCost(c);
  if (s.gold < cost) return fail('골드가 부족합니다');
  s.gold -= cost;
  c.level++;
  c.exp = 0;
  syncSkillSlots(c);
  return { ok: true, msg: `${c.name} Lv.${c.level} 달성!` };
}

/** 신전: 특성 하나 재설정 (고유 특성은 불가) */
export const rerollTraitCost = (c: Character) => Math.round(300 * c.grade * (1 + c.level / 10));
export function rerollTrait(s: GameState, uid: string, idx: number): Result {
  const c = byUid(s, uid);
  if (!c || !c.traitIds[idx]) return fail('특성을 찾을 수 없습니다');
  const cost = rerollTraitCost(c);
  if (s.gold < cost) return fail('골드가 부족합니다');
  const pool = COMMON_TRAITS.filter((t) => !c.traitIds.includes(t));
  s.gold -= cost;
  const old = c.traitIds[idx];
  c.traitIds[idx] = rngOf(s).pick(pool);
  return { ok: true, msg: `${old} → ${c.traitIds[idx]}` };
}

/** 재련: 희귀 이상 장비의 추가 옵션 다시 굴리기 */
/** 제련소: 고정하지 않은 옵션 칸(최대 3칸)을 다시 새김 */
export const refineCost = (e: Equip) => ({
  stones: refineStoneCost(0),
  gold: refineGoldCost(EQUIP_BY_ID[e.baseId].tier, e.rarity),
});
/** 잠재 등급업 판정: 확률 또는 천장 */
function tryUp(r: Rng, g: number, pity: number): { g: number; pity: number; up: boolean } {
  if (g >= 4) return { g, pity: 0, up: false };
  const p = pity + 1;
  if (r.chance(POT_UP[g]) || p >= POT_PITY[g]) return { g: g + 1, pity: 0, up: true };
  return { g, pity: p, up: false };
}
export function refine(s: GameState, equipUid: string): Result {
  const f = findEquip(s, equipUid);
  if (!f) return fail('장비를 찾을 수 없습니다');
  const cost = refineCost(f.e);
  if (s.refineStones < cost.stones) return fail(`제련석이 부족합니다 (${cost.stones}개 필요)`);
  if (s.gold < cost.gold) return fail('골드가 부족합니다');
  s.refineStones -= cost.stones;
  s.gold -= cost.gold;
  const r = rngOf(s);
  const tier = EQUIP_BY_ID[f.e.baseId].tier;
  const t = tryUp(r, f.e.pot ?? 1, f.e.potPity ?? 0);
  f.e.pot = t.g; f.e.potPity = t.pity;
  f.e.options = rollLines(r, EQUIP_BY_ID[f.e.baseId].slot, tier, t.g, OPTION_SLOTS);
  delete f.e.locked;
  bump(s, 'refine');
  return { ok: true, msg: t.up ? `✨ 잠재 등급 상승! ${POT_NAME[t.g]}` : `제련 완료! 제련석 -${cost.stones}` };
}

/** 에디셔널 잠재: 고대 룬석으로 (처음엔 레어로 개방) */
export const addCost = (e: Equip) => ({
  runes: addRuneCost(0),
  gold: refineGoldCost(EQUIP_BY_ID[e.baseId].tier, e.rarity),
});
export function refineAdd(s: GameState, equipUid: string): Result {
  const f = findEquip(s, equipUid);
  if (!f) return fail('장비를 찾을 수 없습니다');
  const cost = addCost(f.e);
  if ((s.runes ?? 0) < cost.runes) return fail(`고대 룬석이 부족합니다 (${cost.runes}개 필요)`);
  if (s.gold < cost.gold) return fail('골드가 부족합니다');
  s.runes = (s.runes ?? 0) - cost.runes;
  s.gold -= cost.gold;
  const r = rngOf(s);
  const tier = EQUIP_BY_ID[f.e.baseId].tier;
  if (!f.e.addG) {
    f.e.addG = 1; f.e.addPity = 0;
    f.e.add = rollLines(r, EQUIP_BY_ID[f.e.baseId].slot, tier, 1, OPTION_SLOTS, true);
    return { ok: true, msg: '에디셔널 잠재 개방! (레어)' };
  }
  const t = tryUp(r, f.e.addG, f.e.addPity ?? 0);
  f.e.addG = t.g; f.e.addPity = t.pity;
  f.e.add = rollLines(r, EQUIP_BY_ID[f.e.baseId].slot, tier, t.g, OPTION_SLOTS, true);
  return { ok: true, msg: t.up ? `✨ 에디셔널 등급 상승! ${POT_NAME[t.g]}` : `에디셔널 재설정! 고대 룬석 -${cost.runes}` };
}

/** 탐험 보험료: 시작 층에 비례 */
export const insuranceCost = (floor: number) => 60 + 60 * floor;

// ───────── 일괄 판매·분해 (가방 장비만, 장착 중 제외) ─────────
export interface BulkFilter { rarities: Rarity[]; keepEnhanced: boolean }
export const bulkTargets = (s: GameState, f: BulkFilter) =>
  s.inventory.filter((e) => f.rarities.includes(e.rarity) && !(f.keepEnhanced && e.enhance > 0));

export function bulkSell(s: GameState, f: BulkFilter): Result {
  const list = bulkTargets(s, f);
  if (!list.length) return fail('조건에 맞는 장비가 없습니다');
  const gold = list.reduce((sum, e) => sum + sellPrice(e), 0);
  const ids = new Set(list.map((e) => e.uid));
  s.inventory = s.inventory.filter((e) => !ids.has(e.uid));
  s.gold += gold;
  return { ok: true, msg: `${list.length}개 판매 · +${gold.toLocaleString('ko-KR')}G` };
}

/** 새로 얻은 장비에 자동 처리 적용 → 남길 장비만 반환 */
export function applyAutoLoot(s: GameState, equips: Equip[]): { kept: Equip[]; line?: string } {
  const a = s.autoLoot;
  if (!a?.on || !a.rarities.length) return { kept: equips };
  const set = new Set(a.rarities);
  const gone = equips.filter((e) => set.has(e.rarity) && !e.enhance && !EQUIP_BY_ID[e.baseId].set);
  if (!gone.length) return { kept: equips };
  const kept = equips.filter((e) => !gone.includes(e));
  if (a.mode === 'sell') { const g = gone.reduce((x, e) => x + sellPrice(e), 0); s.gold += g; return { kept, line: `자동 판매 ${gone.length}개 → +${g.toLocaleString('ko-KR')}G` }; }
  const st = gone.reduce((x, e) => x + dismantleValue(e), 0); s.stones += st;
  return { kept, line: `자동 분해 ${gone.length}개 → 강화석 +${st}` };
}
export function setAutoLoot(s: GameState, patch: Partial<NonNullable<GameState['autoLoot']>>) {
  s.autoLoot = { on: false, rarities: [1, 2], mode: 'dismantle', ...s.autoLoot, ...patch };
}
/** 결과 화면: 이번에 얻은 장비 중 지정 uid만 판매/분해 (가방에 남아있는 것만) */
export function processUids(s: GameState, uids: string[], mode: 'sell' | 'dismantle'): Result {
  const ids = new Set(uids);
  const list = s.inventory.filter((e) => ids.has(e.uid));
  if (!list.length) return fail('이미 정리했어요');
  s.inventory = s.inventory.filter((e) => !ids.has(e.uid));
  if (mode === 'sell') { const g = list.reduce((x, e) => x + sellPrice(e), 0); s.gold += g; return { ok: true, msg: `${list.length}개 판매 · +${g.toLocaleString('ko-KR')}G` }; }
  const st = list.reduce((x, e) => x + dismantleValue(e), 0); s.stones += st;
  return { ok: true, msg: `${list.length}개 분해 · 강화석 +${st}` };
}

export function bulkDismantle(s: GameState, f: BulkFilter): Result {
  const list = bulkTargets(s, f);
  if (!list.length) return fail('조건에 맞는 장비가 없습니다');
  const stones = list.reduce((sum, e) => sum + dismantleValue(e), 0);
  const ids = new Set(list.map((e) => e.uid));
  s.inventory = s.inventory.filter((e) => !ids.has(e.uid));
  s.stones += stones;
  return { ok: true, msg: `${list.length}개 분해 · 강화석 +${stones}` };
}

export const potionsAvailable = (s: GameState) => POTIONS.filter((p) => s.maxFloor >= p.unlockFloor);
export function buyPotion(s: GameState, id: string, n = 1): Result {
  const p = POTIONS.find((x) => x.id === id)!;
  n = Math.max(1, Math.floor(n));
  if (s.gold < p.price * n) return fail('골드가 부족합니다');
  s.gold -= p.price * n;
  s.potions[id] = (s.potions[id] ?? 0) + n;
  bump(s, 'potionBuy', n);
  bump(s, 'buy');
  return { ok: true, msg: `${p.name} ${n}개 구매` };
}
export const blessingPrice = 1200;
export function buyBlessing(s: GameState, n = 1): Result {
  n = Math.max(1, Math.floor(n));
  if (s.gold < blessingPrice * n) return fail('골드가 부족합니다');
  s.gold -= blessingPrice * n;
  s.blessings += n;
  return { ok: true, msg: `축복 주문서 ${n}장 구매` };
}

// ───────── 던전 ─────────
export function canDepart(s: GameState): Result {
  const p = partyChars(s);
  if (!p.length) return fail('파티가 비었습니다');
  return { ok: true };
}

export function startExpedition(s: GameState, settings: ExpeditionSettings): Expedition | string {
  const ok = canDepart(s);
  if (!ok.ok) return ok.msg;
  const region = regionOf(settings.startFloor);
  if (settings.mode === 'repeat' && !region.repeat) return `${region.name}에서는 한 층 반복을 할 수 없어요`;
  const regionEnd = region.floors?.[1] ?? MAX_FLOOR;
  settings = { ...settings, targetFloor: Math.min(settings.targetFloor, regionEnd) };
  if (settings.insured) {
    const cost = insuranceCost(settings.startFloor);
    if (s.gold < cost) return '보험료가 부족합니다';
    s.gold -= cost;
  }
  const potions = settings.potions.filter((id) => (s.potions[id] ?? 0) > 0).slice(0, MAX_POTIONS);
  for (const id of potions) s.potions[id]--;
  s.settings = { ...settings, potions: [] };
  if (settings.startFloor > maxStartFloor(s)) settings.startFloor = maxStartFloor(s);
  // 낮은 층 보상 감소는 같은 지역 기록 기준
  return new Expedition(withGuest(s), { ...settings, potions, bestFloor: Math.min(s.maxFloor, regionEnd), petMods: petPartyMods(s) }, rngOf(s));
}

export interface ExpeditionSummary {
  reason: string;
  floor: number;
  repeat: boolean;
  runs: number;
  insured: boolean;
  gold: number; exp: number; stones: number; blessings: number; refineStones: number; shards: number; cores: number; runes?: number; ess?: number; cardPacks?: number; goblins?: number;
  autoLine?: string;
  report?: Report;
  towerLines?: string[];
  diag?: string[];
  lost?: boolean;
  daily?: string;
  dailyRef?: { id: string; stage: number; won: boolean };
  raidLines?: string[];
  equips: Equip[];
  levelUps: { name: string; to: number }[];
  bosses: string[];
  newMaxFloor: boolean;
}

const REASON: Record<string, string> = {
  wipe: '파티 전멸… 간신히 마을로 돌아왔다', timeout: '60라운드가 지나도 끝나지 않아 후퇴했다', lowHp: 'HP가 낮아 귀환했다', down: '쓰러진 동료가 있어 귀환했다',
  target: '목표 층에 도달해 귀환했다', bossAhead: '보스 앞에서 귀환했다', cleared: '던전 최하층을 정복했다!', regionEnd: '이 지역의 끝까지 정복했다!', manual: '귀환했다',
};

export function finishExpedition(s: GameState, ex: Expedition): ExpeditionSummary {
  if (!ex.finished) ex.finish('manual');
  const before = Object.fromEntries(ex.chars.map((c) => [c.uid, c.level]));
  ex.applyExp();
  const levelUps = ex.chars.filter((c) => !c.uid.startsWith('guest_') && c.level > before[c.uid]).map((c) => ({ name: c.name, to: c.level }));
  for (const c of ex.chars) syncSkillSlots(c);
  s.gold += ex.loot.gold;
  s.stones += ex.loot.stones;
  s.blessings += ex.loot.blessings;
  s.refineStones += ex.loot.refineStones;
  s.runes = (s.runes ?? 0) + (ex.loot.runes ?? 0);
  s.mythEss = (s.mythEss ?? 0) + (ex.loot.ess ?? 0);
  if (!ex.settings.multi) s.cardPacks = (s.cardPacks ?? 0) + (ex.loot.cardPacks ?? 0);
  if (ex.goblins) bump(s, 'goblin', ex.goblins);
  s.shards += ex.loot.shards;
  s.cores += ex.loot.cores;
  if (!ex.settings.daily && !ex.settings.raid && !ex.settings.tower && !ex.settings.duel) bump(s, 'run');
  const auto = applyAutoLoot(s, ex.loot.equips);
  ex.loot.equips = auto.kept;
  s.inventory.push(...ex.loot.equips);
  const raidLines = ex.settings.raid ? applyRaid(s, ex) : undefined;
  const dly = ex.settings.daily;
  const failed = ex.stopReason === 'wipe' || ex.stopReason === 'timeout';
  const won = !failed;
  if (dly && won) {
    const st = dailyState(s);
    st.used[dly.id] = (st.used[dly.id] ?? 0) + 1;
    st.cleared[dly.id] = Math.max(st.cleared[dly.id] ?? 0, dly.stage);
  }
  const towerLines = ex.settings.tower ? applyTower(s, ex) : undefined;
  const reached = dly || ex.settings.raid || ex.settings.tower ? 0 : ex.reachedFloor();
  const newMax = reached > s.maxFloor;
  s.maxFloor = Math.max(s.maxFloor, reached);
  const bosses = ex.bossesKilled.filter((b) => !s.bossesKilled.includes(b));
  for (const b of bosses) {
    s.bossesKilled.push(b);
    // 보스 첫 처치 보상
    const bonus = rollEquip(rngOf(s), ex.floor, 3);
    s.inventory.push(bonus);
    ex.loot.equips.push(bonus);
    s.gold += 1000 * (b === 'velas' ? 5 : 1);
    const egg = addPet(s, hatch(rngOf(s), ex.floor > 50 ? 3 : 1));
    news(s, `${MONSTERS[b].name} 첫 처치! 보너스 장비와 펫 알을 받았다. (${PET_GRADE_NAME[egg.grade]} ${PET_BY_ID[egg.kind].name})`);
  }
  s.day++;
  refreshDaily(s);
  if (ex.settings.raid || ex.settings.tower) { /* applyRaid·applyTower에서 소식 기록 */ }
  else if (dly) news(s, `${s.day - 1}일차: ${DAILY_BY_ID[dly.id].name} ${dly.stage}단계 ${won ? '클리어' : '실패 (입장 횟수는 그대로)'}.`);
  else news(s, ex.repeating
    ? `${s.day - 1}일차 탐험: ${floorName(ex.floor)} ${ex.floorsCleared}회 반복, 골드 ${ex.loot.gold} 획득.`
    : `${s.day - 1}일차 탐험: ${floorName(ex.floor)}까지, 골드 ${ex.loot.gold} 획득.`);
  for (const l of levelUps) news(s, `${l.name} Lv.${l.to} 달성!`);
  return {
    reason: ex.settings.tower ? (failed ? `무한 탑 ${ex.floor}층에서 막혔다${ex.towerCleared ? ` (${ex.towerCleared}층까지 돌파)` : ''}` : `무한 탑 ${ex.towerCleared}층까지 돌파하고 귀환`) : ex.settings.raid ? (ex.raidKilled ? '군단장 벨리알 처치!' : `벨리알에게 ${ex.raidDealt.toLocaleString('ko-KR')} 피해 (${((ex.raidDealt / ex.settings.raid.maxHp) * 100).toFixed(1)}%)`) : dly ? (won ? `${DAILY_BY_ID[dly.id].name} ${dly.stage}단계 클리어!` : ex.stopReason === 'timeout' ? '시간 초과… 입장 횟수는 차감되지 않았다' : '파티 전멸… 입장 횟수는 차감되지 않았다') : ex.repeating && ex.stopReason === 'target' ? '반복 파밍을 마치고 귀환했다' : REASON[ex.stopReason ?? 'manual'],
    towerLines,
    autoLine: auto.line,
    daily: ex.settings.tower ? `무한 탑 · 최고 기록 ${s.tower?.best ?? 0}층` : ex.settings.raid ? `레이드 · ${RAID_DIFF_NAME[ex.settings.raid.diff]}` : dly ? `${DAILY_BY_ID[dly.id].name} ${dly.stage}단계` : undefined,
    report: ex.report,
    lost: ex.settings.raid ? !ex.raidKilled && ex.stopReason === 'wipe' : !won,
    diag: diagnose(ex.report, ex.settings.raid ? ex.raidKilled : won, {
      hasHealer: ex.chars.some((c) => JOBS[c.jobId].base === 'priest'), healerName: ex.chars.find((c) => JOBS[c.jobId].base === 'priest')?.name,
      rows: Object.fromEntries(ex.chars.map((c) => [c.uid, rowOf(c)])), prefs: Object.fromEntries(ex.chars.map((c) => [c.uid, c.target ?? 'auto'])),
      tankIds: ex.chars.filter((c) => JOBS[c.jobId].base === 'warrior').map((c) => c.uid) }),
    dailyRef: dly && !ex.settings.raid ? { id: dly.id, stage: dly.stage, won: !!won } : undefined,
    raidLines,
    insured: !!ex.settings.insured,
    floor: ex.floor, repeat: ex.repeating, runs: ex.floorsCleared, gold: ex.loot.gold, exp: ex.loot.exp,
    stones: ex.loot.stones, blessings: ex.loot.blessings, refineStones: ex.loot.refineStones, runes: ex.loot.runes ?? 0, ess: ex.loot.ess ?? 0, cardPacks: ex.settings.multi ? 0 : ex.loot.cardPacks ?? 0, goblins: ex.goblins, shards: ex.loot.shards, cores: ex.loot.cores, equips: ex.loot.equips, levelUps,
    bosses: ex.bossesKilled, newMaxFloor: newMax,
  };
}

/** 오래된 세이브 보정 */
export function migrate(raw: any): GameState | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.roster)) return null;
  const s = raw as GameState;
  s.settings = { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) };
  if (s.settings.startFloor > Math.min(MAX_FLOOR, s.maxFloor + 1)) s.settings.startFloor = 1;
  s.potions ??= {}; delete (s as any).hp;
  s.stoneStock ??= STONE_STOCK;
  s.refineStones ??= 0;
  s.idleAt ??= Date.now();
  s.pets ??= []; s.activePet ??= null; s.shards ??= 0; s.cores ??= 0; autoMergePets(s);
  s.codex ??= []; for (const c of s.roster) if (c.mercId && !s.codex.includes(c.mercId)) s.codex.push(c.mercId);
  // 재화 통합: 어둠의 파편 → 군단장의 핵 (옛 핵 1개 = 새 핵 10개, 파편 1개 = 핵 1개)
  if (!s.coreMerged) { s.cores = s.cores * 10 + s.shards; s.shards = 0; s.coreMerged = true; } s.scales ??= 0; s.daily ??= { date: '', used: {}, cleared: {} }; s.raid ??= { week: 0, date: '', used: 0, dmg: {}, claimed: {}, everKilled: {}, best: 0 };
  s.boardLocks ??= s.board.map(() => false);
  if (!s.deals) s.deals = []; ensureShopDay(s); s.news ??= []; s.bossesKilled ??= [];
  for (const c of s.roster) syncSkillSlots(c);
  return s;
}

// ───────── 무한 탑 ─────────
export const towerState = (s: GameState) => (s.tower ??= { best: 0, claimed: 0 });
export const towerOpen = (s: GameState) => s.maxFloor >= TOWER_UNLOCK;
export function startTower(s: GameState): Expedition | string {
  if (!towerOpen(s)) return `마왕숲 ${TOWER_UNLOCK}층을 클리어하면 열려요`;
  const ok = canDepart(s);
  if (!ok.ok) return ok.msg;
  const t = towerState(s).best + 1;
  bump(s, 'tower');
  return new Expedition(partyChars(s), { ...DEFAULT_SETTINGS, startFloor: t, targetFloor: 1e9, mode: 'advance', auto: true, retreatHpPct: 0, retreatOnDown: false, stopBeforeBoss: false, insured: true, potions: [], petMods: petPartyMods(s), tower: true }, rngOf(s));
}
function applyTower(s: GameState, ex: Expedition): string[] {
  const st = towerState(s), lines: string[] = [];
  const from = st.best + 1, to = ex.towerCleared;
  let gold = 0, cores = 0, refine = 0, runes = 0;
  for (let t = from; t <= to; t++) {
    const r = towerReward(t);
    gold += r.gold; cores += r.cores; refine += r.refineStones; runes += r.runes;
    if (r.egg) { const p = addPet(s, hatch(rngOf(s), r.egg)); lines.push(`${t}층 돌파 보상: ${PET_GRADE_NAME[p.grade]} ${PET_BY_ID[p.kind].name} 부화!`); }
  }
  if (to >= from) {
    s.gold += gold; s.cores += cores; s.refineStones += refine; s.runes = (s.runes ?? 0) + runes;
    lines.unshift(`처음 돌파한 층 ${to - from + 1}개 보상: 골드 ${gold.toLocaleString('ko-KR')} · 군단장의 핵 ${cores}${refine ? ` · 제련석 ${refine}` : ''}${runes ? ` · 고대 룬석 ${runes}` : ''}`);
    st.best = to;
    news(s, `무한 탑 ${to}층 돌파! (최고 기록)`);
  } else {
    lines.push(`최고 기록 ${st.best}층을 넘지 못했어요. ${ex.floor}층 ${towerGimmick(ex.floor).name} 기믹을 확인하고 세팅을 바꿔보세요.`);
    news(s, `무한 탑 ${ex.floor}층 도전 실패.`);
  }
  return lines;
}

/** 멀티 던전 보상: 재화·장비는 전원 동일, 경험치는 내가 데려간 단원 비율만큼 내 단원에게 */
export function applyMultiReward(s: GameState, r: { gold: number; exp: number; stones: number; blessings: number; refineStones: number; cores: number; cardPacks?: number; equips: Equip[] }, myUids: string[], totalChars: number) {
  bump(s, 'multi');
  s.gold += r.gold; s.stones += r.stones; s.blessings += r.blessings; s.refineStones += r.refineStones; s.cores += r.cores;
  s.cardPacks = (s.cardPacks ?? 0) + (r.cardPacks ?? 0);
  const auto = applyAutoLoot(s, r.equips.map((e) => ({ ...e, uid: newUid('e') })));
  const equips = auto.kept;
  s.inventory.push(...equips);
  const mine = myUids.map((u) => byUid(s, u)).filter(Boolean) as Character[];
  const ups: { name: string; to: number }[] = [];
  if (mine.length && totalChars) {
    const each = (r.exp * (mine.length / totalChars)) / mine.length;
    for (const c of mine) { const lv = c.level; gainExp(c, each); syncSkillSlots(c); if (c.level > lv) ups.push({ name: c.name, to: c.level }); }
  }
  s.day++;
  news(s, `멀티 던전 보상: 골드 ${r.gold.toLocaleString('ko-KR')}${equips.length ? ` · 장비 ${equips.length}개` : ''}`);
  return { equips, ups, autoLine: auto.line };
}

/** 서버 보상 지급 (월드보스 등) */
export function grantReward(s: GameState, r: { gold?: number; cores?: number; refineStones?: number; runes?: number; egg?: number }): string {
  s.gold += r.gold ?? 0; s.cores += r.cores ?? 0; s.refineStones += r.refineStones ?? 0; s.runes = (s.runes ?? 0) + (r.runes ?? 0);
  let extra = '';
  if (r.egg) { const p = addPet(s, hatch(rngOf(s), r.egg as Grade)); extra = ` · ${PET_GRADE_NAME[p.grade]} ${PET_BY_ID[p.kind].name} 부화!`; }
  return extra;
}

// ───────── 가이드 퀘스트 ─────────
export function questView(s: GameState): QuestView {
  const eq = allEquipsOf(s);
  return {
    maxFloor: s.maxFloor, partySize: s.party.length, maxEnh: eq.reduce((a, e) => Math.max(a, e.enhance), 0),
    maxTier: s.roster.reduce((a, c) => Math.max(a, JOBS[c.jobId].tier), 1), potions: Object.values(s.potions).reduce((a, b) => a + b, 0) + (s.cnt?.potionBuy ?? 0),
    pets: s.pets.length, cnt: s.cnt ?? {}, towerBest: s.tower?.best ?? 0,
  };
}
const allEquipsOf = (s: GameState) => [...s.inventory, ...s.roster.flatMap((c) => Object.values(c.equipment).filter(Boolean) as Equip[])];
export const currentQuest = (s: GameState) => QUESTS[s.questIdx ?? 0];
export function claimQuest(s: GameState): Result {
  const q = currentQuest(s);
  if (!q) return fail('모든 목표를 달성했어요');
  if (!q.done(questView(s))) return fail('아직 달성하지 않았어요');
  const r = q.reward;
  s.gold += r.gold ?? 0; s.stones += r.stones ?? 0; s.blessings += r.blessings ?? 0; s.refineStones += r.refineStones ?? 0; s.cores += r.cores ?? 0;
  let extra = '';
  if (r.egg) { const p = addPet(s, hatch(rngOf(s), r.egg as Grade)); extra = ` · ${PET_GRADE_NAME[p.grade]} ${PET_BY_ID[p.kind].name} 부화!`; }
  s.questIdx = (s.questIdx ?? 0) + 1;
  return { ok: true, msg: `목표 달성 보상: ${rewardText(r)}${extra}` };
}

/** 전직할 수 있는 단원 */
export const advanceable = (s: GameState) => s.roster.filter((c) => canAdvance(c));

// ───────── 신비 카드 ─────────
export function openCardPacks(s: GameState, n: number): Result & { got?: { id: string; isNew: boolean }[] } {
  const have = s.cardPacks ?? 0;
  n = Math.min(n, have);
  if (n <= 0) return fail('카드 팩이 없어요. 균열(멀티)이나 잡화점에서 얻을 수 있어요');
  s.cards ??= {};
  const r = rngOf(s);
  const got: { id: string; isNew: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const c = openPack(r);
    const isNew = !s.cards[c.id];
    if (isNew) s.cards[c.id] = { count: 1, awaken: 0 }; else s.cards[c.id].count++;
    got.push({ id: c.id, isNew });
  }
  s.cardPacks = have - n;
  lastCards = got;
  const best = got.map((g) => CARD_BY_ID[g.id]).reduce((a, b) => (b.grade > a.grade ? b : a));
  return { ok: true, got, msg: `카드 ${n}장! 최고 ${['', '일반', '고급', '희귀', '영웅', '전설'][best.grade]} ${best.name}${got.some((g) => g.isNew) ? ` · 새 카드 ${got.filter((g) => g.isNew).length}장` : ''}` };
}
export let lastCards: { id: string; isNew: boolean }[] = [];
export function toggleDeck(s: GameState, id: string): Result {
  if (!s.cards?.[id]) return fail('없는 카드예요');
  s.deck ??= [];
  if (s.deck.includes(id)) { s.deck = s.deck.filter((x) => x !== id); return { ok: true, msg: `${CARD_BY_ID[id].name} 해제` }; }
  if (s.deck.length >= DECK_SIZE) return fail(`덱은 ${DECK_SIZE}장까지예요`);
  s.deck.push(id);
  return { ok: true, msg: `${CARD_BY_ID[id].name} 장착` };
}
/** 자동 장착 후보: 높은 순 + 세트 조합들. 전투력으로 비교 */
export interface DeckOption { deck: string[]; power: number; label: string; bonuses: string[] }
export function autoDeckOptions(s: GameState): DeckOption[] {
  const owned = s.cards ?? {};
  const val = (id: string) => cardValue(CARD_BY_ID[id], owned[id].awaken) + CARD_BY_ID[id].grade * 0.01;
  const ids = Object.keys(owned).filter((id) => CARD_BY_ID[id]).sort((a, b) => val(b) - val(a));
  const fill = (base: string[]) => [...base, ...ids.filter((x) => !base.includes(x))].slice(0, DECK_SIZE);
  const bySet = CARD_SETS.map((st) => ids.filter((id) => CARD_BY_ID[id].set === st.id)).filter((l) => l.length >= 2);
  const cands: string[][] = [fill([])];
  for (const a of bySet) {
    cands.push(fill(a.slice(0, 5)));
    if (a.length >= 4) cands.push(fill(a.slice(0, 4)));
    for (const b of bySet) if (b !== a) {
      if (a.length >= 4) cands.push(fill([...a.slice(0, 4), ...b.slice(0, 2)]));
      cands.push(fill([...a.slice(0, 2), ...b.slice(0, 2)]));
      for (const c of bySet) if (c !== a && c !== b) cands.push(fill([...a.slice(0, 2), ...b.slice(0, 2), ...c.slice(0, 2)]));
    }
  }
  const keep = s.deck;
  const seen = new Set<string>();
  const out: DeckOption[] = [];
  for (const d of cands) {
    const k = [...d].sort().join();
    if (seen.has(k)) continue;
    seen.add(k);
    s.deck = d;
    const power = statePower(s);
    const bonuses = cardMods(owned, d).lines.filter((l) => l.on && l.kind === 'set').map((l) => l.text);
    const counts = CARD_SETS.map((st) => [st.name, d.filter((id) => CARD_BY_ID[id].set === st.id).length] as const).filter(([, n]) => n >= 2);
    out.push({ deck: d, power, bonuses, label: counts.length ? counts.map(([n, c]) => `${n} ${c}장`).join(' + ') : '세트 없이 높은 순' });
  }
  s.deck = keep;
  return out.sort((a, b) => b.power - a.power).slice(0, 4);
}
export function applyDeck(s: GameState, deck: string[]): Result {
  if (deck.some((id) => !s.cards?.[id])) return fail('없는 카드가 있어요');
  s.deck = deck.slice(0, DECK_SIZE);
  return { ok: true, msg: `카드 ${s.deck.length}장 자동 장착` };
}

/** 각성: 같은 카드 여분을 소모 (count = 보유 장수, 1장은 본체) */
export const awakenNeed = (o: OwnedCard) => (o.awaken >= MAX_AWAKEN ? Infinity : AWAKEN_COST[o.awaken]);
export function awakenCard(s: GameState, id: string): Result {
  const o = s.cards?.[id];
  if (!o) return fail('없는 카드예요');
  if (o.awaken >= MAX_AWAKEN) return fail('이미 최대 각성이에요');
  const need = awakenNeed(o);
  if (o.count - 1 < need) return fail(`같은 카드가 ${need}장 더 필요해요`);
  o.count -= need; o.awaken++;
  return { ok: true, msg: `${CARD_BY_ID[id].name} 각성 ${o.awaken}단계!` };
}

// ───────── 4인 레이드 보상 (난이도마다 하루 1번) ─────────
export const r4Claimed = (s: GameState, diff: R4Diff) => s.r4?.date === r4Today() && s.r4.done.includes(diff);
export function claimR4(s: GameState, diff: R4Diff, frac: number, win: boolean): string[] {
  if (r4Claimed(s, diff)) return [`오늘 ${R4[diff].name} 보상은 이미 받았어요 (자정에 초기화)`];
  bump(s, 'raid4');
  if (s.r4?.date !== r4Today()) s.r4 = { date: r4Today(), done: [] };
  s.r4!.done.push(diff);
  const r = r4Reward(diff, frac, win);
  s.mythEss = (s.mythEss ?? 0) + r.ess; s.cores += r.cores; s.runes = (s.runes ?? 0) + r.runes; s.gold += r.gold;
  const lines = [`${win ? '처치 보상' : `도전 보상 (${Math.round(frac * 100)}%)`}: 신화의 정수 ${r.ess} · 군단장의 핵 ${r.cores} · 고대 룬석 ${r.runes} · ${r.gold.toLocaleString('ko-KR')}G`];
  if (win && rngOf(s).chance(R4[diff].mythChance)) {
    const e = rollSetEquip(rngOf(s), MYTH_SET);
    s.inventory.push(e);
    lines.push(`✨ 신화 장비 「${EQUIP_BY_ID[e.baseId].name}」 획득!`);
  }
  news(s, `4인 레이드 ${R4[diff].name} ${win ? '처치!' : '도전'} — ${lines[0]}`);
  return lines;
}

// ───────── 친구 우편 ─────────
/** 보내기 전: 가방에서 꺼냄 (장착 중인 건 불가) */
export function takeForMail(s: GameState, equipUid: string): Equip | string {
  const i = s.inventory.findIndex((e) => e.uid === equipUid);
  if (i < 0) return '가방에 있는 장비만 보낼 수 있어요 (장착 중이면 먼저 해제)';
  const [e] = s.inventory.splice(i, 1);
  return e;
}
/** 받은 장비 넣기 (모르는 장비는 무시) */
export function receiveMail(s: GameState, item: any): Result {
  if (item?.kind === 'gift') {
    const g = Math.max(0, Math.min(1000000, Math.floor(Number(item.gold) || 0)));
    s.gold += g;
    return { ok: true, msg: `${item.text ?? '선물'}: ${g.toLocaleString('ko-KR')}G` };
  }
  if (!item || typeof item !== 'object' || !EQUIP_BY_ID[item.baseId]) return fail('알 수 없는 장비예요');
  const e: Equip = { ...item, uid: newUid('e'), enhance: Math.max(0, Math.min(15, Number(item.enhance) || 0)), failStack: 0, options: Array.isArray(item.options) ? item.options : [] };
  s.inventory.push(e);
  return { ok: true, msg: `${EQUIP_BY_ID[e.baseId].name} 받았어요` };
}

// ───────── 출석 · 일일 미션 ─────────
function giveDReward(s: GameState, r: DReward): string {
  s.gold += r.gold ?? 0; s.stones += r.stones ?? 0; s.blessings += r.blessings ?? 0; s.refineStones += r.refineStones ?? 0;
  s.runes = (s.runes ?? 0) + (r.runes ?? 0); s.cores += r.cores ?? 0; s.cardPacks = (s.cardPacks ?? 0) + (r.cardPacks ?? 0); s.mythEss = (s.mythEss ?? 0) + (r.mythEss ?? 0);
  let extra = '';
  if (r.egg) { const p = addPet(s, hatch(rngOf(s), r.egg as Grade)); extra = ` · ${PET_GRADE_NAME[p.grade]} ${PET_BY_ID[p.kind].name} 부화!`; }
  return dRewardText(r) + extra;
}
export const attendedToday = (s: GameState) => s.att?.last === kstDate();
/** 오늘 출석하면 받을 날짜 번호 (1~28) */
export const attendDay = (s: GameState) => attendedToday(s) ? s.att!.n : ((s.att?.n ?? 0) % 28) + 1;
export function attend(s: GameState): Result {
  if (attendedToday(s)) return fail('오늘은 이미 출석했어요');
  const n = ((s.att?.n ?? 0) % 28) + 1;
  s.att = { last: kstDate(), n };
  return { ok: true, msg: `출석 ${n}일째! ${giveDReward(s, ATTEND[n - 1])}` };
}
/** 일일 미션 상태 (날짜가 바뀌면 오늘 기준으로 다시 셈) */
export function missionState(s: GameState) {
  const today = kstDate();
  s.cnt ??= {};
  if (s.dm?.date !== today) s.dm = { date: today, base: { ...s.cnt }, chests: [] };
  const list = MISSIONS.map((m) => { const have = Math.max(0, (s.cnt![m.key] ?? 0) - (s.dm!.base[m.key] ?? 0)); return { ...m, have: Math.min(have, m.need), done: have >= m.need }; });
  const pts = list.filter((m) => m.done).reduce((a, m) => a + m.pts, 0);
  return { list, pts, chests: CHESTS.map((c, i) => ({ ...c, i, ready: pts >= c.pts && !s.dm!.chests.includes(i), claimed: s.dm!.chests.includes(i) })) };
}
export function claimChest(s: GameState, i: number): Result {
  const st = missionState(s);
  const c = st.chests[i];
  if (!c) return fail('없는 상자예요');
  if (c.claimed) return fail('이미 받았어요');
  if (!c.ready) return fail(`${c.pts}포인트가 필요해요`);
  s.dm!.chests.push(i);
  return { ok: true, msg: `${c.pts}포인트 상자: ${giveDReward(s, c.reward)}` };
}

// ───────── 친구 용병 (하루 1명, 던전·일일 던전에 동행) ─────────
export const GUEST_GIFT = 30000;
export const guestToday = (s: GameState) => (s.guest?.date === kstDate() ? s.guest : null);
/** 파티가 4명 미만이면 오늘 빌린 친구 용병을 붙임 */
export function withGuest(s: GameState): Character[] {
  const p = partyChars(s), g = guestToday(s);
  if (!g?.on || p.length >= PARTY_MAX) return p;
  return [...p, JSON.parse(JSON.stringify(g.char)) as Character];
}
export function setGuest(s: GameState, owner: string, ownerName: string, c: Character): Result {
  if (guestToday(s)) return fail('오늘은 이미 친구 용병을 빌렸어요 (자정에 초기화)');
  const copy = JSON.parse(JSON.stringify(c)) as Character;
  copy.uid = `guest_${c.uid}`; copy.name = `${c.name}(${ownerName})`; copy.isHero = false;
  syncSkillSlots(copy);
  s.guest = { date: kstDate(), owner, ownerName, char: copy, on: true };
  return { ok: true, msg: `${ownerName}의 ${c.name}이(가) 오늘 하루 동행해요 (파티 빈자리에 자동 합류)` };
}
export function toggleGuest(s: GameState): Result {
  const g = guestToday(s);
  if (!g) return fail('오늘 빌린 친구 용병이 없어요');
  g.on = !g.on;
  return { ok: true, msg: g.on ? '친구 용병 동행' : '친구 용병 쉬는 중' };
}

// ───────── 방치 보상 (자리를 비운 동안 용병단이 파견 사냥) ─────────
export const IDLE_CAP_H = 12;
/** 시간당 보상: 마왕숲 최고 층(최대 50층) 기준 */
export function idleRate(s: GameState) {
  const f = Math.max(1, Math.min(50, s.maxFloor || 1));
  const sc = rewardScale(f);
  return { floor: f, gold: Math.round(800 * sc), exp: Math.round(900 * sc), stones: 2 + Math.floor(f / 8) };
}
export function idlePending(s: GameState, now = Date.now()) {
  if (!s.idleAt) return { hours: 0, gold: 0, exp: 0, stones: 0 };
  const h = Math.min(IDLE_CAP_H, Math.max(0, (now - s.idleAt) / 3600000));
  const r = idleRate(s);
  return { hours: h, gold: Math.floor(r.gold * h), exp: Math.floor(r.exp * h), stones: Math.floor(r.stones * h) };
}
export function claimIdle(s: GameState): Result {
  const p = idlePending(s);
  if (p.hours < 1 / 6) return fail('10분 이상 지나야 받을 수 있어요');
  s.gold += p.gold; s.stones += p.stones;
  const party = partyChars(s), each = p.exp / Math.max(1, party.length);
  const ups: string[] = [];
  for (const c of party) { const lv = c.level; gainExp(c, each); syncSkillSlots(c); if (c.level > lv) ups.push(`${c.name} Lv.${c.level}`); }
  s.idleAt = Date.now();
  const hh = Math.floor(p.hours), mm = Math.floor((p.hours - hh) * 60);
  return { ok: true, msg: `파견 ${hh}시간 ${mm}분: ${p.gold.toLocaleString('ko-KR')}G · 경험치 ${p.exp.toLocaleString('ko-KR')} · 강화석 ${p.stones}${ups.length ? ` · ${ups.join(', ')}` : ''}` };
}
