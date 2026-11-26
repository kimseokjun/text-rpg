// 업적 · 칭호
import type { Character, Equip, Modifier } from '../core/types';
import { EQUIP_BY_ID } from './items';
import { MYTH_SET } from './sets';
import { PET_KINDS, type Pet } from './pets';
import { CARDS, type OwnedCard } from './cards';
import { charPower, partyPower } from '../core/power';

/** 업적 판정에 필요한 상태만 (GameState와 순환 참조 피하려고 따로 정의) */
export interface AchState {
  maxFloor: number; roster: Character[]; party: string[]; inventory: Equip[]; pets: Pet[];
  cnt?: Record<string, number>; tower?: { best: number };
  cards?: Record<string, OwnedCard>; codex?: string[]; bossesKilled: string[];
  ach?: Record<string, number>; achMs?: number; title?: string; r4Abyss?: number;
}

export type AchCat = 'explore' | 'battle' | 'growth' | 'gear' | 'collect' | 'social' | 'life';
export const ACH_CAT: [AchCat, string][] = [['explore', '탐험'], ['battle', '전투'], ['growth', '성장'], ['gear', '장비'], ['collect', '수집'], ['social', '함께'], ['life', '일상']];

export interface Title { id: string; name: string; tone: 3 | 4 | 5; mods: Modifier[]; desc: string }
const pm = (key: Modifier['key'], value: number, kind: 'pct' | 'flat' = 'pct'): Modifier => ({ key, kind, value, scope: 'party' });
export const TITLES: Title[] = [
  { id: 'demonSlayer', name: '마왕 토벌자', tone: 5, mods: [pm('atk', 2), pm('mag', 2)], desc: '공격력·마력 +2%' },
  { id: 'towerLord', name: '탑의 지배자', tone: 5, mods: [pm('hp', 3)], desc: '생명력 +3%' },
  { id: 'slaughter', name: '학살자', tone: 4, mods: [pm('skillDmg', 3)], desc: '스킬 피해 +3%' },
  { id: 'bossHunter', name: '보스 사냥꾼', tone: 4, mods: [pm('bossDmg', 3)], desc: '보스·엘리트 피해 +3%' },
  { id: 'goldHunter', name: '황금 사냥꾼', tone: 4, mods: [pm('goldGain', 10)], desc: '골드 획득 +10%' },
  { id: 'mercKing', name: '용병왕', tone: 5, mods: [pm('atk', 2), pm('mag', 2), pm('hp', 2)], desc: '공격력·마력·생명력 +2%' },
  { id: 'transcender', name: '초월자', tone: 5, mods: [pm('crit', 2, 'flat')], desc: '치명타 확률 +2%p' },
  { id: 'forgeMaster', name: '전설의 대장장이', tone: 4, mods: [pm('def', 3), pm('res', 3)], desc: '방어·마법 저항 +3%' },
  { id: 'mythOwner', name: '신화의 주인', tone: 5, mods: [pm('physDmg', 2), pm('mag', 2)], desc: '물리 피해·마력 +2%' },
  { id: 'beastLord', name: '진화의 인도자', tone: 4, mods: [pm('hp', 3)], desc: '생명력 +3%' },
  { id: 'cardMaster', name: '카드 마스터', tone: 5, mods: [pm('skillDmg', 3)], desc: '스킬 피해 +3%' },
  { id: 'duelist', name: '불패의 결투가', tone: 5, mods: [pm('agi', 3)], desc: '민첩 +3%' },
  { id: 'hellConq', name: '지옥 정복자', tone: 5, mods: [pm('raidDmg', 5)], desc: '레이드 보스 피해 +5%' },
  { id: 'abyssWalker', name: '심연을 걷는 자', tone: 5, mods: [pm('raidDmg', 6), pm('hp', 2)], desc: '레이드 보스 피해 +6% · 생명력 +2%' },
  { id: 'abyssLord', name: '심연의 정복자', tone: 5, mods: [pm('raidDmg', 8), pm('atk', 3), pm('mag', 3)], desc: '레이드 보스 피해 +8% · 공격력·마력 +3%' },
  { id: 'loyal', name: '의리의 동료', tone: 4, mods: [pm('healPower', 5)], desc: '회복량 +5%' },
  { id: 'tycoon', name: '대부호', tone: 4, mods: [pm('goldGain', 8)], desc: '골드 획득 +8%' },
  { id: 'achiever', name: '업적의 달인', tone: 5, mods: [pm('atk', 1), pm('mag', 1), pm('hp', 1), pm('def', 1)], desc: '공격력·마력·생명력·방어 +1%' },
];
export const TITLE_BY_ID: Record<string, Title> = Object.fromEntries(TITLES.map((t) => [t.id, t]));
export const titleMods = (id?: string | null): Modifier[] => (id && TITLE_BY_ID[id] ? TITLE_BY_ID[id].mods : []);

