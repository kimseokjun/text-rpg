import { JOBS } from '../data/jobs';
import { finalStats, partyMods } from './stats';
import { mitigation } from './combat';
import { refStats } from '../data/monsters';
import type { Character, Modifier } from './types';

/**
 * 전투력 = √(공격력 × 버티기) × 3   (스탯별 가중치는 src/cli/statvalue.ts 실전 승률 측정으로 맞춤)
 *  공격력: 공격·마력 중 높은 쪽 × 치명(100% 상한, 치명 피해 반영) × 스킬 데미지 × 명중(몬스터 민첩 대비) × 회복량(성직자)
 *  버티기: HP ÷ 받는 피해 비율(방어·마저 비율 감소, 같은 레벨 몬스터 기준) ÷ (1 − 회피율) ÷ 받는 피해 보정
 */
export function charPower(c: Character, shared: Modifier[] = []): number {
  const { stats: s, extra: e } = finalStats(c, shared);
  const monAgi = refStats(c.level).agi;
  const crit = Math.min(100, s.crit) / 100;
  const hit = 1 - Math.min(50, Math.max(0, (monAgi - s.agi) * 0.3)) / 100;
  const heal = JOBS[c.jobId].base === 'priest' ? 1 + e.healPower / 100 : 1;
  const off = Math.max(s.atk, s.mag) * (1 + crit * (0.5 + e.critDmg)) * (1 + e.skillDmg / 100) * (s.atk >= s.mag ? 1 + e.physDmg / 100 : 1) * hit * heal;
  const taken = 0.5 * mitigation(s.def, c.level) + 0.5 * mitigation(s.res, c.level);
  const evade = Math.min(50, e.evade + Math.max(0, (s.agi - monAgi) * 0.3)) / 100;
  const dur = s.hp / taken / (1 - evade) / Math.max(0.2, 1 + e.dmgTaken / 100);
  return Math.round(Math.sqrt(off * dur) * 3);
}

/** 파티 전투력: 파티 공용 효과(지휘관 등)까지 반영한 합계 */
export function partyPower(chars: Character[], extra: Modifier[] = []): number {
  const shared = [...partyMods(chars), ...extra];
  return chars.reduce((sum, c) => sum + charPower(c, shared), 0);
}

/** 층별 권장 전투력: 1~50층은 다양한 조합의 무작위 힐러 포함 파티가 해당 층을 풀 HP로 80% 클리어하는 지점 (src/cli/calib.ts),
 *  마왕성 51~70층은 정석 조합(탱커·딜러 2·힐러) 파티 기준 80% 지점 — 조합이 어긋나면 훨씬 더 필요 */
export const FLOOR_POWER = [200,  300,  600,  840,  2800,  3200,  4200,  4300,  8300,  12000,  13000,  14000,  14000,  16000,  15000,  15000,  16000,  16000,  17000,  22000,  20000,  22000,  22000,  27000,  26000,  35000,  35000,  35000,  40000,  40000,  39000,  39000,  42000,  45000,  63000,  46000,  50000,  53000,  53000,  74000,  53000,  64000,  63000,  82000,  88000,  85000,  85000,  85000,  84000,  86000,  100000,  110000,  120000,  94000,  90000,  98000,  96000,  92000,  110000,  91000,  89000,  75000,  84000,  91000,  120000,  94000,  96000,  110000,  120000,  120000];
export const floorPower = (floor: number) => FLOOR_POWER[Math.min(FLOOR_POWER.length, Math.max(1, floor)) - 1];

export type PowerLevel = 'ok' | 'close' | 'low';
/** 힐러 없는 파티 판정 배율 (calib.ts noheal: 5~24층 1.1~1.5배, 25층+ 사실상 불가) */
export const noHealerFactor = (floor: number) => (floor < 25 ? 0.75 : 0.5);

/** 판정용 전투력: 힐러가 없으면 깎아서 본다 */
export const effectivePower = (power: number, floor: number, healer = true) => (healer ? power : power * noHealerFactor(floor));

export function powerLevel(power: number, floor: number, healer = true): PowerLevel {
  const need = floorPower(floor), p = effectivePower(power, floor, healer);
  return p >= need ? 'ok' : p >= need * 0.8 ? 'close' : 'low';
}

export const hasHealer = (chars: Character[]) => chars.some((c) => JOBS[c.jobId].base === 'priest');
