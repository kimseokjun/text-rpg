/** 개인 레이드: 군단장 벨리알. 주마다(한국 시간 월요일) 형태가 바뀜, 이번 주 누적 HP, 하루 3회, 10라운드 */
import { DAY_SHIFT_MS, kstDate } from './daily';

export type RaidDiff = 'normal' | 'hard' | 'hell';
export const RAID_DIFFS: RaidDiff[] = ['normal', 'hard', 'hell'];
export const RAID_DIFF_NAME: Record<RaidDiff, string> = { normal: '보통', hard: '어려움', hell: '지옥' };
export const RAID_ROUNDS = 10;
export const RAID_LIMIT = 3;

export interface RaidForm { id: string; monster: string; name: string; adds: string[]; tip: string; hpMult: Record<RaidDiff, number> }
export const RAID_FORMS: RaidForm[] = [
  { id: 'fire', monster: 'belialFire', name: '화염 형태', hpMult: { normal: 1, hard: 1, hell: 1 }, adds: [], tip: '지옥불로 파티 전체에 화상을 걸고, 라운드마다 강해져요. 짧은 시간에 화력을 몰아야 해요. 마법 저항·회복·정화(엘레노어)가 유리해요.' },
  { id: 'abyss', monster: 'belialAbyss', name: '심연 형태', hpMult: { normal: 0.45, hard: 1.05, hell: 1.2 }, adds: ['tentacle', 'tentacle'], tip: '촉수가 살아있는 동안 벨리알이 받는 피해가 70% 줄어요. 촉수는 계속 다시 자라니 잡몹 우선 딜러로 촉수를 끊고, 보스 우선 딜러로 그 틈에 딜하세요.' },
  { id: 'fallen', monster: 'belialFallen', name: '타락 형태', hpMult: { normal: 0.8, hard: 0.8, hell: 0.8 }, adds: [], tip: '마법 저항이 매우 높고 스스로 치유해요. 전사·궁수 같은 물리 딜러와 받는 마법 피해 감소(바르가스, 템플러)가 유리해요.' },
];
/** 한국 시간 기준 주차 번호 (월요일 오전 4시 시작) */
export function raidWeek(now = Date.now()) {
  const days = Math.floor((now + DAY_SHIFT_MS) / 86400000);
  return Math.floor((days + 3) / 7); // 1970-01-01은 목요일
}
export const raidForm = (week = raidWeek()) => RAID_FORMS[week % RAID_FORMS.length];
export const raidToday = () => kstDate();
export function nextResetText(now = Date.now()) {
  const k = new Date(now + DAY_SHIFT_MS);
  const dow = (k.getUTCDay() + 6) % 7; // 월=0
  return `${7 - dow}일 뒤 월요일 오전 4시`;
}

export interface RaidDiffDef { floor: number; hp: number; tune: number; mult: number; eggMin: 3 | 4 }
/** 체력은 src/cli/raidtune.ts로 표준 파티 10라운드 평균 데미지 기준 (잘 짜면 1회 처치) */
export const RAID_DIFF: Record<RaidDiff, RaidDiffDef> = {
  normal: { floor: 52, hp: 430000, tune: 4, mult: 1, eggMin: 3 },
  hard: { floor: 60, hp: 550000, tune: 3, mult: 2, eggMin: 4 },
  hell: { floor: 70, hp: 870000, tune: 5, mult: 3, eggMin: 4 },
};
export const MILESTONES = [25, 50, 75, 100] as const;
export const raidMaxHp = (diff: RaidDiff, week = raidWeek()) => Math.round(RAID_DIFF[diff].hp * raidForm(week).hpMult[diff]);
/** 도전 보상 (가한 피해 비율 frac 기준) */
export const attemptReward = (diff: RaidDiff, frac: number) => ({
  gold: Math.round(80000 * RAID_DIFF[diff].mult * frac), refineStones: Math.round(20 * RAID_DIFF[diff].mult * frac),
  scales: Math.round((6 + 30 * frac) * RAID_DIFF[diff].mult),
});
/** 구간 보상의 벨리알의 파편 */
export const MILESTONE_SCALES: Record<number, number> = { 25: 10, 50: 15, 75: 20, 100: 40 };
