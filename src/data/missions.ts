/** 출석(28일 주기 누적) · 일일 미션(포인트 → 상자 3개). 날짜는 한국 시간 */
export interface DReward { gold?: number; stones?: number; blessings?: number; refineStones?: number; runes?: number; cores?: number; cardPacks?: number; mythEss?: number; egg?: number }
export const dRewardText = (r: DReward) => [
  r.gold && `${r.gold.toLocaleString('ko-KR')}G`, r.stones && `강화석 ${r.stones}`, r.blessings && `축복 ${r.blessings}`, r.refineStones && `제련석 ${r.refineStones}`,
  r.runes && `룬석 ${r.runes}`, r.cores && `핵 ${r.cores}`, r.cardPacks && `카드 팩 ${r.cardPacks}`, r.mythEss && `신화의 정수 ${r.mythEss}`, r.egg && `${['', '', '', '희귀', '영웅', '전설'][r.egg]} 이상 펫 알`,
].filter(Boolean).join(' · ');

/** 출석 28일: 7일마다 큰 보상 */
export const ATTEND: DReward[] = Array.from({ length: 28 }, (_, i) => {
  const d = i + 1, w = Math.floor(i / 7);
  if (d === 7) return { cardPacks: 3, runes: 10, gold: 200000 };
  if (d === 14) return { mythEss: 15, egg: 4 };
  if (d === 21) return { cardPacks: 5, refineStones: 30, gold: 400000 };
  if (d === 28) return { mythEss: 40, egg: 5, cardPacks: 5 };
  const cyc = d % 3;
  return cyc === 1 ? { gold: 50000 * (w + 1), stones: 20 } : cyc === 2 ? { refineStones: 8 + w * 2, blessings: 2 } : { runes: 3 + w, cores: 20 + w * 10 };
});

export interface Mission { id: string; name: string; key: string; need: number; pts: number; cloud?: boolean }
/** key = 게임 안 누적 카운터 (s.cnt) */
export const MISSIONS: Mission[] = [
  { id: 'run', name: '던전 탐험 3번', key: 'run', need: 3, pts: 20 },
  { id: 'daily', name: '일일 던전 2번', key: 'daily', need: 2, pts: 15 },
  { id: 'enh', name: '장비 강화 5번 시도', key: 'enh', need: 5, pts: 15 },
  { id: 'refine', name: '제련 3번', key: 'refine', need: 3, pts: 15 },
  { id: 'buy', name: '잡화점에서 구매 1번', key: 'buy', need: 1, pts: 10 },
  { id: 'multi', name: '균열 1번', key: 'multi', need: 1, pts: 20, cloud: true },
  { id: 'duel', name: '친구 결투 1번', key: 'duel', need: 1, pts: 10, cloud: true },
  { id: 'raid4', name: '4인 레이드 1번', key: 'raid4', need: 1, pts: 15, cloud: true },
];
/** 포인트 상자 */
export const CHESTS: { pts: number; reward: DReward }[] = [
  { pts: 40, reward: { gold: 150000, stones: 30, blessings: 3 } },
  { pts: 70, reward: { refineStones: 15, runes: 8, cardPacks: 1 } },
  { pts: 100, reward: { mythEss: 8, cores: 60, cardPacks: 2 } },
];