export interface AchDef { id: string; cat: AchCat; name: string; unit: string; goals: number[]; titles?: Record<number, string>; get: (s: AchState) => number }

const c = (s: AchState, k: string) => s.cnt?.[k] ?? 0;
const allEq = (s: AchState) => [...s.inventory, ...s.roster.flatMap((r) => Object.values(r.equipment).filter(Boolean) as Equip[])];
const maxSet = (s: AchState) => Math.max(0, ...s.roster.map((r) => {
  const n: Record<string, number> = {};
  for (const e of Object.values(r.equipment)) { const set = e && EQUIP_BY_ID[e.baseId]?.set; if (set) n[set] = (n[set] ?? 0) + 1; }
  return Math.max(0, ...Object.values(n));
}));

export const ACHS: AchDef[] = [
  // 탐험
  { id: 'floor', cat: 'explore', name: '마왕숲 정복', unit: '층', goals: [10, 20, 40, 60, 80], titles: { 4: 'demonSlayer' }, get: (s) => s.maxFloor },
  { id: 'tower', cat: 'explore', name: '무한 탑 등반', unit: '층', goals: [10, 30, 50, 100], titles: { 3: 'towerLord' }, get: (s) => s.tower?.best ?? 0 },
  { id: 'runs', cat: 'explore', name: '던전 원정', unit: '회', goals: [50, 300, 1000], get: (s) => c(s, 'run') },
  { id: 'daily', cat: 'explore', name: '일일 던전 단골', unit: '회', goals: [10, 100, 500], get: (s) => c(s, 'daily') },
  { id: 'raid', cat: 'explore', name: '군단장 레이드 도전', unit: '회', goals: [10, 50, 200], get: (s) => c(s, 'raid') },
  // 전투
  { id: 'kill', cat: 'battle', name: '몬스터 처치', unit: '마리', goals: [1000, 10000, 100000], titles: { 2: 'slaughter' }, get: (s) => c(s, 'kill') },
  { id: 'boss', cat: 'battle', name: '보스 처치', unit: '회', goals: [10, 100, 500], titles: { 2: 'bossHunter' }, get: (s) => c(s, 'boss') },
  { id: 'goblin', cat: 'battle', name: '보물 고블린 사냥', unit: '마리', goals: [1, 10, 50], titles: { 2: 'goldHunter' }, get: (s) => c(s, 'goblin') },
  { id: 'chamber', cat: 'battle', name: '마왕방 돌파', unit: '', goals: [1, 2], get: (s) => (s.bossesKilled.includes('shadowKing') ? 1 : 0) + (s.bossesKilled.includes('lucifel') ? 1 : 0) },
  // 성장
  { id: 'power', cat: 'growth', name: '파티 전투력', unit: '', goals: [50000, 200000, 500000, 1000000, 2000000], titles: { 4: 'mercKing' }, get: (s) => partyPower(s.party.map((u) => s.roster.find((r) => r.uid === u)).filter(Boolean) as Character[]) },
  { id: 'charPow', cat: 'growth', name: '최강의 단원', unit: '', goals: [20000, 80000, 200000, 500000], get: (s) => Math.max(0, ...s.roster.map((r) => charPower(r))) },
  { id: 'level', cat: 'growth', name: '최고 레벨', unit: 'Lv', goals: [30, 50, 80, 100], get: (s) => Math.max(0, ...s.roster.map((r) => r.level)) },
  { id: 'legend', cat: 'growth', name: '전설 용병', unit: '명', goals: [1, 3, 5, 10], get: (s) => s.roster.filter((r) => r.grade === 5).length },
  { id: 'awaken', cat: 'growth', name: '각성 5단계', unit: '명', goals: [1, 3, 5], get: (s) => s.roster.filter((r) => r.awakening >= 5).length },
  { id: 'transcend', cat: 'growth', name: '초월 5단계', unit: '명', goals: [1, 3], titles: { 0: 'transcender' }, get: (s) => s.roster.filter((r) => (r.transcend ?? 0) >= 5).length },
  // 장비
  { id: 'enhance', cat: 'gear', name: '강화 장인', unit: '강', goals: [10, 12, 15], titles: { 2: 'forgeMaster' }, get: (s) => Math.max(0, ...allEq(s).map((e) => e.enhance)) },
  { id: 'enhTry', cat: 'gear', name: '망치질', unit: '회', goals: [50, 500, 2000], get: (s) => c(s, 'enh') },
  { id: 'pot', cat: 'gear', name: '잠재능력', unit: '', goals: [2, 3, 4], get: (s) => Math.max(0, ...allEq(s).map((e) => e.pot ?? 0)) },
  { id: 'refine', cat: 'gear', name: '제련 중독', unit: '회', goals: [10, 100, 500], get: (s) => c(s, 'refine') },
  { id: 'set', cat: 'gear', name: '세트 완성', unit: '부위', goals: [3, 5, 7], get: maxSet },
  { id: 'myth', cat: 'gear', name: '신화 장비', unit: '개', goals: [1, 3, 7], titles: { 2: 'mythOwner' }, get: (s) => allEq(s).filter((e) => EQUIP_BY_ID[e.baseId]?.set === MYTH_SET).length },
  { id: 'craft', cat: 'gear', name: '제작', unit: '회', goals: [5, 30, 100], get: (s) => c(s, 'craft') },
  // 수집
  { id: 'petKind', cat: 'collect', name: '펫 종류', unit: '종', goals: [3, 6, PET_KINDS.length], get: (s) => new Set(s.pets.map((p) => p.kind)).size },
  { id: 'petEvo', cat: 'collect', name: '펫 진화', unit: '마리', goals: [1, 3], titles: { 0: 'beastLord' }, get: (s) => s.pets.filter((p) => p.evo).length },
  { id: 'cards', cat: 'collect', name: '신비 카드', unit: '종', goals: [10, 50, 100, CARDS.length], titles: { 3: 'cardMaster' }, get: (s) => Object.keys(s.cards ?? {}).length },
  { id: 'codex', cat: 'collect', name: '용병 도감', unit: '명', goals: [10, 30, 50], get: (s) => s.codex?.length ?? 0 },
  // 함께
  { id: 'duelWin', cat: 'social', name: '결투 승리', unit: '회', goals: [1, 10, 50], titles: { 2: 'duelist' }, get: (s) => c(s, 'duelWin') },
  { id: 'r4', cat: 'social', name: '4인 레이드', unit: '회', goals: [1, 10, 50], get: (s) => c(s, 'raid4') },
  { id: 'r4hell', cat: 'social', name: '지옥 레이드 처치', unit: '회', goals: [1, 10], titles: { 0: 'hellConq' }, get: (s) => c(s, 'r4win_hell') },
  { id: 'abyss', cat: 'social', name: '4인 레이드 심연', unit: '단계', goals: [1, 3, 5, 10], titles: { 2: 'abyssWalker', 3: 'abyssLord' }, get: (s) => s.r4Abyss ?? 0 },
  { id: 'lend', cat: 'social', name: '친구에게 단원 빌려주기', unit: '회', goals: [1, 10, 50], titles: { 2: 'loyal' }, get: (s) => c(s, 'lent') },
  { id: 'multi', cat: 'social', name: '파티 던전', unit: '회', goals: [10, 50, 200], get: (s) => c(s, 'multi') },
  // 일상
  { id: 'goldEarn', cat: 'life', name: '골드 벌이', unit: 'G', goals: [1e6, 1e7, 1e8, 1e9], titles: { 3: 'tycoon' }, get: (s) => c(s, 'goldEarn') },
  { id: 'buy', cat: 'life', name: '단골손님', unit: '회', goals: [10, 100, 500], get: (s) => c(s, 'buy') },
];
export const ACH_BY_ID: Record<string, AchDef> = Object.fromEntries(ACHS.map((a) => [a.id, a]));

