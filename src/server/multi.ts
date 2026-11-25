/**
 * 멀티 던전 서버 계산: 참가자들의 서버 세이브에서 고른 단원을 모아 4인 파티로 3층 진행.
 * 결과(시드·단원 스냅샷·설정)를 방에 저장 → 각자 화면에서 같은 시드로 똑같이 재생.
 */
import { migrate, petPartyMods } from '../state/game';
import { Expedition, DEFAULT_SETTINGS, type ExpeditionSettings } from '../core/dungeon';
import { Rng } from '../core/rng';
import type { Character } from '../core/types';

export const MULTI_FLOORS = 3;
export const COOP_BONUS = 1.2;
/** 인원별 한 명이 데려갈 수 있는 단원 수 (방장 먼저) */
export const slotsFor = (n: number, isHost: boolean) => (n <= 2 ? 2 : n === 3 ? (isHost ? 2 : 1) : 1);

export interface MultiMember { user_id: string; username: string; chars: (string | { uid: string })[]; save: unknown; host: boolean }
export function multiSettings(floor: number, petMods: ExpeditionSettings['petMods']): ExpeditionSettings {
  return { ...DEFAULT_SETTINGS, startFloor: floor, targetFloor: Math.min(70, floor + MULTI_FLOORS - 1), mode: 'advance', auto: true, retreatHpPct: 0, retreatOnDown: false, stopBeforeBoss: false, insured: true, potions: [], petMods, multi: true };
}

export function simulateMulti(members: MultiMember[], floor: number, seed: number) {
  const chars: Character[] = [];
  const owner: Record<string, string> = {};
  let petMods: ExpeditionSettings['petMods'] = [];
  for (const m of members) {
    const s = migrate(m.save);
    if (!s) return { error: `${m.username}의 세이브를 읽을 수 없어요` } as const;
    if (m.host) petMods = petPartyMods(s);
    const want = m.chars.map((c) => (typeof c === 'string' ? c : c.uid)).slice(0, slotsFor(members.length, m.host));
    for (const uid of want) {
      const c = s.roster.find((x) => x.uid === uid);
      if (!c) return { error: `${m.username}의 단원을 찾을 수 없어요` } as const;
      const copy = JSON.parse(JSON.stringify(c)) as Character;
      copy.uid = `${m.user_id.slice(0, 8)}_${c.uid}`;
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
    refineStones: loot.refineStones, cores: loot.cores, equips: loot.equips,
  };
  return { chars, owner, settings, seed, cleared, wiped: ex.stopReason === 'wipe' || ex.stopReason === 'timeout', reward } as const;
}
