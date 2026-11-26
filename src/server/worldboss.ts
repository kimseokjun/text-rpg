/**
 * 월드보스 서버 계산 (Supabase Edge Function에서 번들로 사용)
 * 플레이어의 서버 저장 세이브로 파티를 만들어 10라운드 동안 보스에게 넣은 피해를 계산한다.
 */
import { migrate, partyChars, petPartyMods } from '../state/game';
import { Expedition, DEFAULT_SETTINGS } from '../core/dungeon';
import { Rng } from '../core/rng';
import { RAID_FORMS } from '../data/raid';
import { MONSTERS } from '../data/monsters';
import type { BattleEvent } from '../core/types';

export const WB_LIMIT = 3;
export const wbForm = (season: number) => RAID_FORMS[(season + 1) % RAID_FORMS.length];
export const wbInfo = (season: number) => { const f = wbForm(season); return { name: `월드보스 · ${MONSTERS[f.monster].name}`, monster: f.monster, form: f.name, tip: f.tip }; };

export function simulateWorldBoss(saveJson: unknown, season: number, hpLeft: number, maxHp: number, seed: number) {
  const s = migrate(saveJson);
  if (!s) return { error: '세이브가 올바르지 않아요' } as const;
  const chars = partyChars(s);
  if (!chars.length) return { error: '출전 파티가 비어 있어요' } as const;
  const ex = new Expedition(chars, { ...DEFAULT_SETTINGS, startFloor: 70, mode: 'advance', auto: true, potions: [], petMods: petPartyMods(s), insured: true, raid: { diff: 'hell', week: season + 1, hpLeft, maxHp } }, new Rng(seed));
  const r = ex.runFloor();
  // 전송량을 줄이기 위해 로그는 핵심 이벤트만
  const log = r.log.filter((e: BattleEvent) => e.t !== 'status' && e.t !== 'evade').slice(0, 1500);
  return { dealt: ex.raidDealt, killed: ex.raidKilled, wiped: ex.party.every((p) => !p.alive), log, report: ex.report, power: 0 } as const;
}

/** 시즌 HP: 지난 시즌이 빨리 잡히면 늘리고, 못 잡으면 줄임 */
export function nextMaxHp(prev?: { max_hp: number; killed: boolean; hours: number }) {
  if (!prev) return 30_000_000;
  const m = !prev.killed ? 0.7 : prev.hours < 72 ? 1.6 : prev.hours < 120 ? 1.2 : 1.0;
  return Math.max(5_000_000, Math.round((prev.max_hp * m) / 1_000_000) * 1_000_000);
}

/** 기여 순위 보상 (처치된 시즌만) */
export function wbReward(rank: number, total: number) {
  const pct = total ? rank / total : 1;
  const tier = rank === 1 ? 0 : pct <= 0.1 ? 1 : pct <= 0.3 ? 2 : pct <= 0.6 ? 3 : 4;
  return [
    { label: '1위', cores: 900, mythEss: 40, refineStones: 40, runes: 30, gold: 500000, egg: 5 },
    { label: '상위 10%', cores: 600, mythEss: 30, refineStones: 25, runes: 20, gold: 300000, egg: 4 },
    { label: '상위 30%', cores: 420, mythEss: 20, refineStones: 15, runes: 15, gold: 200000 },
    { label: '상위 60%', cores: 270, mythEss: 15, refineStones: 10, runes: 10, gold: 120000 },
    { label: '참여', cores: 150, mythEss: 10, refineStones: 5, runes: 5, gold: 60000 },
  ][tier];
}
