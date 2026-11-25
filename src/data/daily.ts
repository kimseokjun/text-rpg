/** 일일 던전: 하루 3회(한국 시간 자정 초기화), 단계 1~10, 클리어한 단계는 소탕 가능 */
export type DailyReward = 'gold' | 'refine' | 'stone' | 'exp' | 'legion';
export interface DailyDef {
  id: string; name: string; desc: string; tip: string; reward: DailyReward;
  pool: string[]; elite: string; unlockFloor: number;
  /** 단계 → 몬스터 강함 기준 층 */
  stageFloor: (stage: number) => number;
  /** 단계가 열리는 최고 층 */
  stageUnlock: (stage: number) => number;
}
const forest = (k: number) => 5 * k - 1;            // 4, 9, …, 49 (보스층 피함)
const forestUnlock = (k: number) => 5 * (k - 1);
const LEGION_F = [51, 52, 53, 54, 56, 57, 58, 61, 63, 66];
export const DAILY_LIMIT = 3;
export const DAILIES: DailyDef[] = [
  { id: 'vault', name: '황금 금고', desc: '잊힌 왕국의 금고. 황금으로 된 수호자들이 지키고 있다.', tip: '방어가 높은 골렘이 많아요. 마법사가 유리해요.', reward: 'gold',
    pool: ['goldGolem', 'mimic'], elite: 'vaultKeeper', unlockFloor: 0, stageFloor: forest, stageUnlock: forestUnlock },
  { id: 'vein', name: '제련의 광맥', desc: '마력이 굳어 생긴 수정 광맥. 제련석이 자라난다.', tip: '마법 저항이 매우 높아요. 전사·궁수 같은 물리 딜러로 가세요.', reward: 'refine',
    pool: ['crystalSpirit', 'shardGolem'], elite: 'crystalHeart', unlockFloor: 10, stageFloor: forest, stageUnlock: (k) => Math.max(10, forestUnlock(k)) },
  { id: 'quarry', name: '강철 채석장', desc: '강화석이 묻힌 채석장. 바위로 된 괴물들이 들끓는다.', tip: '방어가 단단해요. 마법이나 방어 무시 옵션이 좋아요.', reward: 'stone',
    pool: ['rockGiant', 'stoneBeetle'], elite: 'quarryLord', unlockFloor: 10, stageFloor: forest, stageUnlock: (k) => Math.max(10, forestUnlock(k)) },
  { id: 'tower', name: '경험의 탑', desc: '용병들이 수련하는 탑. 꼭대기의 사범을 이기면 큰 깨달음을 얻는다.', tip: '교관과 사범의 공격이 날카로워요. 탱커와 회복을 챙기세요.', reward: 'exp',
    pool: ['trainingDummy', 'swordInstructor'], elite: 'grandMaster', unlockFloor: 20, stageFloor: forest, stageUnlock: (k) => Math.max(20, forestUnlock(k)) },
  { id: 'legion', name: '군단의 잔해', desc: '마왕군이 남긴 전장의 잔해. 군단장의 힘이 서린 핵이 굴러다닌다.', tip: '마왕성급 난이도예요. 세트 재료를 얻을 수 있어요.', reward: 'legion',
    pool: ['hellKnight', 'doomGuard', 'castleWarlock', 'archDemon'], elite: 'demonDuke', unlockFloor: 50, stageFloor: (k) => LEGION_F[k - 1], stageUnlock: (k) => 50 + 2 * (k - 1) },
];
/** 단계별 난이도 배율 (src/cli/dailytune.ts: 표준 파티 기준 일반 80%, 군단의 잔해 60%) */
export const DAILY_TUNE: Record<string, number[]> = {"vault": [1.05, 1.08, 1.55, 1.49, 1.36, 1.92, 1.98, 1.98, 4.72, 4.97], "vein": [1.08, 1.11, 1.64, 1.44, 1.34, 2.06, 1.98, 1.78, 3.87, 3.91], "quarry": [1.2, 1.4, 2.08, 1.85, 1.8, 3.11, 3.09, 3.13, 5.47, 5.89], "tower": [1.32, 1.07, 1.51, 1.36, 1.37, 1.56, 1.66, 1.64, 3.41, 3.4], "legion": [8.54, 10.22, 9.49, 9.96, 8.98, 8.23, 7.25, 10.43, 10.53, 9.52]};
export const DAILY_BY_ID = Object.fromEntries(DAILIES.map((d) => [d.id, d]));
export const DAILY_STAGES = 10;
/** 한국 시간 날짜 (YYYY-MM-DD) */
export const kstDate = (now = Date.now()) => new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);

export interface DailyLoot { gold: number; exp: number; stones: number; blessings: number; refineStones: number; shards: number; cores: number }
export function dailyReward(d: DailyDef, stage: number, scale: number): DailyLoot {
  const z: DailyLoot = { gold: 0, exp: 0, stones: 0, blessings: 0, refineStones: 0, shards: 0, cores: 0 };
  switch (d.reward) {
    case 'gold': z.gold = Math.round(1800 * scale); break;
    case 'refine': z.refineStones = 3 + 2 * stage; z.gold = Math.round(150 * scale); break;
    case 'stone': z.stones = 4 + 3 * stage; z.blessings = 1 + Math.floor(stage / 2); break;
    case 'exp': z.exp = Math.round(2000 * scale); break;
    case 'legion': z.cores = 12 + 4 * stage + 10 * (1 + Math.floor(stage / 2)); z.gold = Math.round(300 * scale); break;
  }
  return z;
}
