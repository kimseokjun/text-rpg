/** 4인 레이드: 심연의 왕 아바돈. 인당 단원 1명, 차례마다 스킬을 직접 고름 (방장 화면이 전투 진행) */
import { kstDate } from './daily';

export type R4Diff = 'normal' | 'hard' | 'hell';
export const R4_DIFFS: R4Diff[] = ['normal', 'hard', 'hell'];
export interface R4Def { name: string; power: number; ess: number; mythChance: number }
/** power = 권장 1인 전투력 (난이도마다 2배). 보스 능력치도 같은 배율로 커짐 */
export const R4: Record<R4Diff, R4Def> = {
  normal: { name: '노말', power: 125000, ess: 20, mythChance: 0 },
  hard: { name: '하드', power: 250000, ess: 45, mythChance: 6 },
  hell: { name: '헬', power: 500000, ess: 100, mythChance: 15 },
};
export const R4_ROUNDS = 20;
export const R4_TURN_SEC = 15;
export const R4_MAX = 4;
/** 보상은 난이도마다 하루 1번 (한국 시간 자정 초기화) */
export const r4Today = () => kstDate();
/** 실패해도 준 피해 비율만큼 정수 일부 */
export const R4_BONUS: Record<R4Diff, { cores: number; runes: number; gold: number }> = {
  normal: { cores: 60, runes: 10, gold: 300000 }, hard: { cores: 120, runes: 20, gold: 600000 }, hell: { cores: 250, runes: 40, gold: 1200000 },
};
export const r4Reward = (d: R4Diff, frac: number, win: boolean) => {
  const f = win ? 1 : 0.4 * Math.min(1, frac);
  return { ess: Math.floor(R4[d].ess * f), cores: Math.floor(R4_BONUS[d].cores * f), runes: Math.floor(R4_BONUS[d].runes * f), gold: Math.floor(R4_BONUS[d].gold * f) };
};
