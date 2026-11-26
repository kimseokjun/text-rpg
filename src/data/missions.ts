/** 일일 미션(포인트 → 상자 3개). 날짜는 한국 시간 */
export interface DReward { gold?: number; stones?: number; blessings?: number; refineStones?: number; runes?: number; cores?: number; cardPacks?: number; mythEss?: number; egg?: number }
export const dRewardText = (r: DReward) => [
  r.gold && `${r.gold.toLocaleString('ko-KR')}G`, r.stones && `강화석 ${r.stones}`, r.blessings && `축복 ${r.blessings}`, r.refineStones && `제련석 ${r.refineStones}`,
  r.runes && `룬석 ${r.runes}`, r.cores && `핵 ${r.cores}`, r.cardPacks && `카드 팩 ${r.cardPacks}`, r.mythEss && `신화의 정수 ${r.mythEss}`, r.egg && `${['', '', '', '희귀', '영웅', '전설'][r.egg]} 이상 펫 알`,
].filter(Boolean).join(' · ');

export interface Mission { id: string; name: string; key: string; need: number; pts: number; cloud?: boolean }
/** key = 게임 안 누적 카운터 (s.cnt) */
export const MISSIONS: Mission[] = [
  { id: 'run', name: '던전 탐험 3번', key: 'run', need: 3, pts: 20 },
  { id: 'daily', name: '일일 던전 2번', key: 'daily', need: 2, pts: 15 },
  { id: 'enh', name: '장비 강화 5번 시도', key: 'enh', need: 5, pts: 15 },
  { id: 'refine', name: '제련 3번', key: 'refine', need: 3, pts: 15 },
  { id: 'buy', name: '잡화점에서 구매 1번', key: 'buy', need: 1, pts: 10 },
  { id: 'cardDun', name: '카드 던전 1번', key: 'cardDun', need: 1, pts: 20 },
  { id: 'duel', name: '친구 결투 1번', key: 'duel', need: 1, pts: 10, cloud: true },
  { id: 'raid4', name: '4인 레이드 1번', key: 'raid4', need: 1, pts: 15, cloud: true },
];
/** 포인트 상자 */
export const CHESTS: { pts: number; reward: DReward }[] = [
  { pts: 40, reward: { gold: 150000, stones: 30, blessings: 3 } },
  { pts: 70, reward: { refineStones: 15, runes: 8, cardPacks: 1 } },
  { pts: 100, reward: { mythEss: 8, cores: 60, cardPacks: 2 } },
];
