/**
 * 멀티 던전 서버 계산: 참가자들의 서버 세이브에서 고른 단원을 모아 4인 파티로 3층 진행.
 * 결과(시드·단원 스냅샷·설정)를 방에 저장 → 각자 화면에서 같은 시드로 똑같이 재생.
 */
import { migrate, petPartyMods } from '../state/game';
import { Expedition, DEFAULT_SETTINGS, RIFT_FLOORS, rollEquip, type ExpeditionSettings } from '../core/dungeon';
import { rewardScale } from '../data/monsters';
import { Rng } from '../core/rng';
import type { Character } from '../core/types';

export const MULTI_FLOORS = RIFT_FLOORS;
export const COOP_BONUS = 1.2;
/** 인원별 한 명이 데려갈 수 있는 단원 수 (방장 먼저) */
export const slotsFor = (n: number, isHost: boolean) => (n <= 2 ? 2 : n === 3 ? (isHost ? 2 : 1) : 1);

export interface MultiMember { user_id: string; username: string; chars: (string | { uid: string })[]; save: unknown; host: boolean }
export function multiSettings(floor: number, petMods: ExpeditionSettings['petMods']): ExpeditionSettings {
  return { ...DEFAULT_SETTINGS, startFloor: 1, targetFloor: RIFT_FLOORS, mode: 'advance', auto: true, retreatHpPct: 0, retreatOnDown: false, stopBeforeBoss: false, insured: true, potions: [], petMods, multi: true, rift: { level: floor } };
}

export function simulateMulti(members: MultiMember[], floor: number, seed: number) {
  const chars: Character[] = [];
  const owner: Record<string, string> = {};
  const best: Record<string, number> = {};
  let petMods: ExpeditionSettings['petMods'] = [];
  for (const m of members) {
    const s = migrate(m.save);
    if (!s) return { error: `${m.username}의 세이브를 읽을 수 없어요` } as const;
    if (m.host) petMods = petPartyMods(s);
    best[m.user_id] = s.maxFloor;
    const want = m.chars.map((c) => (typeof c === 'string' ? c : c.uid)).slice(0, slotsFor(members.length, m.host));
    for (const uid of want) {
      const c = s.roster.find((x) => x.uid === uid);
      if (!c) return { error: `${m.username}의 단원을 찾을 수 없어요` } as const;
      const copy = JSON.parse(JSON.stringify(c)) as Character;
      copy.uid = `${m.user_id.slice(0, 8)}_${c.uid}`;
      // 이름이 겹치면 주인 이름을 붙여 구분 (전투 기록·체력바가 이름 기준)
      if (chars.some((x) => x.name === copy.name)) copy.name = `${copy.name}(${m.username})`;
      owner[copy.uid] = m.user_id;
      chars.push(copy);
    }
  }
  if (!chars.length) return { error: '데려갈 단원이 없어요' } as const;
  const settings = multiSettings(floor, petMods);
  const ex = new Expedition(chars, settings, new Rng(seed)).runAuto();
  const cleared = ex.floorsCleared;
  const loot = ex.loot;
  const reward = {
    gold: Math.round(loot.gold * COOP_BONUS), exp: Math.round(loot.exp * COOP_BONUS), stones: loot.stones, blessings: loot.blessings,
    refineStones: loot.refineStones, cores: loot.cores, cardPacks: loot.cardPacks ?? 0, equips: loot.equips,
  };
  // 각자 보상: 자기가 깬 층 기준 (못 깬 층 균열이면 내 최고층 수준으로 낮춤)
  const rng = new Rng(seed + 1);
  const rewards: Record<string, typeof reward & { level: number }> = {};
  for (const m of members) {
    const lv = Math.max(1, Math.min(floor, best[m.user_id] || 1));
    const k = lv >= floor ? 1 : rewardScale(lv) / rewardScale(floor);
    rewards[m.user_id] = {
      level: lv,
      gold: Math.round(reward.gold * k), exp: Math.round(reward.exp * k),
      stones: Math.round(reward.stones * Math.min(1, k * 1.5)), blessings: lv >= floor ? reward.blessings : Math.floor(reward.blessings * k),
      refineStones: lv >= floor ? reward.refineStones : Math.floor(reward.refineStones * Math.min(1, k * 1.5)),
      cores: lv > 50 ? reward.cores : 0, cardPacks: reward.cardPacks,
      equips: lv >= floor ? reward.equips : reward.equips.map((e) => rollEquip(rng, lv, Math.min(e.rarity, 3) as 1 | 2 | 3)),
    };
  }
  return { chars, owner, settings, seed, cleared, wiped: ex.stopReason === 'wipe' || ex.stopReason === 'timeout', reward, rewards } as const;
}