/** 단계(0부터)별 보상·점수 */
export const ACH_REWARD = [
  { pts: 10, gold: 20000, stones: 5, runes: 0, packs: 0 },
  { pts: 20, gold: 80000, stones: 15, runes: 1, packs: 0 },
  { pts: 30, gold: 250000, stones: 30, runes: 3, packs: 1 },
  { pts: 40, gold: 600000, stones: 50, runes: 5, packs: 1 },
  { pts: 50, gold: 1500000, stones: 80, runes: 10, packs: 2 },
];
/** 업적 점수 마일스톤 */
export const ACH_MS = [
  { pts: 100, gold: 300000, packs: 2, ess: 0 },
  { pts: 250, gold: 1000000, packs: 3, ess: 10 },
  { pts: 450, gold: 2000000, packs: 5, ess: 25 },
  { pts: 700, gold: 4000000, packs: 8, ess: 50, title: 'achiever' },
];

export const achPoints = (s: AchState) => ACHS.reduce((a, d) => a + ACH_REWARD.slice(0, s.ach?.[d.id] ?? 0).reduce((x, r) => x + r.pts, 0), 0);
export const ACH_MAX_PTS = ACHS.reduce((a, d) => a + ACH_REWARD.slice(0, d.goals.length).reduce((x, r) => x + r.pts, 0), 0);
/** 받을 수 있는 단계 수 (아직 안 받은 달성 단계) */
export function achReady(s: AchState, d: AchDef, v = d.get(s)) { const got = s.ach?.[d.id] ?? 0; return d.goals.filter((g, i) => i >= got && v >= g).length; }
export function unlockedTitles(s: AchState): string[] {
  const out: string[] = [];
  for (const d of ACHS) for (const [i, t] of Object.entries(d.titles ?? {})) if ((s.ach?.[d.id] ?? 0) > +i) out.push(t);
  ACH_MS.forEach((m, i) => { if (m.title && (s.achMs ?? 0) > i) out.push(m.title); });
  return out;
}
